import { z } from "zod";

// Produto principal: só os dados gerais. Venda/estoque (SKU, custo, preço,
// estoque mínimo, validade) agora pertencem à variação.
export const produtoSchema = z.object({
  nome: z.string().min(2, "Informe o nome do produto"),
  descricao: z.string().optional().or(z.literal("")),
  fabricante: z.string().optional().or(z.literal("")),
  categoria_id: z.string().uuid().optional().or(z.literal("")),
  marca_id: z.string().uuid().optional().or(z.literal("")),
  linha_id: z.string().uuid().optional().or(z.literal("")),
});
export type ProdutoFormValues = z.infer<typeof produtoSchema>;

export const varianteSchema = z.object({
  nome: z.string().min(1, "Informe o nome da variação"),
  codigo_interno: z.string().min(1, "Informe o código interno"),
  custo: z.number().min(0, "Custo não pode ser negativo"),
  preco_venda: z.number().min(0, "Preço não pode ser negativo"),
  estoque_minimo: z.number().int().min(0, "Estoque mínimo não pode ser negativo"),
  validade: z.string().optional().or(z.literal("")),
});
export type VarianteFormValues = z.infer<typeof varianteSchema>;

// Cadastro rápido (produto + sua variação padrão em um único passo) — pro
// caso comum de produto simples com uma única apresentação. Cadastrar
// variações adicionais é feito depois, no cadastro do produto.
export const produtoRapidoSchema = produtoSchema.merge(varianteSchema).extend({
  codigo_ean: z
    .string()
    .regex(/^\d{8,14}$/, "EAN deve ter entre 8 e 14 dígitos")
    .optional()
    .or(z.literal("")),
});
export type ProdutoRapidoFormValues = z.infer<typeof produtoRapidoSchema>;

export const codigoBarraSchema = z.object({
  codigo: z
    .string()
    .regex(/^\d{8,14}$/, "Código deve ter entre 8 e 14 dígitos"),
});
export type CodigoBarraFormValues = z.infer<typeof codigoBarraSchema>;

export const taxonomySchema = z.object({
  nome: z.string().min(2, "Informe um nome"),
});
export type TaxonomyFormValues = z.infer<typeof taxonomySchema>;
