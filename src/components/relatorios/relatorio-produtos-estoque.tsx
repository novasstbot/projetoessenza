"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EstoqueSituacao } from "@/components/estoque/estoque-situacao";
import { movimentacaoOrigemLabels } from "@/modules/estoque/types";
import type {
  MovimentacaoEstoquePeriodo,
  MovimentacaoOrigem,
  ProdutoEstoqueDetalhado,
} from "@/modules/estoque/types";
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

type Relatorio = "situacao" | "vendidos" | "movimentacoes";
const TODAS_ORIGENS = "todas";

export function RelatorioProdutosEstoque({
  produtos,
  movimentos,
  vendas,
}: {
  produtos: ProdutoEstoqueDetalhado[];
  movimentos: MovimentacaoEstoquePeriodo[];
  vendas: VendaCaixa[];
}) {
  const [relatorio, setRelatorio] = useState<Relatorio>("situacao");

  const valorTotalEstoqueCusto = useMemo(
    () => produtos.reduce((sum, p) => sum + p.custo * p.quantidade_atual, 0),
    [produtos],
  );
  const valorTotalEstoqueVenda = useMemo(
    () => produtos.reduce((sum, p) => sum + p.preco_venda * p.quantidade_atual, 0),
    [produtos],
  );
  const imagemPorNome = useMemo(
    () => new Map(produtos.map((p) => [p.nome, p.imagem_thumb ?? null])),
    [produtos],
  );

  // --- Mais e menos vendidos ---
  const [rangeVendidos, setRangeVendidos] = useState<DateRange>(null);
  const [ordem, setOrdem] = useState<"desc" | "asc">("desc");
  const ranking = useMemo(() => {
    const porProduto = new Map<string, { nome: string; quantidade: number; faturamento: number }>();
    for (const venda of vendas) {
      if (venda.status !== "concluida") continue;
      if (!dentroDoRange(venda.created_at, rangeVendidos)) continue;
      for (const item of venda.itens_venda) {
        const nome = item.produto_variantes?.nome ?? "Produto removido";
        const atual = porProduto.get(nome) ?? { nome, quantidade: 0, faturamento: 0 };
        atual.quantidade += item.quantidade;
        atual.faturamento += item.subtotal;
        porProduto.set(nome, atual);
      }
    }
    const lista = Array.from(porProduto.values());
    lista.sort((a, b) => (ordem === "desc" ? b.quantidade - a.quantidade : a.quantidade - b.quantidade));
    return lista;
  }, [vendas, rangeVendidos, ordem]);

  // --- Movimentações ---
  const [rangeMov, setRangeMov] = useState<DateRange>(null);
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "entrada" | "saida">("todos");
  const [origemFiltro, setOrigemFiltro] = useState<MovimentacaoOrigem | "todas">(TODAS_ORIGENS);
  const movimentosFiltrados = useMemo(
    () =>
      movimentos.filter(
        (m) =>
          dentroDoRange(m.created_at, rangeMov) &&
          (tipoFiltro === "todos" || m.tipo === tipoFiltro) &&
          (origemFiltro === TODAS_ORIGENS || m.origem === origemFiltro),
      ),
    [movimentos, rangeMov, tipoFiltro, origemFiltro],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant={relatorio === "situacao" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setRelatorio("situacao")}
        >
          Situação do estoque
        </Button>
        <Button
          type="button"
          variant={relatorio === "vendidos" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setRelatorio("vendidos")}
        >
          Mais e menos vendidos
        </Button>
        <Button
          type="button"
          variant={relatorio === "movimentacoes" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setRelatorio("movimentacoes")}
        >
          Movimentações
        </Button>
      </div>

      {relatorio === "situacao" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Valor total do estoque (custo)</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(valorTotalEstoqueCusto)}
                </p>
                <p className="text-xs text-muted-foreground">Custo de aquisição × quantidade atual</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Valor total do estoque (venda)</p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(valorTotalEstoqueVenda)}
                </p>
                <p className="text-xs text-muted-foreground">Preço de venda × quantidade atual</p>
              </CardContent>
            </Card>
          </div>
          <EstoqueSituacao produtos={produtos} />
        </div>
      )}

      {relatorio === "vendidos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeFilter onChange={setRangeVendidos} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setOrdem((o) => (o === "desc" ? "asc" : "desc"))}
            >
              <ArrowDownUp className="size-3.5" />
              {ordem === "desc" ? "Mais vendidos" : "Menos vendidos"}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Produto</th>
                  <th className="px-4 py-2.5 font-medium">Quantidade vendida</th>
                  <th className="px-4 py-2.5 font-medium">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ranking.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhuma venda nesse período.
                    </td>
                  </tr>
                ) : (
                  ranking.map((p) => {
                    const imagem = imagemPorNome.get(p.nome);
                    return (
                      <tr key={p.nome}>
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                              {imagem && (
                                <img src={imagem} alt="" className="size-full object-contain" />
                              )}
                            </div>
                            {p.nome}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-foreground">{p.quantidade}</td>
                        <td className="px-4 py-2.5 text-foreground">
                          {formatCurrency(p.faturamento)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {relatorio === "movimentacoes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeFilter onChange={setRangeMov} />
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={tipoFiltro === "todos" ? "secondary" : "outline"}
                onClick={() => setTipoFiltro("todos")}
              >
                Todas
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tipoFiltro === "entrada" ? "secondary" : "outline"}
                onClick={() => setTipoFiltro("entrada")}
              >
                Entradas
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tipoFiltro === "saida" ? "secondary" : "outline"}
                onClick={() => setTipoFiltro("saida")}
              >
                Saídas
              </Button>
            </div>
            <Select
              value={origemFiltro}
              onValueChange={(v) => v && setOrigemFiltro(v as MovimentacaoOrigem | "todas")}
            >
              <SelectTrigger className="w-48">
                <SelectValue>
                  {() =>
                    origemFiltro === TODAS_ORIGENS
                      ? "Todas as origens"
                      : movimentacaoOrigemLabels[origemFiltro]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_ORIGENS}>Todas as origens</SelectItem>
                {Object.entries(movimentacaoOrigemLabels).map(([valor, label]) => (
                  <SelectItem key={valor} value={valor}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">Produto</th>
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                  <th className="px-4 py-2.5 font-medium">Motivo</th>
                  <th className="px-4 py-2.5 font-medium text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhuma movimentação encontrada.
                    </td>
                  </tr>
                ) : (
                  movimentosFiltrados.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {m.produto_variantes?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {movimentacaoOrigemLabels[m.origem]}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.motivo}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {m.tipo === "entrada" ? "+" : "-"}
                        {m.quantidade}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
