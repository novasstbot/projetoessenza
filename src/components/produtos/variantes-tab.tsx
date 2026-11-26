"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  createVariante,
  updateVariante,
  toggleVarianteAtivo,
  deleteVariante,
  setVarianteAtributo,
  removeVarianteAtributo,
} from "@/server/actions/produtos/variantes";
import { varianteSchema, type VarianteFormValues } from "@/modules/produtos/schemas";
import type { VarianteDetalhada } from "@/modules/produtos/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function VarianteForm({
  produtoId,
  variante,
  onDone,
}: {
  produtoId: string;
  variante?: VarianteDetalhada;
  onDone: () => void;
}) {
  const router = useRouter();
  const form = useForm<VarianteFormValues>({
    resolver: zodResolver(varianteSchema),
    defaultValues: {
      nome: variante?.nome ?? "",
      codigo_interno: variante?.codigo_interno ?? "",
      custo: variante?.custo ?? 0,
      preco_venda: variante?.preco_venda ?? 0,
      estoque_minimo: variante?.estoque_minimo ?? 0,
      validade: variante?.validade ?? "",
    },
  });

  async function onSubmit(values: VarianteFormValues) {
    try {
      if (variante) {
        await updateVariante(variante.id, produtoId, values);
        toast.success("Variação atualizada.");
      } else {
        await createVariante(produtoId, values);
        toast.success("Variação criada.");
      }
      router.refresh();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-lg border border-border p-3"
      >
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da variação</FormLabel>
              <FormControl>
                <Input placeholder="Essenza 100ml" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="codigo_interno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código interno</FormLabel>
                <FormControl>
                  <Input placeholder="ESS-100" {...field} />
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
        <div className="grid grid-cols-2 gap-3">
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
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AtributosEditor({ produtoId, variante }: { produtoId: string; variante: VarianteDetalhada }) {
  const router = useRouter();
  const [atributo, setAtributo] = useState("");
  const [valor, setValor] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    try {
      await setVarianteAtributo(variante.id, produtoId, atributo, valor);
      setAtributo("");
      setValor("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeVarianteAtributo(id, produtoId);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {variante.produto_variante_atributos.map((a) => (
        <Badge key={a.id} variant="outline" className="gap-1">
          {a.atributo}: {a.valor}
          <button type="button" onClick={() => handleRemove(a.id)} aria-label="Remover atributo">
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={atributo}
        onChange={(e) => setAtributo(e.target.value)}
        placeholder="Atributo"
        className="h-7 w-24 text-xs"
      />
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Valor"
        className="h-7 w-24 text-xs"
      />
      <Button type="button" size="icon-sm" variant="ghost" disabled={adding} onClick={handleAdd}>
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}

export function VariantesTab({
  produtoId,
  variantes,
  varianteSelecionadaId,
  onSelect,
}: {
  produtoId: string;
  variantes: VarianteDetalhada[];
  varianteSelecionadaId: string | null;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function handleToggle(variante: VarianteDetalhada) {
    try {
      await toggleVarianteAtivo(variante.id, produtoId, !variante.ativo);
      toast.success(variante.ativo ? "Variação desativada." : "Variação ativada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  async function handleDelete(variante: VarianteDetalhada) {
    try {
      await deleteVariante(variante.id, produtoId);
      toast.success("Variação excluída.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  }

  return (
    <div className="space-y-4">
      {!criando && (
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setCriando(true)}>
          <Plus className="size-4" />
          Nova variação
        </Button>
      )}
      {criando && (
        <VarianteForm produtoId={produtoId} onDone={() => setCriando(false)} />
      )}

      <div className="space-y-2">
        {variantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma variação cadastrada.</p>
        ) : (
          variantes.map((variante) =>
            editandoId === variante.id ? (
              <VarianteForm
                key={variante.id}
                produtoId={produtoId}
                variante={variante}
                onDone={() => setEditandoId(null)}
              />
            ) : (
              <div
                key={variante.id}
                className={`rounded-lg border p-3 ${
                  varianteSelecionadaId === variante.id ? "border-gold ring-1 ring-gold/40" : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(variante.id)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{variante.nome}</span>
                      <Badge variant={variante.ativo ? "secondary" : "outline"}>
                        {variante.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {variante.codigo_interno} · estoque {variante.quantidade_atual} (mínimo{" "}
                      {variante.estoque_minimo})
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">custo {formatCurrency(variante.custo)}</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(variante.preco_venda)}
                    </p>
                  </div>
                </button>

                <div className="mt-2">
                  <AtributosEditor produtoId={produtoId} variante={variante} />
                </div>

                <div className="mt-2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar"
                    onClick={() => setEditandoId(variante.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={variante.ativo ? "Desativar" : "Ativar"}
                    onClick={() => handleToggle(variante)}
                  >
                    {variante.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Excluir"
                    onClick={() => handleDelete(variante)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
