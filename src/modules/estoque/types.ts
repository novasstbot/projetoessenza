export type MovimentacaoTipo = "entrada" | "saida";
export type MovimentacaoOrigem = "manual" | "compra" | "venda" | "ajuste_inventario" | "perda";

export const movimentacaoOrigemLabels: Record<MovimentacaoOrigem, string> = {
  manual: "Ajuste manual",
  compra: "Compra",
  venda: "Venda",
  ajuste_inventario: "Ajuste de inventário",
  perda: "Perda",
};

export type ProdutoComEstoque = {
  id: string;
  nome: string;
  codigo_interno: string;
  estoque_minimo: number;
  validade: string | null;
  quantidade_atual: number;
  tem_movimentacao: boolean;
};

// Quantos dias antes do vencimento um produto já conta como "próximo da
// validade". Fixo por enquanto — vira configurável em Configurações depois.
export const DIAS_PROXIMO_DA_VALIDADE = 30;

export type Movimentacao = {
  id: string;
  produto_id: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  motivo: string;
  origem: MovimentacaoOrigem;
  created_at: string;
  produtos: { nome: string; codigo_interno: string } | null;
  profiles: { full_name: string | null } | null;
};

export type ProdutoEstoqueDetalhado = ProdutoComEstoque & { custo: number };

export type MovimentacaoEstoquePeriodo = {
  id: string;
  produto_id: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  motivo: string;
  origem: MovimentacaoOrigem;
  created_at: string;
  produtos: { nome: string; codigo_interno: string } | null;
};
