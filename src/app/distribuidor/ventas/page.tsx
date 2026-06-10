import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SaleForm } from "@/components/sale-form";
import { SalesTable } from "@/components/sales-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Registrar venta" };

export default async function DistribuidorVentasPage() {
  const supabase = await createClient();
  const [{ data: inv }, { data: products }, { data: sales }] = await Promise.all([
    supabase.from("inventory").select("*").eq("location", "distribuidor"),
    supabase.from("products").select("*").eq("active", true),
    supabase
      .from("sales_detail")
      .select("*")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const nameMap = new Map((products ?? []).map((p) => [p.id, p.name]));
  const options = (inv ?? [])
    .filter((r) => r.quantity > 0)
    .map((r) => ({
      id: r.product_id,
      name: `${nameMap.get(r.product_id) ?? "Producto"} (${r.quantity} disp.)`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Registrar venta"
        description="La venta descuenta de tu inventario automáticamente."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Nueva venta</CardTitle>
          </CardHeader>
          <CardContent>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no tienes inventario asignado. Pídele al administrador que te
                transfiera productos.
              </p>
            ) : (
              <SaleForm products={options} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mis ventas recientes</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <SalesTable sales={sales ?? []} variant="distribuidor" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
