"use client";

import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import { ContasReceberTable } from "@/components/financeiro/contas-receber-table";
import { NovaContaReceberDialog } from "@/components/financeiro/nova-conta-receber-dialog";
import type { ContaFinanceira, ContaReceber } from "@/modules/financeiro/types";

type ClienteOpcao = { id: string; full_name: string };

export function ContasReceberSection({
  contas,
  contasFinanceiras,
  clientes,
  canManage,
}: {
  contas: ContaReceber[];
  contasFinanceiras: ContaFinanceira[];
  clientes: ClienteOpcao[];
  canManage: boolean;
}) {
  const [range, setRange] = useState<DateRange>(null);

  const filtradas = useMemo(() => {
    if (!range) return contas;
    return contas.filter((c) => c.vencimento >= range.from && c.vencimento <= range.to);
  }, [contas, range]);

  return (
    <CollapsibleCard
      title={`Contas a receber (${filtradas.length})`}
      actions={canManage && <NovaContaReceberDialog clientes={clientes} />}
    >
      <div className="mb-4">
        <DateRangeFilter onChange={setRange} />
      </div>
      <ContasReceberTable
        contas={filtradas}
        contasFinanceiras={contasFinanceiras}
        canManage={canManage}
      />
    </CollapsibleCard>
  );
}
