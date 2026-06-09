import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Fly & Chill";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · Gestión`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Plataforma de precios, inventario, ventas e informes de Fly & Chill.",
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b9e8f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
