import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import type { PricingSettingsRow } from "@/lib/supabase/types";
import { PreciosClient } from "./precios-client";

export const metadata: Metadata = { title: "Productos y precios" };

const FALLBACK_SETTINGS: PricingSettingsRow = {
  id: 1,
  investor_pct: 0.3,
  distributor_pct: 0.25,
  company_pct: 0.07,
  gateway_pct: 0.04,
  discount_pct: 0.1,
  rounding: 100,
  updated_at: new Date().toISOString(),
};

export default async function PreciosPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: settings }] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase.from("pricing_settings").select("*").eq("id", 1).single(),
  ]);

  return (
    <>
      <PageHeader
        title="Productos y precios"
        description="Calcula el precio de venta y el reparto por inversionista, distribuidor y empresa."
      />
      <PreciosClient
        products={products ?? []}
        settings={settings ?? FALLBACK_SETTINGS}
      />
    </>
  );
}
