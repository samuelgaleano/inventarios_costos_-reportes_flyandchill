# Arquitectura de Software — Fly & Chill

Sistema web de **cálculo de precios, inventario interactivo, registro de ventas, contabilidad e informes** para reemplazar el Excel actual.

> Objetivo: una sola plataforma web (computador y celular), con **costo $0** de operación (salvo el dominio), bien estructurada, con buenas prácticas, que **optimice el trabajo del administrador** y reduzca el tiempo de gestión.

---

## 1. Visión general

```
                          ┌──────────────────────────────┐
                          │        Usuarios (web)         │
                          │  Admin  ·  Distribuidores     │
                          │  (PC y celular, responsive)   │
                          └───────────────┬──────────────┘
                                          │ HTTPS
                          ┌───────────────▼──────────────┐
                          │   Next.js 15 (App Router)     │  ← desplegado en Vercel (gratis)
                          │   UI + Server Actions + API   │
                          └───────┬───────────────┬───────┘
                                  │               │
                ┌─────────────────▼──┐      ┌─────▼───────────────┐
                │   Supabase (gratis) │      │  Servicios externos │
                │  · PostgreSQL       │      │  · Resend (correos) │
                │  · Auth (login)     │      │  · Google Sheets    │
                │  · Row Level Secur. │      │    (respaldo/export)│
                └─────────────────────┘      └─────────────────────┘
```

- **Frontend + Backend**: un solo proyecto **Next.js** (TypeScript). Sirve la web y expone la lógica de servidor (Server Actions y rutas API). Se despliega nativo en **Vercel**.
- **Base de datos + Autenticación**: **Supabase** (PostgreSQL administrado + login + seguridad por filas). Relacional, ideal para enlazar ventas ↔ inventario de forma sincrónica.
- **Correos / Informes**: **Resend** para enviar el informe mensual por correo.
- **Respaldo externo**: **Google Sheets** (y exportación a **Excel `.xlsx`**) para que la información **no dependa solo del servidor** y quede en un documento que la empresa controla.
- **Control de versiones**: **GitHub** (este repositorio); Vercel se conecta a GitHub y despliega automáticamente en cada cambio.

---

## 2. Qué hace el Excel hoy (punto de partida)

| Hoja | Contenido | Se reemplaza por |
|------|-----------|------------------|
| **Cálculo precio de venta** | Costo unidad, % inversionista (28%), pago proveedor (23%), utilidad retenida (5%), precio cliente final | Módulo **Precios** (motor configurable por %) |
| **Inventario bodega** | Cantidad por producto + costos (VLOOKUP) | Módulo **Inventario** (bodega + distribuidores) |
| **Venta y dist** | Producto, valor, cantidad, fecha, destino | Módulo **Ventas** |
| **Informe** | Distribuidos, ventas por proveedor, ingresos, pago a proveedores, utilidad | Módulo **Contabilidad e Informes** |

Productos detectados (se cargan como datos iniciales): *Cap nacional, Cap rove, Cap reitz, Desechable head bone, Bat basic, Bat vapo*. Moneda: **COP (peso colombiano)**. Distribuidores detectados: *Proveedor B, Proveedor M* → en la app se llaman **distribuidores**.

**Problemas del Excel que la app resuelve:** fórmulas frágiles (VLOOKUP/IFS gigantes), sin login ni roles, sin acceso desde celular, sin actualización en tiempo real del inventario al vender, sin informes automáticos por correo, y riesgo de romper el archivo al editarlo.

---

## 3. Stack tecnológico (todo en capa gratuita)

| Capa | Tecnología | Por qué | Costo |
|------|-----------|---------|-------|
| Framework web | **Next.js 15 + React 19 + TypeScript** | Full-stack en un repo, óptimo en Vercel, escalable | $0 |
| UI | **Tailwind CSS + shadcn/ui** | Responsive (PC/celular), limpio y rápido de construir | $0 |
| Gráficas | **Recharts** | Dashboards de ventas/ganancias | $0 |
| Base de datos | **Supabase Postgres** | Relacional, 500 MB gratis (suficiente: pocos datos) | $0 |
| Autenticación | **Supabase Auth** | Login admin/distribuidor con email+contraseña | $0 |
| Seguridad | **Row Level Security (RLS)** | Cada distribuidor solo ve lo suyo | $0 |
| Correos | **Resend** | 3.000 correos/mes, 100/día gratis | $0 |
| Respaldo | **Google Sheets API + export `.xlsx`** | Datos también fuera del servidor | $0 |
| Tareas programadas | **Vercel Cron** | Disparar el informe mensual | $0 |
| Hosting | **Vercel (Hobby)** | Dominio propio conectable gratis | $0 |
| Repositorio/CI | **GitHub** | Versionado + deploy automático | $0 |

