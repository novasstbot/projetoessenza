"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, PackageX, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DIAS_PROXIMO_DA_VALIDADE, type ProdutoComEstoque } from "@/modules/estoque/types";

type Filtro = "todos" | "abaixo_minimo" | "sem_movimentacao" | "proximo_validade";

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export function EstoqueSituacao({ produtos }: { produtos: ProdutoComEstoque[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const hoje = new Date().toISOString().slice(0, 10);
  const limiteValidade = new Date();
  limiteValidade.setDate(limiteValidade.getDate() + DIAS_PROXIMO_DA_VALIDADE);
  const limiteValidadeStr = limiteValidade.toISOString().slice(0, 10);

  const classificados = useMemo(
    () =>
      produtos.map((p) => ({
        ...p,
        abaixoMinimo: p.tem_movimentacao && p.quantidade_atual < p.estoque_minimo,
        proximoValidade: !!p.validade && p.validade <= limiteValidadeStr,
        vencido: !!p.validade && p.validade < hoje,
      })),
    [produtos, hoje, limiteValidadeStr],
  );

  const abaixoMinimo = classificados.filter((p) => p.abaixoMinimo);
  const semMovimentacao = classificados.filter((p) => !p.tem_movimentacao);
  const proximoValidade = classificados.filter((p) => p.proximoValidade);

  const filtrados =
    filtro === "abaixo_minimo"
      ? abaixoMinimo
      : filtro === "sem_movimentacao"
        ? semMovimentacao
        : filtro === "proximo_validade"
          ? proximoValidade
          : classificados;

  function toggle(f: Filtro) {
    setFiltro((prev) => (prev === f ? "todos" : f));
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => toggle("abaixo_minimo")} className="text-left">
          <Card
            className={cn(
              "transition-colors hover:border-gold/60",
              filtro === "abaixo_minimo" && "border-gold ring-1 ring-gold/40",
            )}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="size-5 shrink-0 text-gold" />
              <div>
                <p className="text-xl font-semibold text-foreground">{abaixoMinimo.length}</p>
                <p className="text-xs text-muted-foreground">Abaixo do estoque mínimo</p>
              </div>
            </CardContent>
          </Card>
        </button>

        <button type="button" onClick={() => toggle("sem_movimentacao")} className="text-left">
          <Card
            className={cn(
              "transition-colors hover:border-gold/60",
              filtro === "sem_movimentacao" && "border-gold ring-1 ring-gold/40",
            )}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <PackageX className="size-5 shrink-0 text-gold" />
              <div>
                <p className="text-xl font-semibold text-foreground">{semMovimentacao.length}</p>
                <p className="text-xs text-muted-foreground">Sem movimentação</p>
              </div>
            </CardContent>
          </Card>
        </button>

        <button type="button" onClick={() => toggle("proximo_validade")} className="text-left">
          <Card
            className={cn(
              "transition-colors hover:border-gold/60",
              filtro === "proximo_validade" && "border-gold ring-1 ring-gold/40",
            )}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <CalendarClock className="size-5 shrink-0 text-gold" />
              <div>
                <p className="text-xl font-semibold text-foreground">{proximoValidade.length}</p>
                <p className="text-xs text-muted-foreground">
                  Próximo da validade ({DIAS_PROXIMO_DA_VALIDADE} dias)
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Situação do estoque
            {filtro !== "todos" && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (filtrado — clique no card de novo para limpar)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-lg border-t border-border">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Produto</th>
                  <th className="px-4 py-2.5 font-medium">Atual</th>
                  <th className="px-4 py-2.5 font-medium">Mínimo</th>
                  <th className="px-4 py-2.5 font-medium">Validade</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((produto) => (
                    <tr key={produto.id}>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                            {produto.imagem_thumb && (
                              <img
                                src={produto.imagem_thumb}
                                alt=""
                                className="size-full object-contain"
                              />
                            )}
                          </div>
                          <span>
                            {produto.produto_nome !== produto.nome
                              ? `${produto.produto_nome} — ${produto.nome}`
                              : produto.nome}
                            <span className="block text-xs text-muted-foreground">
                              {produto.codigo_interno}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{produto.quantidade_atual}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {produto.estoque_minimo}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {produto.validade ? formatDate(produto.validade) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {!produto.tem_movimentacao && (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <PackageX className="size-3" />
                              Sem movimentação
                            </Badge>
                          )}
                          {produto.abaixoMinimo && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="size-3" />
                              Abaixo do mínimo
                            </Badge>
                          )}
                          {produto.vencido ? (
                            <Badge variant="destructive" className="gap-1">
                              <CalendarClock className="size-3" />
                              Vencido
                            </Badge>
                          ) : (
                            produto.proximoValidade && (
                              <Badge variant="outline" className="gap-1 border-gold/40 text-plum">
                                <CalendarClock className="size-3" />
                                Vence em breve
                              </Badge>
                            )
                          )}
                          {produto.tem_movimentacao &&
                            !produto.abaixoMinimo &&
                            !produto.proximoValidade && <Badge variant="secondary">OK</Badge>}
                        </div>
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
