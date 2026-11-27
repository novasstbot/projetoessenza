import { Badge } from "@/components/ui/badge";
import { BaixarRecebivelDialog } from "@/components/financeiro/baixar-recebivel-dialog";
import { RecebivelMotivoDialog } from "@/components/financeiro/recebivel-motivo-dialog";
import { recebivelSituacaoLabels } from "@/modules/financeiro/types";
import type { ContaFinanceira, RecebivelCartao } from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function RecebiveisTable({
  recebiveis,
  contasFinanceiras,
}: {
  recebiveis: RecebivelCartao[];
  contasFinanceiras: ContaFinanceira[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Operadora</th>
            <th className="px-4 py-2.5 font-medium">Parcelas</th>
            <th className="px-4 py-2.5 font-medium">Venda</th>
            <th className="px-4 py-2.5 font-medium">Previsão</th>
            <th className="px-4 py-2.5 font-medium">Bruto</th>
            <th className="px-4 py-2.5 font-medium">Líquido</th>
            <th className="px-4 py-2.5 font-medium">Recebido</th>
            <th className="px-4 py-2.5 font-medium">Destino</th>
            <th className="px-4 py-2.5 font-medium">Situação</th>
            <th className="px-4 py-2.5 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {recebiveis.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                Nenhum recebível encontrado.
              </td>
            </tr>
          ) : (
            recebiveis.map((r) => {
              const valorPendente = Math.max(r.valor_liquido - r.valor_recebido, 0);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {r.operadoras_cartao?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.parcelas}x</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(r.data_venda)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(r.data_prevista_recebimento)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatCurrency(r.valor_bruto)}</td>
                  <td className="px-4 py-2.5 text-foreground">{formatCurrency(r.valor_liquido)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatCurrency(r.valor_recebido)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.contas_financeiras?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={
                        r.situacao === "recebido"
                          ? "secondary"
                          : r.situacao === "divergente"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {recebivelSituacaoLabels[r.situacao]}
                      {r.antecipado && " (antecipado)"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {(r.situacao === "pendente" || r.situacao === "recebido_parcial") && (
                        <>
                          <BaixarRecebivelDialog
                            recebivelId={r.id}
                            valorPendente={valorPendente}
                            contasFinanceiras={contasFinanceiras}
                          />
                          <RecebivelMotivoDialog recebivelId={r.id} acao="divergente" />
                        </>
                      )}
                      {r.situacao === "pendente" && r.taxa_antecipacao_percentual != null && (
                        <RecebivelMotivoDialog
                          recebivelId={r.id}
                          acao="antecipar"
                          valorAntecipado={
                            r.valor_liquido * (1 - r.taxa_antecipacao_percentual / 100)
                          }
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
