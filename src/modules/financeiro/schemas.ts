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
