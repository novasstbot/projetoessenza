"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { movimentacaoOrigemLabels, type MovimentacaoOrigem } from "@/modules/estoque/types";
import type { MovimentoVariante, VarianteDetalhada } from "@/modules/produtos/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function HistoricoTab({
  variantes,
  movimentos,
}: {
  variantes: VarianteDetalhada[];
  movimentos: MovimentoVariante[];
}) {
  const [filtro, setFiltro] = useState("");

  if (variantes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma variação cadastrada.</p>;
  }

  const termo = filtro.trim().toLowerCase();
  const idsFiltrados = new Set(
    (termo ? variantes.filter((v) => v.nome.toLowerCase().includes(termo)) : variantes).map(
      (v) => v.id,
    ),
  );
  const nomePorVariante = new Map(variantes.map((v) => [v.id, v.nome]));
  const filtrados = movimentos.filter((m) => idsFiltrados.has(m.variante_id));

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por nome da variação"
          className="pl-8"
        />
      </div>

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
                <p className="mt-0.5 text-foreground">
                  <span className="font-medium">{nomePorVariante.get(m.variante_id) ?? "—"}</span> —{" "}
                  {m.motivo}
                </p>
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
