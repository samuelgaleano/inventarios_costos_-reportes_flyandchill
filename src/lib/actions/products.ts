"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "./types";

const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  sku: z.string().trim().optional(),
  unit_cost: z.coerce.number().min(0, "El costo no puede ser negativo."),
  shipping_cost: z.coerce.number().min(0, "El envío no puede ser negativo."),
  operating_cost: z.coerce.number().min(0, "El operativo no puede ser negativo."),
});

export async function createProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name: parsed.data.name,
    sku: parsed.data.sku || null,
    unit_cost: parsed.data.unit_cost,
    shipping_cost: parsed.data.shipping_cost,
    operating_cost: parsed.data.operating_cost,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/precios");
  revalidatePath("/admin/inventario");
  return { ok: true, message: "Producto creado correctamente." };
}

export async function updateProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador del producto." };
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      unit_cost: parsed.data.unit_cost,
      shipping_cost: parsed.data.shipping_cost,
      operating_cost: parsed.data.operating_cost,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/precios");
  revalidatePath("/admin/inventario");
  return { ok: true, message: "Producto actualizado." };
}

export async function toggleProductActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("products").update({ active }).eq("id", id);
  revalidatePath("/admin/precios");
}

const pricingSchema = z.object({
  investor_pct: z.coerce.number().min(0).max(100),
  distributor_pct: z.coerce.number().min(0).max(100),
  company_pct: z.coerce.number().min(0).max(100),
  gateway_pct: z.coerce.number().min(0).max(100),
  discount_pct: z.coerce.number().min(0).max(99),
  rounding: z.coerce.number().int().min(0),
});

export async function updatePricingSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = pricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const marginSum =
    d.investor_pct + d.distributor_pct + d.company_pct + d.gateway_pct;
  if (marginSum >= 100) {
    return {
      error: `La suma de márgenes (${marginSum.toFixed(1)}%) debe ser menor a 100%.`,
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("pricing_settings")
    .update({
      investor_pct: d.investor_pct / 100,
      distributor_pct: d.distributor_pct / 100,
      company_pct: d.company_pct / 100,
      gateway_pct: d.gateway_pct / 100,
      discount_pct: d.discount_pct / 100,
      rounding: d.rounding,
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/precios");
  revalidatePath("/admin/inventario");
  return { ok: true, message: "Configuración de precios guardada." };
}
