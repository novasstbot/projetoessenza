import { z } from "zod";

export const novaCompraSchema = z.object({
  fornecedor_id: z.string().uuid("Selecione um fornecedor"),
  observacao: z.string().optional(),
  itens: z
    .array(
      z.object({
        produto_id: z.string().uuid(),
        quantidade: z.number().int().positive(),
        custo_unitario: z.number().min(0),
      }),
    )
    .min(1, "Adicione ao menos um item"),
});

export type NovaCompraValues = z.infer<typeof novaCompraSchema>;
