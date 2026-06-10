import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SaleForm } from "@/components/sale-form";
import { SalesTable } from "@/components/sales-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ventas" };

export default async function VentasPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: distributors }, { data: sales }] =
    await Promise.all([
      supabase.from("products").select("*").eq("active", true).order("name"),
      supabase.from("distributors").select("*").eq("active", true).order("name"),
      supabase
        .from("sales_detail")
        .select("*")
        .order("sale_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const origins = [
    { value: "bodega", label: "Bodega" },
    ...(distributors ?? []).map((d) => ({
      value: `dist:${d.id}`,
      label: `Distribuidor: ${d.name}`,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Registra una venta indicando el origen del producto."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Registrar venta</CardTitle>
          </CardHeader>
          <CardContent>
            <SaleForm
              products={(products ?? []).map((p) => ({ id: p.id, name: p.name }))}
              origins={origins}
            />
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
