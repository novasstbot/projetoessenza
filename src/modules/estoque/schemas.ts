import { z } from "zod";

export const movimentacaoSchema = z.object({
  produto_id: z.string().uuid("Selecione um produto"),
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.number().int().positive("Informe uma quantidade maior que zero"),
  motivo: z.string().min(3, "Descreva o motivo da movimentação"),
});

export type MovimentacaoFormValues = z.infer<typeof movimentacaoSchema>;
