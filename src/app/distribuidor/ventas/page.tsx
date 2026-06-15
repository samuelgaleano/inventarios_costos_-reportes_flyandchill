import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireDistributor } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SaleForm } from "@/components/sale-form";
import { SalesTable } from "@/components/sales-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Registrar venta" };

export default async function DistribuidorVentasPage() {
  const { profile } = await requireDistributor();
  const supabase = await createClient();

  const [{ data: inv }, { data: pricing }, { data: dist }, { data: sales }] =
    await Promise.all([
      supabase.from("inventory").select("*").eq("location", "distribuidor"),
      supabase.from("product_pricing").select("*").eq("active", true),
      profile.distributor_id
        ? supabase.from("distributors").select("type").eq("id", profile.distributor_id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from("sales_detail")
        .select("*")
        .order("sale_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const priceMap = new Map((pricing ?? []).map((p) => [p.product_id, p]));
  const products = (inv ?? [])
    .filter((r) => r.quantity > 0)
    .map((r) => {
      const p = priceMap.get(r.product_id);
      return {
        id: r.product_id,
        name: `${p?.name ?? "Producto"} (${r.quantity} disp.)`,
        listPrice: p?.price_paid ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const sellerType = (dist?.type as "colaborador" | "basico" | undefined) ?? "basico";

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
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no tienes inventario asignado. Pídele al administrador que te
                transfiera productos.
              </p>
            ) : (
              <SaleForm products={products} sellerType={sellerType} />
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
