"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeScannerButton } from "@/components/produtos/barcode-scanner-button";
import {
  addCodigoBarra,
  removeCodigoBarra,
  setCodigoPrincipal,
} from "@/server/actions/produtos/barcodes";
import type { VarianteDetalhada } from "@/modules/produtos/types";

export function CodigosBarraTab({
  produtoId,
  variantes,
  varianteSelecionada,
  onSelect,
}: {
  produtoId: string;
  variantes: VarianteDetalhada[];
  varianteSelecionada: VarianteDetalhada | null;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!varianteSelecionada) return;
    if (!/^\d{8,14}$/.test(codigo)) {
      toast.error("Código deve ter entre 8 e 14 dígitos.");
      return;
    }
    setSubmitting(true);
    try {
      await addCodigoBarra(varianteSelecionada.id, produtoId, { codigo });
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
    if (!varianteSelecionada) return;
    try {
      await setCodigoPrincipal(id, varianteSelecionada.id, produtoId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  if (variantes.length === 0) {
    return <p className="text-sm text-muted-foreground">Cadastre uma variação primeiro.</p>;
  }

  return (
    <div className="space-y-4">
      <Select
        value={varianteSelecionada?.id}
        onValueChange={(v) => v && onSelect(v)}
      >
        <SelectTrigger className="w-72">
          <SelectValue>
            {() => varianteSelecionada?.nome ?? "Selecione a variação"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {variantes.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.nome} ({v.codigo_interno})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {varianteSelecionada && (
        <>
          <div className="flex gap-2">
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
            {varianteSelecionada.produto_codigos_barra.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum código cadastrado.</p>
            ) : (
              varianteSelecionada.produto_codigos_barra.map((c) => (
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
        </>
      )}
    </div>
  );
}
