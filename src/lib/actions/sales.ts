"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { InventoryLocation } from "@/lib/supabase/types";
import type { ActionState } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

const saleSchema = z.object({
  product_id: z.string().uuid("Selecciona un producto."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0."),
  payment_method: z.enum([
    "efectivo",
    "transferencia",
    "tarjeta",
    "nequi",
    "daviplata",
    "otro",
  ]),
  sale_date: z.string().optional(),
  origin: z.string().optional(), // "bodega" | "dist:<uuid>"
  note: z.string().trim().optional(),
});

export async function registerSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profile } = await requireAuth();
  const parsed = saleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  // Origen (solo lo usa el admin; para el distribuidor lo fuerza la función SQL)
  let sourceLocation: InventoryLocation = "bodega";
  let sourceDistributorId: string | null = null;
  if (d.origin && d.origin.startsWith("dist:")) {
    sourceLocation = "distribuidor";
    sourceDistributorId = d.origin.slice(5);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_sale", {
    p_product_id: d.product_id,
    p_quantity: d.quantity,
    p_payment_method: d.payment_method,
    p_sale_date: d.sale_date || today(),
    p_source_location: sourceLocation,
    p_source_distributor_id: sourceDistributorId,
    p_note: d.note || null,
  });
  if (error) return { error: error.message };

  if (profile.role === "admin") {
    revalidatePath("/admin/ventas");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/contabilidad");
  } else {
    revalidatePath("/distribuidor");
    revalidatePath("/distribuidor/ventas");
    revalidatePath("/distribuidor/inventario");
    revalidatePath("/distribuidor/informes");
  }
  return { ok: true, message: "Venta registrada e inventario actualizado." };
}
