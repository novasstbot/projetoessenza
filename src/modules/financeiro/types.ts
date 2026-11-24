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
