"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { ProductRow } from "@/lib/supabase/types";

export function ProductForm({
  product,
  onDone,
}: {
  product?: ProductRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    product ? updateProduct : createProduct,
    initialActionState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state.ok, router, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre del producto</Label>
        <Input id="name" name="name" defaultValue={product?.name} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sku">SKU (opcional)</Label>
        <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} placeholder="CAP-NAC" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="unit_cost">Costo unitario</Label>
          <Input
            id="unit_cost"
            name="unit_cost"
            type="number"
            min={0}
            step={1}
            defaultValue={product?.unit_cost ?? 0}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shipping_cost">Envío unitario</Label>
          <Input
            id="shipping_cost"
            name="shipping_cost"
            type="number"
            min={0}
            step={1}
            defaultValue={product?.shipping_cost ?? 0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="operating_cost">Operativo unitario</Label>
          <Input
            id="operating_cost"
            name="operating_cost"
            type="number"
            min={0}
            step={1}
            defaultValue={product?.operating_cost ?? 0}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Comisión del colaborador (se suma al precio). Solo se paga la parte que ejecute.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="commission_sale">Comisión por venta</Label>
            <Input
              id="commission_sale"
              name="commission_sale"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.commission_sale ?? 0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="commission_shipping">Comisión por envío</Label>
            <Input
              id="commission_shipping"
              name="commission_shipping"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.commission_shipping ?? 0}
            />
          </div>
        </div>
      </div>

      {state.error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
