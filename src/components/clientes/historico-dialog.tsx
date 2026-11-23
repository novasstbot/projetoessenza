"use client";

import { useEffect, useState } from "react";
import { History, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getHistoricoCompras } from "@/server/actions/clientes/clientes";
import type { HistoricoVenda } from "@/modules/clientes/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function HistoricoList({ clienteId }: { clienteId: string }) {
  const [vendas, setVendas] = useState<HistoricoVenda[] | null>(null);

  useEffect(() => {
    getHistoricoCompras(clienteId).then(setVendas);
  }, [clienteId]);

  if (vendas === null) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  if (vendas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <ShoppingBag className="size-6" />
        <p className="text-sm">Nenhuma compra registrada para este cliente.</p>
      </div>
    );
  }

  const total = vendas.reduce((sum, v) => sum + v.total, 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{vendas.length} compra(s)</span>
        <span className="font-medium text-foreground">{formatCurrency(total)}</span>
      </div>
      <div className="divide-y divide-border">
        {vendas.map((venda) => (
          <div key={venda.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted-foreground">{formatDate(venda.created_at)}</span>
            <span className="font-medium text-foreground">{formatCurrency(venda.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoricoDialog({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Ver histórico de compras">
            <History className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Histórico de compras</DialogTitle>
        </DialogHeader>
        {open && <HistoricoList clienteId={clienteId} />}
      </DialogContent>
    </Dialog>
  );
}
