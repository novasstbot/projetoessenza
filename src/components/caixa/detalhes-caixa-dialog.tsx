"use client";

import { useEffect, useState } from "react";
import { Eye, ListTree, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDetalhesCaixa } from "@/server/actions/financeiro/caixa";
import { movimentacaoCategoriaLabels } from "@/modules/financeiro/types";
import type { CaixaDetalhe, MovimentacaoCaixaDetalhe } from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function DetalhesContent({ caixaId }: { caixaId: string }) {
  const [dados, setDados] = useState<{
    caixa: CaixaDetalhe;
    movimentos: MovimentacaoCaixaDetalhe[];
  } | null>(null);

  useEffect(() => {
    getDetalhesCaixa(caixaId).then((data) => setDados(data as typeof dados));
  }, [caixaId]);

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

      <div>
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
          Movimentações ({movimentos.length})
        </p>
        <div className="max-h-96 divide-y divide-border overflow-y-auto">
          {movimentos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            movimentos.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="flex items-start gap-2">
                  {m.tipo === "entrada" ? (
                    <ArrowUpCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                  ) : (
                    <ArrowDownCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{movimentacaoCategoriaLabels[m.categoria]}</Badge>
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
                <span className="whitespace-nowrap font-medium text-foreground">
                  {m.tipo === "entrada" ? "+" : "-"}
                  {formatCurrency(m.valor)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function DetalhesCaixaDialog({
  caixaId,
  compact = false,
}: {
  caixaId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compact ? (
            <Button variant="ghost" size="icon-sm" aria-label="Ver movimentações do caixa">
              <Eye className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5">
              <ListTree className="size-3.5" />
              Movimentações
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimentações do caixa</DialogTitle>
        </DialogHeader>
        {open && <DetalhesContent caixaId={caixaId} />}
      </DialogContent>
    </Dialog>
  );
}
