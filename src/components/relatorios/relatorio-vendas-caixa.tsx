"use client";

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { movimentacaoCategoriaLabels } from "@/modules/financeiro/types";
import type {
  CaixaPeriodo,
  MovimentacaoCategoria,
  MovimentoCaixaPeriodo,
} from "@/modules/financeiro/types";
import type { VendaCaixa } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function dentroDoRange(dataIso: string, range: DateRange) {
  if (!range) return true;
  const data = dataIso.slice(0, 10);
  return data >= range.from && data <= range.to;
}

export function RelatorioVendasCaixa({
  vendas,
  caixasPeriodo,
}: {
  vendas: VendaCaixa[];
  caixasPeriodo: { caixas: CaixaPeriodo[]; movimentos: MovimentoCaixaPeriodo[] } | null;
}) {
  const [range, setRange] = useState<DateRange>(null);

  const vendasFiltradas = useMemo(
    () => vendas.filter((v) => dentroDoRange(v.created_at, range)),
    [vendas, range],
  );
  const concluidas = vendasFiltradas.filter((v) => v.status === "concluida");
  const totalVendido = concluidas.reduce((sum, v) => sum + v.total, 0);
  const totalDesconto = concluidas.reduce((sum, v) => sum + v.desconto, 0);
  const ticketMedio = concluidas.length > 0 ? totalVendido / concluidas.length : 0;

  const caixasFiltrados = useMemo(
    () => caixasPeriodo?.caixas.filter((c) => dentroDoRange(c.aberto_em, range)) ?? [],
    [caixasPeriodo, range],
  );

  const categorias = useMemo(() => {
    const totais = new Map<MovimentacaoCategoria, { entradas: number; saidas: number }>();
    for (const mov of caixasPeriodo?.movimentos ?? []) {
      if (!dentroDoRange(mov.created_at, range)) continue;
      const atual = totais.get(mov.categoria) ?? { entradas: 0, saidas: 0 };
      if (mov.tipo === "entrada") atual.entradas += mov.valor;
      else atual.saidas += mov.valor;
      totais.set(mov.categoria, atual);
    }
    return Array.from(totais, ([categoria, t]) => ({ categoria, ...t }));
  }, [caixasPeriodo, range]);

  return (
    <div className="space-y-6">
      <DateRangeFilter onChange={setRange} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total vendido</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(totalVendido)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Nº de vendas</p>
            <p className="text-xl font-semibold text-foreground">{concluidas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Ticket médio</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(ticketMedio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total de desconto</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(totalDesconto)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Vendas</h2>
        <div className="rounded-lg border border-border">
          {vendasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Receipt className="size-6" />
              <p className="text-sm">Nenhuma venda nesse período.</p>
            </div>
          ) : (
            <div className="max-h-[32rem] divide-y divide-border overflow-y-auto">
              {vendasFiltradas.map((venda) => {
                const formaPagamento =
                  [
                    ...new Set(venda.venda_pagamentos.map((p) => p.formas_pagamento?.nome ?? "—")),
                  ].join(" + ") || "—";
                return (
                  <div key={venda.id} className="p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <Receipt className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground">
                              {venda.customers?.full_name ?? "Venda avulsa"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(venda.created_at)}
                            </span>
                            {venda.status === "cancelada" && (
                              <Badge variant="outline">Cancelada</Badge>
                            )}
                          </div>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {venda.itens_venda.map((item, i) => (
                              <li key={i}>
                                {item.quantidade}× {item.produtos?.nome ?? "Produto removido"} —{" "}
                                {formatCurrency(item.subtotal)}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Pago: {formaPagamento}
                            {venda.desconto > 0 &&
                              ` · Desconto: ${formatCurrency(venda.desconto)}`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          venda.status === "cancelada"
                            ? "whitespace-nowrap font-medium text-muted-foreground line-through"
                            : "whitespace-nowrap font-medium text-foreground"
                        }
                      >
                        {formatCurrency(venda.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {caixasPeriodo && (
        <>
          <div>
            <h2 className="mb-2 text-sm font-medium text-foreground">Abertura e fechamento</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-max text-sm">
                <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Período</th>
                    <th className="px-4 py-2.5 font-medium">Abertura</th>
                    <th className="px-4 py-2.5 font-medium">Entradas</th>
                    <th className="px-4 py-2.5 font-medium">Esperado</th>
                    <th className="px-4 py-2.5 font-medium">Informado</th>
                    <th className="px-4 py-2.5 font-medium">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {caixasFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhum caixa nesse período.
                      </td>
                    </tr>
                  ) : (
                    caixasFiltrados.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatDateTime(c.aberto_em)}
                          {c.fechado_em && <> — {formatDateTime(c.fechado_em)}</>}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(c.valor_abertura)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(c.entradas)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(c.esperado)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {c.valor_fechamento_informado !== null ? (
                            formatCurrency(c.valor_fechamento_informado)
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.diferenca === null ? (
                            "—"
                          ) : c.diferenca === 0 ? (
                            <Badge variant="secondary">Confere</Badge>
                          ) : (
                            <Badge variant={c.diferenca < 0 ? "destructive" : "outline"}>
                              {c.diferenca > 0 ? "+" : ""}
                              {formatCurrency(c.diferenca)}
                              {c.diferenca < 0 ? " (furo)" : " (sobra)"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-foreground">
              Movimentações por categoria
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-max text-sm">
                <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Categoria</th>
                    <th className="px-4 py-2.5 font-medium">Entradas</th>
                    <th className="px-4 py-2.5 font-medium">Saídas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categorias.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhuma movimentação nesse período.
                      </td>
                    </tr>
                  ) : (
                    categorias.map((c) => (
                      <tr key={c.categoria}>
                        <td className="px-4 py-2.5 text-foreground">
                          {movimentacaoCategoriaLabels[c.categoria]}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(c.entradas)}
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{formatCurrency(c.saidas)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
