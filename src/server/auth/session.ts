import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "gerente" | "vendedor" | "estoquista";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  ativo: boolean;
};

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, ativo")
    .eq("id", userData.user.id)
    .single();

  return (profile as Profile) ?? null;
}

export async function requireSession() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: UserRole[]) {
  const profile = await getProfile();
  if (!profile || !profile.ativo || !roles.includes(profile.role)) {
    redirect("/dashboard");
  }
  return profile;
}
