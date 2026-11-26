"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { movimentacaoOrigemLabels, type MovimentacaoOrigem } from "@/modules/estoque/types";
import type { MovimentoVariante, VarianteDetalhada } from "@/modules/produtos/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function HistoricoTab({
  variantes,
  movimentos,
  varianteSelecionada,
  onSelect,
}: {
  variantes: VarianteDetalhada[];
  movimentos: MovimentoVariante[];
  varianteSelecionada: VarianteDetalhada | null;
  onSelect: (id: string) => void;
}) {
  if (variantes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma variação cadastrada.</p>;
  }

  const filtrados = varianteSelecionada
    ? movimentos.filter((m) => m.variante_id === varianteSelecionada.id)
    : movimentos;

  return (
    <div className="space-y-4">
      <Select value={varianteSelecionada?.id} onValueChange={(v) => v && onSelect(v)}>
        <SelectTrigger className="w-72">
          <SelectValue>{() => varianteSelecionada?.nome ?? "Selecione a variação"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {variantes.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.nome} ({v.codigo_interno})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="divide-y divide-border rounded-lg border border-border">
        {filtrados.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma movimentação registrada.
          </p>
        ) : (
          filtrados.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">
                    {movimentacaoOrigemLabels[m.origem as MovimentacaoOrigem] ?? m.origem}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
                </div>
                <p className="mt-0.5 text-foreground">{m.motivo}</p>
                <p className="text-xs text-muted-foreground">{m.profiles?.full_name ?? "usuário"}</p>
              </div>
              <span className="whitespace-nowrap font-medium text-foreground">
                {m.tipo === "entrada" ? "+" : "-"}
                {m.quantidade}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
