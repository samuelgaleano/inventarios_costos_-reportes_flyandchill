-- ════════════════════════════════════════════════════════════════
--  Fly & Chill — Seguridad por filas (RLS) y permisos
--  0004_rls.sql
-- ════════════════════════════════════════════════════════════════

-- ── Habilitar RLS ──────────────────────────────────────────────
alter table profiles            enable row level security;
alter table distributors        enable row level security;
alter table investors           enable row level security;
alter table products            enable row level security;
alter table pricing_settings    enable row level security;
alter table inventory           enable row level security;
alter table inventory_movements enable row level security;
alter table sales               enable row level security;

-- ── profiles ───────────────────────────────────────────────────
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_admin());
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (is_admin()) with check (is_admin());

-- ── distributors ───────────────────────────────────────────────
drop policy if exists distributors_select on distributors;
create policy distributors_select on distributors for select to authenticated
  using (is_admin() or id = auth_distributor_id());
drop policy if exists distributors_insert on distributors;
create policy distributors_insert on distributors for insert to authenticated
  with check (is_admin());
drop policy if exists distributors_update on distributors;
create policy distributors_update on distributors for update to authenticated
  using (is_admin()) with check (is_admin());
drop policy if exists distributors_delete on distributors;
create policy distributors_delete on distributors for delete to authenticated
  using (is_admin());

-- ── investors (solo admin) ─────────────────────────────────────
drop policy if exists investors_all on investors;
create policy investors_all on investors for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── products ───────────────────────────────────────────────────
drop policy if exists products_select on products;
create policy products_select on products for select to authenticated
  using (true);
drop policy if exists products_insert on products;
create policy products_insert on products for insert to authenticated
  with check (is_admin());
drop policy if exists products_update on products;
create policy products_update on products for update to authenticated
  using (is_admin()) with check (is_admin());
drop policy if exists products_delete on products;
create policy products_delete on products for delete to authenticated
  using (is_admin());

-- ── pricing_settings ───────────────────────────────────────────
drop policy if exists pricing_select on pricing_settings;
create policy pricing_select on pricing_settings for select to authenticated
  using (true);
drop policy if exists pricing_update on pricing_settings;
create policy pricing_update on pricing_settings for update to authenticated
  using (is_admin()) with check (is_admin());

-- ── inventory (lectura: admin todo; distribuidor solo el suyo) ──
drop policy if exists inventory_select on inventory;
create policy inventory_select on inventory for select to authenticated
  using (
    is_admin() or
    (location = 'distribuidor' and distributor_id = auth_distributor_id())
  );
-- (sin políticas de escritura: el stock solo se modifica vía funciones
--  SECURITY DEFINER register_purchase / transfer_inventory / register_sale)

-- ── inventory_movements ────────────────────────────────────────
drop policy if exists movements_select on inventory_movements;
create policy movements_select on inventory_movements for select to authenticated
  using (
    is_admin() or
    from_distributor_id = auth_distributor_id() or
    to_distributor_id = auth_distributor_id()
  );

-- ── sales (lectura: admin todo; distribuidor solo el suyo) ──────
drop policy if exists sales_select on sales;
create policy sales_select on sales for select to authenticated
  using (is_admin() or source_distributor_id = auth_distributor_id());
-- (sin INSERT directo: las ventas se crean vía register_sale)

-- ════════════════════════════════════════════════════════════════
--  Permisos (grants)
-- ════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated;

-- Lectura de tablas (la RLS filtra las filas)
grant select on
  profiles, distributors, investors, products, pricing_settings,
  inventory, inventory_movements, sales
  to authenticated;

-- Escritura directa solo en tablas administrables (RLS exige admin)
grant insert, update, delete on
  products, distributors, investors to authenticated;
grant update on pricing_settings, profiles to authenticated;

-- Lectura de vistas
grant select on
  product_pricing, inventory_summary, sales_detail,
  monthly_summary, distributor_summary, product_sales_summary
  to authenticated;

-- ── Funciones: blindar las internas, exponer las de negocio ────
revoke all on function fc_adjust_stock(uuid, inventory_location, uuid, int) from public;
revoke all on function handle_new_user() from public;
revoke all on function set_updated_at() from public;

grant execute on function fc_compute_pricing(numeric, numeric, numeric, numeric, numeric, numeric, int) to authenticated;
grant execute on function auth_role() to authenticated;
grant execute on function auth_distributor_id() to authenticated;
grant execute on function is_admin() to authenticated;
grant execute on function register_purchase(uuid, int, numeric, date, text) to authenticated;
grant execute on function transfer_inventory(uuid, uuid, int, text) to authenticated;
grant execute on function register_sale(uuid, int, payment_method, date, inventory_location, uuid, text) to authenticated;
