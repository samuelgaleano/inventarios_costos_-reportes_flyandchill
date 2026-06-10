/**
 * Tipos del motor de precios de Fly & Chill.
 *
 * Todos los porcentajes se expresan como fracción decimal (0.30 = 30%).
 * Todos los montos están en la moneda base (COP) y se redondean a pesos enteros.
 */

export interface ProductCosts {
  /** Costo unitario del producto (lo que le cuesta a la empresa). */
  unitCost: number;
  /** Costo de envío por unidad. */
  shippingCost: number;
  /** Costos operativos por unidad. */
  operatingCost: number;
}

export interface PricingSettings {
  /** Ganancia del inversionista (fracción del precio neto). */
  investorPct: number;
  /** Ganancia del distribuidor (fracción del precio neto). */
  distributorPct: number;
  /** Margen interno de la empresa (fracción del precio neto). */
  companyPct: number;
  /** Comisión de la pasarela de pago (fracción del precio neto). */
  gatewayPct: number;
  /** Código de descuento aplicado al cliente (fracción del precio de lista). */
  discountPct: number;
  /** Paso de redondeo del precio de lista (p. ej. 100). 0 = sin redondeo. */
  rounding: number;
}

export interface PricingAllocations {
  /** Costo mínimo recuperado en la venta. */
  cost: number;
  /** Monto que recibe el inversionista. */
  investor: number;
  /** Monto que recibe el distribuidor. */
  distributor: number;
  /** Comisión retenida por la pasarela de pago. */
  gateway: number;
  /** Ganancia interna de la empresa (residual; absorbe el redondeo). */
  company: number;
}

export interface PricingBreakdown {
  /** Costo mínimo = unitario + envío + operativo. */
  minimumCost: number;
  /** Suma de márgenes que salen del precio neto (inv + dist + empresa + pasarela). */
  marginSum: number;
  /** Precio neto teórico (post-descuento) sin redondear. */
  netPrice: number;
  /** Precio de lista (público) ya redondeado. */
  listPrice: number;
  /** Lo que paga el cliente tras aplicar el código de descuento. */
  pricePaid: number;
  /** Descuento en pesos (listPrice - pricePaid). */
  discountAmount: number;
  /** Reparto del dinero de la venta. */
  allocations: PricingAllocations;
  /** Porcentajes efectivos sobre pricePaid (para transparencia). */
  effective: {
    investorPct: number;
    distributorPct: number;
    companyPct: number;
    gatewayPct: number;
    costPct: number;
  };
  /** Cuántas veces el precio de lista supera el costo mínimo. */
  markupMultiple: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  investorPct: 0.3,
  distributorPct: 0.25,
  companyPct: 0.07,
  gatewayPct: 0.04,
  discountPct: 0.1,
  rounding: 100,
};
