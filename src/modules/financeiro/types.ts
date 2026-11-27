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
  banco_nome: string | null;
  agencia: string | null;
  numero_conta: string | null;
  saldo_inicial: number;
  data_saldo_inicial: string | null;
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
  | "transferencia"
  | "pagamento"
  | "recebimento"
  | "aporte"
  | "retirada_socio";

export const movimentacaoCategoriaLabels: Record<MovimentacaoCategoria, string> = {
  venda: "Venda",
  suprimento: "Suprimento",
  sangria: "Sangria",
  despesa: "Despesa",
  devolucao: "Devolução",
  ajuste: "Ajuste",
  transferencia: "Transferência",
  pagamento: "Pagamento",
  recebimento: "Recebimento",
  aporte: "Aporte",
  retirada_socio: "Retirada do proprietário",
};

export type MovimentoExtratoConta = {
  id: string;
  tipo: "entrada" | "saida";
  categoria: MovimentacaoCategoria;
  valor: number;
  descricao: string;
  created_at: string;
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
  estorno_de_id: string | null;
  estornada: boolean;
};

export type ContaPagarStatus = "pendente" | "pago" | "cancelado";

export type ContaPagar = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: ContaPagarStatus;
  pago_em: string | null;
  fornecedores: { nome: string } | null;
};

export type ContaReceberStatus = "pendente" | "recebido" | "cancelado";

export type ContaReceber = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: ContaReceberStatus;
  recebido_em: string | null;
  customers: { full_name: string } | null;
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

export type CaixaPeriodo = {
  id: string;
  status: "aberto" | "fechado";
  valor_abertura: number;
  aberto_em: string;
  fechado_em: string | null;
  valor_fechamento_informado: number | null;
  entradas: number;
  saidas: number;
  esperado: number;
  diferenca: number | null;
};

export type CategoriaResumoPeriodo = {
  categoria: MovimentacaoCategoria;
  entradas: number;
  saidas: number;
};

export type MovimentoCaixaPeriodo = {
  caixa_id: string;
  tipo: "entrada" | "saida";
  categoria: MovimentacaoCategoria;
  valor: number;
  created_at: string;
};
