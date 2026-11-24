"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BarcodeScannerButton } from "@/components/produtos/barcode-scanner-button";
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

  const findMatches = useCallback(
    (value: string) => {
      const t = value.trim().toLowerCase();
      if (!t) return [];
      return produtos
        .filter(
          (p) =>
            p.nome.toLowerCase().includes(t) ||
            p.codigo_interno.toLowerCase().includes(t) ||
            (p.codigo_ean ?? "").includes(t),
        )
        .slice(0, 8);
    },
    [produtos],
  );

  const matches = useMemo(() => findMatches(term), [findMatches, term]);

  function add(produto: ProdutoPdv) {
    onAdd(produto);
    setTerm("");
    inputRef.current?.focus();
  }

  // Usado tanto pelo Enter do leitor físico (que "digita" o código e envia
  // Enter) quanto pela foto tirada pela câmera: tenta achar o produto exato
  // pelo código e adiciona direto; sem correspondência exata, cai no
  // primeiro resultado da busca aproximada.
  function handleCode(value: string) {
    const exact = produtos.find(
      (p) => p.codigo_ean === value.trim() || p.codigo_interno === value.trim(),
    );
    if (exact) {
      add(exact);
      return;
    }
    const fuzzy = findMatches(value);
    if (fuzzy.length > 0) {
      add(fuzzy[0]);
      return;
    }
    setTerm(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleCode(term);
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
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
      <BarcodeScannerButton onDetected={handleCode} />
    </div>
  );
}
