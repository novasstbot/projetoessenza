import { z } from "zod";

export const abrirCaixaSchema = z.object({
  valor_abertura: z.number().min(0, "Informe o valor inicial do caixa"),
});
export type AbrirCaixaFormValues = z.infer<typeof abrirCaixaSchema>;

export const fecharCaixaSchema = z.object({
  valor_fechamento_informado: z.number().min(0, "Informe o valor contado no caixa"),
  observacao_fechamento: z.string().optional(),
});
export type FecharCaixaFormValues = z.infer<typeof fecharCaixaSchema>;

export const pagamentoSchema = z.object({
  forma_pagamento_id: z.string().uuid(),
  valor: z.number().positive(),
});

export const finalizarVendaSchema = z.object({
  itens: z
    .array(
      z.object({
        produto_id: z.string().uuid(),
        quantidade: z.number().int().positive(),
      }),
    )
    .min(1, "Adicione ao menos um produto"),
  pagamentos: z.array(pagamentoSchema).min(1, "Informe ao menos uma forma de pagamento"),
  desconto: z.number().min(0).default(0),
  clienteId: z.string().uuid().optional(),
});
export type FinalizarVendaValues = z.infer<typeof finalizarVendaSchema>;
