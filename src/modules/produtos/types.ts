export type Categoria = {
  id: string;
  nome: string;
};

export type Marca = {
  id: string;
  nome: string;
};

export type Produto = {
  id: string;
  nome: string;
  codigo_interno: string;
  codigo_ean: string | null;
  categoria_id: string | null;
  marca_id: string | null;
  custo: number;
  preco_venda: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at: string;
  categorias: Categoria | null;
  marcas: Marca | null;
};
