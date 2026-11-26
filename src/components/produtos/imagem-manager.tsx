"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { urlImagem } from "@/lib/produtos/imagem";
import {
  uploadImagem,
  removeImagem,
  setImagemPrincipal,
  type TipoEntidadeImagem,
} from "@/server/actions/produtos/imagens";
import type { Imagem } from "@/modules/produtos/types";

export function ImagemManager({
  tipo,
  entidadeId,
  produtoId,
  imagens,
}: {
  tipo: TipoEntidadeImagem;
  entidadeId: string;
  produtoId: string;
  imagens: Imagem[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("tipo", tipo);
      formData.set("entidadeId", entidadeId);
      formData.set("produtoId", produtoId);
      await uploadImagem(formData);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeImagem(id, tipo, entidadeId, produtoId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  async function handleSetPrincipal(id: string) {
    try {
      await setImagemPrincipal(id, tipo, entidadeId, produtoId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  const ordenadas = [...imagens].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ordenadas.map((imagem) => (
          <div
            key={imagem.id}
            className="group relative size-20 overflow-hidden rounded-lg border border-border"
          >
            <img
              src={urlImagem(imagem.path_thumb)}
              alt=""
              className="size-full object-contain"
            />
            {imagem.principal && (
              <span className="absolute left-1 top-1 rounded bg-gold px-1 text-[10px] font-medium text-background">
                Principal
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-0.5 bg-background/80 p-0.5 opacity-0 group-hover:opacity-100">
              {!imagem.principal && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Definir como principal"
                  onClick={() => handleSetPrincipal(imagem.id)}
                >
                  <Star className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover"
                onClick={() => handleRemove(imagem.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}

        <button
          type="button"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted disabled:opacity-60"
        >
          <Upload className="size-4" />
          {enviando ? "Enviando..." : "Adicionar"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
