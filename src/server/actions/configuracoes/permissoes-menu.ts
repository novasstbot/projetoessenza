"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, type UserRole } from "@/server/auth/session";

export async function getPermissoesMenuNegadas() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data, error } = await supabase.from("permissoes_menu_negadas").select("role, menu_id");

  if (error) throw new Error(error.message);

  return data as { role: UserRole; menu_id: string }[];
}

// Liberado = remove a linha de negação (por padrão todo item é liberado).
// Negado = garante que a linha exista.
export async function setMenuLiberadoParaPapel(
  role: UserRole,
  menuId: string,
  liberado: boolean,
) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  if (liberado) {
    const { error } = await supabase
      .from("permissoes_menu_negadas")
      .delete()
      .eq("role", role)
      .eq("menu_id", menuId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("permissoes_menu_negadas")
      .upsert({ role, menu_id: menuId }, { onConflict: "role,menu_id" });
    if (error) throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: liberado ? "liberar" : "negar",
    entity: "permissoes_menu_negadas",
    entity_id: `${role}:${menuId}`,
  });

  revalidatePath("/configuracoes");
}
