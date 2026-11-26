import { PageHeader } from "@/components/layout/page-header";
import { ComprasList } from "@/components/compras/compras-list";
import { NovaCompraDialog } from "@/components/compras/nova-compra-dialog";
import { createClient } from "@/lib/supabase/server";
import { unwrapRelacao } from "@/lib/supabase/relations";
import { getProfile } from "@/server/auth/session";
import type { Compra } from "@/modules/compras/types";

export default async function ComprasPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage =
    profile?.role === "admin" || profile?.role === "gerente" || profile?.role === "estoquista";

  const [{ data: compras }, { data: fornecedores }, { data: produtos }] = await Promise.all([
    supabase
      .from("compras")
      .select(
        "id, fornecedor_id, status, observacao, created_at, recebida_em, fornecedores(nome), itens_compra(quantidade, custo_unitario, subtotal)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("fornecedores").select("id, nome, cnpj_cpf, telefone, email, ativo").eq("ativo", true).order("nome"),
    supabase
      .from("produto_variantes")
      .select("id, nome, codigo_interno, custo, produtos!inner(nome, ativo)")
      .eq("ativo", true)
      .eq("produtos.ativo", true)
      .order("nome"),
  ]);

  const produtosCompra = (produtos ?? []).map((v) => ({
    id: v.id,
    nome: v.nome,
    produto_nome: unwrapRelacao(v.produtos)?.nome ?? "—",
    codigo_interno: v.codigo_interno,
    custo: v.custo,
  }));

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Pedidos de compra e recebimento de mercadorias — recebido dá entrada automática no estoque."
        actions={
          canManage && (
            <NovaCompraDialog fornecedores={fornecedores ?? []} produtos={produtosCompra} />
          )
        }
      />
      <ComprasList
        compras={(compras as unknown as Compra[]) ?? []}
        fornecedores={fornecedores ?? []}
        canManage={canManage}
      />
    </div>
  );
}
