"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PhoneInput } from "@/components/ui/phone-input";
import { CnpjCpfInput } from "@/components/ui/cnpj-cpf-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createCliente, updateCliente } from "@/server/actions/clientes/clientes";
import { clienteSchema, type ClienteFormValues } from "@/modules/clientes/schemas";
import type { Cliente } from "@/modules/clientes/types";

export function ClienteForm({
  cliente,
  onSuccess,
}: {
  cliente?: Cliente;
  onSuccess: () => void;
}) {
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      full_name: cliente?.full_name ?? "",
      email: cliente?.email ?? "",
      phone: cliente?.phone ?? "",
      cpf_cnpj: cliente?.cpf_cnpj ?? "",
      data_nascimento: cliente?.data_nascimento ?? "",
      email_opt_in: cliente?.communication_preferences?.email_opt_in ?? false,
    },
  });

  async function onSubmit(values: ClienteFormValues) {
    try {
      if (cliente) {
        await updateCliente(cliente.id, values);
        toast.success("Cliente atualizado.");
      } else {
        await createCliente(values);
        toast.success("Cliente criado.");
        form.reset();
      }
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Maria Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="maria@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <PhoneInput placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cpf_cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <CnpjCpfInput placeholder="000.000.000-00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="data_nascimento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nascimento</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email_opt_in"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3">
              <div>
                <FormLabel>Autoriza e-mails</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Novidades, promoções e lançamentos por e-mail (LGPD).
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting
            ? "Salvando..."
            : cliente
              ? "Salvar alterações"
              : "Criar cliente"}
        </Button>
      </form>
    </Form>
  );
}
