"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { urlImagem } from "@/lib/produtos/imagem";
import { uploadImagemCategoria, removeImagemCategoria } from "@/server/actions/produtos/imagens";
import type { Categoria } from "@/modules/produtos/types";

export function CategoriaImagem({ categoria }: { categoria: Categoria }) {
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
      formData.set("categoriaId", categoria.id);
      await uploadImagemCategoria(formData);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemove() {
    try {
      await removeImagemCategoria(categoria.id);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        aria-label="Imagem padrão da categoria"
        title="Imagem padrão da categoria"
        className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-border text-muted-foreground hover:bg-muted disabled:opacity-60"
      >
        {categoria.imagem_thumb ? (
          <img src={urlImagem(categoria.imagem_thumb)} alt="" className="size-full object-contain" />
        ) : (
          <Upload className="size-3" />
        )}
      </button>
      {categoria.imagem_thumb && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remover imagem padrão"
          onClick={handleRemove}
        >
          <Trash2 className="size-3" />
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
