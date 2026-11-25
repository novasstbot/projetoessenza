"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegerInput } from "@/components/ui/integer-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMovimentacao } from "@/server/actions/estoque/movements";
import {
  movimentacaoSchema,
  type MovimentacaoFormValues,
} from "@/modules/estoque/schemas";

type Produto = { id: string; nome: string; codigo_interno: string };

export function MovementForm({
  produtos,
  onSuccess,
}: {
  produtos: Produto[];
  onSuccess: () => void;
}) {
  const form = useForm<MovimentacaoFormValues>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: { produto_id: "", tipo: "entrada", quantidade: 1, motivo: "", origem: "manual" },
  });
  const tipo = form.watch("tipo");

  async function onSubmit(values: MovimentacaoFormValues) {
    try {
      await createMovimentacao(values);
      toast.success("Movimentação registrada.");
      form.reset({ produto_id: "", tipo: "entrada", quantidade: 1, motivo: "", origem: "manual" });
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível registrar a movimentação.",
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="produto_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produto</FormLabel>
              <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => {
                        const produto = produtos.find((p) => p.id === field.value);
                        return produto
                          ? `${produto.nome} (${produto.codigo_interno})`
                          : "Selecione um produto";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome} ({produto.codigo_interno})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {() => (field.value === "entrada" ? "Entrada" : "Saída")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <IntegerInput min={1} step={1} value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {tipo === "saida" && (
          <FormField
            control={form.control}
            name="origem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo da saída</FormLabel>
                <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {() => (field.value === "perda" ? "Perda" : "Ajuste manual")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="manual">Ajuste manual</SelectItem>
                    <SelectItem value="perda">Perda</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: estoque inicial, quebra, inventário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Registrando..." : "Registrar movimentação"}
        </Button>
      </form>
    </Form>
  );
}
