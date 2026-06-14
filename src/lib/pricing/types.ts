/**
 * Tipos del motor de precios de Fly & Chill.
 *
 * Modelo: Precio final = Base + Comisión
 *   Base = costo mínimo / (1 − (inversionista% + empresa% + pasarela%))
 *   Comisión (por producto, en pesos) = comisión de venta + comisión de envío
 *
 * Porcentajes como fracción decimal (0.30 = 30%); montos en COP (pesos enteros).
 */

export interface ProductCosts {
  unitCost: number;
  shippingCost: number;
  operatingCost: number;
}

export interface PricingSettings {
  /** Ganancia del inversionista (fracción de la base). */
  investorPct: number;
  /** Margen interno de la empresa (fracción de la base). */
  companyPct: number;
  /** Comisión de la pasarela de pago (fracción de la base). */
  gatewayPct: number;
  /** Código de descuento aplicado al cliente (fracción del precio de lista). */
  discountPct: number;
  /** Paso de redondeo del precio de lista (p. ej. 100). 0 = sin redondeo. */
  rounding: number;
}

/** Comisión del colaborador por producto (en pesos). */
export interface ProductCommission {
  /** Por concretar la venta. */
  sale: number;
  /** Por gestionar el envío. */
  shipping: number;
}

export interface PricingAllocations {
  cost: number;
  investor: number;
  company: number;
  gateway: number;
  /** Comisión total del colaborador (venta + envío). */
  commission: number;
}

export interface PricingBreakdown {
  minimumCost: number;
  /** Precio base (cubre costo + inversionista + empresa + pasarela). */
  basePrice: number;
  /** Comisión total incluida en el precio. */
  commission: number;
  /** Precio de lista (público) redondeado. */
  listPrice: number;
  /** Lo que paga el cliente tras el descuento. */
  pricePaid: number;
  discountAmount: number;
  allocations: PricingAllocations;
  markupMultiple: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  investorPct: 0.3,
  companyPct: 0.07,
  gatewayPct: 0.04,
  discountPct: 0.1,
  rounding: 100,
};

export const NO_COMMISSION: ProductCommission = { sale: 0, shipping: 0 };
