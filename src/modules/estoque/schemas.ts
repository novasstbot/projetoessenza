import { z } from "zod";

export const movimentacaoSchema = z.object({
  variante_id: z.string().uuid("Selecione uma variação"),
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.number().int().positive("Informe uma quantidade maior que zero"),
  motivo: z.string().min(3, "Descreva o motivo da movimentação"),
  origem: z.enum(["manual", "perda"]),
});

export type MovimentacaoFormValues = z.infer<typeof movimentacaoSchema>;
