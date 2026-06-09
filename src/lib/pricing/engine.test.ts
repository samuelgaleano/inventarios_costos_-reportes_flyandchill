import { describe, expect, it } from "vitest";
import { computePricing, PricingConfigError, validatePricingSettings } from "./engine";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings, type ProductCosts } from "./types";

// "Cap nacional" del Excel: costo 32000, envío 1000.
const capNacional: ProductCosts = {
  unitCost: 32000,
  shippingCost: 1000,
  operatingCost: 0,
};

describe("validatePricingSettings", () => {
  it("acepta la configuración por defecto", () => {
    expect(validatePricingSettings(DEFAULT_PRICING_SETTINGS)).toBeNull();
  });

  it("rechaza márgenes que suman >= 100%", () => {
    const bad: PricingSettings = {
      ...DEFAULT_PRICING_SETTINGS,
      investorPct: 0.5,
      distributorPct: 0.4,
      companyPct: 0.1,
      gatewayPct: 0.05,
    };
    expect(validatePricingSettings(bad)).toMatch(/menor a 100%/);
  });

  it("rechaza descuento >= 100%", () => {
    expect(
      validatePricingSettings({ ...DEFAULT_PRICING_SETTINGS, discountPct: 1 }),
    ).toMatch(/descuento/i);
  });

  it("rechaza porcentajes negativos", () => {
    expect(
      validatePricingSettings({ ...DEFAULT_PRICING_SETTINGS, investorPct: -0.1 }),
    ).toMatch(/inversionista/);
  });
});

describe("computePricing", () => {
  it("lanza error si la configuración es inválida", () => {
    expect(() =>
      computePricing(capNacional, { ...DEFAULT_PRICING_SETTINGS, investorPct: 0.9 }),
    ).toThrow(PricingConfigError);
  });

  it("calcula el costo mínimo como suma de los tres costos", () => {
    const r = computePricing(
      { unitCost: 10000, shippingCost: 2000, operatingCost: 3000 },
      DEFAULT_PRICING_SETTINGS,
    );
    expect(r.minimumCost).toBe(15000);
  });

  it("el precio neto cubre costo + márgenes (método divisor)", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS);
    // marginSum = 0.30+0.25+0.07+0.04 = 0.66 → netPrice = 33000 / 0.34
    expect(r.marginSum).toBeCloseTo(0.66, 10);
    expect(r.netPrice).toBeCloseTo(33000 / 0.34, 4);
  });

  it("el reparto suma exactamente lo que paga el cliente", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS);
    const { cost, investor, distributor, gateway, company } = r.allocations;
    expect(cost + investor + distributor + gateway + company).toBe(r.pricePaid);
  });

  it("el precio de lista se redondea hacia arriba al paso configurado", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS);
    expect(r.listPrice % DEFAULT_PRICING_SETTINGS.rounding).toBe(0);
    expect(r.listPrice).toBeGreaterThanOrEqual(r.netPrice);
  });

  it("aplica el descuento sobre el precio de lista", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS);
    expect(r.pricePaid).toBe(Math.round(r.listPrice * (1 - 0.1)));
    expect(r.discountAmount).toBe(r.listPrice - r.pricePaid);
  });

  it("sin descuento, el cliente paga el precio de lista", () => {
    const r = computePricing(capNacional, {
      ...DEFAULT_PRICING_SETTINGS,
      discountPct: 0,
    });
    expect(r.pricePaid).toBe(r.listPrice);
    expect(r.discountAmount).toBe(0);
  });

  it("inversionista y distribuidor reciben su % del precio pagado", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS);
    expect(r.allocations.investor).toBe(Math.round(r.pricePaid * 0.3));
    expect(r.allocations.distributor).toBe(Math.round(r.pricePaid * 0.25));
  });

  it("con los % pedidos el markup queda cerca de 3.3x", () => {
    const r = computePricing(capNacional, DEFAULT_PRICING_SETTINGS);
    expect(r.markupMultiple).toBeGreaterThan(3);
    expect(r.markupMultiple).toBeLessThan(3.7);
  });

  it("maneja costo cero sin dividir por cero", () => {
    const r = computePricing(
      { unitCost: 0, shippingCost: 0, operatingCost: 0 },
      DEFAULT_PRICING_SETTINGS,
    );
    expect(r.listPrice).toBe(0);
    expect(r.markupMultiple).toBe(0);
  });
});
