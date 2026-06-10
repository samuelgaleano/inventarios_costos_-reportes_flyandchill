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
