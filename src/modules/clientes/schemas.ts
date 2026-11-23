import { z } from "zod";

export const clienteSchema = z.object({
  full_name: z.string().min(2, "Informe o nome do cliente"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  email_opt_in: z.boolean(),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;
