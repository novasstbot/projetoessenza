"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, type UserRole } from "@/server/auth/session";

export async function getUsuarios() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_usuarios");

  if (error) throw new Error(error.message);

  return data as { id: string; full_name: string | null; role: UserRole; ativo: boolean; email: string }[];
}

export async function atualizarUsuario(
  userId: string,
  values: { role: UserRole; ativo: boolean },
) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: values.role, ativo: values.ativo })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "profiles",
    entity_id: userId,
  });

  revalidatePath("/configuracoes");
}
