import type { PaymentMethod } from "./supabase/types";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  nequi: "Nequi",
  daviplata: "Daviplata",
  otro: "Otro",
};

/** Canales de venta. */
export const CHANNELS = [
  "WhatsApp",
  "Instagram",
  "Página web",
  "Pickup",
  "Presencial",
  "Otro",
] as const;

/** Nombre del mes en español a partir de una fecha ISO (yyyy-mm-dd). */
export function monthLabel(iso: string): string {
  const date = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(date);
}
