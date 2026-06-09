"use server";

import { requireAdmin } from "@/lib/auth";
import { sendMonthlyReports } from "@/lib/email/send";
import { syncToGoogleSheets } from "@/lib/sheets/sync";
import type { ActionState } from "@/lib/actions/types";

export async function sendReportNow(): Promise<ActionState> {
  await requireAdmin();
  try {
    const r = await sendMonthlyReports(new Date());
    if (r.sent === 0 && r.errors.length > 0) {
      return { error: r.errors.join(" · ") };
    }
    const note = r.errors.length ? ` (avisos: ${r.errors.join("; ")})` : "";
    return {
      ok: true,
      message: `Se enviaron ${r.sent} correo(s) del informe de ${r.periodLabel}.${note}`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al enviar." };
  }
}

export async function syncSheetsNow(): Promise<ActionState> {
  await requireAdmin();
  try {
    const r = await syncToGoogleSheets();
    return {
      ok: true,
      message: `Google Sheets actualizado: ${r.rows} filas en ${r.tabs.length} pestañas.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al sincronizar." };
  }
}
