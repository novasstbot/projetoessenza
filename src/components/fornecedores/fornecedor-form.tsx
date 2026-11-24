"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createFornecedor, updateFornecedor } from "@/server/actions/fornecedores/fornecedores";
import { fornecedorSchema, type FornecedorFormValues } from "@/modules/fornecedores/schemas";
import type { Fornecedor } from "@/modules/fornecedores/types";

export function FornecedorForm({
  fornecedor,
  onSuccess,
}: {
  fornecedor?: Fornecedor;
  onSuccess: () => void;
}) {
  const form = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: {
      nome: fornecedor?.nome ?? "",
      cnpj_cpf: fornecedor?.cnpj_cpf ?? "",
      telefone: fornecedor?.telefone ?? "",
      email: fornecedor?.email ?? "",
    },
  });

  async function onSubmit(values: FornecedorFormValues) {
    try {
      if (fornecedor) {
        await updateFornecedor(fornecedor.id, values);
        toast.success("Fornecedor atualizado.");
      } else {
        await createFornecedor(values);
        toast.success("Fornecedor criado.");
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
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Aroma Distribuidora" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cnpj_cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ / CPF</FormLabel>
              <FormControl>
                <CnpjCpfInput placeholder="00.000.000/0000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="telefone"
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contato@fornecedor.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting
            ? "Salvando..."
            : fornecedor
              ? "Salvar alterações"
              : "Criar fornecedor"}
        </Button>
      </form>
    </Form>
  );
}
