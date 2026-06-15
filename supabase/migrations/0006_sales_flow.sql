-- ════════════════════════════════════════════════════════════════
--  Fly & Chill — Flujo de venta (comisión, canal, pagado) + precio básico
--  0006_sales_flow.sql
-- ════════════════════════════════════════════════════════════════

-- ── Nuevos campos de venta ─────────────────────────────────────
alter table sales add column if not exists channel text;                       -- canal: whatsapp/instagram/web/pickup/otro
alter table sales add column if not exists did_sale boolean not null default true;     -- ✔ concretó la venta
alter table sales add column if not exists did_shipping boolean not null default true;  -- ✔ gestionó el envío
alter table sales add column if not exists is_paid boolean not null default false;      -- pago confirmado
alter table sales add column if not exists seller_distributor_id uuid references distributors(id);  -- quién gana la comisión/margen

update sales set seller_distributor_id = source_distributor_id where seller_distributor_id is null;

-- ── Precio del producto por distribuidor (mayorista, básico) ───
create table if not exists distributor_prices (
  distributor_id uuid not null references distributors(id) on delete cascade,
  product_id     uuid not null references products(id) on delete cascade,
  price          numeric(14,2) not null default 0,
  primary key (distributor_id, product_id)
);
alter table distributor_prices enable row level security;

drop policy if exists distprices_select on distributor_prices;
create policy distprices_select on distributor_prices for select to authenticated
  using (is_admin() or distributor_id = auth_distributor_id());
drop policy if exists distprices_write on distributor_prices;
create policy distprices_write on distributor_prices for all to authenticated
  using (is_admin()) with check (is_admin());
grant select, insert, update, delete on distributor_prices to authenticated;

-- ── RLS de ventas: el distribuidor ve donde es origen o vendedor ─
drop policy if exists sales_select on sales;
create policy sales_select on sales for select to authenticated
  using (
    is_admin()
    or source_distributor_id = auth_distributor_id()
    or seller_distributor_id = auth_distributor_id()
  );

-- ── register_sale v2 ───────────────────────────────────────────
drop function if exists register_sale(uuid, int, payment_method, date, inventory_location, uuid, text);

