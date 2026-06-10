import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Mi inventario" };

export default async function DistribuidorInventarioPage() {
  const supabase = await createClient();
  const [{ data: inv }, { data: products }] = await Promise.all([
    supabase.from("inventory").select("*").eq("location", "distribuidor"),
    supabase.from("products").select("*"),
  ]);

  const nameMap = new Map((products ?? []).map((p) => [p.id, p.name]));
  const rows = (inv ?? [])
    .map((r) => ({
      id: r.id,
      name: nameMap.get(r.product_id) ?? "Producto",
      quantity: r.quantity,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const total = rows.reduce((s, r) => s + r.quantity, 0);

  return (
    <>
      <PageHeader
        title="Mi inventario"
        description="Productos disponibles para vender."
      />

      <div className="mb-6 max-w-xs">
        <StatCard label="Total de unidades" value={formatNumber(total)} icon={Boxes} tone="brand" />
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH className="text-right">Disponibles</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.name}</TD>
                <TD className="text-right font-semibold tabular-nums">
                  {formatNumber(r.quantity)}
                </TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR>
                <TD className="py-8 text-center text-muted-foreground" colSpan={2}>
                  No tienes inventario asignado todavía.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
