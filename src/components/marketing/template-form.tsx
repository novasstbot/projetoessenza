"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createEmailTemplate } from "@/server/actions/marketing/templates";
import {
  emailTemplateSchema,
  type EmailTemplateFormValues,
} from "@/modules/marketing/schemas";

export function TemplateForm() {
  const router = useRouter();

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: { key: "", name: "", subject: "", html: "" },
  });

  async function onSubmit(values: EmailTemplateFormValues) {
    try {
      await createEmailTemplate(values);
      toast.success("Template criado com sucesso.");
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível criar o template.",
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chave</FormLabel>
              <FormControl>
                <Input placeholder="boas-vindas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Boas-vindas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assunto</FormLabel>
              <FormControl>
                <Input placeholder="Bem-vinda à Essenza" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="html"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo HTML</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={6}
                  placeholder="<p>Olá {{nome}}...</p>"
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Salvando..." : "Criar template"}
        </Button>
      </form>
    </Form>
  );
}
