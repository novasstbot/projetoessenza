import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContasPagarTable } from "@/components/financeiro/contas-pagar-table";
import { ContasReceberTable } from "@/components/financeiro/contas-receber-table";
import { NovaContaPagarDialog } from "@/components/financeiro/nova-conta-pagar-dialog";
import { NovaContaReceberDialog } from "@/components/financeiro/nova-conta-receber-dialog";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import type { ContaFinanceira, ContaPagar, ContaReceber } from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default async function FinanceiroPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage = profile?.role === "admin" || profile?.role === "gerente";

  const [
    { data: contasPagar },
    { data: contasReceber },
    { data: contasFinanceiras },
    { data: fornecedores },
    { data: clientes },
  ] = await Promise.all([
    supabase
      .from("contas_pagar")
      .select("id, descricao, categoria, valor, vencimento, status, pago_em, fornecedores(nome)")
      .order("vencimento"),
    supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento, status, recebido_em, customers(full_name)")
      .order("vencimento"),
    supabase.from("contas_financeiras").select("id, nome, tipo, ativo").eq("ativo", true).order("nome"),
    supabase.from("fornecedores").select("id, nome, cnpj_cpf, telefone, email, ativo").eq("ativo", true).order("nome"),
    supabase.from("customers").select("id, full_name").eq("ativo", true).order("full_name"),
  ]);

  const pagarList = (contasPagar as unknown as ContaPagar[]) ?? [];
  const receberList = (contasReceber as unknown as ContaReceber[]) ?? [];

  const totalPendentePagar = pagarList
    .filter((c) => c.status === "pendente")
    .reduce((sum, c) => sum + c.valor, 0);
  const totalPendenteReceber = receberList
    .filter((c) => c.status === "pendente")
    .reduce((sum, c) => sum + c.valor, 0);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Contas a pagar e a receber da Essenza."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total a pagar (pendente)</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(totalPendentePagar)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total a receber (pendente)</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(totalPendenteReceber)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contas a pagar</CardTitle>
          {canManage && <NovaContaPagarDialog fornecedores={fornecedores ?? []} />}
        </CardHeader>
        <CardContent>
          <ContasPagarTable
            contas={pagarList}
            contasFinanceiras={(contasFinanceiras as ContaFinanceira[]) ?? []}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contas a receber</CardTitle>
          {canManage && <NovaContaReceberDialog clientes={clientes ?? []} />}
        </CardHeader>
        <CardContent>
          <ContasReceberTable
            contas={receberList}
            contasFinanceiras={(contasFinanceiras as ContaFinanceira[]) ?? []}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
