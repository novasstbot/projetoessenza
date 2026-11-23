"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function CartTable({
  items,
  onUpdateQuantidade,
  onRemove,
}: {
  items: CartItem[];
  onUpdateQuantidade: (produtoId: string, quantidade: number) => void;
  onRemove: (produtoId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
        Nenhum item no carrinho. Busque um produto ou use o leitor de código de barras.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map(({ produto, quantidade }) => (
        <div key={produto.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{produto.nome}</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(produto.preco_venda)} un.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Diminuir quantidade"
              onClick={() => onUpdateQuantidade(produto.id, quantidade - 1)}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-6 text-center text-sm">{quantidade}</span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Aumentar quantidade"
              onClick={() => onUpdateQuantidade(produto.id, quantidade + 1)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <p className="w-24 text-right text-sm font-medium text-foreground">
            {formatCurrency(produto.preco_venda * quantidade)}
          </p>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remover item"
            onClick={() => onRemove(produto.id)}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
