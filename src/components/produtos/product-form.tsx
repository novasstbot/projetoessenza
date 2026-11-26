"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import { BarcodeScannerButton } from "@/components/produtos/barcode-scanner-button";
import { createProduto } from "@/server/actions/produtos/products";
import { produtoRapidoSchema, type ProdutoRapidoFormValues } from "@/modules/produtos/schemas";
import type { Categoria, Linha, Marca } from "@/modules/produtos/types";

const NONE = "none";

type ProductFormProps = {
  categorias: Categoria[];
  marcas: Marca[];
  linhas: Linha[];
};

// Cadastro rápido: cria o produto principal e sua variação padrão em um
// único passo. Para gerenciar variações adicionais, códigos de barras extras
// e histórico de um produto já existente, use a página /produtos/[id].
export function ProductForm({ categorias, marcas, linhas }: ProductFormProps) {
  const router = useRouter();
  const form = useForm<ProdutoRapidoFormValues>({
    resolver: zodResolver(produtoRapidoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      fabricante: "",
      categoria_id: "",
      marca_id: "",
      linha_id: "",
      codigo_interno: "",
      codigo_ean: "",
      custo: 0,
      preco_venda: 0,
      estoque_minimo: 0,
      validade: "",
    },
  });

  const custo = form.watch("custo");
  const precoVenda = form.watch("preco_venda");
  const margem =
    precoVenda > 0 ? (((precoVenda - custo) / precoVenda) * 100).toFixed(1) : null;

  async function onSubmit(values: ProdutoRapidoFormValues) {
    try {
      const id = await createProduto(values);
      toast.success("Produto criado.");
      router.push(`/produtos/${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar.";
      if (message.includes("código interno")) {
        form.setError("codigo_interno", { message });
      } else if (message.includes("código de barras")) {
        form.setError("codigo_ean", { message });
      } else {
        toast.error(message);
      }
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

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Perfume feminino floral amadeirado" {...field} />
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

        <div className="grid grid-cols-3 gap-4">
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
          <FormField
            control={form.control}
            name="linha_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linha</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {() => linhas.find((l) => l.id === field.value)?.nome ?? "Nenhuma"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {linhas.map((linha) => (
                      <SelectItem key={linha.id} value={linha.id}>
                        {linha.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fabricante"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fabricante (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Essenza Indústria e Comércio Ltda" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  <IntegerInput min={0} step={1} value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="validade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Validade (opcional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {margem !== null && (
          <p className="text-sm text-muted-foreground">
            Margem estimada: <span className="font-medium text-foreground">{margem}%</span>
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Isso cria o produto com uma única variação (a padrão). Depois de criado, você pode
          adicionar mais variações, códigos de barra e ver o histórico na página do produto.
        </p>

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Salvando..." : "Criar produto"}
        </Button>
      </form>
    </Form>
  );
}
