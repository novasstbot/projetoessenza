import { PageHeader } from "@/components/layout/page-header";
import { ConfiguracoesShell } from "@/components/configuracoes/configuracoes-shell";
import { createClient } from "@/lib/supabase/server";
import { getSession, requireRole } from "@/server/auth/session";
import { getUsuarios } from "@/server/actions/configuracoes/usuarios";
import { getPermissoesMenuNegadas } from "@/server/actions/configuracoes/permissoes-menu";
import { getConfiguracaoEmpresa } from "@/server/actions/configuracoes/empresa";
import type { ContaFinanceira, OperadoraCartao } from "@/modules/financeiro/types";
import type { FormaPagamentoConfig } from "@/modules/pdv/types";

const roleLabels = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
  estoquista: "Estoquista",
};

export default async function ConfiguracoesPage() {
  const profile = await requireRole(["admin", "gerente", "vendedor", "estoquista"]);
  const isAdmin = profile.role === "admin";
  const user = await getSession();
  const supabase = await createClient();

  const [
    { data: contas },
    { data: formasPagamento },
    { data: operadoras },
    usuarios,
    negadas,
    empresa,
  ] = await Promise.all([
    supabase
      .from("contas_financeiras")
      .select(
        "id, nome, tipo, ativo, banco_nome, agencia, numero_conta, saldo_inicial, data_saldo_inicial",
      )
      .order("nome"),
    supabase
      .from("formas_pagamento")
      .select("id, nome, ativo, usa_operadora, conta_financeira_id")
      .order("nome"),
    supabase
      .from("operadoras_cartao")
      .select(
        "id, nome, ativo, operadora_modalidades(id, operadora_id, modalidade, parcelas, taxa_percentual, taxa_antecipacao_percentual, prazo_dias, conta_destino_id, ativo)",
      )
      .order("nome"),
    isAdmin ? getUsuarios() : Promise.resolve([]),
    isAdmin ? getPermissoesMenuNegadas() : Promise.resolve([]),
    getConfiguracaoEmpresa(),
  ]);

  const contasList = (contas as ContaFinanceira[]) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Financeiro, permissões, usuários, perfil e dados da empresa."
      />
      <ConfiguracoesShell
        isAdmin={isAdmin}
        contas={contasList}
        formasPagamento={(formasPagamento as FormaPagamentoConfig[]) ?? []}
        operadoras={(operadoras as OperadoraCartao[]) ?? []}
        negadas={negadas}
        usuarios={usuarios}
        empresa={empresa}
        fullName={profile.full_name}
        email={user?.email ?? null}
        roleLabel={roleLabels[profile.role]}
      />
    </div>
  );
}
