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
  cpf_cnpj: string | null;
};

export type ItemVendaCaixa = {
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produtos: { nome: string } | null;
};

export type VendaCaixa = {
  id: string;
  total: number;
  desconto: number;
  created_at: string;
  customers: { full_name: string } | null;
  itens_venda: ItemVendaCaixa[];
};

export type Caixa = {
  id: string;
  status: "aberto" | "fechado";
  valor_abertura: number;
  aberto_em: string;
};
