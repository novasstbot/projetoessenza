import { z } from "zod";

function requireEmailOrPhone(data: { email?: string; phone?: string }, ctx: z.RefinementCtx) {
  if (!data.email && !data.phone) {
    ctx.addIssue({
      code: "custom",
      message: "Informe pelo menos e-mail ou telefone",
      path: ["email"],
    });
  }
}

export const clienteSchema = z
  .object({
    full_name: z.string().min(2, "Informe o nome do cliente"),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    cpf_cnpj: z.string().optional().or(z.literal("")),
    data_nascimento: z.string().optional().or(z.literal("")),
    email_opt_in: z.boolean(),
  })
  .superRefine(requireEmailOrPhone);

export type ClienteFormValues = z.infer<typeof clienteSchema>;

export const clienteRapidoSchema = z
  .object({
    full_name: z.string().min(2, "Informe o nome do cliente"),
    cpf_cnpj: z.string().optional().or(z.literal("")),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    data_nascimento: z.string().optional().or(z.literal("")),
  })
  .superRefine(requireEmailOrPhone);

export type ClienteRapidoFormValues = z.infer<typeof clienteRapidoSchema>;
