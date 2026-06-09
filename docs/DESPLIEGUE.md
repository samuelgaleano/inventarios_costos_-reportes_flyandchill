# Guía de despliegue — Fly & Chill (costo $0)

Pasos para poner la aplicación en producción en **Vercel**, con base de datos
en **Supabase**, correos con **Resend** y respaldo en **Google Sheets**. Todo
en capa gratuita; el único gasto es el dominio.

---

## 1. Base de datos y autenticación (Supabase)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un **proyecto**
   nuevo (elige la región más cercana; plan Free).
2. Abre **SQL Editor** y ejecuta, **uno por uno y en orden**, el contenido de
   estos archivos del repositorio:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_views.sql`
   4. `supabase/migrations/0004_rls.sql`
   5. `supabase/seed.sql`
3. Ve a **Project Settings → API** y guarda:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` *(secreta, solo servidor)*

### Crear el administrador

- **Authentication → Users → Add user** → correo + contraseña (*Auto Confirm*).
- En **SQL Editor**:

```sql
update profiles set role = 'admin', full_name = 'Administrador'
where id = (select id from auth.users where email = 'TU-CORREO@ejemplo.com');
```

> Alternativa: al crear el usuario, en *User Metadata* agrega
> `{ "role": "admin", "full_name": "Administrador" }` y el perfil se crea ya
> como administrador.

---

## 2. Repositorio en GitHub

```bash
git add .
git commit -m "Fly & Chill"
git push origin main
```

---

## 3. Despliegue en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. **Add New → Project** e importa el repositorio. Vercel detecta Next.js.
3. En **Environment Variables**, agrega (Production y Preview):

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | clave service_role |
| `RESEND_API_KEY` | (correos) clave de Resend |
| `REPORT_FROM_EMAIL` | remitente verificado, ej. `informes@tudominio.com` |
| `REPORT_ADMIN_EMAIL` | correo que recibe el informe general |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | (Sheets) correo de la cuenta de servicio |
| `GOOGLE_PRIVATE_KEY` | (Sheets) clave privada (con `\n`) |
| `GOOGLE_SHEET_ID` | (Sheets) ID de la hoja |
| `CRON_SECRET` | cadena larga aleatoria |
| `NEXT_PUBLIC_CURRENCY` | `COP` |
| `NEXT_PUBLIC_LOCALE` | `es-CO` |

4. **Deploy**. Cada push a GitHub vuelve a desplegar automáticamente.
5. El **cron** (`vercel.json`) ya queda programado: corre a diario, sincroniza
   Google Sheets y, el día 1 de cada mes, envía los informes.

> Tras un cambio de migraciones en Supabase, no hace falta redeploy en Vercel:
> la base de datos es independiente.

---

## 4. Correos (Resend) — opcional pero recomendado

1. Crea cuenta en [resend.com](https://resend.com).
2. **API Keys → Create** → copia a `RESEND_API_KEY`.
3. Verifica un dominio (o usa el remitente de pruebas `onboarding@resend.dev`
   mientras tanto) y pon el remitente en `REPORT_FROM_EMAIL`.
4. Define `REPORT_ADMIN_EMAIL` (quién recibe el informe general). Cada
   distribuidor recibe el suyo si tiene correo cargado en **Configuración**.

Capa gratuita: 3.000 correos/mes, 100/día — de sobra.

---

## 5. Respaldo en Google Sheets — opcional

1. En [Google Cloud Console](https://console.cloud.google.com): crea un
   proyecto y habilita **Google Sheets API**.
2. **Credenciales → Crear cuenta de servicio**. Genera una **clave JSON**.
3. Del JSON copia `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` y
   `private_key` → `GOOGLE_PRIVATE_KEY` (respeta los `\n`).
4. Crea una hoja en Google Sheets, copia su **ID** (de la URL) →
   `GOOGLE_SHEET_ID`, y **compártela como Editor** con el
   `client_email` de la cuenta de servicio.
5. Desde **Informes → Sincronizar ahora** se vuelca todo a la hoja (pestañas
   Precios, Inventario, Ventas, Informe). El cron también la actualiza a diario.

---

## 6. Dominio propio

1. Compra un dominio (Namecheap, Google Domains, etc.).
2. En Vercel: **Project → Settings → Domains → Add** e ingresa tu dominio.
3. Configura los registros DNS que indica Vercel (CNAME/A). El HTTPS es
   automático y gratuito.

---

## 7. Verificación final

- [ ] Inicio de sesión del administrador funciona.
- [ ] Productos y precios se ven y se pueden editar.
- [ ] Registrar compra suma a bodega; transferir mueve a un distribuidor.
- [ ] Registrar venta descuenta del inventario correcto.
- [ ] El distribuidor entra a su panel y registra ventas.
- [ ] Descarga de Excel funciona (`/api/export`).
- [ ] (Si configuraste Resend) “Enviar informe ahora” envía correos.
- [ ] (Si configuraste Google) “Sincronizar ahora” actualiza la hoja.

---

## Notas de costo $0

| Servicio | Capa gratuita | Suficiente |
|----------|---------------|:----------:|
| Vercel Hobby | hosting + dominio propio + 1 cron diario | ✅ |
| Supabase Free | 500 MB Postgres + Auth | ✅ |
| Resend Free | 3.000 correos/mes | ✅ |
| Google Sheets API | cuota amplia | ✅ |

El único gasto recurrente es el **dominio** (~USD 10–15/año).
