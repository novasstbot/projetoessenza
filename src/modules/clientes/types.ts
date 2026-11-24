export type Cliente = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  data_nascimento: string | null;
  ativo: boolean;
  created_at: string;
  communication_preferences: { email_opt_in: boolean } | null;
};

export type HistoricoVenda = {
  id: string;
  total: number;
  created_at: string;
};
