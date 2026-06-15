"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "./types";

// ── Distribuidores ─────────────────────────────────────────────
const distributorSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  type: z.enum(["colaborador", "basico"]).optional(),
  contact_email: z.string().trim().email("Correo inválido.").optional().or(z.literal("")),
  contact_phone: z.string().trim().optional(),
});

export async function createDistributor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = distributorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("distributors").insert({
    name: d.name,
    type: d.type ?? "basico",
    contact_email: d.contact_email || null,
    contact_phone: d.contact_phone || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Distribuidor creado." };
}

// ── Acceso (cuenta de login) de distribuidor ───────────────────
const accessSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es obligatorio."),
  email: z.string().trim().email("Correo inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  distributor_id: z.string().uuid("Selecciona un distribuidor."),
});

export async function createDistributorAccess(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = accessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: {
      full_name: d.full_name,
      role: "distribuidor",
      distributor_id: d.distributor_id,
    },
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Acceso de distribuidor creado." };
}

export async function setProfileActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("profiles").update({ active }).eq("id", id);
  revalidatePath("/admin/configuracion");
}

/** Guarda los precios mayoristas (por producto) de un distribuidor básico. */
export async function setDistributorPrices(
  distributorId: string,
  prices: { product_id: string; price: number }[],
): Promise<ActionState> {
  await requireAdmin();
  if (!distributorId) return { error: "Selecciona un distribuidor." };
  const supabase = await createClient();
  const rows = prices
    .filter((p) => p.price >= 0)
    .map((p) => ({
      distributor_id: distributorId,
      product_id: p.product_id,
      price: p.price,
    }));
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from("distributor_prices").upsert(rows);
  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Precios guardados." };
}

export async function setDistributorActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("distributors").update({ active }).eq("id", id);
  revalidatePath("/admin/configuracion");
}

/** Elimina un distribuidor. Bloquea si tiene ventas registradas. */
export async function deleteDistributor(id: string): Promise<ActionState> {
  await requireAdmin();
  const admin = createAdminClient();

  const { count } = await admin
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("source_distributor_id", id);
  if ((count ?? 0) > 0) {
    return {
      error:
        "Este distribuidor tiene ventas registradas. Desactívalo en lugar de eliminarlo (para no perder el historial).",
    };
  }

  // Limpia inventario y movimientos asociados, luego elimina.
  await admin
    .from("inventory_movements")
    .delete()
    .or(`from_distributor_id.eq.${id},to_distributor_id.eq.${id}`);
  await admin.from("inventory").delete().eq("distributor_id", id);
  const { error } = await admin.from("distributors").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/inventario");
  return { ok: true };
}

/** Elimina un acceso (usuario de login). Bloquea si registró ventas. */
export async function deleteAccess(profileId: string): Promise<ActionState> {
  await requireAdmin();
  const admin = createAdminClient();

  const { count } = await admin
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("sold_by", profileId);
  if ((count ?? 0) > 0) {
    return {
      error:
        "Este usuario tiene ventas registradas a su nombre. Desactívalo en lugar de eliminarlo.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { error: error.message };

  revalidatePath("/admin/configuracion");
  return { ok: true };
}

// ── Inversionistas ─────────────────────────────────────────────
const investorSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  contact_email: z.string().trim().email("Correo inválido.").optional().or(z.literal("")),
  capital_aportado: z.coerce.number().min(0).optional(),
  participacion_pct: z.coerce.number().min(0).max(100).optional(),
});

export async function createInvestor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = investorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("investors").insert({
    name: d.name,
    contact_email: d.contact_email || null,
    capital_aportado: d.capital_aportado ?? 0,
    participacion_pct: (d.participacion_pct ?? 0) / 100,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Inversionista agregado." };
}
