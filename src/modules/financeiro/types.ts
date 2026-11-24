export type ContaFinanceiraTipo =
  | "caixa_fisico"
  | "cofre"
  | "banco"
  | "pix"
  | "recebiveis_cartao"
  | "transito";

export type ContaFinanceira = {
  id: string;
  nome: string;
  tipo: ContaFinanceiraTipo;
  ativo: boolean;
};

export type SangriaDestinoTipo =
  | "cofre"
  | "deposito_bancario"
  | "transito"
  | "retirada_proprietario"
  | "outro";

export const sangriaDestinoLabels: Record<SangriaDestinoTipo, string> = {
  cofre: "Cofre",
  deposito_bancario: "Depósito bancário",
  transito: "Dinheiro em trânsito",
  retirada_proprietario: "Retirada do proprietário",
  outro: "Outro",
};

export type MovimentacaoCategoria =
  | "venda"
  | "suprimento"
  | "sangria"
  | "despesa"
  | "devolucao"
  | "ajuste"
  | "transferencia";

export const movimentacaoCategoriaLabels: Record<MovimentacaoCategoria, string> = {
  venda: "Venda",
  suprimento: "Suprimento",
  sangria: "Sangria",
  despesa: "Despesa",
  devolucao: "Devolução",
  ajuste: "Ajuste",
  transferencia: "Transferência",
};

export type MovimentacaoCaixaDetalhe = {
  id: string;
  tipo: "entrada" | "saida";
  categoria: MovimentacaoCategoria;
  valor: number;
  descricao: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  autorizado_por_profile: { full_name: string | null } | null;
  contraparte: string | null;
};

export type CaixaDetalhe = {
  id: string;
  status: "aberto" | "fechado";
  valor_abertura: number;
  aberto_em: string;
  fechado_em: string | null;
  valor_fechamento_informado: number | null;
  observacao_fechamento: string | null;
  contagem_cedulas: Record<string, number> | null;
};
