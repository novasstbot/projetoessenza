"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, type UserRole } from "@/server/auth/session";

export async function criarUsuario(values: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const profile = await requireRole(["admin"]);

  if (values.fullName.trim().length < 2) throw new Error("Informe o nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    throw new Error("Informe um e-mail válido.");
  }
  if (values.password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: values.email.trim(),
    password: values.password,
    email_confirm: true,
    user_metadata: { full_name: values.fullName.trim() },
  });

  if (error) {
    throw new Error(
      error.message.includes("already been registered")
        ? "Já existe um usuário com esse e-mail."
        : error.message,
    );
  }

  // O trigger `on_auth_user_created` já criou o profile (papel padrão
  // "vendedor") — ajusta pro papel escolhido na tela.
  const supabase = await createClient();
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: values.role })
    .eq("id", data.user.id);

  if (roleError) throw new Error(roleError.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "profiles",
    entity_id: data.user.id,
  });

  revalidatePath("/configuracoes");
}

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
