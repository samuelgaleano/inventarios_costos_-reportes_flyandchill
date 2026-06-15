"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { notifyAdminOfSale } from "@/lib/email/send";
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
  seller: z.string().optional(), // "dist:<uuid>" (atribución de comisión, admin)
  channel: z.string().optional(),
  unit_price: z.coerce.number().min(0).optional(),
  note: z.string().trim().optional(),
});

function distId(value: string | undefined): string | null {
  return value && value.startsWith("dist:") ? value.slice(5) : null;
}

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

  // Origen (admin). El distribuidor lo fuerza la función SQL.
  let sourceLocation: InventoryLocation = "bodega";
  let sourceDistributorId: string | null = null;
  const od = distId(d.origin);
  if (od) {
    sourceLocation = "distribuidor";
    sourceDistributorId = od;
  }
  // Vendedor que gana la comisión/margen (admin). Por defecto, el origen.
  const sellerDistributorId = distId(d.seller) ?? sourceDistributorId;

  const didSale = formData.has("did_sale");
  const didShipping = formData.has("did_shipping");
  const isPaid = formData.has("is_paid");

  const supabase = await createClient();
  const { data: saleId, error } = await supabase.rpc("register_sale", {
    p_product_id: d.product_id,
    p_quantity: d.quantity,
    p_payment_method: d.payment_method,
    p_sale_date: d.sale_date || today(),
    p_source_location: sourceLocation,
    p_source_distributor_id: sourceDistributorId,
    p_note: d.note || null,
    p_channel: d.channel || null,
    p_did_sale: didSale,
    p_did_shipping: didShipping,
    p_is_paid: isPaid,
    p_unit_price: d.unit_price && d.unit_price > 0 ? d.unit_price : null,
    p_seller_distributor_id: sellerDistributorId,
  });
  if (error) return { error: error.message };

  // Notificación al administrador (mejor esfuerzo; no bloquea la venta)
  if (saleId) {
    try {
      await notifyAdminOfSale(saleId as string);
    } catch {
      /* sin correo configurado: se ignora */
    }
  }

  if (profile.role === "admin") {
    revalidatePath("/admin/ventas");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/contabilidad");
    revalidatePath("/admin");
  } else {
    revalidatePath("/distribuidor");
    revalidatePath("/distribuidor/ventas");
    revalidatePath("/distribuidor/inventario");
    revalidatePath("/distribuidor/informes");
  }
  return { ok: true, message: "Venta registrada e inventario actualizado." };
}

export async function setSalePaid(saleId: string, paid: boolean) {
  await requireAuth();
  const supabase = await createClient();
  await supabase.rpc("set_sale_paid", { p_sale_id: saleId, p_paid: paid });
  revalidatePath("/admin/ventas");
  revalidatePath("/distribuidor/ventas");
  revalidatePath("/distribuidor/informes");
}
