"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockKeyhole } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { fecharCaixa } from "@/server/actions/pdv/caixa";

export function CloseCaixaDialog({ caixaId }: { caixaId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleClose() {
    setSubmitting(true);
    try {
      await fecharCaixa(caixaId, {
        valor_fechamento_informado: valor,
        observacao_fechamento: observacao,
      });
      toast.success("Caixa fechado.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar o caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <LockKeyhole className="size-4" />
            Fechar caixa
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Valor contado no caixa (R$)</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <Button onClick={handleClose} disabled={submitting} className="w-full">
            {submitting ? "Fechando..." : "Confirmar fechamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
