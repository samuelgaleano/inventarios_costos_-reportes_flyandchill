import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { ProfileRow, UserRole } from "./supabase/types";

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: ProfileRow;
}

/** Ruta de inicio según el rol. */
export function roleHome(role: UserRole): string {
  return role === "admin" ? "/admin" : "/distribuidor";
}

/** Usuario + perfil actuales (o null si no hay sesión). */
export async function getAuth(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { userId: user.id, email: user.email ?? null, profile };
}

/** Exige sesión activa; redirige a /login si no la hay. */
export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (!auth.profile.active) redirect("/login?error=inactivo");
  return auth;
}

/** Exige rol administrador. */
export async function requireAdmin(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (auth.profile.role !== "admin") redirect("/distribuidor");
  return auth;
}

/** Exige rol distribuidor con inventario asignado. */
export async function requireDistributor(): Promise<AuthContext> {
  const auth = await requireAuth();
  if (auth.profile.role !== "distribuidor") redirect("/admin");
  return auth;
}
