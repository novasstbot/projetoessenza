"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Pencil, EyeOff, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toggleProdutoAtivo } from "@/server/actions/produtos/products";
import { resolverThumb } from "@/lib/produtos/imagem";
import type { Categoria, Marca, ProdutoComVariantes } from "@/modules/produtos/types";

const ALL = "all";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ProductsTable({
  produtos,
  categorias,
  marcas,
  canManage,
}: {
  produtos: ProdutoComVariantes[];
  categorias: Categoria[];
  marcas: Marca[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState(ALL);
  const [marcaFilter, setMarcaFilter] = useState(ALL);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return produtos.filter((produto) => {
      const variante = produto.produto_variantes[0];
      const codigoEan = variante?.produto_codigos_barra.find((c) => c.principal)?.codigo ?? "";
      const matchesTerm =
        !term ||
        produto.nome.toLowerCase().includes(term) ||
        (variante?.codigo_interno.toLowerCase() ?? "").includes(term) ||
        codigoEan.includes(term);
      const matchesCategoria =
        categoriaFilter === ALL || produto.categoria_id === categoriaFilter;
      const matchesMarca = marcaFilter === ALL || produto.marca_id === marcaFilter;
      return matchesTerm && matchesCategoria && matchesMarca;
    });
  }, [produtos, search, categoriaFilter, marcaFilter]);

  async function handleToggle(produto: ProdutoComVariantes) {
    try {
      await toggleProdutoAtivo(produto.id, !produto.ativo);
      toast.success(produto.ativo ? "Produto desativado." : "Produto ativado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código interno ou EAN"
            className="pl-8"
          />
        </div>

        <Select value={categoriaFilter} onValueChange={(value) => setCategoriaFilter(value ?? ALL)}>
          <SelectTrigger className="w-44">
            <SelectValue>
              {() =>
                categoriaFilter === ALL
                  ? "Todas as categorias"
                  : (categorias.find((c) => c.id === categoriaFilter)?.nome ??
                    "Todas as categorias")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {categorias.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={marcaFilter} onValueChange={(value) => setMarcaFilter(value ?? ALL)}>
          <SelectTrigger className="w-44">
            <SelectValue>
              {() =>
                marcaFilter === ALL
                  ? "Todas as marcas"
                  : (marcas.find((m) => m.id === marcaFilter)?.nome ?? "Todas as marcas")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as marcas</SelectItem>
            {marcas.map((marca) => (
              <SelectItem key={marca.id} value={marca.id}>
                {marca.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && (
          <Button
            className="gap-1.5"
            render={
              <Link href="/produtos/novo">
                <Plus className="size-4" />
                Novo produto
              </Link>
            }
          />
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Produto</th>
              <th className="px-4 py-2.5 font-medium">Código</th>
              <th className="px-4 py-2.5 font-medium">Categoria / Marca</th>
              <th className="px-4 py-2.5 font-medium">Custo</th>
              <th className="px-4 py-2.5 font-medium">Preço</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              {canManage && <th className="px-4 py-2.5 font-medium text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((produto) => {
                const variante = produto.produto_variantes[0];
                const codigoEan = variante?.produto_codigos_barra.find((c) => c.principal)?.codigo;
                const thumb = resolverThumb(variante, produto);
                return (
                  <tr key={produto.id} className={!produto.ativo ? "opacity-60" : undefined}>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
                          {thumb && <img src={thumb} alt="" className="size-full object-contain" />}
                        </div>
                        <span>
                          {produto.nome}
                          {produto.produto_variantes.length > 1 && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              ({produto.produto_variantes.length} variações)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {variante?.codigo_interno ?? "—"}
                      {codigoEan && <span className="block text-xs">EAN {codigoEan}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {produto.categorias?.nome ?? "—"} / {produto.marcas?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatCurrency(variante?.custo ?? 0)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {formatCurrency(variante?.preco_venda ?? 0)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={produto.ativo ? "secondary" : "outline"}>
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar"
                            render={
                              <Link href={`/produtos/${produto.id}`}>
                                <Pencil className="size-4" />
                              </Link>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={produto.ativo ? "Desativar" : "Ativar"}
                            onClick={() => handleToggle(produto)}
                          >
                            {produto.ativo ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
