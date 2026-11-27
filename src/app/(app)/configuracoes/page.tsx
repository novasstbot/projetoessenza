import { PageHeader } from "@/components/layout/page-header";
import { ContasFinanceirasManager } from "@/components/configuracoes/contas-financeiras-manager";
import { FormasPagamentoManager } from "@/components/configuracoes/formas-pagamento-manager";
import { OperadorasCartaoManager } from "@/components/configuracoes/operadoras-cartao-manager";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import type { ContaFinanceira, OperadoraCartao } from "@/modules/financeiro/types";
import type { FormaPagamentoConfig } from "@/modules/pdv/types";

export default async function ConfiguracoesPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [{ data: contas }, { data: formasPagamento }, { data: operadoras }] = await Promise.all([
    supabase
      .from("contas_financeiras")
      .select(
        "id, nome, tipo, ativo, banco_nome, agencia, numero_conta, saldo_inicial, data_saldo_inicial",
      )
      .order("nome"),
    supabase
      .from("formas_pagamento")
      .select("id, nome, ativo, eh_cartao, conta_financeira_id")
      .order("nome"),
    supabase
      .from("operadoras_cartao")
      .select(
        "id, nome, ativo, operadora_modalidades(id, operadora_id, modalidade, parcelas, taxa_percentual, taxa_antecipacao_percentual, prazo_dias, conta_destino_id, ativo)",
      )
      .order("nome"),
  ]);

  const contasList = (contas as ContaFinanceira[]) ?? [];
  const contasAtivas = contasList.filter((c) => c.ativo);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Contas financeiras, formas de pagamento e operadoras de cartão."
      />
      <ContasFinanceirasManager contas={contasList} />
      <FormasPagamentoManager
        formasPagamento={(formasPagamento as FormaPagamentoConfig[]) ?? []}
        contas={contasAtivas}
      />
      <OperadorasCartaoManager
        operadoras={(operadoras as OperadoraCartao[]) ?? []}
        contas={contasAtivas}
      />
    </div>
  );
}
