import { PageHeader } from "@/components/layout/page-header";
import { OpenCaixaCard } from "@/components/pdv/open-caixa-card";
import { PdvScreen } from "@/components/pdv/pdv-screen";
import { createClient } from "@/lib/supabase/server";
import { resolverThumb } from "@/lib/produtos/imagem";
import { unwrapRelacao } from "@/lib/supabase/relations";
import { buildTotaisPorCaixa } from "@/lib/caixa/totais";
import { requireRole } from "@/server/auth/session";
import type { ProdutoPdv } from "@/modules/pdv/types";
import type { ContaFinanceira, OperadoraCartao } from "@/modules/financeiro/types";

export default async function PdvPage() {
  const [supabase] = await Promise.all([
    createClient(),
    requireRole(["admin", "gerente", "vendedor"]),
  ]);

  const { data: caixa } = await supabase
    .from("caixas")
    .select("id, valor_abertura, aberto_em")
    .eq("status", "aberto")
    .maybeSingle();

  if (!caixa) {
    return (
      <div>
        <PageHeader title="PDV / Vendas" description="Frente de caixa da Essenza." />
        <OpenCaixaCard />
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
      supabase.from("formas_pagamento").select("id, nome, eh_cartao").eq("ativo", true).order("nome"),
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
    <div>
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
    </div>
  );
}
