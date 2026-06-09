"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, UserPlus } from "lucide-react";
import {
  createDistributor,
  createDistributorAccess,
  createInvestor,
} from "@/lib/actions/admin";
import { initialActionState, type ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

function useDialogAction(
  action: (p: ActionState, f: FormData) => Promise<ActionState>,
  onClose: () => void,
) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state.ok, router, onClose]);
  return { state, formAction, pending };
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function AddDistributor() {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogAction(createDistributor, () =>
    setOpen(false),
  );
  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Agregar
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo distribuidor">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="d_name">Nombre</Label>
            <Input id="d_name" name="name" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="d_email">Correo (opcional)</Label>
              <Input id="d_email" name="contact_email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d_phone">Teléfono (opcional)</Label>
              <Input id="d_phone" name="contact_phone" />
            </div>
          </div>
          <FormError message={state.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? "Guardando…" : "Crear"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function AddAccess({
  distributors,
}: {
  distributors: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogAction(
    createDistributorAccess,
    () => setOpen(false),
  );
  return (
    <>
      <Button
        size="sm"
        variant="brand"
        onClick={() => setOpen(true)}
        disabled={distributors.length === 0}
      >
        <UserPlus className="h-4 w-4" /> Crear acceso
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear acceso de distribuidor"
        description="El distribuidor podrá iniciar sesión con este correo y contraseña."
      >
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="a_name">Nombre completo</Label>
            <Input id="a_name" name="full_name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a_dist">Distribuidor asociado</Label>
            <Select id="a_dist" name="distributor_id" required defaultValue="">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="a_email">Correo</Label>
              <Input id="a_email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a_pass">Contraseña</Label>
              <Input id="a_pass" name="password" type="text" minLength={6} required />
            </div>
          </div>
          <FormError message={state.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? "Creando…" : "Crear acceso"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function AddInvestor() {
  const [open, setOpen] = useState(false);
  const { state, formAction, pending } = useDialogAction(createInvestor, () =>
    setOpen(false),
  );
  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Agregar
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo inversionista">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="i_name">Nombre</Label>
            <Input id="i_name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i_email">Correo (opcional)</Label>
            <Input id="i_email" name="contact_email" type="email" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="i_capital">Capital aportado</Label>
              <Input id="i_capital" name="capital_aportado" type="number" min={0} step={1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i_pct">Participación (%)</Label>
              <Input id="i_pct" name="participacion_pct" type="number" min={0} max={100} step={0.5} />
            </div>
          </div>
          <FormError message={state.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? "Guardando…" : "Agregar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
