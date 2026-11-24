import { z } from "zod";

export const produtoSchema = z.object({
  nome: z.string().min(2, "Informe o nome do produto"),
  codigo_interno: z.string().min(1, "Informe o código interno"),
  codigo_ean: z
    .string()
    .regex(/^\d{8,14}$/, "EAN deve ter entre 8 e 14 dígitos")
    .optional()
    .or(z.literal("")),
  categoria_id: z.string().uuid().optional().or(z.literal("")),
  marca_id: z.string().uuid().optional().or(z.literal("")),
  custo: z.number().min(0, "Custo não pode ser negativo"),
  preco_venda: z.number().min(0, "Preço não pode ser negativo"),
  estoque_minimo: z.number().int().min(0, "Estoque mínimo não pode ser negativo"),
  validade: z.string().optional().or(z.literal("")),
});

export type ProdutoFormValues = z.infer<typeof produtoSchema>;

export const taxonomySchema = z.object({
  nome: z.string().min(2, "Informe um nome"),
});

export type TaxonomyFormValues = z.infer<typeof taxonomySchema>;