create or replace function register_sale(
  p_product_id uuid, p_quantity int, p_payment_method payment_method,
  p_sale_date date, p_source_location inventory_location,
  p_source_distributor_id uuid, p_note text,
  p_channel text default null,
  p_did_sale boolean default true,
  p_did_shipping boolean default true,
  p_is_paid boolean default false,
  p_unit_price numeric default null,
  p_seller_distributor_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := auth_role();
  v_my_dist uuid := auth_distributor_id();
  v_product products%rowtype;
  v_set pricing_settings%rowtype;
  v_min_cost numeric; v_commission numeric; pr record; v_sale_id uuid;
  v_src_location inventory_location := p_source_location;
  v_src_dist uuid := p_source_distributor_id;
  v_seller uuid;
  v_seller_type distributor_type;
  v_unit_price numeric; v_wholesale numeric;
  v_cost numeric; v_investor numeric; v_gateway numeric;
  v_commission_earned numeric; v_company numeric; v_dist_earn numeric;
begin
  if v_role is null then raise exception 'No autorizado'; end if;
  if p_quantity <= 0 then raise exception 'La cantidad debe ser positiva'; end if;

  if v_role = 'distribuidor' then
    v_src_location := 'distribuidor';
    v_src_dist := v_my_dist;
    v_seller := v_my_dist;
    if v_src_dist is null then raise exception 'El distribuidor no tiene inventario asignado'; end if;
  else
    v_seller := coalesce(p_seller_distributor_id, p_source_distributor_id);
  end if;

  select * into v_product from products where id = p_product_id and active;
  if not found then raise exception 'Producto no existe o está inactivo'; end if;
  select * into v_set from pricing_settings where id = 1;

  v_min_cost := coalesce(v_product.unit_cost,0)+coalesce(v_product.shipping_cost,0)+coalesce(v_product.operating_cost,0);
  v_commission := coalesce(v_product.commission_sale,0)+coalesce(v_product.commission_shipping,0);
  select * into pr from fc_compute_pricing(
    v_min_cost, v_set.investor_pct, v_set.company_pct, v_set.gateway_pct,
    v_set.discount_pct, v_commission, v_set.rounding);

  v_unit_price := coalesce(nullif(p_unit_price, 0), pr.price_paid);
  v_cost := pr.cost;

  v_seller_type := null;
  if v_seller is not null then
    select type into v_seller_type from distributors where id = v_seller;
  end if;

  if v_seller_type = 'basico' then
    -- mayorista: empresa gana (mayorista − costo); el básico gana (precio − mayorista)
    select price into v_wholesale from distributor_prices
      where distributor_id = v_seller and product_id = p_product_id;
    v_wholesale := coalesce(nullif(v_wholesale, 0), pr.price_paid);
    v_investor := 0; v_gateway := 0; v_commission_earned := 0;
    v_company := v_wholesale - v_cost;
    v_dist_earn := v_unit_price - v_wholesale;
  else
    -- retail (colaborador/admin): comisión según pasos ejecutados
    v_commission_earned :=
      (case when p_did_sale then coalesce(v_product.commission_sale,0) else 0 end) +
      (case when p_did_shipping then coalesce(v_product.commission_shipping,0) else 0 end);
    if v_seller is null then v_commission_earned := 0; end if;
    v_investor := pr.investor; v_gateway := pr.gateway;
    v_dist_earn := v_commission_earned;
    v_company := v_unit_price - v_cost - v_investor - v_gateway - v_commission_earned;
  end if;

  perform fc_adjust_stock(p_product_id, v_src_location, v_src_dist, -p_quantity);

  insert into sales (
    product_id, quantity, payment_method, sale_date,
    source_location, source_distributor_id, seller_distributor_id, sold_by,
    unit_list_price, unit_price_paid, discount_pct, unit_cost_snapshot,
    investor_amount, distributor_amount, company_amount, gateway_amount, total_paid, note,
    channel, did_sale, did_shipping, is_paid
  ) values (
    p_product_id, p_quantity, p_payment_method, coalesce(p_sale_date, current_date),
    v_src_location, v_src_dist, v_seller, auth.uid(),
    pr.list_price, v_unit_price, v_set.discount_pct, v_cost,
    v_investor*p_quantity, v_dist_earn*p_quantity, v_company*p_quantity,
    v_gateway*p_quantity, v_unit_price*p_quantity, p_note,
    p_channel, p_did_sale, p_did_shipping, p_is_paid
  ) returning id into v_sale_id;

  insert into inventory_movements (product_id, type, quantity, from_location, from_distributor_id, related_sale_id, note, created_by)
  values (p_product_id, 'venta', p_quantity, v_src_location, v_src_dist, v_sale_id, p_note, auth.uid());

  return v_sale_id;
end $$;

grant execute on function register_sale(uuid, int, payment_method, date, inventory_location, uuid, text, text, boolean, boolean, boolean, numeric, uuid) to authenticated;

-- ── Marcar venta como pagada (vendedor o admin) ────────────────
create or replace function set_sale_paid(p_sale_id uuid, p_paid boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    update sales set is_paid = p_paid where id = p_sale_id;
  else
    update sales set is_paid = p_paid
      where id = p_sale_id and seller_distributor_id = auth_distributor_id();
  end if;
end $$;
grant execute on function set_sale_paid(uuid, boolean) to authenticated;

-- ── Vistas actualizadas ────────────────────────────────────────
-- Detalle de ventas (incluye nuevos campos + nombre del vendedor)
drop view if exists sales_detail;
create view sales_detail with (security_invoker = true) as
select
  s.*,
  p.name as product_name,
  p.sku  as product_sku,
  d.name as distributor_name,
  sd.name as seller_name
from sales s
join products p on p.id = s.product_id
left join distributors d on d.id = s.source_distributor_id
left join distributors sd on sd.id = s.seller_distributor_id;
grant select on sales_detail to authenticated;

-- Resumen por distribuidor: agrupa por VENDEDOR (quien gana)
create or replace view distributor_summary with (security_invoker = true) as
select
  d.id as distributor_id, d.name,
  count(s.id) as num_sales,
  coalesce(sum(s.quantity), 0) as units,
  coalesce(sum(s.total_paid), 0) as revenue,
  coalesce(sum(s.distributor_amount), 0) as distributor_earnings
from distributors d
left join sales s on s.seller_distributor_id = d.id
group by d.id, d.name;
