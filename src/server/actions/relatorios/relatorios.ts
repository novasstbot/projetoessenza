"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { buildTotaisPorCaixa } from "@/lib/caixa/totais";

function dozeMesesAtras() {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d.toISOString();
}

export async function getVendasPeriodo() {
  await requireRole(["admin", "gerente", "vendedor"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendas")
    .select(
      "id, total, desconto, status, created_at, customers(full_name), itens_venda(quantidade, preco_unitario, subtotal, produto_variantes(nome)), venda_pagamentos(valor, formas_pagamento(nome))",
    )
    .gte("created_at", dozeMesesAtras())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data;
}

export async function getCaixasPeriodo() {
  await requireRole(["admin", "gerente"]);

  const supabase = await createClient();

  const { data: caixas, error: caixasError } = await supabase
    .from("caixas")
    .select("id, status, valor_abertura, aberto_em, fechado_em, valor_fechamento_informado")
    .gte("aberto_em", dozeMesesAtras())
    .order("aberto_em", { ascending: false });
  if (caixasError) throw new Error(caixasError.message);

  const caixaIds = (caixas ?? []).map((c) => c.id);
  const { data: movimentos, error: movError } =
    caixaIds.length > 0
      ? await supabase
          .from("movimentacoes_caixa")
          .select("caixa_id, tipo, categoria, valor, created_at")
          .in("caixa_id", caixaIds)
      : { data: [], error: null };
  if (movError) throw new Error(movError.message);

  const totaisPorCaixa = buildTotaisPorCaixa(movimentos ?? []);

  const caixasComTotais = (caixas ?? []).map((c) => {
    const totais = totaisPorCaixa.get(c.id) ?? { entradas: 0, saidas: 0 };
    const esperado = c.valor_abertura + totais.entradas - totais.saidas;
    const diferenca =
      c.valor_fechamento_informado !== null ? c.valor_fechamento_informado - esperado : null;
    return { ...c, entradas: totais.entradas, saidas: totais.saidas, esperado, diferenca };
  });

  // Bruto (não agregado por categoria aqui) pra quem exibe poder filtrar por
  // período no cliente, igual já faz com vendas e caixas.
  return { caixas: caixasComTotais, movimentos: movimentos ?? [] };
}

export async function getEstoqueAtualDetalhado() {
  await requireRole(["admin", "gerente", "vendedor"]);

  const supabase = await createClient();
  const [{ data: variantes, error: variantesError }, { data: estoqueAtual, error: estoqueError }] =
    await Promise.all([
      supabase
        .from("produto_variantes")
        .select(
          "id, nome, codigo_interno, estoque_minimo, validade, custo, produtos!inner(nome, ativo)",
        )
        .eq("ativo", true)
        .eq("produtos.ativo", true)
        .order("nome"),
      supabase.from("estoque_atual").select("variante_id, quantidade_atual"),
    ]);
  if (variantesError) throw new Error(variantesError.message);
  if (estoqueError) throw new Error(estoqueError.message);

  const quantidadePorVariante = new Map(
    (estoqueAtual ?? []).map((item) => [item.variante_id, item.quantidade_atual]),
  );

  return (variantes ?? []).map((v) => ({
    id: v.id,
    nome: v.nome,
    produto_nome: v.produtos[0]?.nome ?? "—",
    codigo_interno: v.codigo_interno,
    estoque_minimo: v.estoque_minimo,
    validade: v.validade,
    custo: v.custo,
    quantidade_atual: quantidadePorVariante.get(v.id) ?? 0,
    tem_movimentacao: quantidadePorVariante.has(v.id),
  }));
}

export async function getMovimentacoesEstoquePeriodo() {
  await requireRole(["admin", "gerente", "vendedor"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimentacoes_estoque")
    .select(
      "id, variante_id, tipo, quantidade, motivo, origem, created_at, produto_variantes(nome, codigo_interno)",
    )
    .gte("created_at", dozeMesesAtras())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data;
}
