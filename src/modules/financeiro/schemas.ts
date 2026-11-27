import { z } from "zod";

export const sangriaSchema = z.object({
  valor: z.number().positive("Informe um valor maior que zero"),
  destinoTipo: z.enum(["cofre", "deposito_bancario", "transito", "retirada_proprietario", "outro"]),
  motivo: z.string().min(3, "Descreva o motivo"),
});
export type SangriaFormValues = z.infer<typeof sangriaSchema>;

export const suprimentoSchema = z.object({
  valor: z.number().positive("Informe um valor maior que zero"),
  origemContaId: z.string().uuid("Selecione a conta de origem"),
  motivo: z.string().min(3, "Descreva o motivo"),
});
export type SuprimentoFormValues = z.infer<typeof suprimentoSchema>;

export const despesaCaixaSchema = z.object({
  descricao: z.string().min(3, "Descreva a despesa"),
  categoria: z.string().min(2, "Informe a categoria"),
  valor: z.number().positive("Informe um valor maior que zero"),
});
export type DespesaCaixaFormValues = z.infer<typeof despesaCaixaSchema>;

export const ajusteCaixaSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  valor: z.number().positive("Informe um valor maior que zero"),
  motivo: z.string().min(3, "Descreva o motivo do ajuste"),
});
export type AjusteCaixaFormValues = z.infer<typeof ajusteCaixaSchema>;

export const fecharCaixaSchema = z.object({
  valorInformado: z.number().min(0, "Informe o valor contado"),
  contagem: z.record(z.string(), z.number()).optional(),
  observacao: z.string().optional(),
});
export type FecharCaixaValues = z.infer<typeof fecharCaixaSchema>;

export const contaPagarSchema = z.object({
  descricao: z.string().min(3, "Descreva a conta"),
  categoria: z.string().min(2, "Informe a categoria"),
  valor: z.number().positive("Informe um valor maior que zero"),
  vencimento: z.string().min(1, "Informe o vencimento"),
  fornecedorId: z.string().uuid().optional().or(z.literal("")),
});
export type ContaPagarFormValues = z.infer<typeof contaPagarSchema>;

export const contaReceberSchema = z.object({
  descricao: z.string().min(3, "Descreva a conta"),
  valor: z.number().positive("Informe um valor maior que zero"),
  vencimento: z.string().min(1, "Informe o vencimento"),
  clienteId: z.string().uuid().optional().or(z.literal("")),
});
export type ContaReceberFormValues = z.infer<typeof contaReceberSchema>;

export const baixarContaSchema = z.object({
  contaFinanceiraId: z.string().uuid("Selecione a conta financeira"),
});
export type BaixarContaFormValues = z.infer<typeof baixarContaSchema>;

export const estornoSchema = z.object({
  motivo: z.string().min(3, "Descreva o motivo"),
});
export type EstornoFormValues = z.infer<typeof estornoSchema>;

export const contaFinanceiraSchema = z.object({
  nome: z.string().min(2, "Informe o nome da conta"),
  tipo: z.enum(["caixa_fisico", "cofre", "banco", "pix", "recebiveis_cartao", "transito"]),
  bancoNome: z.string().optional().or(z.literal("")),
  agencia: z.string().optional().or(z.literal("")),
  numeroConta: z.string().optional().or(z.literal("")),
  saldoInicial: z.number().min(0, "Saldo inicial não pode ser negativo"),
  dataSaldoInicial: z.string().optional().or(z.literal("")),
});
export type ContaFinanceiraFormValues = z.infer<typeof contaFinanceiraSchema>;

export const transferenciaSchema = z
  .object({
    contaOrigemId: z.string().uuid("Selecione a conta de origem"),
    contaDestinoId: z.string().uuid("Selecione a conta de destino"),
    valor: z.number().positive("Informe um valor maior que zero"),
    motivo: z.string().min(3, "Descreva o motivo"),
  })
  .refine((v) => v.contaOrigemId !== v.contaDestinoId, {
    message: "Origem e destino não podem ser a mesma conta",
    path: ["contaDestinoId"],
  });
export type TransferenciaFormValues = z.infer<typeof transferenciaSchema>;

export const aporteRetiradaSchema = z.object({
  contaId: z.string().uuid("Selecione a conta"),
  valor: z.number().positive("Informe um valor maior que zero"),
  motivo: z.string().min(3, "Descreva o motivo"),
});
export type AporteRetiradaFormValues = z.infer<typeof aporteRetiradaSchema>;

export const formaPagamentoSchema = z.object({
  nome: z.string().min(2, "Informe o nome da forma de pagamento"),
  usaOperadora: z.boolean(),
});
export type FormaPagamentoFormValues = z.infer<typeof formaPagamentoSchema>;

export const operadoraCartaoSchema = z.object({
  nome: z.string().min(2, "Informe o nome da operadora"),
});
export type OperadoraCartaoFormValues = z.infer<typeof operadoraCartaoSchema>;

export const operadoraModalidadeSchema = z.object({
  modalidade: z.enum(["debito", "credito_vista", "credito_parcelado", "boleto"]),
  parcelas: z.number().int().min(1, "Mínimo 1 parcela"),
  taxaPercentual: z.number().min(0, "Taxa não pode ser negativa").max(100, "Taxa inválida"),
  taxaAntecipacaoPercentual: z.number().min(0).max(100).optional(),
  prazoDias: z.number().int().min(0, "Prazo não pode ser negativo"),
  contaDestinoId: z.string().uuid("Selecione a conta de destino"),
});
export type OperadoraModalidadeFormValues = z.infer<typeof operadoraModalidadeSchema>;

export const baixarRecebivelSchema = z.object({
  valorRecebido: z.number().positive("Informe um valor maior que zero"),
  contaFinanceiraId: z.string().uuid().optional().or(z.literal("")),
});
export type BaixarRecebivelFormValues = z.infer<typeof baixarRecebivelSchema>;
