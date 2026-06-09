import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuth, roleHome } from "@/lib/auth";
import { LoginForm } from "./login-form";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Fly & Chill";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage() {
  const auth = await getAuth();
  if (auth) redirect(roleHome(auth.profile.role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-brand-foreground">
            F
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa para gestionar precios, inventario y ventas.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Problemas para ingresar? Contacta al administrador.
        </p>
      </div>
    </main>
  );
}
