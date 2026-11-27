"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContasFinanceirasManager } from "@/components/configuracoes/contas-financeiras-manager";
import { FormasPagamentoManager } from "@/components/configuracoes/formas-pagamento-manager";
import { OperadorasCartaoManager } from "@/components/configuracoes/operadoras-cartao-manager";
import { PermissoesMenuManager } from "@/components/configuracoes/permissoes-menu-manager";
import { UsuariosManager } from "@/components/configuracoes/usuarios-manager";
import { PerfilManager } from "@/components/configuracoes/perfil-manager";
import { ConfiguracaoEmpresaManager } from "@/components/configuracoes/configuracao-empresa-manager";
import type { ContaFinanceira, OperadoraCartao } from "@/modules/financeiro/types";
import type { FormaPagamentoConfig } from "@/modules/pdv/types";
import type { UserRole } from "@/server/auth/session";
import type { ConfiguracaoEmpresa } from "@/server/actions/configuracoes/empresa";

type Categoria = "financeiro" | "permissoes" | "usuarios" | "perfil" | "geral";

function AcessoRestrito() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <p className="font-medium text-foreground">Acesso restrito</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Esta seção é visível só para administradores.
        </p>
      </CardContent>
    </Card>
  );
}

export function ConfiguracoesShell({
  isAdmin,
  contas,
  formasPagamento,
  operadoras,
  negadas,
  usuarios,
  empresa,
  fullName,
  email,
  roleLabel,
}: {
  isAdmin: boolean;
  contas: ContaFinanceira[];
  formasPagamento: FormaPagamentoConfig[];
  operadoras: OperadoraCartao[];
  negadas: { role: UserRole; menu_id: string }[];
  usuarios: { id: string; full_name: string | null; role: UserRole; ativo: boolean; email: string }[];
  empresa: ConfiguracaoEmpresa | null;
  fullName: string | null;
  email: string | null;
  roleLabel: string;
}) {
  const [categoria, setCategoria] = useState<Categoria>(isAdmin ? "financeiro" : "perfil");

  const categorias: { id: Categoria; label: string }[] = [
    { id: "financeiro", label: "Financeiro" },
    { id: "permissoes", label: "Permissões" },
    { id: "usuarios", label: "Usuários" },
    { id: "perfil", label: "Perfil" },
    { id: "geral", label: "Geral" },
  ];

  const contasAtivas = contas.filter((c) => c.ativo);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {categorias.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={categoria === c.id ? "secondary" : "outline"}
            size="sm"
            onClick={() => setCategoria(c.id)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <hr className="border-border" />

      {categoria === "financeiro" &&
        (isAdmin ? (
          <div className="space-y-6">
            <ContasFinanceirasManager contas={contas} />
            <FormasPagamentoManager formasPagamento={formasPagamento} contas={contasAtivas} />
            <OperadorasCartaoManager operadoras={operadoras} contas={contasAtivas} />
          </div>
        ) : (
          <AcessoRestrito />
        ))}

      {categoria === "permissoes" &&
        (isAdmin ? <PermissoesMenuManager negadas={negadas} /> : <AcessoRestrito />)}

      {categoria === "usuarios" &&
        (isAdmin ? <UsuariosManager usuarios={usuarios} /> : <AcessoRestrito />)}

      {categoria === "perfil" && (
        <PerfilManager fullName={fullName} email={email} roleLabel={roleLabel} />
      )}

      {categoria === "geral" &&
        (isAdmin && empresa ? (
          <ConfiguracaoEmpresaManager empresa={empresa} />
        ) : (
          <AcessoRestrito />
        ))}
    </div>
  );
}
