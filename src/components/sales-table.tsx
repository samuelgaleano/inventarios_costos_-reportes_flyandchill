import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PaidToggle } from "@/components/paid-toggle";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { SaleDetailRow } from "@/lib/supabase/types";

export function SalesTable({
  sales,
  variant = "admin",
}: {
  sales: SaleDetailRow[];
  variant?: "admin" | "distribuidor";
}) {
  const isAdmin = variant === "admin";
  const cols = isAdmin ? 8 : 7;

  return (
    <Table>
      <THead>
        <TR>
          <TH>Fecha</TH>
          <TH>Producto</TH>
          <TH className="text-right">Cant.</TH>
          {isAdmin && <TH>Vendedor</TH>}
          <TH>Canal</TH>
          <TH className="text-right">Total</TH>
          {!isAdmin && <TH className="text-right">Mi ganancia</TH>}
          <TH>Pago</TH>
        </TR>
      </THead>
      <TBody>
        {sales.map((s) => (
          <TR key={s.id}>
            <TD className="whitespace-nowrap text-muted-foreground">
              {formatDate(s.sale_date)}
            </TD>
            <TD className="font-medium">{s.product_name}</TD>
            <TD className="text-right tabular-nums">{formatNumber(s.quantity)}</TD>
            {isAdmin && (
              <TD>
                {s.seller_name ? (
                  <Badge tone="brand">{s.seller_name}</Badge>
                ) : (
                  <span className="text-muted-foreground">Empresa</span>
                )}
              </TD>
            )}
            <TD className="text-muted-foreground">{s.channel ?? "—"}</TD>
            <TD className="text-right font-semibold tabular-nums">
              {formatCurrency(s.total_paid)}
            </TD>
            {!isAdmin && (
              <TD className="text-right tabular-nums text-success">
                {formatCurrency(s.distributor_amount)}
              </TD>
            )}
            <TD>
              <PaidToggle id={s.id} paid={s.is_paid} />
            </TD>
          </TR>
        ))}
        {sales.length === 0 && (
          <TR>
            <TD className="py-8 text-center text-muted-foreground" colSpan={cols}>
              Aún no hay ventas registradas.
            </TD>
          </TR>
        )}
      </TBody>
    </Table>
  );
}
