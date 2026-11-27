"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Zap } from "lucide-react";
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
import {
  marcarRecebivelDivergente,
  anteciparRecebivel,
} from "@/server/actions/financeiro/recebiveis";

export function RecebivelMotivoDialog({
  recebivelId,
  acao,
  valorAntecipado,
}: {
  recebivelId: string;
  acao: "divergente" | "antecipar";
  valorAntecipado?: number;
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
      if (acao === "divergente") {
        await marcarRecebivelDivergente(recebivelId, { motivo: motivo.trim() });
        toast.success("Recebível marcado como divergente.");
      } else {
        await anteciparRecebivel(recebivelId, { motivo: motivo.trim() });
        toast.success("Recebível antecipado.");
      }
      setOpen(false);
      setMotivo("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5">
            {acao === "divergente" ? (
              <>
                <AlertTriangle className="size-3.5" />
                Divergência
              </>
            ) : (
              <>
                <Zap className="size-3.5" />
                Antecipar
              </>
            )}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {acao === "divergente" ? "Marcar como divergente" : "Antecipar recebível"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {acao === "antecipar" && valorAntecipado != null && (
            <p className="text-sm text-muted-foreground">
              Valor que cai na conta hoje (já descontada a taxa de antecipação):{" "}
              <span className="font-medium text-foreground">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  valorAntecipado,
                )}
              </span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                acao === "divergente" ? "Explique a divergência" : "Ex.: antecipação solicitada"
              }
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
