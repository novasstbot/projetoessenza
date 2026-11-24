import { PageHeader } from "@/components/layout/page-header";
import { ProductsTable } from "@/components/produtos/products-table";
import { TaxonomyManager } from "@/components/produtos/taxonomy-manager";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import type { Produto } from "@/modules/produtos/types";

export default async function ProdutosPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage = profile?.role === "admin" || profile?.role === "gerente";

  const [{ data: produtos }, { data: categorias }, { data: marcas }] = await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, nome, codigo_interno, codigo_ean, categoria_id, marca_id, custo, preco_venda, estoque_minimo, validade, ativo, created_at, categorias(id, nome), marcas(id, nome)",
      )
      .order("nome"),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("marcas").select("id, nome").order("nome"),
  ]);

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Cadastro de produtos com código EAN, código interno, custos, preços e estoque mínimo."
        actions={
          canManage && (
            <TaxonomyManager categorias={categorias ?? []} marcas={marcas ?? []} />
          )
        }
      />

      <ProductsTable
        produtos={(produtos as unknown as Produto[]) ?? []}
        categorias={categorias ?? []}
        marcas={marcas ?? []}
        canManage={canManage}
      />
    </div>
  );
}
