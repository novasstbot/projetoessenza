import { PageHeader } from "@/components/layout/page-header";
import { OpenCaixaCard } from "@/components/pdv/open-caixa-card";
import { PdvScreen } from "@/components/pdv/pdv-screen";
import { createClient } from "@/lib/supabase/server";
import type { ProdutoPdv } from "@/modules/pdv/types";

export default async function PdvPage() {
  const supabase = await createClient();

  const { data: caixa } = await supabase
    .from("caixas")
    .select("id, aberto_em")
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

  const [{ data: produtos }, { data: estoqueAtual }, { data: formasPagamento }, { data: clientes }] =
    await Promise.all([
      supabase
        .from("produtos")
        .select("id, nome, codigo_interno, codigo_ean, preco_venda")
        .eq("ativo", true)
        .order("nome"),
      supabase.from("estoque_atual").select("produto_id, quantidade_atual"),
      supabase.from("formas_pagamento").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("customers").select("id, full_name").eq("ativo", true).order("full_name"),
    ]);

  const estoquePorProduto = new Map(
    (estoqueAtual ?? []).map((item) => [item.produto_id, item.quantidade_atual]),
  );

  const produtosPdv: ProdutoPdv[] = (produtos ?? []).map((p) => ({
    ...p,
    quantidade_atual: estoquePorProduto.get(p.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader title="PDV / Vendas" description="Frente de caixa da Essenza." />
      <PdvScreen
        produtos={produtosPdv}
        formasPagamento={formasPagamento ?? []}
        clientes={clientes ?? []}
        caixaId={caixa.id}
        caixaAbertoEm={caixa.aberto_em}
      />
    </div>
  );
}
