import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Boxes, DollarSign, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { MonthlyChart } from "@/components/charts";
import { SalesTable } from "@/components/sales-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/format";
import { monthLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Panel" };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data: monthly }, { data: sales }, { data: inv }] = await Promise.all([
    supabase.from("monthly_summary").select("*").limit(6),
    supabase
      .from("sales_detail")
      .select("*")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("inventory_summary").select("*"),
  ]);

  const months = monthly ?? [];
  const currentKey = new Date().toISOString().slice(0, 7);
  const current = months.find((m) => m.month.slice(0, 7) === currentKey);

  const chartData = [...months]
    .reverse()
    .map((m) => ({
      label: monthLabel(m.month).replace(/ de \d+/, ""),
      ingresos: m.revenue,
      ganancia: m.company,
    }));

  const inventoryTotal = (inv ?? []).reduce((s, r) => s + r.total, 0);

  return (
    <>
      <PageHeader
        title="Panel"
        description="Resumen general del negocio."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(current?.revenue ?? 0)}
          icon={DollarSign}
          tone="brand"
          hint={monthLabel(currentKey + "-01")}
        />
        <StatCard
          label="Unidades vendidas (mes)"
          value={formatNumber(current?.units ?? 0)}
          icon={ShoppingBag}
        />
        <StatCard
          label="Ganancia empresa (mes)"
          value={formatCurrency(current?.company ?? 0)}
          icon={BarChart3}
          tone="success"
        />
        <StatCard
          label="Inventario total"
          value={formatNumber(inventoryTotal)}
          icon={Boxes}
          hint="Unidades (bodega + distribuidores)"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ingresos y ganancia por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link href="/admin/ventas" className={buttonVariants({ variant: "brand" })}>
              Registrar venta
            </Link>
            <Link href="/admin/inventario" className={buttonVariants({ variant: "outline" })}>
              Gestionar inventario
            </Link>
            <Link href="/admin/precios" className={buttonVariants({ variant: "outline" })}>
              Productos y precios
            </Link>
            <Link href="/admin/contabilidad" className={buttonVariants({ variant: "outline" })}>
              Ver contabilidad
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas recientes</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <SalesTable sales={sales ?? []} variant="admin" />
        </CardContent>
      </Card>
    </>
  );
}
