"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Pencil, EyeOff, Eye, Mail, MailX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClienteDialog } from "@/components/clientes/cliente-dialog";
import { HistoricoDialog } from "@/components/clientes/historico-dialog";
import { toggleClienteAtivo } from "@/server/actions/clientes/clientes";
import type { Cliente } from "@/modules/clientes/types";

export function ClientesTable({
  clientes,
  canManage,
}: {
  clientes: Cliente[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter(
      (c) =>
        c.full_name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
    );
  }, [clientes, search]);

  async function handleToggle(cliente: Cliente) {
    try {
      await toggleClienteAtivo(cliente.id, !cliente.ativo);
      toast.success(cliente.ativo ? "Cliente desativado." : "Cliente ativado.");
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
            placeholder="Buscar por nome ou e-mail"
            className="pl-8"
          />
        </div>
        {canManage && (
          <ClienteDialog
            trigger={
              <Button className="gap-1.5">
                <Plus className="size-4" />
                Novo cliente
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
              <th className="px-4 py-2.5 font-medium">Contato</th>
              <th className="px-4 py-2.5 font-medium">E-mails</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((cliente) => {
                const optIn = cliente.communication_preferences?.email_opt_in ?? false;
                return (
                  <tr key={cliente.id} className={!cliente.ativo ? "opacity-60" : undefined}>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {cliente.full_name}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {cliente.email}
                      {cliente.phone && <span className="block text-xs">{cliente.phone}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={optIn ? "secondary" : "outline"} className="gap-1">
                        {optIn ? <Mail className="size-3" /> : <MailX className="size-3" />}
                        {optIn ? "Autorizado" : "Não autorizado"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={cliente.ativo ? "secondary" : "outline"}>
                        {cliente.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <HistoricoDialog clienteId={cliente.id} />
                        {canManage && (
                          <>
                            <ClienteDialog
                              cliente={cliente}
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label="Editar">
                                  <Pencil className="size-4" />
                                </Button>
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={cliente.ativo ? "Desativar" : "Ativar"}
                              onClick={() => handleToggle(cliente)}
                            >
                              {cliente.ativo ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