**Único gasto: el dominio** (~USD 10–15/año), que tú compras y se conecta a Vercel.

> **Nota sobre "baja base de datos / costo cero":** el volumen es bajo (decenas de productos, ventas e inventario), muy por debajo de los límites gratuitos. Supabase pausa proyectos tras 7 días **sin actividad**; al ser de uso diario real esto no aplica, y es restaurable.

---

## 4. Modelo de datos (PostgreSQL)

Relacional y normalizado. Enlaza **ventas ↔ inventario** para sincronía en tiempo real.

```
profiles            distributors          investors
─────────           ────────────          ─────────
id (=auth uid)      id                    id
full_name           name  (Proveedor B…)  name
role(admin|distr)   contact_email         contact_email
distributor_id ───► id                    capital_aportado
active              phone, active         participacion_pct, active

products                      pricing_settings (1 fila global)
────────                      ────────────────
id                            investor_pct      (def 30%)
name, sku                     distributor_pct   (def 25%)
unit_cost      (costo u.)     company_pct       (def 7%)
shipping_cost  (envío u.)     gateway_pct       (def 4%)
operating_cost (operativo u.) discount_pct      (def 10%)
active                        rounding, updated_at, updated_by

inventory                         inventory_movements (libro mayor / auditoría)
─────────                         ───────────────────
id                                id
product_id ───► products          product_id
location (bodega|distribuidor)    type (compra|transferencia|venta|ajuste)
distributor_id ──► distributors   qty, unit_cost
quantity                          from_location, to_location
UNIQUE(product_id,location,distr) from_distributor_id, to_distributor_id
                                  related_sale_id, date, created_by, note

sales (cada venta guarda una "foto" del precio para informes históricos estables)
─────
id · product_id · qty · payment_method · sale_date · sold_by
source_location (bodega|distribuidor) · source_distributor_id
unit_price (precio cobrado) · discount_applied
── snapshot ──
unit_cost_snapshot · investor_amount · distributor_amount
company_amount · gateway_amount
```

**Decisiones clave de diseño:**
- **Libro mayor de movimientos** (`inventory_movements`): toda compra, transferencia, venta o ajuste queda registrada → trazabilidad total y posibilidad de reconstruir el stock.
- **Snapshot de precio en la venta**: cada venta guarda cuánto fue a inversionista/distribuidor/empresa/pasarela **en el momento de la venta**, para que cambiar precios después **no altere informes pasados**.
- **Transacciones atómicas**: registrar venta = (insertar venta + descontar inventario del origen + registrar movimiento) en una sola transacción → nunca queda inconsistente.
- **Inventario general = bodega + Σ distribuidores** (cálculo, no se duplica el dato).

---

## 5. Motor de precios (configurable y transparente)

Reemplaza la hoja *Cálculo precio de venta*. Cada producto tiene 3 costos; los márgenes son **porcentajes editables** desde un panel.

```
Costo mínimo (Cm) = costo_unitario + costo_envío + costo_operativo
```

Porcentajes (editables, valores por defecto que pediste):

| Concepto | % def. | A quién va |
|----------|-------:|------------|
| Ganancia inversionista | 30% | inversionista (por unidad vendida) |
| Ganancia distribuidor | 25% | distribuidor (por unidad que vende) |
| Margen empresa | 7% | ganancia interna Fly & Chill |
| Pasarela de pago | 4% | costo por transacción en línea |
| Código de descuento | 10% | descuento al cliente (modificable) |

**Fórmula (método "divisor", cada % es fracción del precio neto):**

```
Precio neto  P  = Cm / (1 − (inv% + dist% + emp% + gw%))
Precio lista     = P / (1 − descuento%)        ← absorbe el cupón
Cliente paga     = Precio lista × (1 − descuento%) = P

Reparto por unidad:
  Inversionista = inv%  × P
  Distribuidor  = dist% × P
  Empresa       = emp%  × P
  Pasarela      = gw%   × P
  Costo         = Cm
  ─────────────────────────
  Suma          = P  ✔ (cada parte recibe exactamente su % del precio)
```

