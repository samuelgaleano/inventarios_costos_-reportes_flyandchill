# Fly & Chill — Sistema de precios, inventario, ventas e informes

Aplicación web para **reemplazar el Excel** de Fly & Chill: calcula precios,
controla el inventario (bodega + distribuidores) en tiempo real, registra
ventas, lleva la contabilidad y genera informes por correo, en Excel y en
Google Sheets. Funciona en **computador y celular**, y corre con **costo $0**
(salvo el dominio).

> **Stack:** Next.js 15 · TypeScript · Tailwind · Supabase (PostgreSQL + Auth +
> RLS) · Resend · Google Sheets · Vercel. Arquitectura detallada en
> [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Guía de despliegue en
> [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

---

## Funcionalidades

- **Precios configurables en vivo:** costo unitario + envío + operativo →
  precio final, con porcentajes editables (inversionista, distribuidor,
  empresa, pasarela, descuento) y reparto del dinero por venta.
- **Inventario interactivo:** inventario general = bodega + distribuidores.
  Registro de compras, **transferencia bodega → distribuidor** y descuento
  automático del stock al vender.
- **Ventas:** el administrador registra ventas eligiendo el origen; el
  distribuidor registra las suyas (descuentan de su inventario).
- **Contabilidad:** ventas mensuales, ganancia por producto y por
  distribuidor, reparto de inversionista/distribuidor/empresa.
- **Informes:** envío mensual automático por correo (admin + cada
  distribuidor), exportación a **Excel** y respaldo en **Google Sheets**.
- **Roles:** administrador (control total) y distribuidor (su panel, sus
  ventas, su inventario). Seguridad por filas en la base de datos.

---

## Requisitos

- Node.js 20+
- Una cuenta gratuita de [Supabase](https://supabase.com)
- (Opcional) [Resend](https://resend.com) para correos y una cuenta de
  servicio de Google para Google Sheets

---

## Puesta en marcha local

```bash
# 1) Instalar dependencias
npm install

# 2) Variables de entorno
cp .env.example .env.local   # y completa los valores (ver abajo)

# 3) Ejecutar
npm run dev                  # http://localhost:3000
```

### Configurar Supabase (base de datos + login)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. En **SQL Editor**, ejecuta **en orden** el contenido de:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions.sql`
   - `supabase/migrations/0003_views.sql`
   - `supabase/migrations/0004_rls.sql`
   - `supabase/seed.sql`  *(productos e inventario iniciales del Excel)*
3. En **Project Settings → API**, copia a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Crear el primer administrador

1. En Supabase, **Authentication → Users → Add user**: crea tu correo y
   contraseña (marca *Auto Confirm*).
2. En **SQL Editor**, conviértelo en administrador:

```sql
update profiles
set role = 'admin', full_name = 'Administrador'
where id = (select id from auth.users where email = 'TU-CORREO@ejemplo.com');
```

3. Inicia sesión en `http://localhost:3000/login`.
   Desde **Configuración** podrás crear distribuidores y sus accesos.

> Los distribuidores **no** se registran solos: el administrador crea sus
> accesos desde **Configuración → Accesos de distribuidor**.

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación |
| `npm run typecheck` | Verifica tipos |
| `npm test` | Pruebas (motor de precios) |
| `npm run lint` | Linter |

---

## Estructura

```
src/
├─ app/
│  ├─ admin/           # panel, precios, inventario, ventas, contabilidad, informes, configuración
│  ├─ distribuidor/    # panel, registrar venta, mi inventario, mis informes
│  ├─ login/           # autenticación
│  └─ api/             # /export (Excel) y /cron/informe-mensual
├─ components/         # UI y componentes compartidos
└─ lib/
   ├─ pricing/         # motor de precios (con pruebas)
   ├─ supabase/        # clientes y tipos
   ├─ actions/         # server actions (productos, inventario, ventas, admin)
   ├─ reports/         # datos del informe
   ├─ email/           # Resend + plantillas
   ├─ excel/           # exportación .xlsx
   └─ sheets/          # sincronización Google Sheets
supabase/
├─ migrations/         # esquema, funciones, vistas, RLS
└─ seed.sql            # datos iniciales
```

---

## Despliegue (Vercel + dominio, costo $0)

Resumen — guía completa en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md):

1. Sube el repositorio a GitHub.
2. Importa el repo en [Vercel](https://vercel.com) (framework Next.js).
3. Carga las variables de entorno (las mismas de `.env.local` + Resend/Google).
4. Vercel construye y despliega automáticamente. El **cron** del informe
   queda activo según `vercel.json`.
5. Conecta tu **dominio** propio en Vercel.

Todos los servicios usados tienen capa gratuita suficiente para el volumen
esperado. El único gasto es el dominio.
