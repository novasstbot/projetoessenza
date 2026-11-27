import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Vault, QrCode, CreditCard, ArrowLeftRight, Wallet } from "lucide-react";
import type { ContaFinanceira, ContaFinanceiraTipo } from "@/modules/financeiro/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const icons: Record<ContaFinanceiraTipo, typeof Wallet> = {
  caixa_fisico: Wallet,
  cofre: Vault,
  banco: Landmark,
  pix: QrCode,
  recebiveis_cartao: CreditCard,
  transito: ArrowLeftRight,
};

export function ContasFinanceirasList({
  contas,
  saldos,
  onSelect,
}: {
  contas: ContaFinanceira[];
  saldos: Map<string, number>;
  onSelect?: (conta: ContaFinanceira) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contas financeiras</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {contas.map((conta) => {
          const Icon = icons[conta.tipo];
          const content = (
            <>
              <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" />
                {conta.nome}
              </div>
              <p className="font-semibold text-foreground">
                {formatCurrency(saldos.get(conta.id) ?? 0)}
              </p>
            </>
          );
          return onSelect ? (
            <button
              key={conta.id}
              type="button"
              onClick={() => onSelect(conta)}
              className="rounded-lg border border-border p-3 text-left hover:border-gold/60"
            >
              {content}
            </button>
          ) : (
            <div key={conta.id} className="rounded-lg border border-border p-3">
              {content}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
