"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateFormaPagamentoContaDestino } from "@/server/actions/configuracoes/formas-pagamento";
import type { FormaPagamentoConfig } from "@/modules/pdv/types";
import type { ContaFinanceira } from "@/modules/financeiro/types";

export function FormasPagamentoManager({
  formasPagamento,
  contas,
}: {
  formasPagamento: FormaPagamentoConfig[];
  contas: ContaFinanceira[];
}) {
  const router = useRouter();

  async function handleChange(formaId: string, contaId: string) {
    try {
      await updateFormaPagamentoContaDestino(formaId, contaId);
      toast.success("Destino atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Formas de pagamento</CardTitle>
        <p className="text-sm text-muted-foreground">
          Define pra qual conta o dinheiro de cada forma de pagamento vai quando uma venda é
          concluída.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {formasPagamento.map((forma) => (
          <div
            key={forma.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <span className="font-medium text-foreground">{forma.nome}</span>
            <Select
              value={forma.conta_financeira_id ?? undefined}
              onValueChange={(v) => v && handleChange(forma.id, v)}
            >
              <SelectTrigger className="w-64">
                <SelectValue>
                  {() =>
                    contas.find((c) => c.id === forma.conta_financeira_id)?.nome ??
                    "Selecione a conta de destino"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
