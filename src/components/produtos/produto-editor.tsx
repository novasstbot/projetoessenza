"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VariantesTab } from "@/components/produtos/variantes-tab";
import { CodigosBarraTab } from "@/components/produtos/codigos-barra-tab";
import { HistoricoTab } from "@/components/produtos/historico-tab";
import { ImagemManager } from "@/components/produtos/imagem-manager";
import { updateProdutoPrincipal, toggleProdutoAtivo } from "@/server/actions/produtos/products";
import { produtoSchema, type ProdutoFormValues } from "@/modules/produtos/schemas";
import type {
  Categoria,
  Linha,
  Marca,
  MovimentoVariante,
  ProdutoComVariantes,
  VarianteDetalhada,
} from "@/modules/produtos/types";

const NONE = "none";
type Aba = "dados" | "variantes" | "codigos" | "historico";

function DadosGeraisForm({
  produto,
  categorias,
  marcas,
  linhas,
}: {
  produto: ProdutoComVariantes;
  categorias: Categoria[];
  marcas: Marca[];
  linhas: Linha[];
}) {
  const router = useRouter();
  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      nome: produto.nome,
      descricao: produto.descricao ?? "",
      fabricante: produto.fabricante ?? "",
      categoria_id: produto.categoria_id ?? "",
      marca_id: produto.marca_id ?? "",
      linha_id: produto.linha_id ?? "",
    },
  });

  async function onSubmit(values: ProdutoFormValues) {
    try {
      await updateProdutoPrincipal(produto.id, values);
      toast.success("Produto atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  async function handleToggleAtivo() {
    try {
      await toggleProdutoAtivo(produto.id, !produto.ativo);
      toast.success(produto.ativo ? "Produto desativado." : "Produto ativado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={produto.ativo ? "secondary" : "outline"}>
            {produto.ativo ? "Ativo" : "Inativo"}
          </Badge>
          <Button type="button" variant="ghost" size="sm" onClick={handleToggleAtivo}>
            {produto.ativo ? "Desativar produto" : "Ativar produto"}
          </Button>
        </div>

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do produto</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                        {() => categorias.find((c) => c.id === field.value)?.nome ?? "Nenhuma"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
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
                    {marcas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
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
                    {linhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>

      <div className="mt-6 max-w-2xl">
        <p className="text-sm font-medium text-foreground">Imagens do produto</p>
        <div className="mt-2">
          <ImagemManager
            tipo="produto"
            entidadeId={produto.id}
            produtoId={produto.id}
            imagens={produto.produto_imagens}
          />
        </div>
      </div>
    </Form>
  );
}

export function ProdutoEditor({
  produto,
  variantes,
  movimentos,
  categorias,
  marcas,
  linhas,
}: {
  produto: ProdutoComVariantes;
  variantes: VarianteDetalhada[];
  movimentos: MovimentoVariante[];
  categorias: Categoria[];
  marcas: Marca[];
  linhas: Linha[];
}) {
  const [aba, setAba] = useState<Aba>("dados");
  const [varianteSelecionadaId, setVarianteSelecionadaId] = useState<string | null>(
    variantes[0]?.id ?? null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant={aba === "dados" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAba("dados")}
        >
          Dados gerais
        </Button>
        <Button
          type="button"
          variant={aba === "variantes" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAba("variantes")}
        >
          Variações ({variantes.length})
        </Button>
        <Button
          type="button"
          variant={aba === "codigos" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAba("codigos")}
        >
          Códigos de barras
        </Button>
        <Button
          type="button"
          variant={aba === "historico" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setAba("historico")}
        >
          Histórico
        </Button>
      </div>

      {aba === "dados" && (
        <DadosGeraisForm produto={produto} categorias={categorias} marcas={marcas} linhas={linhas} />
      )}

      {aba === "variantes" && (
        <VariantesTab
          produtoId={produto.id}
          variantes={variantes}
          varianteSelecionadaId={varianteSelecionadaId}
          onSelect={setVarianteSelecionadaId}
        />
      )}

      {aba === "codigos" && <CodigosBarraTab produtoId={produto.id} variantes={variantes} />}

      {aba === "historico" && <HistoricoTab variantes={variantes} movimentos={movimentos} />}
    </div>
  );
}
