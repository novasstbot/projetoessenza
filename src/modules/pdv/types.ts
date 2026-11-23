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

export type Caixa = {
  id: string;
  status: "aberto" | "fechado";
  valor_abertura: number;
  aberto_em: string;
};
