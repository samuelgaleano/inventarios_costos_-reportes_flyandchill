"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Calculator,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/login/actions";
import type { UserRole } from "@/lib/supabase/types";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Fly & Chill";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/precios", label: "Productos y precios", icon: Calculator },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/ventas", label: "Ventas", icon: Receipt },
  { href: "/admin/contabilidad", label: "Contabilidad", icon: BarChart3 },
  { href: "/admin/informes", label: "Informes", icon: FileText },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

const DIST_NAV: NavItem[] = [
  { href: "/distribuidor", label: "Panel", icon: LayoutDashboard },
  { href: "/distribuidor/ventas", label: "Registrar venta", icon: Receipt },
  { href: "/distribuidor/inventario", label: "Mi inventario", icon: Boxes },
  { href: "/distribuidor/informes", label: "Mis informes", icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/distribuidor") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({
  role,
  userName,
  children,
}: {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = role === "admin" ? ADMIN_NAV : DIST_NAV;

  const navList = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
          F
        </div>
        <span className="font-semibold tracking-tight">{APP_NAME}</span>
      </div>
      {navList}
      <div className="border-t p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium">{userName || "Usuario"}</p>
          <p className="text-xs capitalize text-muted-foreground">{role}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar fijo (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        {sidebarInner}
      </aside>

      {/* Drawer (móvil) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Barra superior (móvil) */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground">
            F
          </div>
          <span className="font-semibold">{APP_NAME}</span>
        </div>
      </header>

      {/* Contenido */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
