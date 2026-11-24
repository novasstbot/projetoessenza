"use client";

import { useMemo, useState } from "react";
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

const DENOMINACOES = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function FechamentoForm({
  caixaId,
  esperado,
  onSuccess,
}: {
  caixaId: string;
  esperado: number;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [usarContagem, setUsarContagem] = useState(true);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [valorManual, setValorManual] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalContagem = useMemo(
    () => DENOMINACOES.reduce((sum, d) => sum + d * (contagem[String(d)] ?? 0), 0),
    [contagem],
  );
  const valorInformado = usarContagem ? totalContagem : valorManual;
  const diferenca = Math.round((valorInformado - esperado) * 100) / 100;
  const precisaJustificativa = diferenca !== 0;

  async function handleSubmit() {
    if (precisaJustificativa && observacao.trim() === "") {
      toast.error("Informe uma justificativa para a diferença de caixa.");
      return;
    }
    setSubmitting(true);
    try {
      await fecharCaixa(caixaId, {
        valorInformado,
        contagem: usarContagem ? contagem : undefined,
        observacao,
      });
      toast.success("Caixa fechado.");
      onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar o caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <Button
          type="button"
          size="xs"
          variant={usarContagem ? "default" : "outline"}
          onClick={() => setUsarContagem(true)}
        >
          Contar cédulas e moedas
        </Button>
        <Button
          type="button"
          size="xs"
          variant={!usarContagem ? "default" : "outline"}
          onClick={() => setUsarContagem(false)}
        >
          Informar valor direto
        </Button>
      </div>

      {usarContagem ? (
        <div className="grid grid-cols-3 gap-2">
          {DENOMINACOES.map((d) => (
            <div key={d} className="space-y-1">
              <Label className="text-xs">{formatCurrency(d)}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={contagem[String(d)] ?? ""}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setContagem((prev) => ({ ...prev, [String(d)]: e.target.valueAsNumber || 0 }))
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Valor contado (R$)</Label>
          <CurrencyInput value={valorManual} onChange={setValorManual} />
        </div>
      )}

      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Esperado</span>
          <span>{formatCurrency(esperado)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Contado</span>
          <span>{formatCurrency(valorInformado)}</span>
        </div>
        <div className="flex justify-between font-medium text-foreground">
          <span>Diferença</span>
          <span className={diferenca !== 0 ? "text-destructive" : undefined}>
            {formatCurrency(diferenca)}
          </span>
        </div>
      </div>

      {precisaJustificativa && (
        <div className="space-y-1.5">
          <Label>Justificativa da diferença (obrigatória)</Label>
          <Input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Explique o motivo da diferença"
          />
        </div>
      )}

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? "Fechando..." : "Confirmar fechamento"}
      </Button>
    </div>
  );
}

export function FechamentoDialog({ caixaId, esperado }: { caixaId: string; esperado: number }) {
  const [open, setOpen] = useState(false);

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
        {open && (
          <FechamentoForm caixaId={caixaId} esperado={esperado} onSuccess={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
