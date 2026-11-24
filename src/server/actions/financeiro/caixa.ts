"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  sangriaSchema,
  suprimentoSchema,
  despesaCaixaSchema,
  ajusteCaixaSchema,
  type SangriaFormValues,
  type SuprimentoFormValues,
  type DespesaCaixaFormValues,
  type AjusteCaixaFormValues,
} from "@/modules/financeiro/schemas";

export async function registrarSangria(caixaId: string, values: SangriaFormValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = sangriaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_sangria", {
    p_caixa_id: caixaId,
    p_valor: parsed.valor,
    p_destino_tipo: parsed.destinoTipo,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}

export async function registrarSuprimento(caixaId: string, values: SuprimentoFormValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = suprimentoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_suprimento", {
    p_caixa_id: caixaId,
    p_valor: parsed.valor,
    p_origem_conta_id: parsed.origemContaId,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}

export async function registrarDespesaCaixa(caixaId: string, values: DespesaCaixaFormValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = despesaCaixaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_despesa_caixa", {
    p_caixa_id: caixaId,
    p_descricao: parsed.descricao,
    p_categoria: parsed.categoria,
    p_valor: parsed.valor,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}

export async function getDetalhesCaixa(caixaId: string) {
  await requireRole(["admin", "gerente", "vendedor"]);

  const supabase = await createClient();

  const { data: caixa, error: caixaError } = await supabase
    .from("caixas")
    .select(
      "id, status, valor_abertura, aberto_em, fechado_em, valor_fechamento_informado, observacao_fechamento, contagem_cedulas",
    )
    .eq("id", caixaId)
    .single();
  if (caixaError) throw new Error(caixaError.message);

  const { data: movimentos, error: movError } = await supabase
    .from("movimentacoes_caixa")
    .select("id, tipo, categoria, valor, descricao, created_at, user_id, autorizado_por")
    .eq("caixa_id", caixaId)
    .order("created_at", { ascending: true });
  if (movError) throw new Error(movError.message);

  const userIds = [
    ...new Set((movimentos ?? []).flatMap((m) => [m.user_id, m.autorizado_por].filter(Boolean))),
  ] as string[];

  const { data: perfis } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
  const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p.full_name]));

  const movIds = (movimentos ?? []).map((m) => m.id);
  const { data: contrapartes } =
    movIds.length > 0
      ? await supabase
          .from("movimentacoes_financeiras")
          .select("movimentacao_caixa_id, tipo, contas_financeiras(nome)")
          .in("movimentacao_caixa_id", movIds)
      : { data: [] };
  const contrapartePorMovId = new Map(
    (contrapartes ?? []).map((c) => [
      c.movimentacao_caixa_id,
      `${c.tipo === "entrada" ? "veio de" : "foi para"} ${(c.contas_financeiras as unknown as { nome: string } | null)?.nome ?? "—"}`,
    ]),
  );

  const movimentosDetalhados = (movimentos ?? []).map((m) => ({
    id: m.id,
    tipo: m.tipo,
    categoria: m.categoria,
    valor: m.valor,
    descricao: m.descricao,
    created_at: m.created_at,
    profiles: { full_name: perfilPorId.get(m.user_id) ?? null },
    autorizado_por_profile: m.autorizado_por
      ? { full_name: perfilPorId.get(m.autorizado_por) ?? null }
      : null,
    contraparte: contrapartePorMovId.get(m.id) ?? null,
  }));

  return { caixa, movimentos: movimentosDetalhados };
}

export async function registrarAjusteCaixa(caixaId: string, values: AjusteCaixaFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = ajusteCaixaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_ajuste_caixa", {
    p_caixa_id: caixaId,
    p_tipo: parsed.tipo,
    p_valor: parsed.valor,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}
