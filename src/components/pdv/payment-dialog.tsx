"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, CreditCard, User, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { finalizarVenda } from "@/server/actions/pdv/vendas";
import type { CartItem, ClientePdv, FormaPagamento } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type PaymentLine = { id: string; forma_pagamento_id: string; valor: number };

function ClientePicker({
  clientes,
  clienteId,
  onChange,
}: {
  clientes: ClientePdv[];
  clienteId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [term, setTerm] = useState("");
  const selecionado = clientes.find((c) => c.id === clienteId);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return clientes.filter((c) => c.full_name.toLowerCase().includes(t)).slice(0, 5);
  }, [clientes, term]);

  if (selecionado) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5 text-foreground">
          <User className="size-3.5" />
          {selecionado.full_name}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remover cliente"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Cliente (opcional) — venda avulsa se não informar"
      />
      {matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {matches.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => {
                onChange(cliente.id);
                setTerm("");
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted"
            >
              {cliente.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentForm({
  items,
  desconto,
  formasPagamento,
  clientes,
  onSuccess,
}: {
  items: CartItem[];
  desconto: number;
  formasPagamento: FormaPagamento[];
  clientes: ClientePdv[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const subtotal = items.reduce((sum, i) => sum + i.produto.preco_venda * i.quantidade, 0);
  const total = Math.max(subtotal - desconto, 0);

  const [lines, setLines] = useState<PaymentLine[]>(() => [
    { id: crypto.randomUUID(), forma_pagamento_id: formasPagamento[0]?.id ?? "", valor: total },
  ]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const alocado = lines.reduce((sum, l) => sum + l.valor, 0);
  const restante = Math.round((total - alocado) * 100) / 100;

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        forma_pagamento_id: formasPagamento[0]?.id ?? "",
        valor: Math.max(restante, 0),
      },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: string, patch: Partial<PaymentLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handleFinalizar() {
    setSubmitting(true);
    try {
      await finalizarVenda({
        itens: items.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade })),
        pagamentos: lines.map((l) => ({
          forma_pagamento_id: l.forma_pagamento_id,
          valor: l.valor,
        })),
        desconto,
        clienteId: clienteId ?? undefined,
      });
      toast.success("Venda finalizada.");
      onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível finalizar a venda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Cliente</Label>
        <ClientePicker clientes={clientes} clienteId={clienteId} onChange={setClienteId} />
      </div>

      {lines.map((line) => (
        <div key={line.id} className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select
              value={line.forma_pagamento_id}
              onValueChange={(value) => value && updateLine(line.id, { forma_pagamento_id: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() =>
                    formasPagamento.find((f) => f.id === line.forma_pagamento_id)?.nome ??
                    "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map((forma) => (
                  <SelectItem key={forma.id} value={forma.id}>
                    {forma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1.5">
            <Label>Valor</Label>
            <CurrencyInput value={line.valor} onChange={(valor) => updateLine(line.id, { valor })} />
          </div>
          {lines.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remover forma de pagamento"
              onClick={() => removeLine(line.id)}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
        <Plus className="size-3.5" />
        Dividir pagamento
      </Button>

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Restante</span>
        <span className={restante === 0 ? "text-foreground" : "font-medium text-destructive"}>
          {formatCurrency(restante)}
        </span>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={restante !== 0 || submitting || items.length === 0}
        onClick={handleFinalizar}
      >
        {submitting ? "Finalizando..." : "Finalizar venda"}
      </Button>
    </div>
  );
}

export function PaymentDialog({
  open,
  onOpenChange,
  items,
  desconto,
  formasPagamento,
  clientes,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  desconto: number;
  formasPagamento: FormaPagamento[];
  clientes: ClientePdv[];
  onSuccess: () => void;
}) {
  const subtotal = items.reduce((sum, i) => sum + i.produto.preco_venda * i.quantidade, 0);
  const total = Math.max(subtotal - desconto, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Pagamento — {formatCurrency(total)}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <PaymentForm
            items={items}
            desconto={desconto}
            formasPagamento={formasPagamento}
            clientes={clientes}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
