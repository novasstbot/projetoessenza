"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Pencil, EyeOff, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FornecedorDialog } from "@/components/fornecedores/fornecedor-dialog";
import { toggleFornecedorAtivo } from "@/server/actions/fornecedores/fornecedores";
import type { Fornecedor } from "@/modules/fornecedores/types";

export function FornecedoresTable({
  fornecedores,
  canManage,
}: {
  fornecedores: Fornecedor[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return fornecedores;
    return fornecedores.filter(
      (f) =>
        f.nome.toLowerCase().includes(term) || (f.cnpj_cpf ?? "").toLowerCase().includes(term),
    );
  }, [fornecedores, search]);

  async function handleToggle(fornecedor: Fornecedor) {
    try {
      await toggleFornecedorAtivo(fornecedor.id, !fornecedor.ativo);
      toast.success(fornecedor.ativo ? "Fornecedor desativado." : "Fornecedor ativado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CNPJ/CPF"
            className="pl-8"
          />
        </div>
        {canManage && (
          <FornecedorDialog
            trigger={
              <Button className="gap-1.5">
                <Plus className="size-4" />
                Novo fornecedor
              </Button>
            }
          />
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">CNPJ/CPF</th>
              <th className="px-4 py-2.5 font-medium">Contato</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              {canManage && <th className="px-4 py-2.5 font-medium text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum fornecedor encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((fornecedor) => (
                <tr key={fornecedor.id} className={!fornecedor.ativo ? "opacity-60" : undefined}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{fornecedor.nome}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {fornecedor.cnpj_cpf ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {fornecedor.telefone ?? "—"}
                    {fornecedor.email && <span className="block text-xs">{fornecedor.email}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={fornecedor.ativo ? "secondary" : "outline"}>
                      {fornecedor.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <FornecedorDialog
                          fornecedor={fornecedor}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Editar">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={fornecedor.ativo ? "Desativar" : "Ativar"}
                          onClick={() => handleToggle(fornecedor)}
                        >
                          {fornecedor.ativo ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
