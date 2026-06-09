import type { Metadata } from "next";
import { Boxes, Warehouse, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import type { MovementType } from "@/lib/supabase/types";
import { InventarioActions } from "./inventario-actions";

export const metadata: Metadata = { title: "Inventario" };

const MOVEMENT_LABELS: Record<MovementType, { label: string; tone: "brand" | "success" | "warning" | "neutral" }> = {
  compra: { label: "Compra", tone: "success" },
  transferencia: { label: "Transferencia", tone: "brand" },
  venta: { label: "Venta", tone: "warning" },
  ajuste: { label: "Ajuste", tone: "neutral" },
};

export default async function InventarioPage() {
  const supabase = await createClient();

  const [{ data: summary }, { data: products }, { data: distributors }, { data: movements }] =
    await Promise.all([
      supabase.from("inventory_summary").select("*").order("name"),
      supabase.from("products").select("*").eq("active", true).order("name"),
      supabase.from("distributors").select("*").eq("active", true).order("name"),
      supabase
        .from("inventory_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const rows = summary ?? [];
  const productMap = new Map((products ?? []).map((p) => [p.id, p.name]));
  const distMap = new Map((distributors ?? []).map((d) => [d.id, d.name]));

  const totalBodega = rows.reduce((s, r) => s + r.bodega, 0);
  const totalDist = rows.reduce((s, r) => s + r.distribuidor, 0);

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias por producto: bodega + distribuidores."
      >
        <InventarioActions
          products={(products ?? []).map((p) => ({ id: p.id, name: p.name }))}
          distributors={(distributors ?? []).map((d) => ({ id: d.id, name: d.name }))}
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="En bodega" value={formatNumber(totalBodega)} icon={Warehouse} tone="brand" hint="Unidades disponibles" />
        <StatCard label="En distribuidores" value={formatNumber(totalDist)} icon={Users} hint="Unidades asignadas" />
        <StatCard label="Inventario general" value={formatNumber(totalBodega + totalDist)} icon={Boxes} tone="success" hint="Total de unidades" />
      </div>

      <Card className="mb-6">
        <div className="p-5 pb-3">
          <h2 className="font-semibold">Existencias por producto</h2>
          <p className="text-sm text-muted-foreground">
            El inventario general es la suma de bodega y distribuidores.
          </p>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH className="text-right">Bodega</TH>
              <TH className="text-right">Distribuidores</TH>
              <TH className="text-right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.product_id}>
                <TD className="font-medium">{r.name}</TD>
                <TD className="text-right tabular-nums">{formatNumber(r.bodega)}</TD>
                <TD className="text-right tabular-nums">{formatNumber(r.distribuidor)}</TD>
                <TD className="text-right font-semibold tabular-nums">{formatNumber(r.total)}</TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR>
                <TD className="py-8 text-center text-muted-foreground" {...{ colSpan: 4 }}>
                  Sin productos en inventario.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>

      <Card>
        <div className="p-5 pb-3">
          <h2 className="font-semibold">Movimientos recientes</h2>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Tipo</TH>
              <TH>Producto</TH>
              <TH className="text-right">Cantidad</TH>
              <TH>Destino</TH>
              <TH>Fecha</TH>
            </TR>
          </THead>
          <TBody>
            {(movements ?? []).map((m) => {
              const meta = MOVEMENT_LABELS[m.type];
              const destino =
                m.type === "transferencia"
                  ? `→ ${distMap.get(m.to_distributor_id ?? "") ?? "distribuidor"}`
                  : m.type === "venta"
                    ? m.from_distributor_id
                      ? distMap.get(m.from_distributor_id) ?? "distribuidor"
                      : "bodega"
                    : "bodega";
              return (
                <TR key={m.id}>
                  <TD>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </TD>
                  <TD className="font-medium">{productMap.get(m.product_id) ?? "—"}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(m.quantity)}</TD>
                  <TD className="text-muted-foreground">{destino}</TD>
                  <TD className="text-muted-foreground">{formatDate(m.created_at)}</TD>
                </TR>
              );
            })}
            {(movements ?? []).length === 0 && (
              <TR>
                <TD className="py-8 text-center text-muted-foreground" {...{ colSpan: 5 }}>
                  Aún no hay movimientos.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
