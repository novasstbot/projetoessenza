import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetalhesCaixaDialog } from "@/components/caixa/detalhes-caixa-dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export type CaixaFechadoHoje = {
  id: string;
  valor_abertura: number;
  valor_fechamento_informado: number | null;
  aberto_em: string;
  fechado_em: string;
  entradas: number;
  saidas: number;
};

export function CaixasFechadosHoje({
  caixas,
  canManage,
}: {
  caixas: CaixaFechadoHoje[];
  canManage: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Caixas fechados hoje</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-b-lg border-t border-border">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Abertura</th>
                <th className="px-4 py-2.5 font-medium">Fechamento</th>
                <th className="px-4 py-2.5 font-medium">Esperado</th>
                <th className="px-4 py-2.5 font-medium">Informado</th>
                <th className="px-4 py-2.5 font-medium">Diferença</th>
                <th className="px-4 py-2.5 font-medium text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {caixas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum caixa seu fechado hoje ainda.
                  </td>
                </tr>
              ) : (
                caixas.map((c) => {
                  const esperado = c.valor_abertura + c.entradas - c.saidas;
                  const informado = c.valor_fechamento_informado;
                  const diferenca = informado !== null ? informado - esperado : null;
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDateTime(c.aberto_em)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDateTime(c.fechado_em)}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{formatCurrency(esperado)}</td>
                      <td className="px-4 py-2.5 text-foreground">
                        {informado !== null ? (
                          formatCurrency(informado)
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {diferenca === null ? (
                          "—"
                        ) : diferenca === 0 ? (
                          <Badge variant="secondary">Confere</Badge>
                        ) : (
                          <Badge variant={diferenca < 0 ? "destructive" : "outline"}>
                            {diferenca > 0 ? "+" : ""}
                            {formatCurrency(diferenca)}
                            {diferenca < 0 ? " (furo)" : " (sobra)"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DetalhesCaixaDialog caixaId={c.id} canManage={canManage} compact />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
