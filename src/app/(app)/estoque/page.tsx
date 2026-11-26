import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MovementDialog } from "@/components/estoque/movement-dialog";
import { EstoqueSituacao } from "@/components/estoque/estoque-situacao";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import type { Movimentacao, ProdutoComEstoque } from "@/modules/estoque/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function EstoquePage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage =
    profile?.role === "admin" || profile?.role === "gerente" || profile?.role === "estoquista";

  const [{ data: variantes }, { data: estoqueAtual }, { data: movimentacoes }] = await Promise.all([
    supabase
      .from("produto_variantes")
      .select("id, nome, codigo_interno, estoque_minimo, validade, produtos!inner(nome, ativo)")
      .eq("ativo", true)
      .eq("produtos.ativo", true)
      .order("nome"),
    supabase.from("estoque_atual").select("variante_id, quantidade_atual"),
    supabase
      .from("movimentacoes_estoque")
      .select(
        "id, variante_id, tipo, quantidade, motivo, origem, created_at, produto_variantes(nome, codigo_interno), profiles(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const estoquePorVariante = new Map(
    (estoqueAtual ?? []).map((item) => [item.variante_id, item.quantidade_atual]),
  );

  const produtosComEstoque: ProdutoComEstoque[] = (variantes ?? []).map((v) => ({
    id: v.id,
    nome: v.nome,
    produto_nome: v.produtos[0]?.nome ?? "—",
    codigo_interno: v.codigo_interno,
    estoque_minimo: v.estoque_minimo,
    validade: v.validade,
    quantidade_atual: estoquePorVariante.get(v.id) ?? 0,
    tem_movimentacao: estoquePorVariante.has(v.id),
  }));

  const variantesList = (variantes ?? []).map((v) => ({
    id: v.id,
    nome: v.nome,
    codigo_interno: v.codigo_interno,
    produto_nome: v.produtos[0]?.nome ?? "—",
  }));

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Situação atual, estoque mínimo, validade e histórico de movimentações."
        actions={canManage && <MovementDialog variantes={variantesList} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <EstoqueSituacao produtos={produtosComEstoque} />
        </div>

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
                      {mov.produto_variantes?.nome ?? "—"}
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
