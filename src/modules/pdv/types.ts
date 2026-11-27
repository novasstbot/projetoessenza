export type FormaPagamento = {
  id: string;
  nome: string;
  eh_cartao: boolean;
};

export type FormaPagamentoConfig = {
  id: string;
  nome: string;
  ativo: boolean;
  eh_cartao: boolean;
  conta_financeira_id: string | null;
};

export type ProdutoPdv = {
  id: string;
  nome: string;
  codigo_interno: string;
  codigo_ean: string | null;
  preco_venda: number;
  quantidade_atual: number;
  imagem_thumb: string | null;
};

export type CartItem = {
  produto: ProdutoPdv;
  quantidade: number;
};

export type ClientePdv = {
  id: string;
  full_name: string;
  cpf_cnpj: string | null;
};

export type ItemVendaCaixa = {
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produto_variantes: { nome: string } | null;
};

export type PagamentoVendaCaixa = {
  valor: number;
  formas_pagamento: { nome: string } | null;
};

export type VendaCaixa = {
  id: string;
  total: number;
  desconto: number;
  status: "concluida" | "cancelada";
  created_at: string;
  customers: { id: string; full_name: string } | null;
  itens_venda: ItemVendaCaixa[];
  venda_pagamentos: PagamentoVendaCaixa[];
};

export type Caixa = {
  id: string;
  status: "aberto" | "fechado";
  valor_abertura: number;
  aberto_em: string;
};
