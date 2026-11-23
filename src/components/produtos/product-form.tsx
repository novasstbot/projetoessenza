"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { BarcodeScannerButton } from "@/components/produtos/barcode-scanner-button";
import { createProduto, updateProduto } from "@/server/actions/produtos/products";
import { produtoSchema, type ProdutoFormValues } from "@/modules/produtos/schemas";
import type { Categoria, Marca, Produto } from "@/modules/produtos/types";

const NONE = "none";

type ProductFormProps = {
  categorias: Categoria[];
  marcas: Marca[];
  produto?: Produto;
  onSuccess: () => void;
};

export function ProductForm({ categorias, marcas, produto, onSuccess }: ProductFormProps) {
  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome: produto?.nome ?? "",
      codigo_interno: produto?.codigo_interno ?? "",
      codigo_ean: produto?.codigo_ean ?? "",
      categoria_id: produto?.categoria_id ?? "",
      marca_id: produto?.marca_id ?? "",
      custo: produto?.custo ?? 0,
      preco_venda: produto?.preco_venda ?? 0,
      estoque_minimo: produto?.estoque_minimo ?? 0,
    },
  });

  const custo = form.watch("custo");
  const precoVenda = form.watch("preco_venda");
  const margem =
    precoVenda > 0 ? (((precoVenda - custo) / precoVenda) * 100).toFixed(1) : null;

  async function onSubmit(values: ProdutoFormValues) {
    try {
      if (produto) {
        await updateProduto(produto.id, values);
        toast.success("Produto atualizado.");
      } else {
        await createProduto(values);
        toast.success("Produto criado.");
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
              <FormLabel>Nome do produto</FormLabel>
              <FormControl>
                <Input placeholder="Perfume Essenza Noir 100ml" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="codigo_interno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código interno</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ESS-0001"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="codigo_ean"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código EAN</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="7891234567890"
                      {...field}
                      onKeyDown={(e) => {
                        // A leitora de código de barras digita rápido e envia
                        // Enter ao final — isso não deve submeter o formulário.
                        if (e.key === "Enter") e.preventDefault();
                      }}
                    />
                  </FormControl>
                  <BarcodeScannerButton onDetected={(code) => field.onChange(code)} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoria_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {() =>
                          categorias.find((c) => c.id === field.value)?.nome ?? "Nenhuma"
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="marca_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {() => marcas.find((m) => m.id === field.value)?.nome ?? "Nenhuma"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {marcas.map((marca) => (
                      <SelectItem key={marca.id} value={marca.id}>
                        {marca.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="custo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custo (R$)</FormLabel>
                <FormControl>
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preco_venda"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de venda (R$)</FormLabel>
                <FormControl>
                  <CurrencyInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estoque_minimo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque mínimo</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {margem !== null && (
          <p className="text-sm text-muted-foreground">
            Margem estimada: <span className="font-medium text-foreground">{margem}%</span>
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting
            ? "Salvando..."
            : produto
              ? "Salvar alterações"
              : "Criar produto"}
        </Button>
      </form>
    </Form>
  );
}
