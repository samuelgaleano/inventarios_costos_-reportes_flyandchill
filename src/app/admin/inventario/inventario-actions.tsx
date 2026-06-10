"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRightLeft, PackagePlus } from "lucide-react";
import { registerPurchase, transferInventory } from "@/lib/actions/inventory";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

type Option = { id: string; name: string };

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function PurchaseForm({ products, onDone }: { products: Option[]; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(registerPurchase, initialActionState);
  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state.ok, router, onDone]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="p_product">Producto</Label>
        <Select id="p_product" name="product_id" required defaultValue="">
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="p_qty">Cantidad</Label>
          <Input id="p_qty" name="quantity" type="number" min={1} step={1} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p_cost">Costo unitario (opcional)</Label>
          <Input id="p_cost" name="unit_cost" type="number" min={0} step={1} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p_date">Fecha</Label>
        <Input
          id="p_date"
          name="date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p_note">Nota (opcional)</Label>
        <Textarea id="p_note" name="note" rows={2} placeholder="Proveedor, lote…" />
      </div>
      <FormError message={state.error} />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Registrando…" : "Registrar compra"}
        </Button>
      </div>
    </form>
  );
}

function TransferForm({
  products,
  distributors,
  onDone,
}: {
  products: Option[];
  distributors: Option[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(transferInventory, initialActionState);
  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state.ok, router, onDone]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="t_product">Producto</Label>
        <Select id="t_product" name="product_id" required defaultValue="">
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
      <div className="space-y-1.5">
        <Label htmlFor="t_dist">Distribuidor destino</Label>
        <Select id="t_dist" name="distributor_id" required defaultValue="">
          <option value="" disabled>
            Selecciona…
          </option>
          {distributors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t_qty">Cantidad a transferir</Label>
        <Input id="t_qty" name="quantity" type="number" min={1} step={1} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="t_note">Nota (opcional)</Label>
        <Textarea id="t_note" name="note" rows={2} />
      </div>
      <FormError message={state.error} />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Transfiriendo…" : "Transferir"}
        </Button>
      </div>
    </form>
  );
}

export function InventarioActions({
  products,
  distributors,
}: {
  products: Option[];
  distributors: Option[];
}) {
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpenTransfer(true)} disabled={distributors.length === 0}>
        <ArrowRightLeft className="h-4 w-4" />
        Transferir
      </Button>
      <Button variant="brand" onClick={() => setOpenPurchase(true)}>
        <PackagePlus className="h-4 w-4" />
        Registrar compra
      </Button>

      <Dialog
        open={openPurchase}
        onClose={() => setOpenPurchase(false)}
        title="Registrar compra"
        description="El inventario comprado entra a la bodega."
      >
        <PurchaseForm products={products} onDone={() => setOpenPurchase(false)} />
      </Dialog>

      <Dialog
        open={openTransfer}
        onClose={() => setOpenTransfer(false)}
        title="Transferir inventario"
        description="Mueve unidades de la bodega a un distribuidor."
      >
        <TransferForm
          products={products}
          distributors={distributors}
          onDone={() => setOpenTransfer(false)}
        />
      </Dialog>
    </>
  );
}
