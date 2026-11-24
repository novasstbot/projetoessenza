"use client";

import { useMemo, useState } from "react";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComprasTable } from "@/components/compras/compras-table";
import type { Compra } from "@/modules/compras/types";
import type { Fornecedor } from "@/modules/fornecedores/types";

const TODOS = "todos";

export function ComprasList({
  compras,
  fornecedores,
  canManage,
}: {
  compras: Compra[];
  fornecedores: Fornecedor[];
  canManage: boolean;
}) {
  const [range, setRange] = useState<DateRange>(null);
  const [fornecedorId, setFornecedorId] = useState(TODOS);

  const filtradas = useMemo(() => {
    return compras.filter((compra) => {
      const data = compra.created_at.slice(0, 10);
      const matchesRange = !range || (data >= range.from && data <= range.to);
      const matchesFornecedor = fornecedorId === TODOS || compra.fornecedor_id === fornecedorId;
      return matchesRange && matchesFornecedor;
    });
  }, [compras, range, fornecedorId]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DateRangeFilter onChange={setRange} />
        <Select value={fornecedorId} onValueChange={(v) => v && setFornecedorId(v)}>
          <SelectTrigger className="w-48">
            <SelectValue>
              {() =>
                fornecedorId === TODOS
                  ? "Todos os fornecedores"
                  : (fornecedores.find((f) => f.id === fornecedorId)?.nome ?? "Todos os fornecedores")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os fornecedores</SelectItem>
            {fornecedores.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ComprasTable compras={filtradas} canManage={canManage} />
    </div>
  );
}
