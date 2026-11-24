"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { criarContaPagar } from "@/server/actions/financeiro/contas";
import { contaPagarSchema, type ContaPagarFormValues } from "@/modules/financeiro/schemas";
import type { Fornecedor } from "@/modules/fornecedores/types";

const NENHUM = "nenhum";

export function NovaContaPagarDialog({ fornecedores }: { fornecedores: Fornecedor[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<ContaPagarFormValues>({
    resolver: zodResolver(contaPagarSchema),
    defaultValues: { descricao: "", categoria: "", valor: 0, vencimento: "", fornecedorId: "" },
  });

  async function onSubmit(values: ContaPagarFormValues) {
    try {
      await criarContaPagar(values);
      toast.success("Conta a pagar criada.");
      form.reset({ descricao: "", categoria: "", valor: 0, vencimento: "", fornecedorId: "" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            Nova conta a pagar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova conta a pagar</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: aluguel da loja" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: aluguel, fornecedor, imposto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="fornecedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor (opcional)</FormLabel>
                  <Select
                    value={field.value || NENHUM}
                    onValueChange={(v) => field.onChange(v === NENHUM ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {() =>
                            fornecedores.find((f) => f.id === field.value)?.nome ?? "Nenhum"
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Nenhum</SelectItem>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? "Salvando..." : "Criar conta a pagar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
