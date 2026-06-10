-- ════════════════════════════════════════════════════════════════
--  PRUEBA LOCAL del flujo de negocio (compra, transferencia, venta,
--  snapshot de precios, autorización y RLS). Solo para Postgres local.
-- ════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

do $$
declare
  v_admin     uuid := '00000000-0000-0000-0000-000000000001';
  v_dist_user uuid := '00000000-0000-0000-0000-000000000002';
  v_dist uuid;
  v_prod uuid;
  v_bodega int; v_dist_qty int;
  v_sale uuid;
  s sales%rowtype;
begin
  select id into v_dist from distributors limit 1;
  select id into v_prod from products where sku = 'CAP-NAC';

  -- Crear usuarios (dispara handle_new_user → crea perfiles)
  insert into auth.users(id, email, raw_user_meta_data)
    values (v_admin, 'admin@test',
            jsonb_build_object('full_name','Admin','role','admin'))
    on conflict (id) do nothing;
  insert into auth.users(id, email, raw_user_meta_data)
    values (v_dist_user, 'dist@test',
            jsonb_build_object('full_name','Dist','role','distribuidor',
                               'distributor_id', v_dist::text))
    on conflict (id) do nothing;

  -- Actuar como administrador
  perform set_config('app.current_user_id', v_admin::text, false);
  assert is_admin(), 'el usuario admin debe ser administrador';

  -- Bodega inicial de Cap nacional = 51 (del seed)
  select quantity into v_bodega from inventory
    where product_id = v_prod and location = 'bodega';
  assert v_bodega = 51, format('bodega inicial esperada 51, fue %s', v_bodega);

  -- Compra: +10 a bodega
  perform register_purchase(v_prod, 10, 30000, current_date, 'compra test');
  select quantity into v_bodega from inventory
    where product_id = v_prod and location = 'bodega';
  assert v_bodega = 61, format('tras compra esperado 61, fue %s', v_bodega);

  -- Transferencia: 5 a distribuidor
  perform transfer_inventory(v_prod, v_dist, 5, 'transfer test');
  select quantity into v_bodega from inventory
    where product_id = v_prod and location = 'bodega';
  select quantity into v_dist_qty from inventory
    where product_id = v_prod and location = 'distribuidor' and distributor_id = v_dist;
  assert v_bodega = 56,  format('bodega tras transferencia esperado 56, fue %s', v_bodega);
  assert v_dist_qty = 5, format('distribuidor tras transferencia esperado 5, fue %s', v_dist_qty);

  -- Venta del admin desde bodega: 2 unidades
  v_sale := register_sale(v_prod, 2, 'efectivo', current_date, 'bodega', null, 'venta admin');
  select quantity into v_bodega from inventory
    where product_id = v_prod and location = 'bodega';
  assert v_bodega = 54, format('bodega tras venta esperado 54, fue %s', v_bodega);

  -- Verificar snapshot de precios de la venta (debe coincidir con el motor TS)
  select * into s from sales where id = v_sale;
  assert s.unit_list_price = 107900, format('list_price esperado 107900, fue %s', s.unit_list_price);
  assert s.unit_price_paid = 97110,  format('price_paid esperado 97110, fue %s', s.unit_price_paid);
  assert s.total_paid = 194220,      format('total esperado 194220, fue %s', s.total_paid);
  assert (s.investor_amount + s.distributor_amount + s.company_amount
          + s.gateway_amount + (s.unit_cost_snapshot * s.quantity)) = s.total_paid,
         'el reparto debe cuadrar exactamente con el total cobrado';

  -- Venta como distribuidor: 1 unidad (debe salir de SU inventario, no de bodega)
  perform set_config('app.current_user_id', v_dist_user::text, false);
  v_sale := register_sale(v_prod, 1, 'nequi', current_date, 'bodega', null, 'venta dist');
  perform set_config('app.current_user_id', v_admin::text, false);
  select quantity into v_dist_qty from inventory
    where product_id = v_prod and location = 'distribuidor' and distributor_id = v_dist;
  assert v_dist_qty = 4, format('distribuidor tras venta esperado 4, fue %s', v_dist_qty);
  select quantity into v_bodega from inventory
    where product_id = v_prod and location = 'bodega';
  assert v_bodega = 54, format('la venta del distribuidor NO debe tocar bodega (54), fue %s', v_bodega);

  -- Sobreventa: debe fallar
  begin
    perform register_sale(v_prod, 9999, 'efectivo', current_date, 'bodega', null, 'sobreventa');
    assert false, 'la sobreventa debió lanzar excepción';
  exception when others then
    null; -- fallo esperado
  end;

  raise notice '✔ TODAS LAS ASERCIONES DE NEGOCIO PASARON';
end $$;

-- ── Parità de precios en la vista product_pricing ──────────────
\echo '--- product_pricing (CAP-NAC) ---'
select name, list_price, price_paid, cost, investor, distributor, gateway, company
from product_pricing where sku = 'CAP-NAC';

-- ── RLS: el distribuidor solo ve lo suyo ───────────────────────
select set_config('app.current_user_id', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
\echo '--- RLS distribuidor: ventas visibles (esperado 1) ---'
select count(*) as sales_visibles from sales;
\echo '--- RLS distribuidor: filas de bodega visibles (esperado 0) ---'
select count(*) as bodega_visible from inventory where location = 'bodega';
reset role;

-- ── RLS: el admin ve todo ──────────────────────────────────────
select set_config('app.current_user_id', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
\echo '--- RLS admin: ventas visibles (esperado 2) ---'
select count(*) as sales_admin from sales;
reset role;
