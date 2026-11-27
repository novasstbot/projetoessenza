import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession, getProfile } from "@/server/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (profile && !profile.ativo) redirect("/login?inativo=1");

  const role = profile?.role ?? "vendedor";
  const supabase = await createClient();
  const { data: negados } = await supabase
    .from("permissoes_menu_negadas")
    .select("menu_id")
    .eq("role", role);

  return (
    <AppShell
      fullName={profile?.full_name ?? null}
      email={user.email ?? null}
      role={role}
      menusNegados={(negados ?? []).map((n) => n.menu_id)}
    >
      {children}
    </AppShell>
  );
}
