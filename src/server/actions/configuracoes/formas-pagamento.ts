"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";

export async function updateFormaPagamentoContaDestino(
  formaPagamentoId: string,
  contaFinanceiraId: string,
) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("formas_pagamento")
    .update({ conta_financeira_id: contaFinanceiraId })
    .eq("id", formaPagamentoId);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "formas_pagamento",
    entity_id: formaPagamentoId,
  });

  revalidatePath("/configuracoes");
}
