import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireDistributor } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SalesTable } from "@/components/sales-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/format";
import { monthLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Panel" };

export default async function DistribuidorDashboard() {
  await requireDistributor();
  const supabase = await createClient();

  const [{ data: monthly }, { data: sales }, { data: inv }] = await Promise.all([
    supabase.from("monthly_summary").select("*").limit(6),
    supabase
      .from("sales_detail")
      .select("*")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("inventory").select("*").eq("location", "distribuidor"),
  ]);

  const currentKey = new Date().toISOString().slice(0, 7);
  const current = (monthly ?? []).find((m) => m.month.slice(0, 7) === currentKey);
  const myStock = (inv ?? []).reduce((s, r) => s + r.quantity, 0);

  return (
    <>
      <PageHeader title="Mi panel" description="Resumen de tus ventas e inventario." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mi ganancia del mes"
          value={formatCurrency(current?.distributor ?? 0)}
          icon={Wallet}
          tone="success"
          hint={monthLabel(currentKey + "-01")}
        />
        <StatCard label="Unidades vendidas (mes)" value={formatNumber(current?.units ?? 0)} icon={ShoppingBag} />
        <StatCard label="N.º de ventas (mes)" value={formatNumber(current?.num_sales ?? 0)} icon={Receipt} />
        <StatCard label="Mi inventario" value={formatNumber(myStock)} icon={Boxes} tone="brand" hint="Unidades disponibles" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mis ventas recientes</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <SalesTable sales={sales ?? []} variant="distribuidor" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link href="/distribuidor/ventas" className={buttonVariants({ variant: "brand" })}>
              Registrar venta
            </Link>
            <Link href="/distribuidor/inventario" className={buttonVariants({ variant: "outline" })}>
              Ver mi inventario
            </Link>
            <Link href="/distribuidor/informes" className={buttonVariants({ variant: "outline" })}>
              Mis informes
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
