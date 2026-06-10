import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente de Supabase para Server Components, Server Actions y rutas.
 * Usa las cookies de la petición para la sesión del usuario.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component: se ignora (el refresco de
          // sesión lo maneja el middleware).
        }
      },
    },
  });
}
