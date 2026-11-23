"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { receberCompra, cancelarCompra } from "@/server/actions/compras/compras";
import type { Compra } from "@/modules/compras/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

const statusLabel: Record<Compra["status"], string> = {
  rascunho: "Rascunho",
  recebida: "Recebida",
  cancelada: "Cancelada",
};

const statusVariant: Record<Compra["status"], "outline" | "secondary" | "destructive"> = {
  rascunho: "outline",
  recebida: "secondary",
  cancelada: "destructive",
};

export function ComprasTable({ compras, canManage }: { compras: Compra[]; canManage: boolean }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleReceber(id: string) {
    setLoadingId(id);
    try {
      await receberCompra(id);
      toast.success("Compra recebida — estoque atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível receber a compra.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCancelar(id: string) {
    setLoadingId(id);
    try {
      await cancelarCompra(id);
      toast.success("Compra cancelada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Fornecedor</th>
            <th className="px-4 py-2.5 font-medium">Itens</th>
            <th className="px-4 py-2.5 font-medium">Total</th>
            <th className="px-4 py-2.5 font-medium">Data</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            {canManage && <th className="px-4 py-2.5 font-medium text-right">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {compras.length === 0 ? (
            <tr>
              <td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">
                Nenhuma compra registrada.
              </td>
            </tr>
          ) : (
            compras.map((compra) => {
              const total = compra.itens_compra.reduce((sum, i) => sum + i.subtotal, 0);
              return (
                <tr key={compra.id}>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {compra.fornecedores?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {compra.itens_compra.length}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{formatCurrency(total)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(compra.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[compra.status]}>
                      {statusLabel[compra.status]}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5">
                      {compra.status === "rascunho" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={loadingId === compra.id}
                            onClick={() => handleReceber(compra.id)}
                          >
                            <PackageCheck className="size-3.5" />
                            Receber
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Cancelar compra"
                            disabled={loadingId === compra.id}
                            onClick={() => handleCancelar(compra.id)}
                          >
                            <Ban className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