> **Importante (a validar contigo):** con los porcentajes que pediste, los márgenes suman 66% del precio + 4% de pasarela, por lo que el **precio de lista resulta ≈ 3.3× el costo** (más alto que el Excel actual, ≈1.7×). El motor **muestra en vivo** el precio final y el desglose en pesos; podrás **ajustar los % hasta llegar al precio objetivo**. Si tu intención era otra (p. ej. el 30% del inversionista como retorno sobre el capital y no sobre el precio), lo configuramos: el motor es flexible y queda 100% transparente.

La tabla de precios es **editable** (costos y %), con opción de **override por producto** y **redondeo configurable**.

---

## 6. Módulos funcionales (mapeo de tus requisitos)

### 6.1 Panel de Administrador (login)
- **Precios y costos**: tabla general editable (costos, %, precio final, reparto). Agregar/editar/desactivar productos.
- **Inventario**:
  - Vista **general** (existencias por producto) + desglose por **ubicación**: **Bodega** y **cada Distribuidor**.
  - **Registrar compra** → entra a bodega (producto, cantidad, fecha, costo).
  - **Transferencia de inventario** (botón): Bodega → Distribuidor. Resta de bodega, suma al distribuidor; el **general no cambia** (es interno).
- **Registrar venta** indicando **origen** (bodega o un distribuidor) y método de pago.
- **Contabilidad y administración**: ventas del mes, cantidades, ganancia por producto, totales; informe general de inversionista, distribuidor y gasto neto de la empresa.
- **Informes**: ganancia desglosada por distribuidor según ventas; disparo/recepción del informe por correo.

### 6.2 Panel de Distribuidor (login autónomo)
- **Registrar venta**: producto, cantidad, fecha, método de pago → descuenta **su** inventario en tiempo real y alimenta el informe.
- **Mi inventario**: existencias que debería tener (para su control).
- **Mis informes**: sus ventas y su ganancia desglosada, todo claro.

### 6.3 Inventario interactivo (regla central)
```
Compra (admin)           → + Bodega
Transferencia (admin)    → − Bodega   + Distribuidor   (general igual)
Venta desde bodega       → − Bodega
Venta desde distribuidor → − Distribuidor
```
Cada venta descuenta del origen correcto **en la misma transacción**; el stock se actualiza al instante.

### 6.4 Contabilidad e informes
- Agregados por mes/producto/distribuidor con **vistas SQL** + dashboards (Recharts).
- Totales: ingreso, costo, pago a distribuidores, ganancia inversionista, **utilidad neta empresa**.
- **Informe mensual automático por correo** (Resend + Vercel Cron) al admin (y opcionalmente a cada distribuidor el suyo).
- **Respaldo en Google Sheets** (espejo de los datos) + **exportación a Excel `.xlsx`** bajo demanda → la información vive también fuera del servidor, en un documento de la empresa.

---

## 7. Roles y seguridad

- **Autenticación**: Supabase Auth (email + contraseña). Middleware de Next.js protege `/admin/**` y `/distribuidor/**` según el rol.
- **Row Level Security (RLS)** en la base de datos:
  - Distribuidor: ve y registra **solo lo de su `distributor_id`** (su inventario y sus ventas).
  - Admin: acceso total.
  - Precios/configuración: solo admin escribe; distribuidor lee lo necesario.
- La `service_role_key` (clave maestra) **solo se usa en el servidor**, nunca en el navegador.

---

## 8. Despliegue y costo cero

```
GitHub (push a rama) ──auto──► Vercel build & deploy ──► https://tudominio.com
                                     │
                                     ├─ Variables de entorno (Supabase, Resend, Google)
                                     └─ Vercel Cron → /api/cron/informe-mensual
```

| Servicio | Límite gratis | Uso estimado | ¿Suficiente? |
|----------|---------------|--------------|--------------|
| Vercel Hobby | 100 GB-h, dominio propio | muy bajo | ✅ |
| Supabase | 500 MB DB, 50k usuarios/mes | < 5 MB, pocos usuarios | ✅ |
| Resend | 3.000 correos/mes | ~ decenas | ✅ |
| Google Sheets API | cuota amplia gratis | sync ocasional | ✅ |

**Único costo: dominio** (lo compras tú; se conecta a Vercel sin costo adicional).

---

## 9. Estructura del repositorio

