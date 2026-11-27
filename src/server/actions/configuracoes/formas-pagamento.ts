"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  formaPagamentoSchema,
  type FormaPagamentoFormValues,
} from "@/modules/financeiro/schemas";

export async function createFormaPagamento(values: FormaPagamentoFormValues) {
  const profile = await requireRole(["admin"]);
  const parsed = formaPagamentoSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("formas_pagamento")
    .insert({ nome: parsed.nome, usa_operadora: parsed.usaOperadora })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe uma forma de pagamento com esse nome." : error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "formas_pagamento",
    entity_id: data.id,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/pdv");
}

export async function toggleFormaPagamentoAtiva(id: string, ativo: boolean) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase.from("formas_pagamento").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "formas_pagamento",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/pdv");
}

export async function updateFormaPagamentoNome(id: string, nome: string) {
  const profile = await requireRole(["admin"]);
  if (nome.trim().length < 2) throw new Error("Informe o nome da forma de pagamento.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("formas_pagamento")
    .update({ nome: nome.trim() })
    .eq("id", id);

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe uma forma de pagamento com esse nome." : error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "formas_pagamento",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/pdv");
}

// Bloqueado pela FK normal (código 23503) quando já existe pagamento de
// venda vinculado — nesse caso é só inativar, não excluir.
export async function deleteFormaPagamento(id: string) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase.from("formas_pagamento").delete().eq("id", id);

  if (error) {
    throw new Error(
      error.code === "23503"
        ? "Não é possível remover: já tem venda com essa forma de pagamento. Inative em vez disso."
        : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "delete",
    entity: "formas_pagamento",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/pdv");
}

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
