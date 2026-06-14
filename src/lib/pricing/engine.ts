import type {
  PricingBreakdown,
  PricingSettings,
  ProductCommission,
  ProductCosts,
} from "./types";

/** Error de configuración de precios (márgenes imposibles). */
export class PricingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingConfigError";
  }
}

function roundUpTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.ceil(value / step) * step;
}

/**
 * Valida la configuración de precios. Devuelve un mensaje de error si es
 * inválida, o `null` si es correcta.
 */
export function validatePricingSettings(s: PricingSettings): string | null {
  const fractions: Array<[string, number]> = [
    ["inversionista", s.investorPct],
    ["empresa", s.companyPct],
    ["pasarela", s.gatewayPct],
    ["descuento", s.discountPct],
  ];
  for (const [name, v] of fractions) {
    if (!Number.isFinite(v) || v < 0) {
      return `El porcentaje de ${name} debe ser un número mayor o igual a 0.`;
    }
  }
  const base = s.investorPct + s.companyPct + s.gatewayPct;
  if (base >= 1) {
    return `La suma de inversionista + empresa + pasarela (${(base * 100).toFixed(1)}%) debe ser menor a 100%.`;
  }
  if (s.discountPct >= 1) {
    return "El descuento debe ser menor a 100%.";
  }
  return null;
}

/**
 * Calcula el precio de venta y el reparto del dinero.
 *
 *   Cm        = costo unitario + envío + operativo
 *   base      = Cm / (1 − (inv% + empresa% + pasarela%))
 *   comisión  = comisión de venta + comisión de envío (pesos, por producto)
 *   listPrice = redondeo( (base + comisión) / (1 − descuento%) )
 *   pricePaid = listPrice × (1 − descuento%)
 *
 * La empresa recibe el residual (absorbe el ajuste por redondeo).
 *
 * @throws {PricingConfigError} si la configuración es inválida.
 */
export function computePricing(
  costs: ProductCosts,
  settings: PricingSettings,
  commission: ProductCommission = { sale: 0, shipping: 0 },
): PricingBreakdown {
  const invalid = validatePricingSettings(settings);
  if (invalid) throw new PricingConfigError(invalid);

  const minimumCost =
    (costs.unitCost || 0) + (costs.shippingCost || 0) + (costs.operatingCost || 0);
  const commissionTotal = (commission.sale || 0) + (commission.shipping || 0);

  const s = settings.investorPct + settings.companyPct + settings.gatewayPct;

  if (minimumCost <= 0) {
    return {
      minimumCost: 0,
      basePrice: 0,
      commission: 0,
      listPrice: 0,
      pricePaid: 0,
      discountAmount: 0,
      allocations: { cost: 0, investor: 0, company: 0, gateway: 0, commission: 0 },
      markupMultiple: 0,
    };
  }

  const basePrice = minimumCost / (1 - s);
  const neto = basePrice + commissionTotal;
  const rawList = neto / (1 - settings.discountPct);
  const listPrice = roundUpTo(rawList, settings.rounding);
  const pricePaid = Math.round(listPrice * (1 - settings.discountPct));
  const discountAmount = listPrice - pricePaid;

  const cost = Math.round(minimumCost);
  const investor = Math.round(settings.investorPct * basePrice);
  const gateway = Math.round(settings.gatewayPct * basePrice);
  const commissionAmt = Math.round(commissionTotal);
  const company = pricePaid - cost - investor - gateway - commissionAmt;

  return {
    minimumCost,
    basePrice,
    commission: commissionAmt,
    listPrice,
    pricePaid,
    discountAmount,
    allocations: { cost, investor, company, gateway, commission: commissionAmt },
    markupMultiple: listPrice / minimumCost,
  };
}
