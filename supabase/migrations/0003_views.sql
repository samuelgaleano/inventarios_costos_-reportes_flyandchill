-- ════════════════════════════════════════════════════════════════
--  Fly & Chill — Vistas para informes y dashboards
--  0003_views.sql
--  security_invoker = true → respetan la RLS del usuario que consulta.
-- ════════════════════════════════════════════════════════════════

-- ── Precios calculados por producto (con la config global) ─────
create or replace view product_pricing
with (security_invoker = true) as
select
  p.id          as product_id,
  p.name,
  p.sku,
  p.active,
  p.unit_cost,
  p.shipping_cost,
  p.operating_cost,
  (coalesce(p.unit_cost,0) + coalesce(p.shipping_cost,0) + coalesce(p.operating_cost,0)) as min_cost,
  pr.list_price,
  pr.price_paid,
  pr.discount_amount,
  pr.cost,
  pr.investor,
  pr.distributor,
  pr.gateway,
  pr.company
from products p
cross join (select * from pricing_settings where id = 1) s
cross join lateral fc_compute_pricing(
  coalesce(p.unit_cost,0) + coalesce(p.shipping_cost,0) + coalesce(p.operating_cost,0),
  s.investor_pct, s.distributor_pct, s.company_pct, s.gateway_pct, s.discount_pct, s.rounding
) pr;

-- ── Resumen de inventario (general = bodega + distribuidor) ────
create or replace view inventory_summary
with (security_invoker = true) as
select
  p.id   as product_id,
  p.name,
  p.sku,
  p.active,
  coalesce(sum(i.quantity) filter (where i.location = 'bodega'), 0)       as bodega,
  coalesce(sum(i.quantity) filter (where i.location = 'distribuidor'), 0) as distribuidor,
  coalesce(sum(i.quantity), 0)                                            as total
from products p
left join inventory i on i.product_id = p.id
group by p.id, p.name, p.sku, p.active;

-- ── Detalle de ventas (con nombres) ────────────────────────────
create or replace view sales_detail
with (security_invoker = true) as
select
  s.*,
  p.name as product_name,
  p.sku  as product_sku,
  d.name as distributor_name
from sales s
join products p on p.id = s.product_id
left join distributors d on d.id = s.source_distributor_id;

-- ── Resumen mensual de ventas y ganancias ──────────────────────
create or replace view monthly_summary
with (security_invoker = true) as
select
  date_trunc('month', sale_date)::date as month,
  count(*)                              as num_sales,
  coalesce(sum(quantity), 0)            as units,
  coalesce(sum(total_paid), 0)          as revenue,
  coalesce(sum(unit_cost_snapshot * quantity), 0) as cost,
  coalesce(sum(investor_amount), 0)     as investor,
  coalesce(sum(distributor_amount), 0)  as distributor,
  coalesce(sum(company_amount), 0)      as company,
  coalesce(sum(gateway_amount), 0)      as gateway
from sales
group by 1
order by 1 desc;

-- ── Resumen por distribuidor ───────────────────────────────────
create or replace view distributor_summary
with (security_invoker = true) as
select
  d.id   as distributor_id,
  d.name,
  count(s.id)                            as num_sales,
  coalesce(sum(s.quantity), 0)           as units,
  coalesce(sum(s.total_paid), 0)         as revenue,
  coalesce(sum(s.distributor_amount), 0) as distributor_earnings
from distributors d
left join sales s on s.source_distributor_id = d.id
group by d.id, d.name;

-- ── Resumen por producto ───────────────────────────────────────
create or replace view product_sales_summary
with (security_invoker = true) as
select
  p.id   as product_id,
  p.name,
  coalesce(sum(s.quantity), 0)           as units,
  coalesce(sum(s.total_paid), 0)         as revenue,
  coalesce(sum(s.unit_cost_snapshot * s.quantity), 0) as cost,
  coalesce(sum(s.investor_amount), 0)    as investor,
  coalesce(sum(s.distributor_amount), 0) as distributor,
  coalesce(sum(s.company_amount), 0)     as company
from products p
left join sales s on s.product_id = p.id
group by p.id, p.name;
