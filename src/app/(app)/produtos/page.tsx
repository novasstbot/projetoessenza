import { PageHeader } from "@/components/layout/page-header";
import { ProductsTable } from "@/components/produtos/products-table";
import { TaxonomyManager } from "@/components/produtos/taxonomy-manager";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import type { ProdutoComVariantes } from "@/modules/produtos/types";

export default async function ProdutosPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage = profile?.role === "admin" || profile?.role === "gerente";

  const [{ data: produtos }, { data: categorias }, { data: marcas }, { data: linhas }] =
    await Promise.all([
      supabase
        .from("produtos")
        .select(
          "id, nome, descricao, fabricante, categoria_id, marca_id, linha_id, ativo, created_at, categorias(id, nome), marcas(id, nome), produto_linhas(id, nome), produto_variantes(id, produto_id, nome, codigo_interno, custo, preco_venda, estoque_minimo, validade, ativo, created_at, produto_codigos_barra(id, codigo, tipo, principal), produto_variante_atributos(id, atributo, valor))",
        )
        .order("nome"),
      supabase.from("categorias").select("id, nome").order("nome"),
      supabase.from("marcas").select("id, nome").order("nome"),
      supabase.from("produto_linhas").select("id, nome").order("nome"),
    ]);

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Cadastro de produtos, variações, códigos de barras e estoque mínimo."
        actions={
          canManage && (
            <TaxonomyManager
              categorias={categorias ?? []}
              marcas={marcas ?? []}
              linhas={linhas ?? []}
            />
          )
        }
      />

      <ProductsTable
        produtos={(produtos as unknown as ProdutoComVariantes[]) ?? []}
        categorias={categorias ?? []}
        marcas={marcas ?? []}
        canManage={canManage}
      />
    </div>
  );
}
