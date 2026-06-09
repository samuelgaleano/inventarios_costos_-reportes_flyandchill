const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "COP";
const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "es-CO";

/** Formatea un valor numérico como moneda (COP por defecto, sin decimales). */
export function formatCurrency(value: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Formatea un número con separadores de miles. */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Formatea una fracción (0..1) como porcentaje. */
export function formatPercent(fraction: number, decimals = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(fraction) ? fraction : 0);
}

/** Formatea una fecha ISO/Date a formato legible (dd MMM yyyy). */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
