-- ════════════════════════════════════════════════════════════════
--  Fly & Chill — Modelo de precio con comisión + tipos de distribuidor
--  0005_pricing_model.sql
-- ════════════════════════════════════════════════════════════════

-- ── Tipo de distribuidor ───────────────────────────────────────
do $$ begin
  create type distributor_type as enum ('colaborador', 'basico');
exception when duplicate_object then null; end $$;

alter table distributors
  add column if not exists type distributor_type not null default 'basico';

-- El distribuidor existente "principal" pasa a ser colaborador
update distributors
set type = 'colaborador'
where lower(name) like '%principal%' or lower(name) like '%colaborad%';

-- ── Comisión por producto (en pesos) ───────────────────────────
alter table products
  add column if not exists commission_sale numeric(14,2) not null default 0;     -- concretar venta
alter table products
  add column if not exists commission_shipping numeric(14,2) not null default 0;  -- gestionar envío

-- ── Motor de precios: precio = base + comisión ─────────────────
-- base = costo / (1 − (inversionista% + empresa% + pasarela%))
-- precio final = (base + comisión) ajustado por descuento y redondeo
-- (se elimina primero la vista que depende de la función)
drop view if exists product_pricing;
drop function if exists fc_compute_pricing(numeric, numeric, numeric, numeric, numeric, numeric, int);

create or replace function fc_compute_pricing(
  p_min_cost numeric, p_inv numeric, p_comp numeric, p_gw numeric, p_disc numeric,
  p_commission numeric, p_rounding int,
  out list_price numeric, out price_paid numeric, out discount_amount numeric,
  out cost numeric, out investor numeric, out company numeric,
  out gateway numeric, out commission numeric
) language plpgsql immutable as $$
declare
  s numeric := p_inv + p_comp + p_gw;
  net_base numeric;
  neto numeric;
  raw_list numeric;
begin
  if s >= 1 then
    raise exception 'La suma de inversionista + empresa + pasarela debe ser menor a 100%%; actual: % por ciento', round(s*100,1);
  end if;
  if p_disc >= 1 then
    raise exception 'El descuento debe ser menor a 100%%';
  end if;
  if coalesce(p_min_cost,0) <= 0 then
    list_price:=0; price_paid:=0; discount_amount:=0; cost:=0;
    investor:=0; company:=0; gateway:=0; commission:=0; return;
  end if;

  net_base := p_min_cost / (1 - s);
  neto := net_base + coalesce(p_commission,0);
  raw_list := neto / (1 - p_disc);
  if p_rounding > 0 then list_price := ceil(raw_list / p_rounding) * p_rounding;
  else list_price := round(raw_list); end if;

  price_paid := round(list_price * (1 - p_disc));
  discount_amount := list_price - price_paid;
  cost := round(p_min_cost);
  investor := round(p_inv * net_base);
  gateway := round(p_gw * net_base);
  commission := round(coalesce(p_commission,0));
  company := price_paid - cost - investor - gateway - commission;
end $$;

grant execute on function fc_compute_pricing(numeric, numeric, numeric, numeric, numeric, numeric, int) to authenticated;

-- ── Vista de precios actualizada ───────────────────────────────
create view product_pricing
with (security_invoker = true) as
select
  p.id as product_id, p.name, p.sku, p.active,
  p.unit_cost, p.shipping_cost, p.operating_cost,
  p.commission_sale, p.commission_shipping,
  (coalesce(p.unit_cost,0) + coalesce(p.shipping_cost,0) + coalesce(p.operating_cost,0)) as min_cost,
  pr.list_price, pr.price_paid, pr.discount_amount, pr.cost,
  pr.investor, pr.company, pr.gateway, pr.commission
from products p
cross join (select * from pricing_settings where id = 1) s
cross join lateral fc_compute_pricing(
  coalesce(p.unit_cost,0) + coalesce(p.shipping_cost,0) + coalesce(p.operating_cost,0),
  s.investor_pct, s.company_pct, s.gateway_pct, s.discount_pct,
  coalesce(p.commission_sale,0) + coalesce(p.commission_shipping,0),
  s.rounding
) pr;

grant select on product_pricing to authenticated;

-- ── register_sale actualizado al nuevo modelo ──────────────────
-- (commission se guarda en distributor_amount: es la "comisión" del colaborador)
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
  v_commission numeric;
  pr record;
  v_sale_id uuid;
  v_src_location inventory_location := p_source_location;
  v_src_dist uuid := p_source_distributor_id;
begin
  if v_role is null then raise exception 'No autorizado'; end if;
  if p_quantity <= 0 then raise exception 'La cantidad debe ser positiva'; end if;

  if v_role = 'distribuidor' then
    v_src_location := 'distribuidor';
    v_src_dist := v_my_dist;
    if v_src_dist is null then raise exception 'El distribuidor no tiene inventario asignado'; end if;
  end if;

  select * into v_product from products where id = p_product_id and active;
  if not found then raise exception 'Producto no existe o está inactivo'; end if;
  select * into v_set from pricing_settings where id = 1;

  v_min_cost := coalesce(v_product.unit_cost,0) + coalesce(v_product.shipping_cost,0) + coalesce(v_product.operating_cost,0);
  v_commission := coalesce(v_product.commission_sale,0) + coalesce(v_product.commission_shipping,0);

  select * into pr from fc_compute_pricing(
    v_min_cost, v_set.investor_pct, v_set.company_pct, v_set.gateway_pct,
    v_set.discount_pct, v_commission, v_set.rounding
  );

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
    pr.investor * p_quantity, pr.commission * p_quantity, pr.company * p_quantity,
    pr.gateway * p_quantity, pr.price_paid * p_quantity, p_note
  ) returning id into v_sale_id;

  insert into inventory_movements (
    product_id, type, quantity, from_location, from_distributor_id, related_sale_id, note, created_by
  ) values (
    p_product_id, 'venta', p_quantity, v_src_location, v_src_dist, v_sale_id, p_note, auth.uid()
  );

  return v_sale_id;
end $$;

-- Seed de comisión de ejemplo para la cápsula (Cap nacional): venta 6.000, envío 4.000
update products set commission_sale = 6000, commission_shipping = 4000
where sku = 'CAP-NAC' and commission_sale = 0 and commission_shipping = 0;
