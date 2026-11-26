export type Categoria = {
  id: string;
  nome: string;
  imagem_thumb?: string | null;
  imagem_medium?: string | null;
};

export type Marca = {
  id: string;
  nome: string;
};

export type Linha = {
  id: string;
  nome: string;
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  fabricante: string | null;
  categoria_id: string | null;
  marca_id: string | null;
  linha_id: string | null;
  ativo: boolean;
  created_at: string;
  categorias: Categoria | null;
  marcas: Marca | null;
  produto_linhas: Linha | null;
};

export type CodigoBarra = {
  id: string;
  codigo: string;
  tipo: string;
  principal: boolean;
};

export type VarianteAtributo = {
  id: string;
  atributo: string;
  valor: string;
};

export type Imagem = {
  id: string;
  path_thumb: string;
  path_medium: string;
  principal: boolean;
  ordem: number;
};

export type Variante = {
  id: string;
  produto_id: string;
  nome: string;
  codigo_interno: string;
  custo: number;
  preco_venda: number;
  estoque_minimo: number;
  validade: string | null;
  ativo: boolean;
  created_at: string;
};

export type VarianteComCodigos = Variante & {
  produto_codigos_barra: CodigoBarra[];
  produto_variante_atributos: VarianteAtributo[];
  variante_imagens: Imagem[];
};

export type ProdutoComVariantes = Produto & {
  produto_variantes: VarianteComCodigos[];
  produto_imagens: Imagem[];
};

export type VarianteDetalhada = VarianteComCodigos & { quantidade_atual: number };

export type MovimentoVariante = {
  id: string;
  variante_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  motivo: string;
  origem: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
};
