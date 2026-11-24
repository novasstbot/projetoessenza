"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { baixarContaPagar, baixarContaReceber } from "@/server/actions/financeiro/contas";
import type { ContaFinanceira } from "@/modules/financeiro/types";

export function BaixarContaDialog({
  contaId,
  tipo,
  contasFinanceiras,
}: {
  contaId: string;
  tipo: "pagar" | "receber";
  contasFinanceiras: ContaFinanceira[];
}) {
  const [open, setOpen] = useState(false);
  const [contaFinanceiraId, setContaFinanceiraId] = useState(contasFinanceiras[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    if (!contaFinanceiraId) {
      toast.error("Selecione a conta financeira.");
      return;
    }
    setSubmitting(true);
    try {
      if (tipo === "pagar") {
        await baixarContaPagar(contaId, { contaFinanceiraId });
      } else {
        await baixarContaReceber(contaId, { contaFinanceiraId });
      }
      toast.success(tipo === "pagar" ? "Conta paga." : "Conta recebida.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar a conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <CheckCircle2 className="size-3.5" />
            {tipo === "pagar" ? "Pagar" : "Receber"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{tipo === "pagar" ? "Pagar conta" : "Receber conta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{tipo === "pagar" ? "De qual conta sai o dinheiro?" : "Em qual conta entra o dinheiro?"}</Label>
            <Select value={contaFinanceiraId} onValueChange={(v) => v && setContaFinanceiraId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() =>
                    contasFinanceiras.find((c) => c.id === contaFinanceiraId)?.nome ?? "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contasFinanceiras.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleConfirm} disabled={submitting} className="w-full">
            {submitting ? "Confirmando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
