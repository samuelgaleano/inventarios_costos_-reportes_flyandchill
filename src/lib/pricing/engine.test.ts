import { describe, expect, it } from "vitest";
import { computePricing, PricingConfigError, validatePricingSettings } from "./engine";
import {
  DEFAULT_PRICING_SETTINGS,
  type PricingSettings,
  type ProductCosts,
} from "./types";

const capNacional: ProductCosts = {
  unitCost: 32000,
  shippingCost: 1000,
  operatingCost: 0,
};
const capCommission = { sale: 6000, shipping: 4000 };

describe("validatePricingSettings", () => {
  it("acepta la configuración por defecto", () => {
    expect(validatePricingSettings(DEFAULT_PRICING_SETTINGS)).toBeNull();
  });

  it("rechaza inversionista+empresa+pasarela >= 100%", () => {
    const bad: PricingSettings = {
      ...DEFAULT_PRICING_SETTINGS,
      investorPct: 0.6,
      companyPct: 0.3,
      gatewayPct: 0.2,
    };
    expect(validatePricingSettings(bad)).toMatch(/menor a 100%/);
  });

  it("rechaza descuento >= 100%", () => {
    expect(
      validatePricingSettings({ ...DEFAULT_PRICING_SETTINGS, discountPct: 1 }),
    ).toMatch(/descuento/i);
  });
});

describe("computePricing (modelo base + comisión)", () => {
  it("lanza error si la configuración es inválida", () => {
    expect(() =>
      computePricing(capNacional, { ...DEFAULT_PRICING_SETTINGS, investorPct: 0.95 }),
    ).toThrow(PricingConfigError);
  });

  it("costo mínimo = suma de los tres costos", () => {
    const r = computePricing(
      { unitCost: 10000, shippingCost: 2000, operatingCost: 3000 },
      DEFAULT_PRICING_SETTINGS,
    );
    expect(r.minimumCost).toBe(15000);
  });

  it("la base cubre costo + márgenes (inv+empresa+pasarela)", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS, capCommission);
    // base = 33000 / (1 − 0.41)
    expect(r.basePrice).toBeCloseTo(33000 / 0.59, 4);
  });

  it("la comisión se suma al precio (venta + envío)", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS, capCommission);
    expect(r.commission).toBe(10000);
    expect(r.allocations.commission).toBe(10000);
  });

  it("el reparto suma exactamente lo que paga el cliente", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS, capCommission);
    const { cost, investor, company, gateway, commission } = r.allocations;
    expect(cost + investor + company + gateway + commission).toBe(r.pricePaid);
  });

  it("coincide exactamente con el cálculo SQL (paridad TS ↔ DB)", () => {
    // Cap nacional con la config por defecto + comisión 6.000/4.000.
    // Verificado contra fc_compute_pricing en Postgres.
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS, capCommission);
    expect(r.listPrice).toBe(73300);
    expect(r.pricePaid).toBe(65970);
    expect(r.allocations.cost).toBe(33000);
    expect(r.allocations.investor).toBe(16780);
    expect(r.allocations.gateway).toBe(2237);
    expect(r.allocations.commission).toBe(10000);
    expect(r.allocations.company).toBe(3953);
  });

  it("sin comisión, el precio es solo la base", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS);
    expect(r.commission).toBe(0);
    expect(r.allocations.commission).toBe(0);
  });

  it("el precio de lista se redondea hacia arriba al paso configurado", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS, capCommission);
    expect(r.listPrice % DEFAULT_PRICING_SETTINGS.rounding).toBe(0);
  });

  it("maneja costo cero sin dividir por cero", () => {
    const r = computePricing(
      { unitCost: 0, shippingCost: 0, operatingCost: 0 },
      DEFAULT_PRICING_SETTINGS,
      capCommission,
    );
    expect(r.listPrice).toBe(0);
    expect(r.markupMultiple).toBe(0);
  });
});
