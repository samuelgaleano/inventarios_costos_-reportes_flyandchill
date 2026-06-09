import "server-only";
import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthLabel, PAYMENT_LABELS } from "@/lib/labels";

const CURRENCY_FMT = '"$"#,##0';

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B9E8F" },
    };
    cell.alignment = { vertical: "middle" };
  });
}

/**
 * Genera un libro de Excel (.xlsx) con todo el sistema: precios, inventario,
 * ventas e informe mensual. Sirve como respaldo externo de los datos.
 */
export async function buildWorkbookBuffer(): Promise<Buffer> {
  const admin = createAdminClient();
  const [{ data: pricing }, { data: inventory }, { data: sales }, { data: monthly }] =
    await Promise.all([
      admin.from("product_pricing").select("*").order("name"),
      admin.from("inventory_summary").select("*").order("name"),
      admin
        .from("sales_detail")
        .select("*")
        .order("sale_date", { ascending: false })
        .limit(5000),
      admin.from("monthly_summary").select("*"),
    ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Fly & Chill";
  wb.created = new Date();

  // ── Precios ──────────────────────────────────────────────────
  const wsP = wb.addWorksheet("Precios");
  wsP.columns = [
    { header: "Producto", key: "name", width: 24 },
    { header: "SKU", key: "sku", width: 12 },
    { header: "Costo unit.", key: "unit_cost", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Envío", key: "shipping_cost", width: 11, style: { numFmt: CURRENCY_FMT } },
    { header: "Operativo", key: "operating_cost", width: 12, style: { numFmt: CURRENCY_FMT } },
    { header: "Costo mín.", key: "min_cost", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "P. lista", key: "list_price", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Con descuento", key: "price_paid", width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: "Inversionista", key: "investor", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Distribuidor", key: "distributor", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Empresa", key: "company", width: 12, style: { numFmt: CURRENCY_FMT } },
    { header: "Pasarela", key: "gateway", width: 11, style: { numFmt: CURRENCY_FMT } },
  ];
  (pricing ?? []).forEach((p) => wsP.addRow(p));
  styleHeader(wsP.getRow(1));

  // ── Inventario ───────────────────────────────────────────────
  const wsI = wb.addWorksheet("Inventario");
  wsI.columns = [
    { header: "Producto", key: "name", width: 24 },
    { header: "SKU", key: "sku", width: 12 },
    { header: "Bodega", key: "bodega", width: 12 },
    { header: "Distribuidores", key: "distribuidor", width: 14 },
    { header: "Total", key: "total", width: 12 },
  ];
  (inventory ?? []).forEach((r) => wsI.addRow(r));
  styleHeader(wsI.getRow(1));

  // ── Ventas ───────────────────────────────────────────────────
  const wsV = wb.addWorksheet("Ventas");
  wsV.columns = [
    { header: "Fecha", key: "sale_date", width: 13 },
    { header: "Producto", key: "product_name", width: 24 },
    { header: "Cantidad", key: "quantity", width: 10 },
    { header: "Origen", key: "origen", width: 22 },
    { header: "Método pago", key: "pago", width: 14 },
    { header: "P. unitario", key: "unit_price_paid", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Total", key: "total_paid", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Inversionista", key: "investor_amount", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Distribuidor", key: "distributor_amount", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Empresa", key: "company_amount", width: 12, style: { numFmt: CURRENCY_FMT } },
  ];
  (sales ?? []).forEach((s) =>
    wsV.addRow({
      ...s,
      origen:
        s.source_location === "bodega"
          ? "Bodega"
          : `Distribuidor: ${s.distributor_name ?? ""}`,
      pago: PAYMENT_LABELS[s.payment_method],
    }),
  );
  styleHeader(wsV.getRow(1));

  // ── Informe mensual ──────────────────────────────────────────
  const wsM = wb.addWorksheet("Informe mensual");
  wsM.columns = [
    { header: "Mes", key: "mes", width: 20 },
    { header: "N.º ventas", key: "num_sales", width: 11 },
    { header: "Unidades", key: "units", width: 11 },
    { header: "Ingresos", key: "revenue", width: 14, style: { numFmt: CURRENCY_FMT } },
    { header: "Costo", key: "cost", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Inversionista", key: "investor", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Distribuidor", key: "distributor", width: 13, style: { numFmt: CURRENCY_FMT } },
    { header: "Empresa", key: "company", width: 12, style: { numFmt: CURRENCY_FMT } },
    { header: "Pasarela", key: "gateway", width: 11, style: { numFmt: CURRENCY_FMT } },
  ];
  (monthly ?? []).forEach((m) =>
    wsM.addRow({ ...m, mes: monthLabel(m.month) }),
  );
  styleHeader(wsM.getRow(1));

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
