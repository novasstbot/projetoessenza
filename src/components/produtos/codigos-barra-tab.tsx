"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeScannerButton } from "@/components/produtos/barcode-scanner-button";
import {
  addCodigoBarra,
  removeCodigoBarra,
  setCodigoPrincipal,
} from "@/server/actions/produtos/barcodes";
import type { VarianteDetalhada } from "@/modules/produtos/types";

function VarianteCodigos({
  produtoId,
  variante,
}: {
  produtoId: string;
  variante: VarianteDetalhada;
}) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!/^\d{8,14}$/.test(codigo)) {
      toast.error("Código deve ter entre 8 e 14 dígitos.");
      return;
    }
    setSubmitting(true);
    try {
      await addCodigoBarra(variante.id, produtoId, { codigo });
      setCodigo("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeCodigoBarra(id, produtoId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  async function handleSetPrincipal(id: string) {
    try {
      await setCodigoPrincipal(id, variante.id, produtoId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-sm font-medium text-foreground">
        {variante.nome}{" "}
        <span className="font-normal text-muted-foreground">({variante.codigo_interno})</span>
      </p>

      <div className="mb-2 flex gap-2">
        <Input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="7891234567890"
          className="max-w-xs"
        />
        <BarcodeScannerButton onDetected={setCodigo} />
        <Button type="button" size="sm" disabled={submitting} onClick={handleAdd}>
          Adicionar
        </Button>
      </div>

      <div className="space-y-1.5">
        {variante.produto_codigos_barra.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum código cadastrado.</p>
        ) : (
          variante.produto_codigos_barra.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground">{c.codigo}</span>
                <Badge variant="outline">{c.tipo}</Badge>
                {c.principal && <Badge variant="secondary">Principal</Badge>}
              </div>
              <div className="flex gap-1">
                {!c.principal && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Definir como principal"
                    onClick={() => handleSetPrincipal(c.id)}
                  >
                    <Star className="size-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover"
                  onClick={() => handleRemove(c.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CodigosBarraTab({
  produtoId,
  variantes,
}: {
  produtoId: string;
  variantes: VarianteDetalhada[];
}) {
  const [filtro, setFiltro] = useState("");

  if (variantes.length === 0) {
    return <p className="text-sm text-muted-foreground">Cadastre uma variação primeiro.</p>;
  }

  const termo = filtro.trim().toLowerCase();
  const filtradas = termo
    ? variantes.filter(
        (v) =>
          v.nome.toLowerCase().includes(termo) || v.codigo_interno.toLowerCase().includes(termo),
      )
    : variantes;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por nome ou código interno"
          className="pl-8"
        />
      </div>

      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma variação encontrada.</p>
        ) : (
          filtradas.map((v) => <VarianteCodigos key={v.id} produtoId={produtoId} variante={v} />)
        )}
      </div>
    </div>
  );
}
