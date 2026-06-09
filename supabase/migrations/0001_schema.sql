-- ════════════════════════════════════════════════════════════════
--  Fly & Chill — Esquema relacional
--  0001_schema.sql
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Enumeraciones ──────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'distribuidor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_location as enum ('bodega', 'distribuidor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type movement_type as enum ('compra', 'transferencia', 'venta', 'ajuste');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum
    ('efectivo', 'transferencia', 'tarjeta', 'nequi', 'daviplata', 'otro');
exception when duplicate_object then null; end $$;

-- ── Distribuidores ─────────────────────────────────────────────
create table if not exists distributors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_email text,
  contact_phone text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Inversionistas (solo informes, sin login) ──────────────────
create table if not exists investors (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  contact_email     text,
  capital_aportado  numeric(14,2) not null default 0,
  participacion_pct numeric(6,4)  not null default 0, -- fracción 0..1
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ── Productos ──────────────────────────────────────────────────
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  sku            text unique,
  unit_cost      numeric(14,2) not null default 0,  -- costo unitario
  shipping_cost  numeric(14,2) not null default 0,  -- costo de envío unitario
  operating_cost numeric(14,2) not null default 0,  -- costo operativo unitario
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Configuración de precios (fila única global) ───────────────
create table if not exists pricing_settings (
  id              int primary key default 1,
  investor_pct    numeric(6,4) not null default 0.30,
  distributor_pct numeric(6,4) not null default 0.25,
  company_pct     numeric(6,4) not null default 0.07,
  gateway_pct     numeric(6,4) not null default 0.04,
  discount_pct    numeric(6,4) not null default 0.10,
  rounding        int          not null default 100,
  updated_at      timestamptz  not null default now(),
  constraint pricing_settings_singleton check (id = 1)
);

-- ── Perfiles (1:1 con auth.users de Supabase) ──────────────────
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  role           user_role not null default 'distribuidor',
  distributor_id uuid references distributors(id) on delete set null,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ── Inventario (stock actual por producto y ubicación) ─────────
create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  location       inventory_location not null,
  distributor_id uuid references distributors(id) on delete cascade,
  quantity       integer not null default 0,
  updated_at     timestamptz not null default now(),
  constraint inventory_location_distributor_chk check (
    (location = 'bodega'      and distributor_id is null) or
    (location = 'distribuidor' and distributor_id is not null)
  ),
  constraint inventory_quantity_nonneg check (quantity >= 0)
);

-- Una sola fila de stock por (producto, ubicación, distribuidor)
create unique index if not exists inventory_unique_bodega
  on inventory (product_id) where location = 'bodega';
create unique index if not exists inventory_unique_distribuidor
  on inventory (product_id, distributor_id) where location = 'distribuidor';

-- ── Movimientos de inventario (libro mayor / auditoría) ────────
create table if not exists inventory_movements (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id),
  type                movement_type not null,
  quantity            integer not null,
  unit_cost           numeric(14,2),
  from_location       inventory_location,
  from_distributor_id uuid references distributors(id),
  to_location         inventory_location,
  to_distributor_id   uuid references distributors(id),
  related_sale_id     uuid,
  note                text,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

create index if not exists idx_movements_product on inventory_movements (product_id);
create index if not exists idx_movements_created on inventory_movements (created_at);

-- ── Ventas (con "foto" del precio para informes estables) ──────
create table if not exists sales (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references products(id),
  quantity             integer not null check (quantity > 0),
  payment_method       payment_method not null default 'efectivo',
  sale_date            date not null default current_date,
  source_location      inventory_location not null,
  source_distributor_id uuid references distributors(id),
  sold_by              uuid references auth.users(id),
  -- snapshot unitario
  unit_list_price      numeric(14,2) not null,
  unit_price_paid      numeric(14,2) not null,
  discount_pct         numeric(6,4)  not null default 0,
  unit_cost_snapshot   numeric(14,2) not null,
  -- montos totales (× cantidad)
  investor_amount      numeric(14,2) not null default 0,
  distributor_amount   numeric(14,2) not null default 0,
  company_amount       numeric(14,2) not null default 0,
  gateway_amount       numeric(14,2) not null default 0,
  total_paid           numeric(14,2) not null default 0,
  note                 text,
  created_at           timestamptz not null default now(),
  constraint sales_source_chk check (
    (source_location = 'bodega'       and source_distributor_id is null) or
    (source_location = 'distribuidor' and source_distributor_id is not null)
  )
);

create index if not exists idx_sales_date on sales (sale_date);
create index if not exists idx_sales_product on sales (product_id);
create index if not exists idx_sales_distributor on sales (source_distributor_id);

-- ── Trigger updated_at ─────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_inventory_updated on inventory;
create trigger trg_inventory_updated before update on inventory
  for each row execute function set_updated_at();
