"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  deleteAccess,
  deleteDistributor,
  setDistributorActive,
  setProfileActive,
} from "@/lib/actions/admin";

function ActionButtons({
  active,
  pending,
  onToggle,
  onDelete,
}: {
  active: boolean;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
      >
        {active ? "Desactivar" : "Activar"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar
      </button>
    </div>
  );
}

export function DistributorActions({
  id,
  active,
  name,
}: {
  id: string;
  active: boolean;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <ActionButtons
      active={active}
      pending={pending}
      onToggle={() =>
        start(async () => {
          await setDistributorActive(id, !active);
          router.refresh();
        })
      }
      onDelete={() => {
        if (
          !confirm(
            `¿Eliminar el distribuidor "${name}"? Se borrará su inventario y movimientos. Esta acción no se puede deshacer.`,
          )
        )
          return;
        start(async () => {
          const r = await deleteDistributor(id);
          if (r?.error) alert(r.error);
          router.refresh();
        });
      }}
    />
  );
}

export function AccessActions({
  id,
  active,
  name,
}: {
  id: string;
  active: boolean;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <ActionButtons
      active={active}
      pending={pending}
      onToggle={() =>
        start(async () => {
          await setProfileActive(id, !active);
          router.refresh();
        })
      }
      onDelete={() => {
        if (
          !confirm(
            `¿Eliminar el acceso de "${name}"? El usuario ya no podrá iniciar sesión. Esta acción no se puede deshacer.`,
          )
        )
          return;
        start(async () => {
          const r = await deleteAccess(id);
          if (r?.error) alert(r.error);
          router.refresh();
        });
      }}
    />
  );
}
