"use client";

import { useState } from "react";
import { ContasFinanceirasList } from "@/components/caixa/contas-financeiras-list";
import { ExtratoContaDialog } from "@/components/financeiro/extrato-conta-dialog";
import type { ContaFinanceira } from "@/modules/financeiro/types";

export function ContasFinanceirasSaldos({
  contas,
  saldos,
}: {
  contas: ContaFinanceira[];
  saldos: Map<string, number>;
}) {
  const [contaSelecionada, setContaSelecionada] = useState<ContaFinanceira | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ContasFinanceirasList
        contas={contas}
        saldos={saldos}
        onSelect={(conta) => {
          setContaSelecionada(conta);
          setOpen(true);
        }}
      />
      <ExtratoContaDialog conta={contaSelecionada} open={open} onOpenChange={setOpen} />
    </>
  );
}
