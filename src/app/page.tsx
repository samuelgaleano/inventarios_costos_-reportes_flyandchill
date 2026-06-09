import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, Calculator, Receipt } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Fly & Chill";

const features = [
  {
    icon: Calculator,
    title: "Precios",
    desc: "Calcula el precio de venta y el reparto por inversionista, distribuidor y empresa con porcentajes configurables.",
  },
  {
    icon: Boxes,
    title: "Inventario",
    desc: "Bodega y distribuidor sincronizados: compras, transferencias y descuento automático al vender.",
  },
  {
    icon: Receipt,
    title: "Ventas",
    desc: "Registra ventas desde el panel del administrador o del distribuidor, en computador o celular.",
  },
  {
    icon: BarChart3,
    title: "Informes",
    desc: "Contabilidad mensual, ganancias desglosadas e informes automáticos por correo.",
  },
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground font-bold">
            F
          </div>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Ingresar <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 pb-16 pt-10 text-center md:pt-20">
        <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Gestión de precios, inventario y ventas
        </span>
        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Todo el control de{" "}
          <span className="text-brand">{APP_NAME}</span> en una sola plataforma
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-muted-foreground">
          Reemplaza el Excel por un sistema web que optimiza precios, mantiene
          el inventario al día en tiempo real y genera tus informes
          automáticamente. Accede desde el computador o el celular.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90"
          >
            Entrar al panel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Sistema interno de gestión.
        </div>
      </footer>
    </main>
  );
}
