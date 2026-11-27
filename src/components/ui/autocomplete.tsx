"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

// Mesmo padrão de busca já usado em product-search.tsx/nova-compra-dialog.tsx
// (input + lista de resultados), só generalizado pra qualquer lista de itens
// — pra não ficar reimplementando isso a cada tela que precisa escolher um
// produto numa lista longa.
export function Autocomplete<T>({
  items,
  value,
  onChange,
  getId,
  getLabel,
  getSublabel,
  placeholder,
}: {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  getSublabel?: (item: T) => string | null | undefined;
  placeholder?: string;
}) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const selecionado = items.find((item) => getId(item) === value);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    const base = !t
      ? items
      : items.filter(
          (item) =>
            getLabel(item).toLowerCase().includes(t) ||
            (getSublabel?.(item) ?? "").toLowerCase().includes(t),
        );
    return base.slice(0, 8);
  }, [items, term, getLabel, getSublabel]);

  return (
    <div className="relative">
      <Input
        value={open ? term : (selecionado ? getLabel(selecionado) : "")}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setTerm("");
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        placeholder={placeholder ?? "Buscar..."}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
          {matches.map((item) => {
            const id = getId(item);
            const sublabel = getSublabel?.(item);
            return (
              <button
                key={id}
                type="button"
                // Evita que o blur do input feche a lista antes do clique registrar.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(id);
                  setTerm("");
                  setOpen(false);
                }}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="text-foreground">{getLabel(item)}</span>
                {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
