"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategoria,
  deleteCategoria,
  createMarca,
  deleteMarca,
} from "@/server/actions/produtos/taxonomies";
import type { Categoria, Marca } from "@/modules/produtos/types";

function TaxonomyList({
  label,
  items,
  onCreate,
  onDelete,
}: {
  label: string;
  items: { id: string; nome: string }[];
  onCreate: (nome: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (value.trim().length < 2) return;
    setSubmitting(true);
    try {
      await onCreate(value.trim());
      setValue("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await onDelete(id);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="mb-3 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Nova ${label.toLowerCase()}`}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
        />
        <Button type="button" size="icon" disabled={submitting} onClick={handleCreate}>
          <Plus className="size-4" />
        </Button>
      </div>
      <ul className="max-h-40 space-y-1 overflow-y-auto">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhuma cadastrada.</li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-muted"
          >
            {item.nome}
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remover ${item.nome}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TaxonomyManager({
  categorias,
  marcas,
}: {
  categorias: Categoria[];
  marcas: Marca[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <Settings className="size-4" />
            Categorias e marcas
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categorias e marcas</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <TaxonomyList
            label="Categorias"
            items={categorias}
            onCreate={(nome) => createCategoria({ nome })}
            onDelete={deleteCategoria}
          />
          <TaxonomyList
            label="Marcas"
            items={marcas}
            onCreate={(nome) => createMarca({ nome })}
            onDelete={deleteMarca}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
