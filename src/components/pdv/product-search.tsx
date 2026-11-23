"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ProdutoPdv } from "@/modules/pdv/types";

export function ProductSearch({
  produtos,
  onAdd,
}: {
  produtos: ProdutoPdv[];
  onAdd: (produto: ProdutoPdv) => void;
}) {
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return produtos
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(t) ||
          p.codigo_interno.toLowerCase().includes(t) ||
          (p.codigo_ean ?? "").includes(t),
      )
      .slice(0, 8);
  }, [produtos, term]);

  function add(produto: ProdutoPdv) {
    onAdd(produto);
    setTerm("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const exact = produtos.find(
      (p) => p.codigo_ean === term.trim() || p.codigo_interno === term.trim(),
    );
    if (exact) {
      add(exact);
    } else if (matches.length > 0) {
      add(matches[0]);
    }
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        autoFocus
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar produto ou passar o leitor de código de barras"
        className="pl-8"
      />
      {matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {matches.map((produto) => (
            <button
              key={produto.id}
              type="button"
              onClick={() => add(produto)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span>
                {produto.nome}
                <span className="block text-xs text-muted-foreground">
                  {produto.codigo_interno}
                  {produto.codigo_ean ? ` · EAN ${produto.codigo_ean}` : ""} · estoque{" "}
                  {produto.quantidade_atual}
                </span>
              </span>
              <span className="font-medium text-foreground">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  produto.preco_venda,
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
