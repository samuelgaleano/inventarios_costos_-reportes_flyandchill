"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSalePaid } from "@/lib/actions/sales";
import { Badge } from "@/components/ui/badge";

export function PaidToggle({ id, paid }: { id: string; paid: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title="Cambiar estado de pago"
      onClick={() =>
        start(async () => {
          await setSalePaid(id, !paid);
          router.refresh();
        })
      }
      className="disabled:opacity-50"
    >
      <Badge tone={paid ? "success" : "warning"}>
        {paid ? "Pagado" : "Pendiente"}
      </Badge>
    </button>
  );
}
