import { z } from "zod";

export const novaCompraSchema = z
  .object({
    fornecedor_id: z.string().uuid("Selecione um fornecedor"),
    observacao: z.string().optional(),
    formaPagamento: z.enum(["a_vista", "a_prazo"]),
    vencimentoPagamento: z.string().optional().or(z.literal("")),
    parcelas: z.number().int().min(1).max(10),
    itens: z
      .array(
        z.object({
          variante_id: z.string().uuid(),
          quantidade: z.number().int().positive(),
          custo_unitario: z.number().min(0),
        }),
      )
      .min(1, "Adicione ao menos um item"),
  })
  .superRefine((data, ctx) => {
    if (data.formaPagamento === "a_prazo" && !data.vencimentoPagamento) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o vencimento da compra a prazo",
        path: ["vencimentoPagamento"],
      });
    }
  });

export type NovaCompraValues = z.infer<typeof novaCompraSchema>;
