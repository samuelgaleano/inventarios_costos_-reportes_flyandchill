import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { buildMonthlyReport } from "@/lib/reports/data";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Banknote, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { InformesActions } from "./informes-client";

export const metadata: Metadata = { title: "Informes" };

export default async function InformesPage() {
  await requireAdmin();
  const report = await buildMonthlyReport();
  const t = report.totals;

  return (
    <>
      <PageHeader
        title="Informes"
        description="Envía el informe por correo, respáldalo en Google Sheets o descárgalo en Excel."
      />

      <div className="mb-6">
        <InformesActions />
      </div>

      <h2 className="mb-3 text-lg font-semibold capitalize">
        Vista previa · {report.periodLabel}
      </h2>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ingresos" value={formatCurrency(t.revenue)} icon={Banknote} tone="brand" />
        <StatCard label="Unidades" value={formatNumber(t.units)} icon={ShoppingBag} />
        <StatCard label="Ganancia empresa" value={formatCurrency(t.company)} icon={TrendingUp} tone="success" />
        <StatCard label="Pago distribuidores" value={formatCurrency(t.distributor)} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ganancia por distribuidor</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Distribuidor</TH>
                  <TH className="text-right">Ingresos</TH>
                  <TH className="text-right">Su ganancia</TH>
                </TR>
              </THead>
              <TBody>
                {report.byDistributor.map((d) => (
                  <TR key={d.id ?? "bodega"}>
                    <TD className="font-medium">{d.name}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(d.revenue)}</TD>
                    <TD className="text-right tabular-nums text-success">{formatCurrency(d.earnings)}</TD>
                  </TR>
                ))}
                {report.byDistributor.length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={3}>
                      Sin ventas este mes.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas por producto</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH className="text-right">Unidades</TH>
                  <TH className="text-right">Ingresos</TH>
                </TR>
              </THead>
              <TBody>
                {report.byProduct.map((p) => (
                  <TR key={p.name}>
                    <TD className="font-medium">{p.name}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(p.units)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(p.revenue)}</TD>
                  </TR>
                ))}
                {report.byProduct.length === 0 && (
                  <TR>
                    <TD className="py-8 text-center text-muted-foreground" colSpan={3}>
                      Sin ventas este mes.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        El envío de correos requiere configurar Resend (RESEND_API_KEY) y la
        sincronización requiere las credenciales de Google Sheets. Consulta el
        archivo <code>.env.example</code> y la guía de despliegue.
      </p>
    </>
  );
}
