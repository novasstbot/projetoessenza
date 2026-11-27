"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  contaFinanceiraSchema,
  type ContaFinanceiraFormValues,
} from "@/modules/financeiro/schemas";

function normalizeConta(values: ContaFinanceiraFormValues) {
  return {
    nome: values.nome,
    tipo: values.tipo,
    banco_nome: values.bancoNome || null,
    agencia: values.agencia || null,
    numero_conta: values.numeroConta || null,
    saldo_inicial: values.saldoInicial,
    data_saldo_inicial: values.dataSaldoInicial || null,
  };
}

export async function createContaFinanceira(values: ContaFinanceiraFormValues) {
  const profile = await requireRole(["admin"]);
  const parsed = contaFinanceiraSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contas_financeiras")
    .insert(normalizeConta(parsed))
    .select("id")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe uma conta com esse nome." : error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "contas_financeiras",
    entity_id: data.id,
  });

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  revalidatePath("/configuracoes");
}

export async function updateContaFinanceira(id: string, values: ContaFinanceiraFormValues) {
  const profile = await requireRole(["admin"]);
  const parsed = contaFinanceiraSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase
    .from("contas_financeiras")
    .update(normalizeConta(parsed))
    .eq("id", id);

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe uma conta com esse nome." : error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "contas_financeiras",
    entity_id: id,
  });

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  revalidatePath("/configuracoes");
}

// Conta com movimentações não pode ser excluída (preserva histórico) —
// só inativar, mesmo padrão de toggleProdutoAtivo.
export async function toggleContaFinanceiraAtiva(id: string, ativo: boolean) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase.from("contas_financeiras").update({ ativo }).eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "contas_financeiras",
    entity_id: id,
  });

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  revalidatePath("/configuracoes");
}
