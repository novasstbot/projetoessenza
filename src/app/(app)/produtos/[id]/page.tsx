import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ProdutoEditor } from "@/components/produtos/produto-editor";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import type {
  MovimentoVariante,
  ProdutoComVariantes,
  VarianteDetalhada,
} from "@/modules/produtos/types";

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "gerente"]);
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: produto }, { data: categorias }, { data: marcas }, { data: linhas }] =
    await Promise.all([
      supabase
        .from("produtos")
        .select(
          "id, nome, descricao, fabricante, categoria_id, marca_id, linha_id, ativo, created_at, categorias(id, nome), marcas(id, nome), produto_linhas(id, nome), produto_imagens(id, path_thumb, path_medium, principal, ordem), produto_variantes(id, produto_id, nome, codigo_interno, custo, preco_venda, estoque_minimo, validade, ativo, created_at, produto_codigos_barra(id, codigo, tipo, principal), produto_variante_atributos(id, atributo, valor), variante_imagens(id, path_thumb, path_medium, principal, ordem))",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.from("categorias").select("id, nome").order("nome"),
      supabase.from("marcas").select("id, nome").order("nome"),
      supabase.from("produto_linhas").select("id, nome").order("nome"),
    ]);

  if (!produto) {
    notFound();
  }

  const varianteIds = produto.produto_variantes.map((v: { id: string }) => v.id);

  const [{ data: estoque }, { data: movimentos }] = await Promise.all([
    varianteIds.length > 0
      ? supabase.from("estoque_atual").select("variante_id, quantidade_atual").in("variante_id", varianteIds)
      : Promise.resolve({ data: [] }),
    varianteIds.length > 0
      ? supabase
          .from("movimentacoes_estoque")
          .select("id, variante_id, tipo, quantidade, motivo, origem, created_at, profiles(full_name)")
          .in("variante_id", varianteIds)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  const quantidadePorVariante = new Map(
    (estoque ?? []).map((item) => [item.variante_id, item.quantidade_atual]),
  );

  const produtoTyped = produto as unknown as ProdutoComVariantes;
  const variantes: VarianteDetalhada[] = produtoTyped.produto_variantes.map((v) => ({
    ...v,
    quantidade_atual: quantidadePorVariante.get(v.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader title={produtoTyped.nome} description="Produto, variações, códigos de barras e histórico." />
      <ProdutoEditor
        produto={produtoTyped}
        variantes={variantes}
        movimentos={(movimentos as unknown as MovimentoVariante[]) ?? []}
        categorias={categorias ?? []}
        marcas={marcas ?? []}
        linhas={linhas ?? []}
      />
    </div>
  );
}
