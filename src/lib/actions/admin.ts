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
