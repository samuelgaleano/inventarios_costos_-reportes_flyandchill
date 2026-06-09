-- ════════════════════════════════════════════════════════════════
--  Fly & Chill — Funciones y lógica de negocio
--  0002_functions.sql
-- ════════════════════════════════════════════════════════════════

-- ── Helpers de autorización (usan auth.uid() de Supabase) ──────
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_distributor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select distributor_id from profiles where id = auth.uid()
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and active
  )
$$;

-- ── Cálculo de precios (autoritativo, espejo del motor TS) ─────
-- Método divisor: cada margen es fracción del precio neto post-descuento.
create or replace function fc_compute_pricing(
  p_min_cost numeric,
  p_inv numeric, p_dist numeric, p_comp numeric, p_gw numeric,
  p_disc numeric, p_rounding int,
  out list_price numeric, out price_paid numeric, out discount_amount numeric,
  out cost numeric, out investor numeric, out distributor numeric,
  out gateway numeric, out company numeric
) language plpgsql immutable as $$
declare
  margin_sum numeric := p_inv + p_dist + p_comp + p_gw;
  net numeric;
  raw_list numeric;
begin
  if margin_sum >= 1 then
    raise exception 'La suma de márgenes debe ser menor a 100%%; valor actual: % por ciento', round(margin_sum*100,1);
  end if;
  if p_disc >= 1 then
    raise exception 'El descuento debe ser menor a 100%%';
  end if;
  if coalesce(p_min_cost,0) <= 0 then
    list_price := 0; price_paid := 0; discount_amount := 0;
    cost := 0; investor := 0; distributor := 0; gateway := 0; company := 0;
    return;
  end if;
  net := p_min_cost / (1 - margin_sum);
  raw_list := net / (1 - p_disc);
  if p_rounding > 0 then
    list_price := ceil(raw_list / p_rounding) * p_rounding;
  else
    list_price := round(raw_list);
  end if;
  price_paid := round(list_price * (1 - p_disc));
  discount_amount := list_price - price_paid;
  investor := round(price_paid * p_inv);
  distributor := round(price_paid * p_dist);
  gateway := round(price_paid * p_gw);
  cost := round(p_min_cost);
  company := price_paid - investor - distributor - gateway - cost;
end $$;

-- ── Ajuste atómico de stock (interno) ──────────────────────────
create or replace function fc_adjust_stock(
  p_product_id uuid, p_location inventory_location,
  p_distributor_id uuid, p_delta int
) returns void language plpgsql as $$
declare
  v_id uuid; v_qty int;
begin
  select id, quantity into v_id, v_qty from inventory
   where product_id = p_product_id and location = p_location
     and distributor_id is not distinct from p_distributor_id
   for update;

  if v_id is null then
    if p_delta < 0 then
      raise exception 'Sin existencias para descontar';
    end if;
    insert into inventory (product_id, location, distributor_id, quantity)
      values (p_product_id, p_location, p_distributor_id, p_delta);
  else
    if v_qty + p_delta < 0 then
      raise exception 'Existencias insuficientes: hay %, se requieren %', v_qty, -p_delta;
    end if;
    update inventory set quantity = v_qty + p_delta where id = v_id;
  end if;
end $$;

