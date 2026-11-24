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
import { criarContaReceber } from "@/server/actions/financeiro/contas";
import { contaReceberSchema, type ContaReceberFormValues } from "@/modules/financeiro/schemas";

type ClienteOpcao = { id: string; full_name: string };

const NENHUM = "nenhum";

export function NovaContaReceberDialog({ clientes }: { clientes: ClienteOpcao[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<ContaReceberFormValues>({
    resolver: zodResolver(contaReceberSchema),
    defaultValues: { descricao: "", valor: 0, vencimento: "", clienteId: "" },
  });

  async function onSubmit(values: ContaReceberFormValues) {
    try {
      await criarContaReceber(values);
      toast.success("Conta a receber criada.");
      form.reset({ descricao: "", valor: 0, vencimento: "", clienteId: "" });
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
            Nova conta a receber
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova conta a receber</DialogTitle>
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
                    <Input placeholder="Ex.: venda fiada" {...field} />
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
              name="clienteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (opcional)</FormLabel>
                  <Select
                    value={field.value || NENHUM}
                    onValueChange={(v) => field.onChange(v === NENHUM ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {() =>
                            clientes.find((c) => c.id === field.value)?.full_name ?? "Nenhum"
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Nenhum</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? "Salvando..." : "Criar conta a receber"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
