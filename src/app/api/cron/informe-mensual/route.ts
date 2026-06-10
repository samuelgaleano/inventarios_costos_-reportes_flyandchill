import { NextResponse } from "next/server";
import { sendMonthlyReports } from "@/lib/email/send";
import { syncToGoogleSheets } from "@/lib/sheets/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tarea programada (Vercel Cron). Se ejecuta a diario:
 *  - Sincroniza el respaldo en Google Sheets.
 *  - El día 1 de cada mes, envía los informes del mes anterior por correo.
 *
 * Vercel añade el header Authorization: Bearer ${CRON_SECRET} automáticamente.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results: Record<string, unknown> = { ranAt: new Date().toISOString() };

  try {
    results.sheets = await syncToGoogleSheets();
  } catch (e) {
    results.sheetsError = e instanceof Error ? e.message : String(e);
  }

  const now = new Date();
  if (now.getDate() === 1) {
    const ref = new Date(now);
    ref.setDate(0); // último día del mes anterior
    try {
      results.emails = await sendMonthlyReports(ref);
    } catch (e) {
      results.emailsError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
