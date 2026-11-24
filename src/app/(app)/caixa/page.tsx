import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContasFinanceirasList } from "@/components/caixa/contas-financeiras-list";
import { SangriaDialog } from "@/components/caixa/sangria-dialog";
import { SuprimentoDialog } from "@/components/caixa/suprimento-dialog";
import { DespesaDialog } from "@/components/caixa/despesa-dialog";
import { AjusteDialog } from "@/components/caixa/ajuste-dialog";
import { FechamentoDialog } from "@/components/caixa/fechamento-dialog";
import { DetalhesCaixaDialog } from "@/components/caixa/detalhes-caixa-dialog";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import type { ContaFinanceira } from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function CaixaPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canOperate =
    profile?.role === "admin" || profile?.role === "gerente" || profile?.role === "vendedor";
  const canAjustar = profile?.role === "admin" || profile?.role === "gerente";

  const { data: aberto } = await supabase
    .from("caixas")
    .select("id, valor_abertura, aberto_em")
    .eq("status", "aberto")
    .maybeSingle();

  const { data: fechados } = await supabase
    .from("caixas")
    .select(
      "id, valor_abertura, valor_fechamento_informado, aberto_em, fechado_em, observacao_fechamento",
    )
    .eq("status", "fechado")
    .order("fechado_em", { ascending: false })
    .limit(10);

  const fechadosIds = (fechados ?? []).map((c) => c.id);
  const caixaIdsParaMovimentos = aberto ? [aberto.id, ...fechadosIds] : fechadosIds;

  const [{ data: todosMovimentos }, { data: contas }, { data: movFinanceiras }] =
    await Promise.all([
      supabase
        .from("movimentacoes_caixa")
        .select("caixa_id, tipo, valor")
        .in(
          "caixa_id",
          caixaIdsParaMovimentos.length > 0
            ? caixaIdsParaMovimentos
            : ["00000000-0000-0000-0000-000000000000"],
        ),
      supabase.from("contas_financeiras").select("id, nome, tipo, ativo").eq("ativo", true).order("nome"),
      supabase.from("movimentacoes_financeiras").select("conta_id, tipo, valor"),
    ]);

  const totaisPorCaixa = new Map<string, { entradas: number; saidas: number }>();
  for (const mov of todosMovimentos ?? []) {
    const atual = totaisPorCaixa.get(mov.caixa_id) ?? { entradas: 0, saidas: 0 };
    if (mov.tipo === "entrada") atual.entradas += mov.valor;
    else atual.saidas += mov.valor;
    totaisPorCaixa.set(mov.caixa_id, atual);
  }

  const totaisAberto = aberto ? (totaisPorCaixa.get(aberto.id) ?? { entradas: 0, saidas: 0 }) : null;
  const esperadoAberto = aberto
    ? aberto.valor_abertura + (totaisAberto?.entradas ?? 0) - (totaisAberto?.saidas ?? 0)
    : 0;

  const saldosContas = new Map<string, number>();
  for (const mov of movFinanceiras ?? []) {
    const atual = saldosContas.get(mov.conta_id) ?? 0;
    saldosContas.set(mov.conta_id, atual + (mov.tipo === "entrada" ? mov.valor : -mov.valor));
  }
  if (aberto) {
    const caixaFisico = (contas ?? []).find((c) => c.tipo === "caixa_fisico");
    if (caixaFisico) saldosContas.set(caixaFisico.id, esperadoAberto);
  }

  const contasOrigemSuprimento = (contas ?? []).filter((c) => c.tipo !== "caixa_fisico");

  return (
    <div>
      <PageHeader
        title="Caixa"
        description="Abertura, fechamento e conferência de valores do caixa."
      />

      <div className="mb-6">
        <ContasFinanceirasList contas={(contas as ContaFinanceira[]) ?? []} saldos={saldosContas} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {aberto ? (
              <>
                <Unlock className="size-4 text-gold" /> Caixa aberto
              </>
            ) : (
              <>
                <Lock className="size-4 text-muted-foreground" /> Caixa fechado
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aberto ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Aberto em</p>
                  <p className="font-medium text-foreground">{formatDateTime(aberto.aberto_em)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor de abertura</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(aberto.valor_abertura)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entradas (sessão)</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(totaisAberto?.entradas ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Esperado em caixa</p>
                  <p className="font-medium text-foreground">{formatCurrency(esperadoAberto)}</p>
                </div>
              </div>

              {canOperate && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <SangriaDialog caixaId={aberto.id} />
                  <SuprimentoDialog caixaId={aberto.id} contas={contasOrigemSuprimento as ContaFinanceira[]} />
                  <DespesaDialog caixaId={aberto.id} />
                  {canAjustar && <AjusteDialog caixaId={aberto.id} />}
                  <DetalhesCaixaDialog caixaId={aberto.id} canManage={canAjustar} />
                  <FechamentoDialog caixaId={aberto.id} esperado={esperadoAberto} />
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                render={<Link href="/pdv">Ir para o PDV</Link>}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum caixa aberto no momento. Abra um caixa na tela de PDV para começar a
                vender.
              </p>
              <Button size="sm" render={<Link href="/pdv">Ir para o PDV</Link>} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de fechamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-lg border-t border-border">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Período</th>
                  <th className="px-4 py-2.5 font-medium">Abertura</th>
                  <th className="px-4 py-2.5 font-medium">Entradas</th>
                  <th className="px-4 py-2.5 font-medium">Esperado</th>
                  <th className="px-4 py-2.5 font-medium">Informado</th>
                  <th className="px-4 py-2.5 font-medium">Diferença</th>
                  <th className="px-4 py-2.5 font-medium text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!fechados || fechados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum caixa fechado ainda.
                    </td>
                  </tr>
                ) : (
                  fechados.map((c) => {
                    const totais = totaisPorCaixa.get(c.id) ?? { entradas: 0, saidas: 0 };
                    const esperado = c.valor_abertura + totais.entradas - totais.saidas;
                    const informado = c.valor_fechamento_informado;
                    const diferenca = informado !== null ? informado - esperado : null;

                    return (
                      <tr key={c.id}>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatDateTime(c.aberto_em)}
                          {c.fechado_em && <> — {formatDateTime(c.fechado_em)}</>}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(c.valor_abertura)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(totais.entradas)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{formatCurrency(esperado)}</td>
                        <td className="px-4 py-2.5 text-foreground">
                          {informado !== null ? (
                            formatCurrency(informado)
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {diferenca === null ? (
                            "—"
                          ) : diferenca === 0 ? (
                            <Badge variant="secondary">Confere</Badge>
                          ) : (
                            <Badge variant={diferenca < 0 ? "destructive" : "outline"}>
                              {diferenca > 0 ? "+" : ""}
                              {formatCurrency(diferenca)}
                              {diferenca < 0 ? " (furo)" : " (sobra)"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <DetalhesCaixaDialog caixaId={c.id} canManage={canAjustar} compact />
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
    </div>
  );
}
