import { requireDistributor } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function DistribuidorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireDistributor();
  return (
    <AppShell role="distribuidor" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
