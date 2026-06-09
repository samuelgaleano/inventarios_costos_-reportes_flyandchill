import type { ReportData, ReportTotals } from "@/lib/reports/data";
import type { SaleDetailRow } from "@/lib/supabase/types";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Fly & Chill";

function cop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:8px;background:#1b9e8f;color:#fff;font-weight:bold;text-align:center;line-height:32px">F</div>
      <strong style="font-size:18px">${APP_NAME}</strong>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px">
      <h1 style="margin:0 0 4px;font-size:20px">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
      Informe automático de ${APP_NAME}.
    </p>
  </div></body></html>`;
}

function kpiRow(label: string, value: string, strong = false): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#475569">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:${strong ? "bold" : "normal"};color:${strong ? "#1b9e8f" : "#0f172a"}">${value}</td>
  </tr>`;
}

function salesTable(sales: SaleDetailRow[], showDistributorEarning = false): string {
  if (sales.length === 0) {
    return `<p style="color:#94a3b8">Sin ventas en el período.</p>`;
  }
  const rows = sales
    .slice(0, 60)
    .map(
      (s) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${s.sale_date}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${s.product_name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${s.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${cop(s.total_paid)}</td>
        ${showDistributorEarning ? `<td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right;color:#16a34a">${cop(s.distributor_amount)}</td>` : ""}
      </tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
    <thead><tr style="background:#f8fafc;color:#64748b;text-align:left">
      <th style="padding:6px 8px">Fecha</th>
      <th style="padding:6px 8px">Producto</th>
      <th style="padding:6px 8px;text-align:right">Cant.</th>
      <th style="padding:6px 8px;text-align:right">Total</th>
      ${showDistributorEarning ? `<th style="padding:6px 8px;text-align:right">Ganancia</th>` : ""}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Correo del informe general (administrador). */
export function adminReportEmail(report: ReportData): { subject: string; html: string } {
  const t = report.totals;
  const kpis = `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
    ${kpiRow("Ventas", String(t.numSales))}
    ${kpiRow("Unidades vendidas", String(t.units))}
    ${kpiRow("Ingresos", cop(t.revenue))}
    ${kpiRow("Costo de productos", cop(t.cost))}
    ${kpiRow("Pago a inversionista", cop(t.investor))}
    ${kpiRow("Pago a distribuidores", cop(t.distributor))}
    ${kpiRow("Comisión pasarela", cop(t.gateway))}
    ${kpiRow("Ganancia de la empresa", cop(t.company), true)}
  </table>`;

  const byDist = report.byDistributor.length
    ? `<h3 style="margin:20px 0 4px;font-size:15px">Por distribuidor</h3>
       <table style="width:100%;border-collapse:collapse;font-size:13px">
         <thead><tr style="background:#f8fafc;color:#64748b;text-align:left">
           <th style="padding:6px 8px">Distribuidor</th>
           <th style="padding:6px 8px;text-align:right">Ingresos</th>
           <th style="padding:6px 8px;text-align:right">Su ganancia</th>
         </tr></thead>
         <tbody>${report.byDistributor
           .map(
             (d) => `<tr>
               <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${d.name}</td>
               <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${cop(d.revenue)}</td>
               <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right">${cop(d.earnings)}</td>
             </tr>`,
           )
           .join("")}</tbody>
       </table>`
    : "";

  const body = `<p style="color:#475569;margin:0 0 12px">Resumen de <strong>${report.periodLabel}</strong>.</p>
    ${kpis}${byDist}
    <h3 style="margin:20px 0 4px;font-size:15px">Detalle de ventas</h3>
    ${salesTable(report.sales)}`;

  return {
    subject: `Informe ${report.periodLabel} · ${APP_NAME}`,
    html: shell(`Informe de ${report.periodLabel}`, body),
  };
}

/** Correo del informe individual del distribuidor. */
export function distributorReportEmail(
  name: string,
  periodLabel: string,
  sales: SaleDetailRow[],
  totals: ReportTotals,
): { subject: string; html: string } {
  const body = `<p style="color:#475569;margin:0 0 12px">Hola ${name}, este es tu resumen de <strong>${periodLabel}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
      ${kpiRow("N.º de ventas", String(totals.numSales))}
      ${kpiRow("Unidades vendidas", String(totals.units))}
      ${kpiRow("Ingresos generados", cop(totals.revenue))}
      ${kpiRow("Tu ganancia", cop(totals.distributor), true)}
    </table>
    <h3 style="margin:20px 0 4px;font-size:15px">Tus ventas</h3>
    ${salesTable(sales, true)}`;

  return {
    subject: `Tu informe de ${periodLabel} · ${APP_NAME}`,
    html: shell(`Tu informe de ${periodLabel}`, body),
  };
}
