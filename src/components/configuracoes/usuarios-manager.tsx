"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { atualizarUsuario } from "@/server/actions/configuracoes/usuarios";
import type { UserRole } from "@/server/auth/session";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
  estoquista: "Estoquista",
};

type Usuario = { id: string; full_name: string | null; role: UserRole; ativo: boolean; email: string };

export function UsuariosManager({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();

  async function handleChangeRole(usuario: Usuario, role: UserRole) {
    try {
      await atualizarUsuario(usuario.id, { role, ativo: usuario.ativo });
      toast.success("Papel atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  async function handleToggleAtivo(usuario: Usuario) {
    try {
      await atualizarUsuario(usuario.id, { role: usuario.role, ativo: !usuario.ativo });
      toast.success(usuario.ativo ? "Usuário inativado." : "Usuário ativado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usuários</CardTitle>
        <p className="text-sm text-muted-foreground">
          Troca o papel ou inativa quem já tem conta. Criar usuário novo continua fora do app.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {usuarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          usuarios.map((usuario) => (
            <div
              key={usuario.id}
              className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 ${!usuario.ativo ? "opacity-60" : ""}`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">
                    {usuario.full_name ?? "(sem nome)"}
                  </span>
                  {!usuario.ativo && <Badge variant="outline">Inativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{usuario.email}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Select
                  value={usuario.role}
                  onValueChange={(v) => v && handleChangeRole(usuario, v as UserRole)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue>{() => roleLabels[usuario.role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={usuario.ativo ? "Inativar" : "Ativar"}
                  onClick={() => handleToggleAtivo(usuario)}
                >
                  {usuario.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
