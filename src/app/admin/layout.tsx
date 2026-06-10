import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();
  return (
    <AppShell role="admin" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
