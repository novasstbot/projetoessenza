import { AlertTriangle, PackageX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MovementDialog } from "@/components/estoque/movement-dialog";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import type { Movimentacao } from "@/modules/estoque/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function EstoquePage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage =
    profile?.role === "admin" || profile?.role === "gerente" || profile?.role === "estoquista";

  const [{ data: produtos }, { data: estoqueAtual }, { data: movimentacoes }] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome, codigo_interno, estoque_minimo")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("estoque_atual").select("produto_id, quantidade_atual"),
    supabase
      .from("movimentacoes_estoque")
      .select(
        "id, produto_id, tipo, quantidade, motivo, origem, created_at, produtos(nome, codigo_interno), profiles(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const estoquePorProduto = new Map(
    (estoqueAtual ?? []).map((item) => [item.produto_id, item.quantidade_atual]),
  );

  const produtosComEstoque = (produtos ?? []).map((produto) => ({
    ...produto,
    quantidade_atual: estoquePorProduto.get(produto.id) ?? 0,
    tem_movimentacao: estoquePorProduto.has(produto.id),
  }));

  const produtosList = (produtos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    codigo_interno: p.codigo_interno,
  }));

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Situação atual, estoque mínimo e histórico de movimentações."
        actions={canManage && <MovementDialog produtos={produtosList} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Situação do estoque</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-b-lg border-t border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Produto</th>
                    <th className="px-4 py-2.5 font-medium">Atual</th>
                    <th className="px-4 py-2.5 font-medium">Mínimo</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {produtosComEstoque.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhum produto ativo cadastrado.
                      </td>
                    </tr>
                  ) : (
                    produtosComEstoque.map((produto) => {
                      const abaixoDoMinimo = produto.quantidade_atual < produto.estoque_minimo;
                      return (
                        <tr key={produto.id}>
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {produto.nome}
                            <span className="block text-xs text-muted-foreground">
                              {produto.codigo_interno}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-foreground">
                            {produto.quantidade_atual}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {produto.estoque_minimo}
                          </td>
                          <td className="px-4 py-2.5">
                            {!produto.tem_movimentacao ? (
                              <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <PackageX className="size-3" />
                                Sem movimentação
                              </Badge>
                            ) : abaixoDoMinimo ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="size-3" />
                                Abaixo do mínimo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">OK</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Histórico de movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!movimentacoes || movimentacoes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
              </p>
            ) : (
              (movimentacoes as unknown as Movimentacao[]).map((mov) => (
                <div key={mov.id} className="border-b border-border pb-2 text-sm last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {mov.produtos?.nome ?? "—"}
                    </span>
                    <Badge variant={mov.tipo === "entrada" ? "secondary" : "outline"}>
                      {mov.tipo === "entrada" ? "+" : "-"}
                      {mov.quantidade}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mov.motivo} — {mov.profiles?.full_name ?? "usuário"} em{" "}
                    {formatDateTime(mov.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
