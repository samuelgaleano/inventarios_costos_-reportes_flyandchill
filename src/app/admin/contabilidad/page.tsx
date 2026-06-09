import type { Metadata } from "next";
import { Banknote, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { AllocationPie } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { monthLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Contabilidad" };

export default async function ContabilidadPage() {
  const supabase = await createClient();
  const [{ data: monthly }, { data: byDist }, { data: byProduct }] =
    await Promise.all([
      supabase.from("monthly_summary").select("*").limit(24),
      supabase.from("distributor_summary").select("*").order("revenue", { ascending: false }),
      supabase.from("product_sales_summary").select("*").order("revenue", { ascending: false }),
    ]);

  const months = monthly ?? [];
  const tot = months.reduce(
    (a, m) => ({
      revenue: a.revenue + m.revenue,
      cost: a.cost + m.cost,
      investor: a.investor + m.investor,
      distributor: a.distributor + m.distributor,
      company: a.company + m.company,
      gateway: a.gateway + m.gateway,
    }),
    { revenue: 0, cost: 0, investor: 0, distributor: 0, company: 0, gateway: 0 },
  );

  const pieData = [
    { name: "Costo", value: tot.cost },
    { name: "Inversionista", value: tot.investor },
    { name: "Distribuidor", value: tot.distributor },
    { name: "Empresa", value: tot.company },
    { name: "Pasarela", value: tot.gateway },
  ];

  return (
    <>
      <PageHeader
        title="Contabilidad"
        description="Ingresos, costos y reparto de ganancias (histórico)."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ingresos totales" value={formatCurrency(tot.revenue)} icon={Banknote} tone="brand" />
        <StatCard label="Ganancia empresa" value={formatCurrency(tot.company)} icon={TrendingUp} tone="success" />
        <StatCard label="Pagado a inversionista" value={formatCurrency(tot.investor)} icon={PiggyBank} />
        <StatCard label="Pagado a distribuidores" value={formatCurrency(tot.distributor)} icon={Wallet} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumen mensual</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Mes</TH>
                  <TH className="text-right">Ventas</TH>
                  <TH className="text-right">Ingresos</TH>
                  <TH className="text-right">Costo</TH>
                  <TH className="text-right">Inversionista</TH>
                  <TH className="text-right">Distribuidor</TH>
                  <TH className="text-right">Empresa</TH>
                </TR>
              </THead>
              <TBody>
                {months.map((m) => (
                  <TR key={m.month}>
                    <TD className="font-medium capitalize">{monthLabel(m.month)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(m.num_sales)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(m.revenue)}</TD>
                    <TD className="text-right tabular-nums text-muted-foreground">{formatCurrency(m.cost)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(m.investor)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(m.distributor)}</TD>
                    <TD className="text-right font-semibold tabular-nums text-success">{formatCurrency(m.company)}</TD>
                  </TR>
                ))}
                {months.length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={7}>
                      Aún no hay ventas registradas.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reparto del dinero</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationPie data={pieData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por distribuidor</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Distribuidor</TH>
                  <TH className="text-right">Ventas</TH>
                  <TH className="text-right">Ingresos</TH>
                  <TH className="text-right">Su ganancia</TH>
                </TR>
              </THead>
              <TBody>
                {(byDist ?? []).map((d) => (
                  <TR key={d.distributor_id}>
                    <TD className="font-medium">{d.name}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(d.num_sales)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(d.revenue)}</TD>
                    <TD className="text-right tabular-nums text-success">{formatCurrency(d.distributor_earnings)}</TD>
                  </TR>
                ))}
                {(byDist ?? []).length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={4}>
                      Sin distribuidores con ventas.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por producto</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH className="text-right">Unidades</TH>
                  <TH className="text-right">Ingresos</TH>
                  <TH className="text-right">Empresa</TH>
                </TR>
              </THead>
              <TBody>
                {(byProduct ?? []).map((p) => (
                  <TR key={p.product_id}>
                    <TD className="font-medium">{p.name}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(p.units)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(p.revenue)}</TD>
                    <TD className="text-right tabular-nums text-success">{formatCurrency(p.company)}</TD>
                  </TR>
                ))}
                {(byProduct ?? []).length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={4}>
                      Sin ventas por producto.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
