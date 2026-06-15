import "server-only";
import { Resend } from "resend";
import { buildMonthlyReport, reportForDistributor } from "@/lib/reports/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminReportEmail, distributorReportEmail } from "./templates";

const FROM = process.env.REPORT_FROM_EMAIL || "Fly & Chill <onboarding@resend.dev>";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no está configurado.");
  return new Resend(key);
}

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);

/** Notifica al administrador cuando se registra una venta (mejor esfuerzo). */
export async function notifyAdminOfSale(saleId: string): Promise<void> {
  const adminTo = process.env.REPORT_ADMIN_EMAIL;
  if (!adminTo || !process.env.RESEND_API_KEY) return; // sin configurar → no-op

  const admin = createAdminClient();
  const { data: s } = await admin
    .from("sales_detail")
    .select("*")
    .eq("id", saleId)
    .single();
  if (!s) return;

  const rows: [string, string][] = [
    ["Producto", `${s.product_name} × ${s.quantity}`],
    ["Total", cop(s.total_paid)],
    ["Canal", s.channel ?? "—"],
    ["Vendedor", s.seller_name ?? "Empresa (directo)"],
    ["Comisión / margen", cop(s.distributor_amount)],
    ["Ganancia empresa", cop(s.company_amount)],
    ["Pago", s.is_paid ? "Confirmado" : "Pendiente"],
    ["Fecha", s.sale_date],
  ];
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a">
    <h2 style="margin:0 0 8px">Nueva venta registrada</h2>
    <table style="border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0;font-weight:600">${v}</td></tr>`,
        )
        .join("")}
    </table>
  </div>`;

  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to: adminTo,
    subject: `Nueva venta: ${s.product_name} ×${s.quantity} · ${cop(s.total_paid)}`,
    html,
  });
}

export interface SendResult {
  sent: number;
  errors: string[];
  periodLabel: string;
}

/**
 * Construye y envía los informes del mes: uno general al administrador y uno
 * individual a cada distribuidor activo con correo y ventas en el período.
 */
export async function sendMonthlyReports(ref = new Date()): Promise<SendResult> {
  const report = await buildMonthlyReport(ref);
  const resend = getResend();
  const errors: string[] = [];
  let sent = 0;

  const adminTo = process.env.REPORT_ADMIN_EMAIL;
  if (adminTo) {
    const { subject, html } = adminReportEmail(report);
    const { error } = await resend.emails.send({ from: FROM, to: adminTo, subject, html });
    if (error) errors.push(`Admin: ${error.message}`);
    else sent++;
  } else {
    errors.push("REPORT_ADMIN_EMAIL no configurado.");
  }

  const admin = createAdminClient();
  const { data: dists } = await admin
    .from("distributors")
    .select("*")
    .eq("active", true);

  for (const d of dists ?? []) {
    if (!d.contact_email) continue;
    const { sales, totals } = reportForDistributor(report, d.id);
    if (sales.length === 0) continue;
    const { subject, html } = distributorReportEmail(
      d.name,
      report.periodLabel,
      sales,
      totals,
    );
    const { error } = await resend.emails.send({
      from: FROM,
      to: d.contact_email,
      subject,
      html,
    });
    if (error) errors.push(`${d.name}: ${error.message}`);
    else sent++;
  }

  return { sent, errors, periodLabel: report.periodLabel };
}
