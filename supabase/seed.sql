-- ════════════════════════════════════════════════════════════════
--  Fly & Chill — Datos iniciales (seed)
--  Productos, costos e inventario tomados del Excel original.
-- ════════════════════════════════════════════════════════════════

-- Configuración de precios global (fila única)
insert into pricing_settings (id) values (1) on conflict (id) do nothing;

-- Productos (costos en COP, tomados del Excel)
insert into products (name, sku, unit_cost, shipping_cost, operating_cost) values
  ('Cap nacional',         'CAP-NAC', 32000, 1000, 0),
  ('Cap rove',             'CAP-ROV', 36000, 2000, 0),
  ('Cap reitz',            'CAP-REI', 37000, 2000, 0),
  ('Desechable head bone', 'DES-HB',  70000, 2000, 0),
  ('Bat basic',            'BAT-BAS', 25000, 2000, 0),
  ('Bat vapo',             'BAT-VAP', 49000, 1000, 0)
on conflict (sku) do nothing;

-- Distribuidor inicial (uno por ahora; el modelo soporta varios)
insert into distributors (name)
select 'Distribuidor principal'
where not exists (select 1 from distributors);

-- Inventario de bodega (cantidades del Excel) — idempotente
insert into inventory (product_id, location, quantity)
select p.id, 'bodega', v.qty
from products p
join (values
  ('CAP-NAC', 51),
  ('CAP-ROV', 33),
  ('CAP-REI', 38),
  ('DES-HB',  20),
  ('BAT-BAS', 12),
  ('BAT-VAP', 41)
) as v(sku, qty) on v.sku = p.sku
where not exists (
  select 1 from inventory i
  where i.product_id = p.id and i.location = 'bodega'
);
