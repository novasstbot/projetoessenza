"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  ListTree,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Ban,
  Undo2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getDetalhesCaixa, estornarMovimentacaoCaixa } from "@/server/actions/financeiro/caixa";
import { getVendasCaixa, cancelarVenda } from "@/server/actions/pdv/vendas";
import { movimentacaoCategoriaLabels } from "@/modules/financeiro/types";
import type { CaixaDetalhe, MovimentacaoCaixaDetalhe } from "@/modules/financeiro/types";
import type { VendaCaixa } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

type AcaoPendente = { tipo: "cancelar-venda" | "estornar-mov"; id: string };

function MotivoInline({
  onConfirm,
  onCancelar,
}: {
  onConfirm: (motivo: string) => Promise<void>;
  onCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <Input
        autoFocus
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo..."
        className="h-8 text-sm"
      />
      <Button
        type="button"
        size="sm"
        disabled={submitting}
        onClick={async () => {
          if (motivo.trim().length < 3) {
            toast.error("Descreva o motivo.");
            return;
          }
          setSubmitting(true);
          await onConfirm(motivo.trim());
          setSubmitting(false);
        }}
      >
        {submitting ? "..." : "Confirmar"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancelar} disabled={submitting}>
        Voltar
      </Button>
    </div>
  );
}

