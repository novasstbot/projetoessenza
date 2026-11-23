export type Fornecedor = {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
};