-- ── Registrar compra (entra a bodega) — solo admin ─────────────
create or replace function register_purchase(
  p_product_id uuid, p_quantity int, p_unit_cost numeric,
  p_date date, p_note text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  if p_quantity <= 0 then raise exception 'La cantidad debe ser positiva'; end if;

  perform fc_adjust_stock(p_product_id, 'bodega', null, p_quantity);

  insert into inventory_movements (
    product_id, type, quantity, unit_cost, to_location, note, created_by, created_at
  ) values (
    p_product_id, 'compra', p_quantity, p_unit_cost, 'bodega', p_note, auth.uid(),
    coalesce(p_date::timestamptz, now())
  );
end $$;

-- ── Transferir bodega → distribuidor — solo admin ──────────────
create or replace function transfer_inventory(
  p_product_id uuid, p_distributor_id uuid, p_quantity int, p_note text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  if p_quantity <= 0 then raise exception 'La cantidad debe ser positiva'; end if;

  perform fc_adjust_stock(p_product_id, 'bodega', null, -p_quantity);
  perform fc_adjust_stock(p_product_id, 'distribuidor', p_distributor_id, p_quantity);

  insert into inventory_movements (
    product_id, type, quantity, from_location, to_location, to_distributor_id, note, created_by
  ) values (
    p_product_id, 'transferencia', p_quantity, 'bodega', 'distribuidor', p_distributor_id, p_note, auth.uid()
  );
end $$;

-- ── Registrar venta (admin o distribuidor) ─────────────────────
-- Descuenta del origen, guarda snapshot de precio y registra movimiento,
-- todo en una sola transacción atómica.
create or replace function register_sale(
  p_product_id uuid, p_quantity int, p_payment_method payment_method,
  p_sale_date date, p_source_location inventory_location,
  p_source_distributor_id uuid, p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := auth_role();
  v_my_dist uuid := auth_distributor_id();
  v_product products%rowtype;
  v_set pricing_settings%rowtype;
  v_min_cost numeric;
  pr record;
  v_sale_id uuid;
  v_src_location inventory_location := p_source_location;
  v_src_dist uuid := p_source_distributor_id;
begin
  if v_role is null then raise exception 'No autorizado'; end if;
  if p_quantity <= 0 then raise exception 'La cantidad debe ser positiva'; end if;

  -- Un distribuidor solo puede vender desde su propio inventario.
  if v_role = 'distribuidor' then
    v_src_location := 'distribuidor';
    v_src_dist := v_my_dist;
    if v_src_dist is null then raise exception 'El distribuidor no tiene inventario asignado'; end if;
  end if;

  select * into v_product from products where id = p_product_id and active;
  if not found then raise exception 'Producto no existe o está inactivo'; end if;

  select * into v_set from pricing_settings where id = 1;

  v_min_cost := coalesce(v_product.unit_cost,0)
              + coalesce(v_product.shipping_cost,0)
              + coalesce(v_product.operating_cost,0);

  select * into pr from fc_compute_pricing(
    v_min_cost, v_set.investor_pct, v_set.distributor_pct,
    v_set.company_pct, v_set.gateway_pct, v_set.discount_pct, v_set.rounding
  );

  -- Descontar stock del origen (lanza excepción si es insuficiente)
  perform fc_adjust_stock(p_product_id, v_src_location, v_src_dist, -p_quantity);

  insert into sales (
    product_id, quantity, payment_method, sale_date,
    source_location, source_distributor_id, sold_by,
    unit_list_price, unit_price_paid, discount_pct, unit_cost_snapshot,
    investor_amount, distributor_amount, company_amount, gateway_amount, total_paid, note
  ) values (
    p_product_id, p_quantity, p_payment_method, coalesce(p_sale_date, current_date),
    v_src_location, v_src_dist, auth.uid(),
    pr.list_price, pr.price_paid, v_set.discount_pct, pr.cost,
    pr.investor * p_quantity, pr.distributor * p_quantity, pr.company * p_quantity,
    pr.gateway * p_quantity, pr.price_paid * p_quantity, p_note
  ) returning id into v_sale_id;

  insert into inventory_movements (
    product_id, type, quantity, from_location, from_distributor_id, related_sale_id, note, created_by
  ) values (
    p_product_id, 'venta', p_quantity, v_src_location, v_src_dist, v_sale_id, p_note, auth.uid()
  );

  return v_sale_id;
end $$;

-- ── Crear perfil automáticamente al registrar un usuario ───────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role, distributor_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'distribuidor'),
    nullif(new.raw_user_meta_data->>'distributor_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