function DetalhesContent({ caixaId, canManage }: { caixaId: string; canManage: boolean }) {
  const router = useRouter();
  const [dados, setDados] = useState<{
    caixa: CaixaDetalhe;
    movimentos: MovimentacaoCaixaDetalhe[];
  } | null>(null);
  const [vendas, setVendas] = useState<VendaCaixa[] | null>(null);
  const [aba, setAba] = useState<"movimentacoes" | "vendas">("movimentacoes");
  const [acaoPendente, setAcaoPendente] = useState<AcaoPendente | null>(null);

  const recarregar = useCallback(() => {
    getDetalhesCaixa(caixaId).then((data) => setDados(data as typeof dados));
    getVendasCaixa(caixaId).then((data) => setVendas(data as unknown as VendaCaixa[]));
  }, [caixaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function confirmarCancelarVenda(vendaId: string, motivo: string) {
    try {
      await cancelarVenda(vendaId, { motivo });
      toast.success("Venda cancelada.");
      setAcaoPendente(null);
      recarregar();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar a venda.");
    }
  }

  async function confirmarEstornarMovimentacao(movimentacaoId: string, motivo: string) {
    try {
      await estornarMovimentacaoCaixa(movimentacaoId, { motivo });
      toast.success("Movimentação estornada.");
      setAcaoPendente(null);
      recarregar();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível estornar a movimentação.",
      );
    }
  }

  if (!dados) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  const { caixa, movimentos } = dados;
  const esperado =
    caixa.valor_abertura +
    movimentos.reduce((s, m) => s + (m.tipo === "entrada" ? m.valor : -m.valor), 0);
  const diferenca =
    caixa.valor_fechamento_informado !== null
      ? caixa.valor_fechamento_informado - esperado
      : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Abertura</p>
          <p className="font-medium text-foreground">{formatCurrency(caixa.valor_abertura)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Esperado</p>
          <p className="font-medium text-foreground">{formatCurrency(esperado)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Informado</p>
          <p className="font-medium text-foreground">
            {caixa.valor_fechamento_informado !== null
              ? formatCurrency(caixa.valor_fechamento_informado)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Diferença</p>
          <p className={diferenca ? "font-medium text-destructive" : "font-medium text-foreground"}>
            {diferenca !== null ? formatCurrency(diferenca) : "—"}
          </p>
        </div>
      </div>

      {caixa.observacao_fechamento && (
        <div className="rounded-lg bg-rose/40 p-3 text-sm text-foreground">
          <p className="mb-0.5 text-xs font-medium text-muted-foreground">
            Justificativa do fechamento
          </p>
          {caixa.observacao_fechamento}
        </div>
      )}

      <div className="flex gap-1.5">
        <Button
          type="button"
          variant={aba === "movimentacoes" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAba("movimentacoes")}
        >
          Movimentações ({movimentos.length})
        </Button>
        <Button
          type="button"
          variant={aba === "vendas" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAba("vendas")}
        >
          Vendas ({vendas?.length ?? "…"})
        </Button>
      </div>

      {aba === "movimentacoes" ? (
        <div className="max-h-96 divide-y divide-border overflow-y-auto">
          {movimentos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            movimentos.map((m) => {
              const podeEstornar =
                canManage && m.categoria !== "venda" && !m.estorno_de_id && !m.estornada;
              const pendente = acaoPendente?.tipo === "estornar-mov" && acaoPendente.id === m.id;
              return (
                <div key={m.id} className="py-2.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {m.tipo === "entrada" ? (
                        <ArrowUpCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                      ) : (
                        <ArrowDownCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">{movimentacaoCategoriaLabels[m.categoria]}</Badge>
                          {m.estorno_de_id && <Badge variant="outline">Estorno</Badge>}
                          {m.estornada && <Badge variant="outline">Estornada</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(m.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-foreground">{m.descricao}</p>
                        {m.contraparte && (
                          <p className="text-xs text-muted-foreground">{m.contraparte}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {m.profiles?.full_name ?? "usuário"}
                          {m.autorizado_por_profile &&
                            ` — autorizado por ${m.autorizado_por_profile.full_name ?? "—"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap font-medium text-foreground">
                        {m.tipo === "entrada" ? "+" : "-"}
                        {formatCurrency(m.valor)}
                      </span>
                      {podeEstornar && !pendente && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Estornar movimentação"
                          onClick={() => setAcaoPendente({ tipo: "estornar-mov", id: m.id })}
                        >
                          <Undo2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {pendente && (
                    <MotivoInline
                      onConfirm={(motivo) => confirmarEstornarMovimentacao(m.id, motivo)}
                      onCancelar={() => setAcaoPendente(null)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="max-h-96 divide-y divide-border overflow-y-auto">
          {vendas === null ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : vendas.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma venda registrada neste caixa.
            </p>
          ) : (
            vendas.map((venda) => {
              const podeCancelar = canManage && venda.status === "concluida";
              const pendente =
                acaoPendente?.tipo === "cancelar-venda" && acaoPendente.id === venda.id;
              return (
                <div key={venda.id} className="py-2.5 text-sm">
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
                              {item.quantidade}× {item.produto_variantes?.nome ?? "Produto removido"} —{" "}
                              {formatCurrency(item.subtotal)}
                            </li>
                          ))}
                        </ul>
                        {venda.desconto > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Desconto: {formatCurrency(venda.desconto)}
                          </p>
                        )}
                        {venda.venda_pagamentos.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Pago:{" "}
                            {venda.venda_pagamentos
                              .map(
                                (p, i) =>
                                  `${p.formas_pagamento?.nome ?? "—"} ${formatCurrency(p.valor)}${
                                    i < venda.venda_pagamentos.length - 1 ? " · " : ""
                                  }`,
                              )
                              .join("")}
                            {venda.status === "cancelada" && " (revertido no cancelamento)"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          venda.status === "cancelada"
                            ? "whitespace-nowrap font-medium text-muted-foreground line-through"
                            : "whitespace-nowrap font-medium text-foreground"
                        }
                      >
                        {formatCurrency(venda.total)}
                      </span>
                      {podeCancelar && !pendente && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Cancelar venda"
                          onClick={() => setAcaoPendente({ tipo: "cancelar-venda", id: venda.id })}
                        >
                          <Ban className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {pendente && (
                    <MotivoInline
                      onConfirm={(motivo) => confirmarCancelarVenda(venda.id, motivo)}
                      onCancelar={() => setAcaoPendente(null)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function DetalhesCaixaDialog({
  caixaId,
  compact = false,
  canManage = false,
}: {
  caixaId: string;
  compact?: boolean;
  canManage?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compact ? (
            <Button variant="ghost" size="icon-sm" aria-label="Ver detalhes do caixa">
              <Eye className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5">
              <ListTree className="size-3.5" />
              Detalhes
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do caixa</DialogTitle>
        </DialogHeader>
        {open && <DetalhesContent caixaId={caixaId} canManage={canManage} />}
      </DialogContent>
    </Dialog>
  );
}
