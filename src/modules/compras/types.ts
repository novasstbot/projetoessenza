export type CompraStatus = "rascunho" | "recebida" | "cancelada";

export type Compra = {
  id: string;
  fornecedor_id: string;
  status: CompraStatus;
  observacao: string | null;
  created_at: string;
  recebida_em: string | null;
  fornecedores: { nome: string } | null;
  itens_compra: { quantidade: number; custo_unitario: number; subtotal: number }[];
};

export type ProdutoCompra = {
  id: string;
  nome: string;
  produto_nome: string;
  codigo_interno: string;
  custo: number;
};
