import { PageHeader } from "@/components/layout/page-header";
import { RelatoriosShell } from "@/components/relatorios/relatorios-shell";
import { requireRole } from "@/server/auth/session";
import {
  getVendasPeriodo,
  getCaixasPeriodo,
  getEstoqueAtualDetalhado,
  getMovimentacoesEstoquePeriodo,
} from "@/server/actions/relatorios/relatorios";
import type { VendaCaixa } from "@/modules/pdv/types";
import type { MovimentacaoEstoquePeriodo, ProdutoEstoqueDetalhado } from "@/modules/estoque/types";

export default async function RelatoriosPage() {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);
  const canAjustar = profile.role === "admin" || profile.role === "gerente";

  const [vendas, caixasPeriodo, produtosEstoque, movimentosEstoque] = await Promise.all([
    getVendasPeriodo(),
    canAjustar ? getCaixasPeriodo() : Promise.resolve(null),
    getEstoqueAtualDetalhado(),
    getMovimentacoesEstoquePeriodo(),
  ]);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Financeiro, produtos e estoque, comercial e compras — organizados por categoria."
      />
      <RelatoriosShell
        vendas={(vendas as unknown as VendaCaixa[]) ?? []}
        caixasPeriodo={caixasPeriodo}
        produtosEstoque={produtosEstoque as unknown as ProdutoEstoqueDetalhado[]}
        movimentosEstoque={movimentosEstoque as unknown as MovimentacaoEstoquePeriodo[]}
      />
    </div>
  );
}
