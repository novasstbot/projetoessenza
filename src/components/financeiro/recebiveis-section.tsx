"use client";

import { useMemo, useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecebiveisTable } from "@/components/financeiro/recebiveis-table";
import { recebivelSituacaoLabels } from "@/modules/financeiro/types";
import type {
  ContaFinanceira,
  RecebivelCartao,
  RecebivelCartaoSituacao,
} from "@/modules/financeiro/types";

const TODAS_SITUACOES = "todas";

export function RecebiveisSection({
  recebiveis,
  contasFinanceiras,
}: {
  recebiveis: RecebivelCartao[];
  contasFinanceiras: ContaFinanceira[];
}) {
  const [range, setRange] = useState<DateRange>(null);
  const [situacao, setSituacao] = useState<RecebivelCartaoSituacao | "todas">(TODAS_SITUACOES);

  const filtrados = useMemo(() => {
    return recebiveis.filter((r) => {
      const dentroDoRange = !range || (r.data_venda.slice(0, 10) >= range.from && r.data_venda.slice(0, 10) <= range.to);
      const situacaoOk = situacao === TODAS_SITUACOES || r.situacao === situacao;
      return dentroDoRange && situacaoOk;
    });
  }, [recebiveis, range, situacao]);

  return (
    <CollapsibleCard title={`Recebíveis de cartão (${filtrados.length})`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DateRangeFilter onChange={setRange} />
        <Select
          value={situacao}
          onValueChange={(v) => v && setSituacao(v as RecebivelCartaoSituacao | "todas")}
        >
          <SelectTrigger className="w-48">
            <SelectValue>
              {() => (situacao === TODAS_SITUACOES ? "Todas as situações" : recebivelSituacaoLabels[situacao])}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS_SITUACOES}>Todas as situações</SelectItem>
            {Object.entries(recebivelSituacaoLabels).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <RecebiveisTable recebiveis={filtrados} contasFinanceiras={contasFinanceiras} />
    </CollapsibleCard>
  );
}
