"use client";

import { useState } from "react";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RelatorioVendasCaixa } from "@/components/relatorios/relatorio-vendas-caixa";
import { RelatorioProdutosEstoque } from "@/components/relatorios/relatorio-produtos-estoque";
import { RelatorioComercial } from "@/components/relatorios/relatorio-comercial";
import type { CaixaPeriodo, MovimentoCaixaPeriodo } from "@/modules/financeiro/types";
import type { MovimentacaoEstoquePeriodo, ProdutoEstoqueDetalhado } from "@/modules/estoque/types";
import type { VendaCaixa } from "@/modules/pdv/types";

type Categoria = "financeiro" | "produtos-estoque" | "comercial" | "compras-fornecedores";

function CategoriaEmConstrucao() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Construction className="size-8 text-gold" />
        <p className="font-medium text-foreground">Em construção</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Os relatórios desta categoria chegam numa próxima etapa.
        </p>
      </CardContent>
    </Card>
  );
}

export function RelatoriosShell({
  vendas,
  caixasPeriodo,
  produtosEstoque,
  movimentosEstoque,
}: {
  vendas: VendaCaixa[];
  caixasPeriodo: { caixas: CaixaPeriodo[]; movimentos: MovimentoCaixaPeriodo[] } | null;
  produtosEstoque: ProdutoEstoqueDetalhado[];
  movimentosEstoque: MovimentacaoEstoquePeriodo[];
}) {
  const [categoria, setCategoria] = useState<Categoria>("financeiro");

  const categorias: { id: Categoria; label: string }[] = [
    { id: "financeiro", label: "Financeiro" },
    { id: "produtos-estoque", label: "Produtos e Estoque" },
    { id: "comercial", label: "Comercial" },
    { id: "compras-fornecedores", label: "Compras e Fornecedores" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {categorias.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant={categoria === c.id ? "secondary" : "outline"}
            size="sm"
            onClick={() => setCategoria(c.id)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <hr className="border-border" />

      {categoria === "financeiro" && (
        <RelatorioVendasCaixa vendas={vendas} caixasPeriodo={caixasPeriodo} />
      )}
      {categoria === "produtos-estoque" && (
        <RelatorioProdutosEstoque produtos={produtosEstoque} movimentos={movimentosEstoque} />
      )}
      {categoria === "comercial" && (
        <RelatorioComercial vendas={vendas} produtos={produtosEstoque} />
      )}
      {categoria === "compras-fornecedores" && <CategoriaEmConstrucao />}
    </div>
  );
}
