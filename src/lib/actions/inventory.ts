"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

const purchaseSchema = z.object({
  product_id: z.string().uuid("Selecciona un producto."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0."),
  unit_cost: z.coerce.number().min(0).optional(),
  date: z.string().optional(),
  note: z.string().trim().optional(),
});

export async function registerPurchase(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_purchase", {
    p_product_id: d.product_id,
    p_quantity: d.quantity,
    p_unit_cost: d.unit_cost ?? 0,
    p_date: d.date || today(),
    p_note: d.note || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/inventario");
  return { ok: true, message: "Compra registrada y sumada a bodega." };
}

const transferSchema = z.object({
  product_id: z.string().uuid("Selecciona un producto."),
  distributor_id: z.string().uuid("Selecciona un distribuidor."),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0."),
  note: z.string().trim().optional(),
});

export async function transferInventory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_inventory", {
    p_product_id: d.product_id,
    p_distributor_id: d.distributor_id,
    p_quantity: d.quantity,
    p_note: d.note || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/inventario");
  return { ok: true, message: "Transferencia realizada a la bodega del distribuidor." };
}
