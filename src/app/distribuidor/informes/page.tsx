import type { Metadata } from "next";
import { Receipt, ShoppingBag, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SalesTable } from "@/components/sales-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { monthLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Mis informes" };

export default async function DistribuidorInformesPage() {
  const supabase = await createClient();
  const [{ data: monthly }, { data: sales }] = await Promise.all([
    supabase.from("monthly_summary").select("*").limit(24),
    supabase
      .from("sales_detail")
      .select("*")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const months = monthly ?? [];
  const totals = months.reduce(
    (a, m) => ({
      earnings: a.earnings + m.distributor,
      units: a.units + m.units,
      sales: a.sales + m.num_sales,
    }),
    { earnings: 0, units: 0, sales: 0 },
  );

  return (
    <>
      <PageHeader
        title="Mis informes"
        description="Tus ventas y ganancias desglosadas."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ganancia total" value={formatCurrency(totals.earnings)} icon={Wallet} tone="success" />
        <StatCard label="Unidades vendidas" value={formatNumber(totals.units)} icon={ShoppingBag} />
        <StatCard label="N.º de ventas" value={formatNumber(totals.sales)} icon={Receipt} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ganancia por mes</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Mes</TH>
                <TH className="text-right">Ventas</TH>
                <TH className="text-right">Unidades</TH>
                <TH className="text-right">Mi ganancia</TH>
              </TR>
            </THead>
            <TBody>
              {months.map((m) => (
                <TR key={m.month}>
                  <TD className="font-medium capitalize">{monthLabel(m.month)}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(m.num_sales)}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(m.units)}</TD>
                  <TD className="text-right font-semibold tabular-nums text-success">
                    {formatCurrency(m.distributor)}
                  </TD>
                </TR>
              ))}
              {months.length === 0 && (
                <TR>
                  <TD className="py-8 text-center text-muted-foreground" colSpan={4}>
                    Aún no tienes ventas registradas.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de ventas</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <SalesTable sales={sales ?? []} variant="distribuidor" />
        </CardContent>
      </Card>
    </>
  );
}
