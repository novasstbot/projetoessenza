"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { atualizarMeuPerfil } from "@/server/actions/configuracoes/perfil";

function NomeForm({ nomeAtual }: { nomeAtual: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeAtual);
  const [submitting, setSubmitting] = useState(false);

  async function handleSalvar() {
    setSubmitting(true);
    try {
      await atualizarMeuPerfil(nome);
      toast.success("Nome atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Nome completo</Label>
      <div className="flex gap-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} className="max-w-sm" />
        <Button type="button" size="sm" disabled={submitting} onClick={handleSalvar}>
          {submitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function SenhaForm() {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleTrocar() {
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      toast.success("Senha atualizada.");
      setSenha("");
      setConfirmacao("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível trocar a senha.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid max-w-sm grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Nova senha</Label>
        <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Confirmar senha</Label>
        <Input
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={submitting}
        onClick={handleTrocar}
        className="sm:col-span-2 sm:w-fit"
      >
        {submitting ? "Trocando..." : "Trocar senha"}
      </Button>
    </div>
  );
}

export function PerfilManager({
  fullName,
  email,
  roleLabel,
}: {
  fullName: string | null;
  email: string | null;
  roleLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meu perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p className="text-sm text-foreground">{email ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Papel: {roleLabel}</p>
        </div>
        <NomeForm nomeAtual={fullName ?? ""} />
        <SenhaForm />
      </CardContent>
    </Card>
  );
}
