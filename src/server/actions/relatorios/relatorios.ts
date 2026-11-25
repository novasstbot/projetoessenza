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
      "id, total, desconto, status, created_at, customers(full_name), itens_venda(quantidade, preco_unitario, subtotal, produtos(nome)), venda_pagamentos(valor, formas_pagamento(nome))",
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
