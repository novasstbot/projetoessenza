import { PageHeader } from "@/components/layout/page-header";
import { OpenCaixaCard } from "@/components/pdv/open-caixa-card";
import { PdvScreen } from "@/components/pdv/pdv-screen";
import { CaixasFechadosHoje, type CaixaFechadoHoje } from "@/components/pdv/caixas-fechados-hoje";
import { createClient } from "@/lib/supabase/server";
import { resolverThumb } from "@/lib/produtos/imagem";
import { unwrapRelacao } from "@/lib/supabase/relations";
import { buildTotaisPorCaixa } from "@/lib/caixa/totais";
import { requireRole } from "@/server/auth/session";
import type { ProdutoPdv } from "@/modules/pdv/types";
import type { ContaFinanceira, OperadoraCartao } from "@/modules/financeiro/types";

export default async function PdvPage() {
  const [supabase, profile] = await Promise.all([
    createClient(),
    requireRole(["admin", "gerente", "vendedor"]),
  ]);
  const canManage = profile.role === "admin" || profile.role === "gerente";

  const { data: caixa } = await supabase
    .from("caixas")
    .select("id, valor_abertura, aberto_em")
    .eq("status", "aberto")
    .maybeSingle();

  // Caixas fechados hoje por esse usuário — vendedor não tem mais acesso a
  // /caixa (que agora é só visão admin/gerente), então essa é a única forma
  // dele consultar as vendas/movimentações de uma sessão que ele já fechou.
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const { data: fechadosHojeRaw } = await supabase
    .from("caixas")
    .select("id, valor_abertura, valor_fechamento_informado, aberto_em, fechado_em")
    .eq("status", "fechado")
    .eq("aberto_por", profile.id)
    .gte("fechado_em", hojeInicio.toISOString())
    .order("fechado_em", { ascending: false });

  const fechadosHojeIds = (fechadosHojeRaw ?? []).map((c) => c.id);
  const { data: movFechadosHoje } =
    fechadosHojeIds.length > 0
      ? await supabase
          .from("movimentacoes_caixa")
          .select("caixa_id, tipo, valor")
          .in("caixa_id", fechadosHojeIds)
      : { data: [] };
  const totaisFechadosHoje = buildTotaisPorCaixa(movFechadosHoje ?? []);

  const caixasFechadosHoje: CaixaFechadoHoje[] = (fechadosHojeRaw ?? []).map((c) => {
    const totais = totaisFechadosHoje.get(c.id) ?? { entradas: 0, saidas: 0 };
    return {
      id: c.id,
      valor_abertura: c.valor_abertura,
      valor_fechamento_informado: c.valor_fechamento_informado,
      aberto_em: c.aberto_em,
      fechado_em: c.fechado_em as string,
      entradas: totais.entradas,
      saidas: totais.saidas,
    };
  });

  if (!caixa) {
    return (
      <div className="space-y-6">
        <PageHeader title="PDV / Vendas" description="Frente de caixa da Essenza." />
        <OpenCaixaCard />
        <CaixasFechadosHoje caixas={caixasFechadosHoje} canManage={canManage} />
      </div>
    );
  }

  const [
    { data: variantes },
    { data: estoqueAtual },
    { data: formasPagamento },
    { data: clientes },
    { data: movimentosCaixa },
    { data: contasFinanceiras },
    { data: operadoras },
  ] = await Promise.all([
      supabase
        .from("produto_variantes")
        .select(
          "id, nome, codigo_interno, preco_venda, produto_codigos_barra(codigo, principal), variante_imagens(id, path_thumb, principal, ordem), produtos!inner(ativo, produto_imagens(id, path_thumb, principal, ordem), categorias(imagem_thumb))",
        )
        .eq("ativo", true)
        .eq("produtos.ativo", true)
        .order("nome"),
      supabase.from("estoque_atual").select("variante_id, quantidade_atual"),
      // Formas de pagamento sem conta de destino configurada ainda não
      // podem ser usadas pra vender (finalizar_venda rejeitaria) — nem
      // aparecem aqui até alguém configurar o destino em Configurações.
      supabase
        .from("formas_pagamento")
        .select("id, nome, eh_cartao")
        .eq("ativo", true)
        .or("eh_cartao.eq.true,conta_financeira_id.not.is.null")
        .order("nome"),
      supabase
        .from("customers")
        .select("id, full_name, cpf_cnpj")
        .eq("ativo", true)
        .order("full_name"),
      supabase.from("movimentacoes_caixa").select("caixa_id, tipo, valor").eq("caixa_id", caixa.id),
      supabase
        .from("contas_financeiras")
        .select(
          "id, nome, tipo, ativo, banco_nome, agencia, numero_conta, saldo_inicial, data_saldo_inicial",
        )
        .eq("ativo", true)
        .neq("tipo", "caixa_fisico")
        .order("nome"),
      supabase
        .from("operadoras_cartao")
        .select(
          "id, nome, ativo, operadora_modalidades(id, operadora_id, modalidade, parcelas, taxa_percentual, taxa_antecipacao_percentual, prazo_dias, conta_destino_id, ativo)",
        )
        .eq("ativo", true)
        .order("nome"),
    ]);

  const totais = buildTotaisPorCaixa(movimentosCaixa ?? []).get(caixa.id) ?? {
    entradas: 0,
    saidas: 0,
  };
  const esperado = caixa.valor_abertura + totais.entradas - totais.saidas;

  const estoquePorVariante = new Map(
    (estoqueAtual ?? []).map((item) => [item.variante_id, item.quantidade_atual]),
  );

  const produtosPdv: ProdutoPdv[] = (variantes ?? []).map((v) => {
    const codigos = v.produto_codigos_barra;
    const codigoPrincipal = codigos.find((c) => c.principal) ?? codigos[0];
    const produtoDaVariante = unwrapRelacao(v.produtos);
    const categoriaDoProduto = unwrapRelacao(produtoDaVariante?.categorias);
    return {
      id: v.id,
      nome: v.nome,
      codigo_interno: v.codigo_interno,
      codigo_ean: codigoPrincipal?.codigo ?? null,
      preco_venda: v.preco_venda,
      quantidade_atual: estoquePorVariante.get(v.id) ?? 0,
      imagem_thumb: resolverThumb(
        { variante_imagens: v.variante_imagens },
        { produto_imagens: produtoDaVariante?.produto_imagens ?? [] },
        categoriaDoProduto,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="PDV / Vendas" description="Frente de caixa da Essenza." />
      <PdvScreen
        produtos={produtosPdv}
        formasPagamento={formasPagamento ?? []}
        operadoras={(operadoras as OperadoraCartao[]) ?? []}
        clientes={clientes ?? []}
        caixaId={caixa.id}
        caixaAbertoEm={caixa.aberto_em}
        esperado={esperado}
        contasSuprimento={(contasFinanceiras as ContaFinanceira[]) ?? []}
      />
      <CaixasFechadosHoje caixas={caixasFechadosHoje} canManage={canManage} />
    </div>
  );
}
