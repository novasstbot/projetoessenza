"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { abrirCaixa } from "@/server/actions/pdv/caixa";

export function OpenCaixaCard() {
  const router = useRouter();
  const [valor, setValor] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function handleOpen() {
    setSubmitting(true);
    try {
      await abrirCaixa({ valor_abertura: valor });
      toast.success("Caixa aberto.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader className="items-center text-center">
        <Lock className="mb-2 size-8 text-gold" />
        <CardTitle>Caixa fechado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Informe o valor inicial para abrir o caixa e começar a vender.
        </p>
        <div className="space-y-1.5">
          <Label>Valor de abertura (R$)</Label>
          <CurrencyInput value={valor} onChange={setValor} />
        </div>
        <Button onClick={handleOpen} disabled={submitting} className="w-full">
          {submitting ? "Abrindo..." : "Abrir caixa"}
        </Button>
      </CardContent>
    </Card>
  );
}
