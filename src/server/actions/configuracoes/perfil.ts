"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";

// Qualquer papel pode mexer no próprio nome — RLS de profiles já cobre
// isso (auth.uid() = id), e o trigger de auto-escalação de papel não
// se aplica aqui porque não tocamos em `role`.
export async function atualizarMeuPerfil(fullName: string) {
  const user = await requireSession();
  if (fullName.trim().length < 2) {
    throw new Error("Informe seu nome completo.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes");
}
