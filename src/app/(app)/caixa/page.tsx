import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function CaixaPage() {
  const supabase = await createClient();

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

  let movimentos: { tipo: string; valor: number }[] = [];
  if (aberto) {
    const { data } = await supabase
      .from("movimentacoes_caixa")
      .select("tipo, valor")
      .eq("caixa_id", aberto.id);
    movimentos = data ?? [];
  }

  const entradas = movimentos
    .filter((m) => m.tipo === "entrada")
    .reduce((sum, m) => sum + m.valor, 0);
  const saidas = movimentos.filter((m) => m.tipo === "saida").reduce((sum, m) => sum + m.valor, 0);
  const esperado = (aberto?.valor_abertura ?? 0) + entradas - saidas;

  return (
    <div>
      <PageHeader
        title="Caixa"
        description="Abertura, fechamento e conferência de valores do caixa."
      />

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
                <p className="text-xs text-muted-foreground">Entradas na sessão</p>
                <p className="font-medium text-foreground">{formatCurrency(entradas)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Esperado em caixa</p>
                <p className="font-medium text-foreground">{formatCurrency(esperado)}</p>
              </div>
              <Button
                size="sm"
                className="col-span-2 sm:col-span-4"
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
          <div className="overflow-hidden rounded-b-lg border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Período</th>
                  <th className="px-4 py-2.5 font-medium">Abertura</th>
                  <th className="px-4 py-2.5 font-medium">Fechamento informado</th>
                  <th className="px-4 py-2.5 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!fechados || fechados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum caixa fechado ainda.
                    </td>
                  </tr>
                ) : (
                  fechados.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDateTime(c.aberto_em)}
                        {c.fechado_em && <> — {formatDateTime(c.fechado_em)}</>}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {formatCurrency(c.valor_abertura)}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {c.valor_fechamento_informado !== null ? (
                          formatCurrency(c.valor_fechamento_informado)
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {c.observacao_fechamento ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
