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

  const [{ data: variantes }, { data: estoqueAtual }, { data: formasPagamento }, { data: clientes }] =
    await Promise.all([
      supabase
        .from("produto_variantes")
        .select(
          "id, nome, codigo_interno, preco_venda, produto_codigos_barra(codigo, principal), produtos!inner(ativo)",
        )
        .eq("ativo", true)
        .eq("produtos.ativo", true)
        .order("nome"),
      supabase.from("estoque_atual").select("variante_id, quantidade_atual"),
      supabase.from("formas_pagamento").select("id, nome").eq("ativo", true).order("nome"),
      supabase
        .from("customers")
        .select("id, full_name, cpf_cnpj")
        .eq("ativo", true)
        .order("full_name"),
    ]);

  const estoquePorVariante = new Map(
    (estoqueAtual ?? []).map((item) => [item.variante_id, item.quantidade_atual]),
  );

  const produtosPdv: ProdutoPdv[] = (variantes ?? []).map((v) => {
    const codigos = v.produto_codigos_barra;
    const codigoPrincipal = codigos.find((c) => c.principal) ?? codigos[0];
    return {
      id: v.id,
      nome: v.nome,
      codigo_interno: v.codigo_interno,
      codigo_ean: codigoPrincipal?.codigo ?? null,
      preco_venda: v.preco_venda,
      quantidade_atual: estoquePorVariante.get(v.id) ?? 0,
    };
  });

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
