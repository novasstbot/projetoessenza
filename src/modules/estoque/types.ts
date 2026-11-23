export type MovimentacaoTipo = "entrada" | "saida";
export type MovimentacaoOrigem = "manual" | "compra" | "venda" | "ajuste_inventario";

export type ProdutoComEstoque = {
  id: string;
  nome: string;
  codigo_interno: string;
  estoque_minimo: number;
  quantidade_atual: number;
  tem_movimentacao: boolean;
};

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
