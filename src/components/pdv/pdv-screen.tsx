"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ProductSearch } from "@/components/pdv/product-search";
import { CartTable } from "@/components/pdv/cart-table";
import { PaymentDialog } from "@/components/pdv/payment-dialog";
import { VendasCaixaDialog } from "@/components/pdv/vendas-caixa-dialog";
import type { CartItem, ClientePdv, FormaPagamento, ProdutoPdv } from "@/modules/pdv/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function PdvScreen({
  produtos,
  formasPagamento,
  clientes,
  caixaId,
  caixaAbertoEm,
}: {
  produtos: ProdutoPdv[];
  formasPagamento: FormaPagamento[];
  clientes: ClientePdv[];
  caixaId: string;
  caixaAbertoEm: string;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [descontoModo, setDescontoModo] = useState<"valor" | "percentual">("valor");
  const [descontoValor, setDescontoValor] = useState(0);
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.produto.preco_venda * i.quantidade, 0);
  const desconto = Math.min(
    descontoModo === "valor" ? descontoValor : (subtotal * descontoPercentual) / 100,
    subtotal,
  );
  const total = Math.max(subtotal - desconto, 0);

  function resetDesconto() {
    setDescontoValor(0);
    setDescontoPercentual(0);
  }

  function addProduto(produto: ProdutoPdv) {
    setItems((prev) => {
      const existing = prev.find((i) => i.produto.id === produto.id);
      const atual = existing?.quantidade ?? 0;
      if (atual + 1 > produto.quantidade_atual) {
        toast.error(`Estoque insuficiente de "${produto.nome}".`);
        return prev;
      }
      if (existing) {
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  }

  function updateQuantidade(produtoId: string, quantidade: number) {
    setItems((prev) => {
      if (quantidade <= 0) return prev.filter((i) => i.produto.id !== produtoId);
      const item = prev.find((i) => i.produto.id === produtoId);
      if (item && quantidade > item.produto.quantidade_atual) {
        toast.error(`Estoque insuficiente de "${item.produto.nome}".`);
        return prev;
      }
      return prev.map((i) => (i.produto.id === produtoId ? { ...i, quantidade } : i));
    });
  }

  function removeItem(produtoId: string) {
    setItems((prev) => prev.filter((i) => i.produto.id !== produtoId));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardContent className="pt-6">
          <ProductSearch produtos={produtos} onAdd={addProduto} />
          <CartTable items={items} onUpdateQuantidade={updateQuantidade} onRemove={removeItem} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="flex h-full flex-col gap-4 pt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Caixa aberto às{" "}
              {new Date(caixaAbertoEm).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <VendasCaixaDialog caixaId={caixaId} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Desconto</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant={descontoModo === "valor" ? "default" : "outline"}
                  onClick={() => setDescontoModo("valor")}
                >
                  R$
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={descontoModo === "percentual" ? "default" : "outline"}
                  onClick={() => setDescontoModo("percentual")}
                >
                  %
                </Button>
              </div>
            </div>
            {descontoModo === "valor" ? (
              <CurrencyInput value={descontoValor} onChange={setDescontoValor} />
            ) : (
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={descontoPercentual}
                onChange={(e) => setDescontoPercentual(Math.min(e.target.valueAsNumber || 0, 100))}
              />
            )}
          </div>

          <div className="mt-auto space-y-1 border-t border-border pt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Desconto
                {descontoModo === "percentual" && descontoPercentual > 0
                  ? ` (${descontoPercentual}%)`
                  : ""}
              </span>
              <span>-{formatCurrency(desconto)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-foreground">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={items.length === 0}
            onClick={() => setPaymentOpen(true)}
          >
            Finalizar venda
          </Button>
        </CardContent>
      </Card>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        items={items}
        desconto={desconto}
        formasPagamento={formasPagamento}
        clientes={clientes}
        onSuccess={() => {
          setItems([]);
          resetDesconto();
          setPaymentOpen(false);
        }}
      />
    </div>
  );
}
