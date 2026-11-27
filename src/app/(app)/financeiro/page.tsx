import { ArrowUpCircle, ArrowDownCircle, Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContasPagarSection } from "@/components/financeiro/contas-pagar-section";
import { ContasReceberSection } from "@/components/financeiro/contas-receber-section";
import { ContasFinanceirasSaldos } from "@/components/financeiro/contas-financeiras-saldos";
import { TransferenciaDialog } from "@/components/financeiro/transferencia-dialog";
import { RecebiveisSection } from "@/components/financeiro/recebiveis-section";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { buildTotaisPorCaixa } from "@/lib/caixa/totais";
import type {
  ContaFinanceira,
  ContaPagar,
  ContaReceber,
  RecebivelCartao,
} from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default async function FinanceiroPage() {
  const [supabase, profile] = await Promise.all([
    createClient(),
    requireRole(["admin", "gerente", "vendedor"]),
  ]);
  const canManage = profile.role === "admin" || profile.role === "gerente";

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Financeiro" description="Contas a pagar e a receber da Essenza." />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Lock className="size-8 text-muted-foreground" />
            <p className="font-medium text-foreground">Acesso restrito</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Esta tela é visível só para administradores e gerentes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [
    { data: contasPagar },
    { data: contasReceber },
    { data: contasFinanceiras },
    { data: fornecedores },
    { data: clientes },
    { data: movFinanceiras },
    { data: caixaAberto },
    { data: recebiveis },
  ] = await Promise.all([
    supabase
      .from("contas_pagar")
      .select("id, descricao, categoria, valor, vencimento, status, pago_em, fornecedores(nome)")
      .order("vencimento"),
    supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, status, recebido_em, customers(full_name)")
      .order("vencimento"),
    supabase
      .from("contas_financeiras")
      .select(
        "id, nome, tipo, ativo, banco_nome, agencia, numero_conta, saldo_inicial, data_saldo_inicial",
      )
      .eq("ativo", true)
      .order("nome"),
    supabase.from("fornecedores").select("id, nome, cnpj_cpf, telefone, email, ativo").eq("ativo", true).order("nome"),
    supabase.from("customers").select("id, full_name").eq("ativo", true).order("full_name"),
    supabase.from("movimentacoes_financeiras").select("conta_id, tipo, valor"),
    supabase.from("caixas").select("id, valor_abertura").eq("status", "aberto").maybeSingle(),
    supabase
      .from("recebiveis_cartao")
      .select(
        "id, valor_bruto, taxa_percentual, valor_liquido, taxa_antecipacao_percentual, parcelas, data_venda, data_prevista_recebimento, data_recebimento, valor_recebido, antecipado, situacao, observacao, operadoras_cartao(nome), contas_financeiras(nome)",
      )
      .order("data_venda", { ascending: false })
      .limit(200),
  ]);

  const pagarList = (contasPagar as unknown as ContaPagar[]) ?? [];
  const receberList = (contasReceber as unknown as ContaReceber[]) ?? [];
  const contasFinanceirasList = (contasFinanceiras as ContaFinanceira[]) ?? [];

  const totalPendentePagar = pagarList
    .filter((c) => c.status === "pendente")
    .reduce((sum, c) => sum + c.valor, 0);
  const totalPendenteReceber = receberList
    .filter((c) => c.status === "pendente")
    .reduce((sum, c) => sum + c.valor, 0);

  // Saldo por conta vem do histórico de movimentacoes_financeiras — Caixa
  // Físico é especial-casado pro "esperado" da sessão aberta, já que vendas
  // em dinheiro nunca geram linha em movimentacoes_financeiras (vão só pro
  // ledger da sessão de caixa, movimentacoes_caixa).
  const saldosContas = new Map<string, number>();
  for (const mov of movFinanceiras ?? []) {
    const atual = saldosContas.get(mov.conta_id) ?? 0;
    saldosContas.set(mov.conta_id, atual + (mov.tipo === "entrada" ? mov.valor : -mov.valor));
  }
  if (caixaAberto) {
    const { data: movimentosCaixa } = await supabase
      .from("movimentacoes_caixa")
      .select("caixa_id, tipo, valor")
      .eq("caixa_id", caixaAberto.id);
    const totais = buildTotaisPorCaixa(movimentosCaixa ?? []).get(caixaAberto.id) ?? {
      entradas: 0,
      saidas: 0,
    };
    const esperado = caixaAberto.valor_abertura + totais.entradas - totais.saidas;
    const caixaFisico = contasFinanceirasList.find((c) => c.tipo === "caixa_fisico");
    if (caixaFisico) saldosContas.set(caixaFisico.id, esperado);
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Contas a pagar e a receber da Essenza."
        actions={<TransferenciaDialog contas={contasFinanceirasList} />}
      />

      <div className="mb-6">
        <ContasFinanceirasSaldos contas={contasFinanceirasList} saldos={saldosContas} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <ArrowUpCircle className="size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Total a pagar (pendente)</p>
              <p className="text-xl font-semibold text-foreground">
                {formatCurrency(totalPendentePagar)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <ArrowDownCircle className="size-5 shrink-0 text-gold" />
            <div>
              <p className="text-xs text-muted-foreground">Total a receber (pendente)</p>
              <p className="text-xl font-semibold text-foreground">
                {formatCurrency(totalPendenteReceber)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <ContasPagarSection
          contas={pagarList}
          contasFinanceiras={contasFinanceirasList}
          fornecedores={fornecedores ?? []}
          canManage={canManage}
        />
      </div>

      <div className="mb-6">
        <ContasReceberSection
          contas={receberList}
          contasFinanceiras={contasFinanceirasList}
          clientes={clientes ?? []}
          canManage={canManage}
        />
      </div>

      <RecebiveisSection
        recebiveis={(recebiveis as unknown as RecebivelCartao[]) ?? []}
        contasFinanceiras={contasFinanceirasList}
      />
    </div>
  );
}
