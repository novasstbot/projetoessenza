"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  operadoraCartaoSchema,
  operadoraModalidadeSchema,
  type OperadoraCartaoFormValues,
  type OperadoraModalidadeFormValues,
} from "@/modules/financeiro/schemas";

export async function createOperadoraCartao(values: OperadoraCartaoFormValues) {
  const profile = await requireRole(["admin"]);
  const parsed = operadoraCartaoSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operadoras_cartao")
    .insert({ nome: parsed.nome })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe uma operadora com esse nome." : error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "operadoras_cartao",
    entity_id: data.id,
  });

  revalidatePath("/configuracoes");
}

export async function toggleOperadoraCartaoAtiva(id: string, ativo: boolean) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase.from("operadoras_cartao").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "operadoras_cartao",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
}

export async function updateOperadoraCartao(id: string, nome: string) {
  const profile = await requireRole(["admin"]);
  const parsed = operadoraCartaoSchema.parse({ nome });

  const supabase = await createClient();
  const { error } = await supabase
    .from("operadoras_cartao")
    .update({ nome: parsed.nome })
    .eq("id", id);

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe uma operadora com esse nome." : error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "operadoras_cartao",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
}

// Bloqueado pela FK normal (código 23503) quando já existe recebível
// vinculado — nesse caso é só inativar, não excluir.
export async function deleteOperadoraCartao(id: string) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase.from("operadoras_cartao").delete().eq("id", id);

  if (error) {
    throw new Error(
      error.code === "23503"
        ? "Não é possível remover: existem recebíveis vinculados. Inative em vez disso."
        : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "delete",
    entity: "operadoras_cartao",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
}

function normalizeModalidade(values: OperadoraModalidadeFormValues) {
  return {
    modalidade: values.modalidade,
    parcelas: values.parcelas,
    taxa_percentual: values.taxaPercentual,
    taxa_antecipacao_percentual: values.taxaAntecipacaoPercentual ?? null,
    prazo_dias: values.prazoDias,
    conta_destino_id: values.contaDestinoId,
  };
}

export async function createOperadoraModalidade(
  operadoraId: string,
  values: OperadoraModalidadeFormValues,
) {
  const profile = await requireRole(["admin"]);
  const parsed = operadoraModalidadeSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operadora_modalidades")
    .insert({ operadora_id: operadoraId, ...normalizeModalidade(parsed) })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe essa modalidade com esse nº de parcelas." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "operadora_modalidades",
    entity_id: data.id,
  });

  revalidatePath("/configuracoes");
}

export async function updateOperadoraModalidade(id: string, values: OperadoraModalidadeFormValues) {
  const profile = await requireRole(["admin"]);
  const parsed = operadoraModalidadeSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase
    .from("operadora_modalidades")
    .update(normalizeModalidade(parsed))
    .eq("id", id);

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe essa modalidade com esse nº de parcelas." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "operadora_modalidades",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
}

export async function toggleOperadoraModalidadeAtiva(id: string, ativo: boolean) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase.from("operadora_modalidades").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "operadora_modalidades",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
}
