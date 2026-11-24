"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  contaPagarSchema,
  contaReceberSchema,
  baixarContaSchema,
  estornoSchema,
  type ContaPagarFormValues,
  type ContaReceberFormValues,
  type BaixarContaFormValues,
  type EstornoFormValues,
} from "@/modules/financeiro/schemas";

export async function criarContaPagar(values: ContaPagarFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = contaPagarSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contas_pagar")
    .insert({
      descricao: parsed.descricao,
      categoria: parsed.categoria,
      valor: parsed.valor,
      vencimento: parsed.vencimento,
      fornecedor_id: parsed.fornecedorId || null,
      user_id: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "contas_pagar",
    entity_id: data.id,
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function criarContaReceber(values: ContaReceberFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = contaReceberSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contas_receber")
    .insert({
      descricao: parsed.descricao,
      valor: parsed.valor,
      vencimento: parsed.vencimento,
      cliente_id: parsed.clienteId || null,
      user_id: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "contas_receber",
    entity_id: data.id,
  });

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function baixarContaPagar(contaId: string, values: BaixarContaFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = baixarContaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("baixar_conta_pagar", {
    p_conta_pagar_id: contaId,
    p_conta_financeira_id: parsed.contaFinanceiraId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  revalidatePath("/dashboard");
}

export async function baixarContaReceber(contaId: string, values: BaixarContaFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = baixarContaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("baixar_conta_receber", {
    p_conta_receber_id: contaId,
    p_conta_financeira_id: parsed.contaFinanceiraId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  revalidatePath("/dashboard");
}

export async function estornarBaixaContaPagar(contaId: string, values: EstornoFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = estornoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("estornar_baixa_conta_pagar", {
    p_conta_pagar_id: contaId,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  revalidatePath("/dashboard");
}

export async function estornarBaixaContaReceber(contaId: string, values: EstornoFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = estornoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("estornar_baixa_conta_receber", {
    p_conta_receber_id: contaId,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
  revalidatePath("/dashboard");
}
