"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/produtos/product-form";
import type { Categoria, Marca, Produto } from "@/modules/produtos/types";

type ProductDialogProps = {
  categorias: Categoria[];
  marcas: Marca[];
  produto?: Produto;
  trigger: React.ReactNode;
};

export function ProductDialog({ categorias, marcas, produto, trigger }: ProductDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <ProductForm
          categorias={categorias}
          marcas={marcas}
          produto={produto}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
