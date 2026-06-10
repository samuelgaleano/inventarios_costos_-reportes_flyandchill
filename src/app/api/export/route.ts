import { getAuth } from "@/lib/auth";
import { buildWorkbookBuffer } from "@/lib/excel/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Descarga del libro de Excel con todo el sistema. Solo administrador. */
export async function GET() {
  const auth = await getAuth();
  if (!auth || auth.profile.role !== "admin") {
    return new Response("No autorizado", { status: 403 });
  }

  const buffer = await buildWorkbookBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fly-and-chill-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
