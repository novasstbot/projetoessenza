import { Badge } from "@/components/ui/badge";
import { BaixarContaDialog } from "@/components/financeiro/baixar-conta-dialog";
import type { ContaFinanceira, ContaPagar } from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export function ContasPagarTable({
  contas,
  contasFinanceiras,
  canManage,
}: {
  contas: ContaPagar[];
  contasFinanceiras: ContaFinanceira[];
  canManage: boolean;
}) {
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Descrição</th>
            <th className="px-4 py-2.5 font-medium">Fornecedor</th>
            <th className="px-4 py-2.5 font-medium">Vencimento</th>
            <th className="px-4 py-2.5 font-medium">Valor</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            {canManage && <th className="px-4 py-2.5 font-medium text-right">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {contas.length === 0 ? (
            <tr>
              <td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground">
                Nenhuma conta a pagar.
              </td>
            </tr>
          ) : (
            contas.map((conta) => {
              const atrasada = conta.status === "pendente" && conta.vencimento < hoje;
              return (
                <tr key={conta.id}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{conta.descricao}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {conta.fornecedores?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(conta.vencimento)}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{formatCurrency(conta.valor)}</td>
                  <td className="px-4 py-2.5">
                    {conta.status === "pago" ? (
                      <Badge variant="secondary">Pago</Badge>
                    ) : conta.status === "cancelado" ? (
                      <Badge variant="outline">Cancelado</Badge>
                    ) : atrasada ? (
                      <Badge variant="destructive">Atrasado</Badge>
                    ) : (
                      <Badge variant="outline">Pendente</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      {conta.status === "pendente" && (
                        <BaixarContaDialog
                          contaId={conta.id}
                          tipo="pagar"
                          contasFinanceiras={contasFinanceiras}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
