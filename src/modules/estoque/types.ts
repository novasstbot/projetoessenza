export type MovimentacaoTipo = "entrada" | "saida";
export type MovimentacaoOrigem = "manual" | "compra" | "venda" | "ajuste_inventario" | "perda";

export const movimentacaoOrigemLabels: Record<MovimentacaoOrigem, string> = {
  manual: "Ajuste manual",
  compra: "Compra",
  venda: "Venda",
  ajuste_inventario: "Ajuste de inventário",
  perda: "Perda",
};

// Representa uma variação de produto (o estoque pertence à variação, nunca
// só ao produto principal). produto_nome é o nome do produto principal, só
// pra dar contexto na tela.
export type ProdutoComEstoque = {
  id: string;
  nome: string;
  produto_nome: string;
  codigo_interno: string;
  estoque_minimo: number;
  validade: string | null;
  quantidade_atual: number;
  tem_movimentacao: boolean;
  imagem_thumb?: string | null;
};

// Quantos dias antes do vencimento um produto já conta como "próximo da
// validade". Fixo por enquanto — vira configurável em Configurações depois.
export const DIAS_PROXIMO_DA_VALIDADE = 30;

export type Movimentacao = {
  id: string;
  variante_id: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  motivo: string;
  origem: MovimentacaoOrigem;
  created_at: string;
  produto_variantes: { nome: string; codigo_interno: string } | null;
  profiles: { full_name: string | null } | null;
};

export type ProdutoEstoqueDetalhado = ProdutoComEstoque & { custo: number; preco_venda: number };

export type MovimentacaoEstoquePeriodo = {
  id: string;
  variante_id: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  motivo: string;
  origem: MovimentacaoOrigem;
  created_at: string;
  produto_variantes: { nome: string; codigo_interno: string } | null;
};
