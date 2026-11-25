import { PageHeader } from "@/components/layout/page-header";
import { RelatorioVendasCaixa } from "@/components/relatorios/relatorio-vendas-caixa";
import { requireRole } from "@/server/auth/session";
import { getVendasPeriodo, getCaixasPeriodo } from "@/server/actions/relatorios/relatorios";
import type { VendaCaixa } from "@/modules/pdv/types";

export default async function RelatoriosPage() {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);
  const canAjustar = profile.role === "admin" || profile.role === "gerente";

  const [vendas, caixasPeriodo] = await Promise.all([
    getVendasPeriodo(),
    canAjustar ? getCaixasPeriodo() : Promise.resolve(null),
  ]);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Vendas e caixa por período. Mais relatórios (estoque, financeiro, marketing) chegam depois."
      />
      <RelatorioVendasCaixa
        vendas={(vendas as unknown as VendaCaixa[]) ?? []}
        caixasPeriodo={caixasPeriodo}
      />
    </div>
  );
}
