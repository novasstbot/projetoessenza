import { z } from "zod";

export const emailTemplateSchema = z.object({
  key: z
    .string()
    .min(2, "Informe uma chave para o template")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  name: z.string().min(2, "Informe um nome"),
  subject: z.string().min(2, "Informe o assunto do e-mail"),
  html: z.string().min(10, "Informe o conteúdo HTML do template"),
});

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;
