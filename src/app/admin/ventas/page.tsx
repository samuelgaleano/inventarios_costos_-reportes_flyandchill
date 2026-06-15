import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SaleForm, type OriginOption } from "@/components/sale-form";
import { SalesTable } from "@/components/sales-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ventas" };

export default async function VentasPage() {
  const supabase = await createClient();
  const [{ data: pricing }, { data: distributors }, { data: sales }] =
    await Promise.all([
      supabase.from("product_pricing").select("*").eq("active", true).order("name"),
      supabase.from("distributors").select("*").eq("active", true).order("name"),
      supabase
        .from("sales_detail")
        .select("*")
        .order("sale_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const products = (pricing ?? []).map((p) => ({
    id: p.product_id,
    name: p.name,
    listPrice: p.price_paid,
  }));

  const origins: OriginOption[] = [
    { value: "bodega", label: "Bodega" },
    ...(distributors ?? []).map((d) => ({
      value: `dist:${d.id}`,
      label: `${d.name} (${d.type === "colaborador" ? "colaborador" : "básico"})`,
      type: d.type,
    })),
  ];

  const collaborators = (distributors ?? [])
    .filter((d) => d.type === "colaborador")
    .map((d) => ({ id: d.id, name: d.name }));

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Registra una venta: origen, canal, comisión y estado de pago."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Registrar venta</CardTitle>
          </CardHeader>
          <CardContent>
            <SaleForm products={products} origins={origins} collaborators={collaborators} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas recientes</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <SalesTable sales={sales ?? []} variant="admin" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
