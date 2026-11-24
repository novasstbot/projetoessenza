"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Trash2, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { IntegerInput } from "@/components/ui/integer-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { criarCompra } from "@/server/actions/compras/compras";
import type { ProdutoCompra } from "@/modules/compras/types";
import type { Fornecedor } from "@/modules/fornecedores/types";

type Item = { produto: ProdutoCompra; quantidade: number; custo_unitario: number };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function NovaCompraForm({
  fornecedores,
  produtos,
  onSuccess,
}: {
  fornecedores: Fornecedor[];
  produtos: ProdutoCompra[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [fornecedorId, setFornecedorId] = useState(fornecedores[0]?.id ?? "");
  const [observacao, setObservacao] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [term, setTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return produtos
      .filter((p) => p.nome.toLowerCase().includes(t) || p.codigo_interno.toLowerCase().includes(t))
      .slice(0, 6);
  }, [produtos, term]);

  function addProduto(produto: ProdutoCompra) {
    setItems((prev) => {
      if (prev.some((i) => i.produto.id === produto.id)) return prev;
      return [...prev, { produto, quantidade: 1, custo_unitario: produto.custo }];
    });
    setTerm("");
  }

  function updateItem(produtoId: string, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((i) => (i.produto.id === produtoId ? { ...i, ...patch } : i)),
    );
  }

  function removeItem(produtoId: string) {
    setItems((prev) => prev.filter((i) => i.produto.id !== produtoId));
  }

  const total = items.reduce((sum, i) => sum + i.quantidade * i.custo_unitario, 0);

  async function handleSubmit() {
    if (!fornecedorId) {
      toast.error("Selecione um fornecedor.");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }

    setSubmitting(true);
    try {
      await criarCompra({
        fornecedor_id: fornecedorId,
        observacao,
        itens: items.map((i) => ({
          produto_id: i.produto.id,
          quantidade: i.quantidade,
          custo_unitario: i.custo_unitario,
        })),
      });
      toast.success("Compra registrada como rascunho.");
      onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a compra.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Fornecedor</Label>
        <Select value={fornecedorId} onValueChange={(v) => v && setFornecedorId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {() => fornecedores.find((f) => f.id === fornecedorId)?.nome ?? "Selecione"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {fornecedores.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative space-y-1.5">
        <Label>Adicionar produto</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar produto por nome ou código"
            className="pl-8"
          />
        </div>
        {matches.length > 0 && (
          <div className="absolute z-10 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
            {matches.map((produto) => (
              <button
                key={produto.id}
                type="button"
                onClick={() => addProduto(produto)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{produto.nome}</span>
                <span className="text-xs text-muted-foreground">
                  custo atual {formatCurrency(produto.custo)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <div key={item.produto.id} className="flex items-center gap-2 p-2.5">
              <span className="flex-1 truncate text-sm text-foreground">{item.produto.nome}</span>
              <IntegerInput
                min={1}
                value={item.quantidade}
                onChange={(v) => updateItem(item.produto.id, { quantidade: v || 1 })}
                className="w-16"
              />
              <div className="w-28">
                <CurrencyInput
                  value={item.custo_unitario}
                  onChange={(v) => updateItem(item.produto.id, { custo_unitario: v })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover item"
                onClick={() => removeItem(item.produto.id)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Observação (opcional)</Label>
        <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-medium text-foreground">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? "Salvando..." : "Salvar compra (rascunho)"}
      </Button>
    </div>
  );
}

export function NovaCompraDialog({
  fornecedores,
  produtos,
}: {
  fornecedores: Fornecedor[];
  produtos: ProdutoCompra[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5">
            <Plus className="size-4" />
            Nova compra
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-4" />
            Nova compra
          </DialogTitle>
        </DialogHeader>
        {open && (
          <NovaCompraForm
            fornecedores={fornecedores}
            produtos={produtos}
            onSuccess={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
