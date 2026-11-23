import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession, getProfile } from "@/server/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const profile = await getProfile();

  return (
    <AppShell
      fullName={profile?.full_name ?? null}
      email={user.email ?? null}
      role={profile?.role ?? "vendedor"}
    >
      {children}
    </AppShell>
  );
}
