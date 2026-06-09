"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Pencil, Plus, Save } from "lucide-react";
import { computePricing, type PricingSettings } from "@/lib/pricing";
import { updatePricingSettings } from "@/lib/actions/products";
import { initialActionState } from "@/lib/actions/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { PricingSettingsRow, ProductRow } from "@/lib/supabase/types";
import { ProductForm } from "./product-form";

type PctState = {
  investor: number;
  distributor: number;
  company: number;
  gateway: number;
  discount: number;
  rounding: number;
};

const FIELDS: {
  key: keyof Omit<PctState, "rounding">;
  label: string;
  name: string;
}[] = [
  { key: "investor", label: "Inversionista", name: "investor_pct" },
  { key: "distributor", label: "Distribuidor", name: "distributor_pct" },
  { key: "company", label: "Margen empresa", name: "company_pct" },
  { key: "gateway", label: "Pasarela de pago", name: "gateway_pct" },
  { key: "discount", label: "Código de descuento", name: "discount_pct" },
];

export function PreciosClient({
  products,
  settings,
}: {
  products: ProductRow[];
  settings: PricingSettingsRow;
}) {
  const router = useRouter();
  const [pct, setPct] = useState<PctState>({
    investor: Math.round(settings.investor_pct * 1000) / 10,
    distributor: Math.round(settings.distributor_pct * 1000) / 10,
    company: Math.round(settings.company_pct * 1000) / 10,
    gateway: Math.round(settings.gateway_pct * 1000) / 10,
    discount: Math.round(settings.discount_pct * 1000) / 10,
    rounding: settings.rounding,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | undefined>(undefined);

  const [state, formAction, pending] = useActionState(
    updatePricingSettings,
    initialActionState,
  );
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const liveSettings: PricingSettings = useMemo(
    () => ({
      investorPct: pct.investor / 100,
      distributorPct: pct.distributor / 100,
      companyPct: pct.company / 100,
      gatewayPct: pct.gateway / 100,
      discountPct: pct.discount / 100,
      rounding: pct.rounding || 0,
    }),
    [pct],
  );

  const marginSum = pct.investor + pct.distributor + pct.company + pct.gateway;
  const invalid = marginSum >= 100 || pct.discount >= 100;

  const rows = useMemo(() => {
    return products.map((p) => {
      let calc;
      try {
        calc = computePricing(
          {
            unitCost: p.unit_cost,
            shippingCost: p.shipping_cost,
            operatingCost: p.operating_cost,
          },
          liveSettings,
        );
      } catch {
        calc = null;
      }
      return { product: p, calc };
    });
  }, [products, liveSettings]);

  function set(key: keyof PctState, value: number) {
    setPct((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Panel de configuración */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Configuración de precios</h2>
            <p className="text-sm text-muted-foreground">
              Ajusta los porcentajes y observa el precio en vivo. Guarda para
              aplicarlo a todo el sistema.
            </p>
          </div>
        </div>

        <form action={formAction}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label} (%)</Label>
                <Input
                  id={f.key}
                  name={f.name}
                  type="number"
                  min={0}
                  step={0.5}
                  value={pct[f.key]}
                  onChange={(e) => set(f.key, Number(e.target.value))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="rounding">Redondeo</Label>
              <Input
                id="rounding"
                name="rounding"
                type="number"
                min={0}
                step={50}
                value={pct.rounding}
                onChange={(e) => set("rounding", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge tone={invalid ? "danger" : marginSum > 80 ? "warning" : "brand"}>
              Suma de márgenes: {marginSum.toFixed(1)}%
            </Badge>
            {invalid && (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Los márgenes deben sumar menos de 100% y el descuento menos de 100%.
              </span>
            )}
            {state.error && (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {state.error}
              </span>
            )}
            {state.ok && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                {state.message}
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" variant="brand" disabled={pending || invalid}>
                <Save className="h-4 w-4" />
                {pending ? "Guardando…" : "Guardar configuración"}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Tabla de productos con precios en vivo */}
      <Card>
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="font-semibold">Productos y precio final</h2>
            <p className="text-sm text-muted-foreground">
              Precios por unidad calculados con la configuración actual.
            </p>
          </div>
          <Button
            variant="brand"
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        <Table>
          <THead>
            <TR>
              <TH>Producto</TH>
              <TH className="text-right">Costo mín.</TH>
              <TH className="text-right">P. lista</TH>
              <TH className="text-right">Con descuento</TH>
              <TH className="text-right">Inversionista</TH>
              <TH className="text-right">Distribuidor</TH>
              <TH className="text-right">Empresa</TH>
              <TH className="text-right">Markup</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.map(({ product, calc }) => (
              <TR key={product.id} className={!product.active ? "opacity-50" : ""}>
                <TD className="font-medium">
                  {product.name}
                  {!product.active && (
                    <Badge tone="neutral" className="ml-2">
                      inactivo
                    </Badge>
                  )}
                </TD>
                <TD className="text-right tabular-nums">
                  {formatCurrency(product.unit_cost + product.shipping_cost + product.operating_cost)}
                </TD>
                <TD className="text-right font-semibold tabular-nums">
                  {calc ? formatCurrency(calc.listPrice) : "—"}
                </TD>
                <TD className="text-right tabular-nums">
                  {calc ? formatCurrency(calc.pricePaid) : "—"}
                </TD>
                <TD className="text-right tabular-nums">
                  {calc ? formatCurrency(calc.allocations.investor) : "—"}
                </TD>
                <TD className="text-right tabular-nums">
                  {calc ? formatCurrency(calc.allocations.distributor) : "—"}
                </TD>
                <TD className="text-right tabular-nums">
                  {calc ? formatCurrency(calc.allocations.company) : "—"}
                </TD>
                <TD className="text-right tabular-nums text-muted-foreground">
                  {calc ? `${calc.markupMultiple.toFixed(2)}×` : "—"}
                </TD>
                <TD className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(product);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR>
                <TD className="py-8 text-center text-muted-foreground" {...{ colSpan: 9 }}>
                  No hay productos. Agrega el primero.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Editar producto" : "Nuevo producto"}
        description="Define los costos; el precio se calcula automáticamente."
      >
        <ProductForm product={editing} onDone={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}
