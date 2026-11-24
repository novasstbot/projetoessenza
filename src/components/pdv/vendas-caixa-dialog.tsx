"use client";

import { useEffect, useState } from "react";
import { History, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getVendasCaixa } from "@/server/actions/pdv/vendas";
import type { VendaCaixa } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function VendasList({ caixaId }: { caixaId: string }) {
  const [vendas, setVendas] = useState<VendaCaixa[] | null>(null);

  useEffect(() => {
    getVendasCaixa(caixaId).then((data) => setVendas(data as unknown as VendaCaixa[]));
  }, [caixaId]);

  if (vendas === null) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>;
  }

  if (vendas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <Receipt className="size-6" />
        <p className="text-sm">Nenhuma venda registrada neste caixa ainda.</p>
      </div>
    );
  }

  const concluidas = vendas.filter((v) => v.status === "concluida");
  const total = concluidas.reduce((sum, v) => sum + v.total, 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{concluidas.length} venda(s)</span>
        <span className="font-medium text-foreground">{formatCurrency(total)}</span>
      </div>
      <div className="max-h-80 divide-y divide-border overflow-y-auto">
        {vendas.map((venda) => (
          <div key={venda.id} className="flex items-center justify-between py-2 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground">{formatTime(venda.created_at)}</span>
              <span className="text-xs text-muted-foreground">
                {venda.customers?.full_name ?? "Venda avulsa"}
              </span>
              {venda.status === "cancelada" && <Badge variant="outline">Cancelada</Badge>}
            </div>
            <span
              className={
                venda.status === "cancelada"
                  ? "font-medium text-muted-foreground line-through"
                  : "font-medium text-foreground"
              }
            >
              {formatCurrency(venda.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VendasCaixaDialog({ caixaId }: { caixaId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <History className="size-3.5" />
            Vendas do caixa
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Vendas deste caixa</DialogTitle>
        </DialogHeader>
        {open && <VendasList caixaId={caixaId} />}
      </DialogContent>
    </Dialog>
  );
}
