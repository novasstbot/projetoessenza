"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
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
import { estornarBaixaContaPagar, estornarBaixaContaReceber } from "@/server/actions/financeiro/contas";

export function EstornarBaixaDialog({
  contaId,
  tipo,
}: {
  contaId: string;
  tipo: "pagar" | "receber";
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    if (motivo.trim().length < 3) {
      toast.error("Descreva o motivo.");
      return;
    }
    setSubmitting(true);
    try {
      if (tipo === "pagar") {
        await estornarBaixaContaPagar(contaId, { motivo: motivo.trim() });
      } else {
        await estornarBaixaContaReceber(contaId, { motivo: motivo.trim() });
      }
      toast.success("Baixa estornada.");
      setOpen(false);
      setMotivo("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível estornar a baixa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Undo2 className="size-3.5" />
            Estornar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Estornar baixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Justifique o estorno"
            />
          </div>
          <Button onClick={handleConfirm} disabled={submitting} className="w-full">
            {submitting ? "Confirmando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
