-- ════════════════════════════════════════════════════════════════
--  SHIM SOLO PARA PRUEBAS LOCALES (Postgres sin Supabase)
--  NO se ejecuta en Supabase (que ya provee el esquema auth).
--  Recrea lo mínimo: schema auth, auth.users, auth.uid() y los
--  roles anon/authenticated.
-- ════════════════════════════════════════════════════════════════

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- auth.uid() lee el usuario "actual" desde una variable de sesión
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role; exception when duplicate_object then null; end $$;
grant anon, authenticated, service_role to current_user;