```
/ (raíz)
├─ app/                    # Rutas Next.js (App Router)
│  ├─ (auth)/login
│  ├─ admin/              # precios, inventario, ventas, contabilidad, informes
│  ├─ distribuidor/       # registrar venta, mi inventario, mis informes
│  └─ api/                # endpoints + api/cron/informe-mensual
├─ components/            # UI (shadcn/ui)
├─ lib/
│  ├─ pricing/            # motor de precios (TypeScript puro + tests)
│  ├─ supabase/           # cliente server/browser
│  ├─ reports/            # generación de informes
│  ├─ sheets/             # sync Google Sheets / export xlsx
│  └─ email/              # plantillas Resend
├─ supabase/migrations/   # esquema SQL + seed (productos del Excel)
├─ docs/                  # esta arquitectura + guía de despliegue
└─ tests/                 # pruebas (motor de precios, inventario)
```

---

## 10. Trazabilidad de requisitos → componente

| Requisito que pediste | Dónde se implementa | Estado |
|-----------------------|---------------------|:------:|
| App web, PC y celular | Next.js + Tailwind responsive | ✅ planeado |
| Costo cero (salvo dominio) | Supabase + Vercel + Resend gratis | ✅ |
| Baja base de datos | Postgres con pocos datos | ✅ |
| Cálculo precio de venta (costos + %) | `lib/pricing` + tabla editable | ✅ |
| % inversionista 30% | `pricing_settings.investor_pct` | ✅ |
| % distribuidor 25% | `pricing_settings.distributor_pct` | ✅ |
| Margen empresa 7% | `pricing_settings.company_pct` | ✅ |
| Pasarela 4% | `pricing_settings.gateway_pct` | ✅ |
| Descuento 10% modificable | `pricing_settings.discount_pct` | ✅ |
| Login admin | Supabase Auth + `/admin` | ✅ |
| Login distribuidor | Supabase Auth + `/distribuidor` | ✅ |
| Inventario general + ubicaciones (bodega/distribuidor) | `inventory` + vistas | ✅ |
| Registrar compra a bodega | flujo compra + `inventory_movements` | ✅ |
| Botón transferencia bodega→distribuidor | flujo transferencia (transacción) | ✅ |
| Registrar venta (admin con origen) | módulo ventas | ✅ |
| Registrar venta (distribuidor) | panel distribuidor | ✅ |
| Inventario interactivo en tiempo real | transacción venta→stock | ✅ |
| Base de datos relacional sincrónica | FKs ventas↔inventario | ✅ |
| Contabilidad mensual / por producto | vistas SQL + dashboards | ✅ |
| Informe inversionista/distribuidor/empresa | módulo informes | ✅ |
| Agregar productos / tabla modificable | CRUD admin | ✅ |
| Informe general por correo | Resend + Vercel Cron | ✅ |
| Respaldo en Google Sheets / Excel | `lib/sheets` + export `.xlsx` | ✅ |
| Despliegue en Vercel + GitHub + dominio | CI/CD Vercel | ✅ |

---

## 11. Plan de implementación por fases

| Fase | Entregable |
|------|-----------|
| **0. Base** | Scaffold Next.js + Tailwind + Supabase, esquema SQL + datos del Excel, login y roles |
| **1. Precios** | Motor de precios (con tests) + tabla editable + CRUD productos |
| **2. Inventario** | Bodega + distribuidores, compras, transferencias, libro de movimientos |
| **3. Ventas** | Registro admin/distribuidor con descuento de stock atómico |
| **4. Contabilidad** | Vistas y dashboards (mes, producto, distribuidor, inversionista) |
| **5. Informes** | Correo mensual (Resend+Cron) + respaldo Google Sheets + export Excel |
| **6. Despliegue** | Vercel + dominio + endurecimiento + guía de uso |

---

## 12. Qué necesito de ti (para la puesta en producción)

Construyo todo el código primero; para **conectar y desplegar** necesitaré (te daré guía paso a paso):

1. **Supabase**: crear proyecto → `Project URL`, `anon key`, `service_role key`.
2. **Resend**: cuenta → `API key` + correo/dominio verificado para enviar informes.
3. **Google**: cuenta de servicio (`JSON`) + ID de la hoja de respaldo.
4. **Vercel**: conectar el repo de GitHub (puedo ayudar con el deploy).
5. **Dominio**: el que compres, para apuntarlo a Vercel.
6. **Decisiones** abiertas (ver preguntas en el chat): fórmula de precio, # de distribuidores, acceso del inversionista, frecuencia/destinatario del informe.

> Mientras tanto, todo el desarrollo y las pruebas corren en **localhost** y en esta rama de GitHub; tú revisas, apruebas, y luego se hace el `pull request` y el despliegue.
