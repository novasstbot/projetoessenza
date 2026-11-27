"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, LayoutGrid, List, Users } from "lucide-react";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProdutoEstoqueDetalhado } from "@/modules/estoque/types";
import type { VendaCaixa } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function dentroDoRange(dataIso: string, range: DateRange) {
  if (!range) return true;
  const data = dataIso.slice(0, 10);
  return data >= range.from && data <= range.to;
}

type Relatorio = "vendidos" | "clientes" | "cliente-por-produto" | "produto-por-cliente";

type Ranking = { chave: string; label: string; quantidade: number; valor: number };

function RankingTable({
  linhas,
  colunaPrincipal,
  vazio,
  imagemPorNome,
}: {
  linhas: Ranking[];
  colunaPrincipal: string;
  vazio: string;
  imagemPorNome?: Map<string, string | null>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">{colunaPrincipal}</th>
            <th className="px-4 py-2.5 font-medium">Quantidade</th>
            <th className="px-4 py-2.5 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {linhas.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                {vazio}
              </td>
            </tr>
          ) : (
            linhas.map((linha) => {
              const imagem = imagemPorNome?.get(linha.label);
              return (
                <tr key={linha.chave}>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {imagemPorNome ? (
                      <div className="flex items-center gap-2">
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                          {imagem && <img src={imagem} alt="" className="size-full object-contain" />}
                        </div>
                        {linha.label}
                      </div>
                    ) : (
                      linha.label
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{linha.quantidade}</td>
                  <td className="px-4 py-2.5 text-foreground">{formatCurrency(linha.valor)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function RankingCards({
  linhas,
  vazio,
  imagemPorNome,
}: {
  linhas: Ranking[];
  vazio: string;
  imagemPorNome: Map<string, string | null>;
}) {
  if (linhas.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{vazio}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {linhas.map((linha) => {
        const imagem = imagemPorNome.get(linha.label);
        return (
          <Card key={linha.chave}>
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {imagem && <img src={imagem} alt="" className="size-full object-contain" />}
              </div>
              <p className="font-medium text-foreground">{linha.label}</p>
              <p className="text-sm text-muted-foreground">{linha.quantidade} vendidos</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(linha.valor)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function RelatorioComercial({
  vendas,
  produtos,
}: {
  vendas: VendaCaixa[];
  produtos: ProdutoEstoqueDetalhado[];
}) {
  const [relatorio, setRelatorio] = useState<Relatorio>("vendidos");
  const imagemPorNome = useMemo(
    () => new Map(produtos.map((p) => [p.nome, p.imagem_thumb ?? null])),
    [produtos],
  );

  const vendasConcluidas = useMemo(() => vendas.filter((v) => v.status === "concluida"), [vendas]);

  // --- Mais e menos vendidos (produto) ---
  const [rangeVendidos, setRangeVendidos] = useState<DateRange>(null);
  const [ordemVendidos, setOrdemVendidos] = useState<"desc" | "asc">("desc");
  const [visualizacaoVendidos, setVisualizacaoVendidos] = useState<"lista" | "cards">("lista");
  const ranqueamentoProdutos = useMemo(() => {
    const porProduto = new Map<string, Ranking>();
    for (const venda of vendasConcluidas) {
      if (!dentroDoRange(venda.created_at, rangeVendidos)) continue;
      for (const item of venda.itens_venda) {
        const nome = item.produto_variantes?.nome ?? "Produto removido";
        const atual = porProduto.get(nome) ?? { chave: nome, label: nome, quantidade: 0, valor: 0 };
        atual.quantidade += item.quantidade;
        atual.valor += item.subtotal;
        porProduto.set(nome, atual);
      }
    }
    const lista = Array.from(porProduto.values());
    lista.sort((a, b) => (ordemVendidos === "desc" ? b.quantidade - a.quantidade : a.quantidade - b.quantidade));
    return lista;
  }, [vendasConcluidas, rangeVendidos, ordemVendidos]);

  // --- Melhores clientes ---
  const [rangeClientes, setRangeClientes] = useState<DateRange>(null);
  const [ordemClientes, setOrdemClientes] = useState<"desc" | "asc">("desc");
  const ranqueamentoClientes = useMemo(() => {
    const porCliente = new Map<string, Ranking>();
    for (const venda of vendasConcluidas) {
      if (!venda.customers) continue;
      if (!dentroDoRange(venda.created_at, rangeClientes)) continue;
      const atual = porCliente.get(venda.customers.id) ?? {
        chave: venda.customers.id,
        label: venda.customers.full_name,
        quantidade: 0,
        valor: 0,
      };
      atual.quantidade += venda.itens_venda.reduce((sum, i) => sum + i.quantidade, 0);
      atual.valor += venda.total;
      porCliente.set(venda.customers.id, atual);
    }
    const lista = Array.from(porCliente.values());
    lista.sort((a, b) => (ordemClientes === "desc" ? b.valor - a.valor : a.valor - b.valor));
    return lista;
  }, [vendasConcluidas, rangeClientes, ordemClientes]);

  // --- Cliente por produto: escolhe um produto, ranqueia clientes ---
  const produtosVendidos = useMemo(() => {
    const nomes = new Set<string>();
    for (const venda of vendasConcluidas) {
      for (const item of venda.itens_venda) {
        if (item.produto_variantes?.nome) nomes.add(item.produto_variantes.nome);
      }
    }
    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [vendasConcluidas]);
  const [produtoEscolhido, setProdutoEscolhido] = useState("");
  const clientesPorProduto = useMemo(() => {
    if (!produtoEscolhido) return [];
    const porCliente = new Map<string, Ranking>();
    for (const venda of vendasConcluidas) {
      if (!venda.customers) continue;
      for (const item of venda.itens_venda) {
        if (item.produto_variantes?.nome !== produtoEscolhido) continue;
        const atual = porCliente.get(venda.customers.id) ?? {
          chave: venda.customers.id,
          label: venda.customers.full_name,
          quantidade: 0,
          valor: 0,
        };
        atual.quantidade += item.quantidade;
        atual.valor += item.subtotal;
        porCliente.set(venda.customers.id, atual);
      }
    }
    return Array.from(porCliente.values()).sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas, produtoEscolhido]);

  // --- Produto por cliente: escolhe um cliente, ranqueia produtos ---
  const clientesComVenda = useMemo(() => {
    const porId = new Map<string, string>();
    for (const venda of vendasConcluidas) {
      if (venda.customers) porId.set(venda.customers.id, venda.customers.full_name);
    }
    return Array.from(porId, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [vendasConcluidas]);
  const [clienteEscolhido, setClienteEscolhido] = useState("");
  const produtosPorCliente = useMemo(() => {
    if (!clienteEscolhido) return [];
    const porProduto = new Map<string, Ranking>();
    for (const venda of vendasConcluidas) {
      if (venda.customers?.id !== clienteEscolhido) continue;
      for (const item of venda.itens_venda) {
        const nome = item.produto_variantes?.nome ?? "Produto removido";
        const atual = porProduto.get(nome) ?? { chave: nome, label: nome, quantidade: 0, valor: 0 };
        atual.quantidade += item.quantidade;
        atual.valor += item.subtotal;
        porProduto.set(nome, atual);
      }
    }
    return Array.from(porProduto.values()).sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas, clienteEscolhido]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant={relatorio === "vendidos" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setRelatorio("vendidos")}
        >
          Mais e menos vendidos
        </Button>
        <Button
          type="button"
          variant={relatorio === "clientes" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setRelatorio("clientes")}
        >
          Melhores clientes
        </Button>
        <Button
          type="button"
          variant={relatorio === "cliente-por-produto" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setRelatorio("cliente-por-produto")}
        >
          Cliente por produto
        </Button>
        <Button
          type="button"
          variant={relatorio === "produto-por-cliente" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setRelatorio("produto-por-cliente")}
        >
          Produto por cliente
        </Button>
      </div>

      {relatorio === "vendidos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <DateRangeFilter onChange={setRangeVendidos} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setOrdemVendidos((o) => (o === "desc" ? "asc" : "desc"))}
              >
                <ArrowDownUp className="size-3.5" />
                {ordemVendidos === "desc" ? "Mais vendidos" : "Menos vendidos"}
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant={visualizacaoVendidos === "lista" ? "secondary" : "outline"}
                size="icon-sm"
                aria-label="Ver em lista"
                onClick={() => setVisualizacaoVendidos("lista")}
              >
                <List className="size-4" />
              </Button>
              <Button
                type="button"
                variant={visualizacaoVendidos === "cards" ? "secondary" : "outline"}
                size="icon-sm"
                aria-label="Ver em cards"
                onClick={() => setVisualizacaoVendidos("cards")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
          {visualizacaoVendidos === "lista" ? (
            <RankingTable
              linhas={ranqueamentoProdutos}
              colunaPrincipal="Produto"
              vazio="Nenhuma venda nesse período."
              imagemPorNome={imagemPorNome}
            />
          ) : (
            <RankingCards
              linhas={ranqueamentoProdutos}
              vazio="Nenhuma venda nesse período."
              imagemPorNome={imagemPorNome}
            />
          )}
        </div>
      )}

      {relatorio === "clientes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeFilter onChange={setRangeClientes} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setOrdemClientes((o) => (o === "desc" ? "asc" : "desc"))}
            >
              <ArrowDownUp className="size-3.5" />
              {ordemClientes === "desc" ? "Maior volume" : "Menor volume"}
            </Button>
          </div>
          <RankingTable
            linhas={ranqueamentoClientes}
            colunaPrincipal="Cliente"
            vazio="Nenhuma venda com cliente identificado nesse período."
          />
        </div>
      )}

      {relatorio === "cliente-por-produto" && (
        <div className="space-y-4">
          <div className="w-72">
            <Autocomplete
              items={produtosVendidos}
              value={produtoEscolhido}
              onChange={setProdutoEscolhido}
              getId={(nome) => nome}
              getLabel={(nome) => nome}
              placeholder="Buscar produto"
            />
          </div>
          {produtoEscolhido ? (
            <RankingTable
              linhas={clientesPorProduto}
              colunaPrincipal="Cliente"
              vazio="Nenhum cliente comprou esse produto ainda."
            />
          ) : (
            <p className="flex items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <Users className="size-4" />
              Escolha um produto pra ver quem mais comprou.
            </p>
          )}
        </div>
      )}

      {relatorio === "produto-por-cliente" && (
        <div className="space-y-4">
          <Select value={clienteEscolhido} onValueChange={(v) => setClienteEscolhido(v ?? "")}>
            <SelectTrigger className="w-72">
              <SelectValue>
                {() =>
                  clientesComVenda.find((c) => c.id === clienteEscolhido)?.nome ??
                  "Selecione um cliente"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clientesComVenda.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clienteEscolhido ? (
            <RankingTable
              linhas={produtosPorCliente}
              colunaPrincipal="Produto"
              vazio="Esse cliente ainda não comprou nada."
              imagemPorNome={imagemPorNome}
            />
          ) : (
            <p className="flex items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <Users className="size-4" />
              Escolha um cliente pra ver o que ele mais comprou.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
