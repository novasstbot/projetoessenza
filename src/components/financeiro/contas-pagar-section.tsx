"use client";

import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import { ContasPagarTable } from "@/components/financeiro/contas-pagar-table";
import { NovaContaPagarDialog } from "@/components/financeiro/nova-conta-pagar-dialog";
import type { ContaFinanceira, ContaPagar } from "@/modules/financeiro/types";
import type { Fornecedor } from "@/modules/fornecedores/types";

export function ContasPagarSection({
  contas,
  contasFinanceiras,
  fornecedores,
  canManage,
}: {
  contas: ContaPagar[];
  contasFinanceiras: ContaFinanceira[];
  fornecedores: Fornecedor[];
  canManage: boolean;
}) {
  const [range, setRange] = useState<DateRange>(null);

  const filtradas = useMemo(() => {
    if (!range) return contas;
    return contas.filter((c) => c.vencimento >= range.from && c.vencimento <= range.to);
  }, [contas, range]);

  return (
    <CollapsibleCard
      title={`Contas a pagar (${filtradas.length})`}
      actions={canManage && <NovaContaPagarDialog fornecedores={fornecedores} />}
    >
      <div className="mb-4">
        <DateRangeFilter onChange={setRange} />
      </div>
      <ContasPagarTable
        contas={filtradas}
        contasFinanceiras={contasFinanceiras}
        canManage={canManage}
      />
    </CollapsibleCard>
  );
}
