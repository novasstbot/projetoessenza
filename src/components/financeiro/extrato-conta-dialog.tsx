"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getExtratoConta } from "@/server/actions/financeiro/contas";
import { movimentacaoCategoriaLabels } from "@/modules/financeiro/types";
import type { ContaFinanceira, MovimentoExtratoConta } from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ExtratoContaDialog({
  conta,
  open,
  onOpenChange,
}: {
  conta: ContaFinanceira | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [movimentos, setMovimentos] = useState<MovimentoExtratoConta[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (nextOpen && conta) {
      setLoading(true);
      try {
        const data = await getExtratoConta(conta.id);
        setMovimentos(data as MovimentoExtratoConta[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar o extrato.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Extrato — {conta?.nome}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : movimentos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma movimentação nessa conta.
            </p>
          ) : (
            movimentos.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{movimentacaoCategoriaLabels[m.categoria]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-foreground">{m.descricao}</p>
                </div>
                <span
                  className={`whitespace-nowrap font-medium ${m.tipo === "entrada" ? "text-foreground" : "text-destructive"}`}
                >
                  {m.tipo === "entrada" ? "+" : "-"}
                  {formatCurrency(m.valor)}
                </span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
