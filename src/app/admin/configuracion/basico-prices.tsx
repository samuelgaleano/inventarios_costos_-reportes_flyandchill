"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";
import { setDistributorPrices } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Dist = { id: string; name: string };
type Prod = { id: string; name: string };
type Price = { distributor_id: string; product_id: string; price: number };

export function BasicoPrices({
  distributors,
  products,
  prices,
}: {
  distributors: Dist[];
  products: Prod[];
  prices: Price[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [distId, setDistId] = useState("");
  const [values, setValues] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prices) m.set(`${p.distributor_id}:${p.product_id}`, p.price);
    return m;
  }, [prices]);

  function selectDist(id: string) {
    setDistId(id);
    setSaved(false);
    const init: Record<string, number> = {};
    for (const p of products) init[p.id] = priceMap.get(`${id}:${p.id}`) ?? 0;
    setValues(init);
  }

  function save() {
    if (!distId) return;
    setSaved(false);
    start(async () => {
      const r = await setDistributorPrices(
        distId,
        products.map((p) => ({ product_id: p.id, price: values[p.id] ?? 0 })),
      );
      if (r.ok) {
        setSaved(true);
        router.refresh();
      } else if (r.error) {
        alert(r.error);
      }
    });
  }

  if (distributors.length === 0) {
    return (
      <p className="px-5 pb-5 text-sm text-muted-foreground">
        No hay distribuidores básicos. Crea uno (tipo “básico”) para asignarle
        precios mayoristas.
      </p>
    );
  }

  return (
    <div className="space-y-4 px-5 pb-5">
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="bp_dist">Distribuidor básico</Label>
        <Select id="bp_dist" value={distId} onChange={(e) => selectDist(e.target.value)}>
          <option value="">Selecciona…</option>
          {distributors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      {distId && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm">{p.name}</span>
                <Input
                  type="number"
                  min={0}
                  step={500}
                  className="w-36"
                  value={values[p.id] ?? 0}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [p.id]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="brand" size="sm" onClick={save} disabled={pending}>
              <Save className="h-4 w-4" />
              {pending ? "Guardando…" : "Guardar precios"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Guardado
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
