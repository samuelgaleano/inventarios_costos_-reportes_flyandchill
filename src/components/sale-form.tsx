"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ShoppingCart } from "lucide-react";
import { registerSale } from "@/lib/actions/sales";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PAYMENT_METHODS } from "@/lib/supabase/types";
import { CHANNELS, PAYMENT_LABELS } from "@/lib/labels";

export type SaleProduct = { id: string; name: string; listPrice: number };
export type OriginOption = {
  value: string; // "bodega" | "dist:<id>"
  label: string;
  type?: "colaborador" | "basico";
};

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-input text-brand focus:ring-ring"
      />
      {label}
    </label>
  );
}

export function SaleForm({
  products,
  origins,
  collaborators,
  sellerType,
}: {
  products: SaleProduct[];
  /** Admin: orígenes (bodega + distribuidores). */
  origins?: OriginOption[];
  /** Admin: colaboradores a quienes atribuir la comisión (origen bodega). */
  collaborators?: { id: string; name: string }[];
  /** Portal del distribuidor: su propio tipo. */
  sellerType?: "colaborador" | "basico";
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(registerSale, initialActionState);
  const [formKey, setFormKey] = useState(0);
  const isAdmin = Boolean(origins);

  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [origin, setOrigin] = useState("bodega");

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      setFormKey((k) => k + 1);
      setProductId("");
      setPrice("");
    }
  }, [state.ok, router]);

  function onProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setPrice(p ? p.listPrice : "");
  }

  // ¿Mostrar checks de comisión? No para distribuidor básico ni origen básico.
  const originType = useMemo(
    () => origins?.find((o) => o.value === origin)?.type,
    [origins, origin],
  );
  const showCommission = isAdmin
    ? originType !== "basico"
    : sellerType === "colaborador";
  const showAttribution = isAdmin && origin === "bodega";

  return (
    <form key={formKey} action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="s_product">Producto</Label>
        <Select
          id="s_product"
          name="product_id"
          required
          value={productId}
          onChange={(e) => onProduct(e.target.value)}
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {isAdmin && (
        <div className="space-y-1.5">
          <Label htmlFor="s_origin">Origen del producto</Label>
          <Select
            id="s_origin"
            name="origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          >
            {origins!.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {showAttribution && collaborators && collaborators.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="s_seller">Vendedor (recibe la comisión)</Label>
          <Select id="s_seller" name="seller" defaultValue="">
            <option value="">Nadie (queda en la empresa)</option>
            {collaborators.map((c) => (
              <option key={c.id} value={`dist:${c.id}`}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="s_qty">Cantidad</Label>
          <Input id="s_qty" name="quantity" type="number" min={1} step={1} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s_price">Precio de venta (unitario)</Label>
          <Input
            id="s_price"
            name="unit_price"
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) =>
              setPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Automático"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="s_channel">Canal</Label>
          <Select id="s_channel" name="channel" defaultValue={CHANNELS[0]}>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s_pay">Método de pago</Label>
          <Select id="s_pay" name="payment_method" defaultValue="efectivo">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_LABELS[m]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="s_date">Fecha</Label>
        <Input
          id="s_date"
          name="sale_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>

      {showCommission && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Pasos ejecutados (definen la comisión):
          </p>
          <Check name="did_sale" label="Concretó la venta" defaultChecked />
          <Check name="did_shipping" label="Gestionó el envío" defaultChecked />
        </div>
      )}

      <Check name="is_paid" label="El pago ya está confirmado" />

      <div className="space-y-1.5">
        <Label htmlFor="s_note">Nota (opcional)</Label>
        <Textarea id="s_note" name="note" rows={2} placeholder="Cliente, referencia…" />
      </div>

      {state.error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && (
        <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        <ShoppingCart className="h-4 w-4" />
        {pending ? "Registrando…" : "Registrar venta"}
      </Button>
    </form>
  );
}
