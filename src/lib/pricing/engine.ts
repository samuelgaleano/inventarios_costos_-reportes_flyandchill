import type {
  PricingBreakdown,
  PricingSettings,
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
 * inválida, o `null` si es correcta. Útil para la UI antes de calcular.
 */
export function validatePricingSettings(s: PricingSettings): string | null {
  const fractions: Array<[string, number]> = [
    ["inversionista", s.investorPct],
    ["distribuidor", s.distributorPct],
    ["empresa", s.companyPct],
    ["pasarela", s.gatewayPct],
    ["descuento", s.discountPct],
  ];
  for (const [name, v] of fractions) {
    if (!Number.isFinite(v) || v < 0) {
      return `El porcentaje de ${name} debe ser un número mayor o igual a 0.`;
    }
  }
  const marginSum = s.investorPct + s.distributorPct + s.companyPct + s.gatewayPct;
  if (marginSum >= 1) {
    return `La suma de márgenes (inversionista + distribuidor + empresa + pasarela = ${(marginSum * 100).toFixed(1)}%) debe ser menor a 100%.`;
  }
  if (s.discountPct >= 1) {
    return "El descuento debe ser menor a 100%.";
  }
  return null;
}

/**
 * Calcula el precio de venta y el reparto del dinero a partir de los costos
 * y la configuración de porcentajes.
 *
 * Método "divisor": cada margen (inversionista, distribuidor, empresa,
 * pasarela) es una fracción del precio neto P que paga el cliente tras el
 * descuento. El precio de lista se infla para absorber el código de descuento.
 *
 *   Cm        = costo unitario + envío + operativo
 *   P (neto)  = Cm / (1 − (inv% + dist% + empresa% + pasarela%))
 *   listPrice = redondeo( P / (1 − descuento%) )
 *   pricePaid = listPrice × (1 − descuento%)
 *
 * El reparto se calcula sobre `pricePaid`; la empresa recibe el residual
 * (lo que garantiza que la suma cuadre exactamente con lo cobrado y absorbe
 * el ajuste por redondeo).
 *
 * @throws {PricingConfigError} si la configuración es inválida.
 */
export function computePricing(
  costs: ProductCosts,
  settings: PricingSettings,
): PricingBreakdown {
  const invalid = validatePricingSettings(settings);
  if (invalid) throw new PricingConfigError(invalid);

  const minimumCost =
    (costs.unitCost || 0) + (costs.shippingCost || 0) + (costs.operatingCost || 0);

  const marginSum =
    settings.investorPct +
    settings.distributorPct +
    settings.companyPct +
    settings.gatewayPct;

  const netPrice = minimumCost / (1 - marginSum);
  const rawList = netPrice / (1 - settings.discountPct);
  const listPrice = roundUpTo(rawList, settings.rounding);
  const pricePaid = Math.round(listPrice * (1 - settings.discountPct));
  const discountAmount = listPrice - pricePaid;

  // Reparto sobre lo efectivamente cobrado. La empresa es el residual.
  const investor = Math.round(pricePaid * settings.investorPct);
  const distributor = Math.round(pricePaid * settings.distributorPct);
  const gateway = Math.round(pricePaid * settings.gatewayPct);
  const cost = Math.round(minimumCost);
  const company = pricePaid - investor - distributor - gateway - cost;

  const safePaid = pricePaid || 1;

  return {
    minimumCost,
    marginSum,
    netPrice,
    listPrice,
    pricePaid,
    discountAmount,
    allocations: { cost, investor, distributor, gateway, company },
    effective: {
      investorPct: investor / safePaid,
      distributorPct: distributor / safePaid,
      companyPct: company / safePaid,
      gatewayPct: gateway / safePaid,
      costPct: cost / safePaid,
    },
    markupMultiple: minimumCost > 0 ? listPrice / minimumCost : 0,
  };
}
