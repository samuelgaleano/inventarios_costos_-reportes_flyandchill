import "server-only";
import { JWT } from "google-auth-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthLabel, PAYMENT_LABELS } from "@/lib/labels";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const API = "https://sheets.googleapis.com/v4/spreadsheets";

type Cell = string | number;
type Grid = Cell[][];

function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!email || !rawKey || !sheetId) {
    throw new Error(
      "Google Sheets no está configurado (faltan GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY o GOOGLE_SHEET_ID).",
    );
  }
  return { email, key: rawKey.replace(/\\n/g, "\n"), sheetId };
}

async function getToken(email: string, key: string): Promise<string> {
  const jwt = new JWT({ email, key, scopes: SCOPES });
  const { token } = await jwt.getAccessToken();
  if (!token) throw new Error("No se pudo autenticar con Google.");
  return token;
}

async function api(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res;
}

async function ensureTabs(token: string, sheetId: string, tabs: string[]) {
  const res = await api(token, `${API}/${sheetId}?fields=sheets.properties.title`);
  const meta = (await res.json()) as { sheets?: { properties: { title: string } }[] };
  const existing = new Set((meta.sheets ?? []).map((s) => s.properties.title));
  const requests = tabs
    .filter((t) => !existing.has(t))
    .map((title) => ({ addSheet: { properties: { title } } }));
  if (requests.length > 0) {
    await api(token, `${API}/${sheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }
}

async function writeTab(token: string, sheetId: string, tab: string, grid: Grid) {
  await api(
    token,
    `${API}/${sheetId}/values/${encodeURIComponent(tab)}!A1:ZZ100000:clear`,
    { method: "POST", body: "{}" },
  );
  await api(
    token,
    `${API}/${sheetId}/values/${encodeURIComponent(tab)}!A1?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: grid }) },
  );
}

export interface SyncResult {
  rows: number;
  tabs: string[];
}

/** Vuelca Precios, Inventario, Ventas e Informe a la hoja de Google. */
export async function syncToGoogleSheets(): Promise<SyncResult> {
  const { email, key, sheetId } = getCredentials();
  const token = await getToken(email, key);

  const admin = createAdminClient();
  const [{ data: pricing }, { data: inventory }, { data: sales }, { data: monthly }] =
    await Promise.all([
      admin.from("product_pricing").select("*").order("name"),
      admin.from("inventory_summary").select("*").order("name"),
      admin.from("sales_detail").select("*").order("sale_date", { ascending: false }).limit(5000),
      admin.from("monthly_summary").select("*"),
    ]);

  const preciosGrid: Grid = [
    ["Producto", "SKU", "Costo unit.", "Envío", "Operativo", "Costo mín.", "Comisión", "P. lista", "Con descuento", "Inversionista", "Empresa", "Pasarela"],
    ...(pricing ?? []).map((p) => [
      p.name, p.sku ?? "", p.unit_cost, p.shipping_cost, p.operating_cost,
      p.min_cost, p.commission, p.list_price, p.price_paid, p.investor, p.company, p.gateway,
    ]),
  ];

  const inventarioGrid: Grid = [
    ["Producto", "SKU", "Bodega", "Distribuidores", "Total"],
    ...(inventory ?? []).map((r) => [r.name, r.sku ?? "", r.bodega, r.distribuidor, r.total]),
  ];

  const ventasGrid: Grid = [
    ["Fecha", "Producto", "Cantidad", "Origen", "Método", "P. unitario", "Total", "Inversionista", "Distribuidor", "Empresa"],
    ...(sales ?? []).map((s) => [
      s.sale_date, s.product_name, s.quantity,
      s.source_location === "bodega" ? "Bodega" : `Distribuidor: ${s.distributor_name ?? ""}`,
      PAYMENT_LABELS[s.payment_method], s.unit_price_paid, s.total_paid,
      s.investor_amount, s.distributor_amount, s.company_amount,
    ]),
  ];

  const informeGrid: Grid = [
    ["Mes", "N.º ventas", "Unidades", "Ingresos", "Costo", "Inversionista", "Distribuidor", "Empresa", "Pasarela"],
    ...(monthly ?? []).map((m) => [
      monthLabel(m.month), m.num_sales, m.units, m.revenue, m.cost, m.investor, m.distributor, m.company, m.gateway,
    ]),
  ];

  const tabs = ["Precios", "Inventario", "Ventas", "Informe"];
  await ensureTabs(token, sheetId, tabs);
  await writeTab(token, sheetId, "Precios", preciosGrid);
  await writeTab(token, sheetId, "Inventario", inventarioGrid);
  await writeTab(token, sheetId, "Ventas", ventasGrid);
  await writeTab(token, sheetId, "Informe", informeGrid);

  const rows =
    preciosGrid.length + inventarioGrid.length + ventasGrid.length + informeGrid.length - 4;
  return { rows, tabs };
}
