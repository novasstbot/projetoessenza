export type TotaisCaixa = { entradas: number; saidas: number };

// Soma entradas/saídas de movimentacoes_caixa por caixa_id — usado tanto na
// página do Caixa (sessão atual + histórico) quanto nos Relatórios (período
// arbitrário), pra não ter duas implementações do mesmo cálculo divergindo.
export function buildTotaisPorCaixa(
  movimentos: { caixa_id: string; tipo: "entrada" | "saida"; valor: number }[],
): Map<string, TotaisCaixa> {
  const totais = new Map<string, TotaisCaixa>();
  for (const mov of movimentos) {
    const atual = totais.get(mov.caixa_id) ?? { entradas: 0, saidas: 0 };
    if (mov.tipo === "entrada") atual.entradas += mov.valor;
    else atual.saidas += mov.valor;
    totais.set(mov.caixa_id, atual);
  }
  return totais;
}
