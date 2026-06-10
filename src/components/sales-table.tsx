import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/labels";
import type { SaleDetailRow } from "@/lib/supabase/types";

export function SalesTable({
  sales,
  variant = "admin",
}: {
  sales: SaleDetailRow[];
  variant?: "admin" | "distribuidor";
}) {
  const showOrigin = variant === "admin";
  const showEarning = variant === "distribuidor";

  return (
    <Table>
      <THead>
        <TR>
          <TH>Fecha</TH>
          <TH>Producto</TH>
          <TH className="text-right">Cant.</TH>
          {showOrigin && <TH>Origen</TH>}
          <TH>Pago</TH>
          <TH className="text-right">Total</TH>
          {showEarning && <TH className="text-right">Mi ganancia</TH>}
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
            {showOrigin && (
              <TD>
                {s.source_location === "bodega" ? (
                  <Badge tone="neutral">Bodega</Badge>
                ) : (
                  <Badge tone="brand">{s.distributor_name ?? "Distribuidor"}</Badge>
                )}
              </TD>
            )}
            <TD className="text-muted-foreground">
              {PAYMENT_LABELS[s.payment_method]}
            </TD>
            <TD className="text-right font-semibold tabular-nums">
              {formatCurrency(s.total_paid)}
            </TD>
            {showEarning && (
              <TD className="text-right tabular-nums text-success">
                {formatCurrency(s.distributor_amount)}
              </TD>
            )}
          </TR>
        ))}
        {sales.length === 0 && (
          <TR>
            <TD
              className="py-8 text-center text-muted-foreground"
              colSpan={showOrigin ? 6 : showEarning ? 6 : 5}
            >
              Aún no hay ventas registradas.
            </TD>
          </TR>
        )}
      </TBody>
    </Table>
  );
}
