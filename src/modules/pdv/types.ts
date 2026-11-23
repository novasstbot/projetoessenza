export type FormaPagamento = {
  id: string;
  nome: string;
};

export type ProdutoPdv = {
  id: string;
  nome: string;
  codigo_interno: string;
  codigo_ean: string | null;
  preco_venda: number;
  quantidade_atual: number;
};

export type CartItem = {
  produto: ProdutoPdv;
  quantidade: number;
};

export type ClientePdv = {
  id: string;
  full_name: string;
};

export type VendaCaixa = {
  id: string;
  total: number;
  desconto: number;
  created_at: string;
  customers: { full_name: string } | null;
};

export type Caixa = {
  id: string;
  status: "aberto" | "fechado";
  valor_abertura: number;
  aberto_em: string;
};
