"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { atualizarUsuario, criarUsuario } from "@/server/actions/configuracoes/usuarios";
import type { UserRole } from "@/server/auth/session";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
  estoquista: "Estoquista",
};

type Usuario = { id: string; full_name: string | null; role: UserRole; ativo: boolean; email: string };

function NovoUsuarioForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("vendedor");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (fullName.trim().length < 2) {
      toast.error("Informe o nome completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await criarUsuario({ fullName, email, password, role });
      toast.success("Usuário criado.");
      router.refresh();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Papel</Label>
          <Select value={role} onValueChange={(v) => v && setRole(v as UserRole)}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => roleLabels[role]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabels[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={submitting} onClick={handleCreate}>
          {submitting ? "Criando..." : "Criar usuário"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function UsuariosManager({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);

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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Usuários</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cria conta nova ou troca o papel e ativa/inativa quem já tem conta.
          </p>
        </div>
        {!criando && (
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setCriando(true)}>
            <Plus className="size-4" />
            Novo usuário
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {criando && <NovoUsuarioForm onDone={() => setCriando(false)} />}

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
