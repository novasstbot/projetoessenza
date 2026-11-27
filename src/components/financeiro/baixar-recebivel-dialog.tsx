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
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { baixarRecebivelCartao } from "@/server/actions/financeiro/recebiveis";
import type { ContaFinanceira } from "@/modules/financeiro/types";

export function BaixarRecebivelDialog({
  recebivelId,
  valorPendente,
  contasFinanceiras,
}: {
  recebivelId: string;
  valorPendente: number;
  contasFinanceiras: ContaFinanceira[];
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(valorPendente);
  const [contaFinanceiraId, setContaFinanceiraId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await baixarRecebivelCartao(recebivelId, { valorRecebido: valor, contaFinanceiraId });
      toast.success("Recebível baixado.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível dar baixa.");
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
            Dar baixa
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dar baixa no recebível</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Valor recebido</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-1.5">
            <Label>Conta de destino (opcional — padrão é a configurada na modalidade)</Label>
            <Select value={contaFinanceiraId} onValueChange={(v) => setContaFinanceiraId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => contasFinanceiras.find((c) => c.id === contaFinanceiraId)?.nome ?? "Padrão"}
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
