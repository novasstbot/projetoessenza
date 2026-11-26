import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  TrendingUp,
  AlertTriangle,
  PackageX,
  Mail,
  CalendarClock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type VendaComItens = {
  id: string;
  total: number;
  created_at: string;
  itens_venda: {
    quantidade: number;
    preco_unitario: number;
    custo_unitario: number;
    variante_id: string;
    produto_variantes: { nome: string } | null;
  }[];
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const trintaCincoDiasAtras = new Date(now);
  trintaCincoDiasAtras.setDate(now.getDate() - 35);

  const daquiSeteDias = new Date(now);
  daquiSeteDias.setDate(now.getDate() + 7);

  const [
    { count: emailsSentCount },
    { data: vendasRecentes },
    { data: produtosAtivos },
    { data: estoqueAtual },
    { data: contasPagarProximas },
    { data: contasReceberProximas },
  ] = await Promise.all([
    supabase.from("email_logs").select("id", { count: "exact", head: true }),
    supabase
      .from("vendas")
      .select(
        "id, total, created_at, itens_venda(quantidade, preco_unitario, custo_unitario, variante_id, produto_variantes(nome))",
      )
      .eq("status", "concluida")
      .gte("created_at", trintaCincoDiasAtras.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("produto_variantes")
      .select("id, nome, estoque_minimo, produtos!inner(ativo)")
      .eq("ativo", true)
      .eq("produtos.ativo", true),
    supabase.from("estoque_atual").select("variante_id, quantidade_atual"),
    supabase
      .from("contas_pagar")
      .select("id, descricao, valor, vencimento")
      .eq("status", "pendente")
      .lte("vencimento", daquiSeteDias.toISOString().slice(0, 10))
      .order("vencimento")
      .limit(5),
    supabase
      .from("contas_receber")
      .select("id, descricao, valor, vencimento")
      .eq("status", "pendente")
      .lte("vencimento", daquiSeteDias.toISOString().slice(0, 10))
      .order("vencimento")
      .limit(5),
  ]);

  const vendas = (vendasRecentes as unknown as VendaComItens[]) ?? [];

  const vendasHoje = vendas.filter((v) => isSameDay(new Date(v.created_at), now));
  const vendasMes = vendas.filter((v) => {
    const d = new Date(v.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const faturamentoHoje = vendasHoje.reduce((sum, v) => sum + v.total, 0);
  const faturamentoMes = vendasMes.reduce((sum, v) => sum + v.total, 0);
  const ticketMedio = vendasHoje.length > 0 ? faturamentoHoje / vendasHoje.length : 0;

  const itensMes = vendasMes.flatMap((v) => v.itens_venda);
  const receitaMes = itensMes.reduce((sum, i) => sum + i.preco_unitario * i.quantidade, 0);
  const custoMes = itensMes.reduce((sum, i) => sum + i.custo_unitario * i.quantidade, 0);
  const margemEstimada = receitaMes > 0 ? ((receitaMes - custoMes) / receitaMes) * 100 : 0;

  const vendasPorProduto = new Map<string, { nome: string; total: number }>();
  for (const item of itensMes) {
    const atual = vendasPorProduto.get(item.variante_id) ?? {
      nome: item.produto_variantes?.nome ?? "—",
      total: 0,
    };
    atual.total += item.preco_unitario * item.quantidade;
    vendasPorProduto.set(item.variante_id, atual);
  }
  const topProdutos = [...vendasPorProduto.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const salesChartData = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - i));
    const total = vendas
      .filter((v) => isSameDay(new Date(v.created_at), day))
      .reduce((sum, v) => sum + v.total, 0);
    return { day: weekdayLabels[day.getDay()], total };
  });

  const estoquePorProduto = new Map(
    (estoqueAtual ?? []).map((item) => [item.variante_id, item.quantidade_atual]),
  );
  const produtosComEstoque = (produtosAtivos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    estoque_minimo: p.estoque_minimo,
    quantidade_atual: estoquePorProduto.get(p.id) ?? 0,
    tem_movimentacao: estoquePorProduto.has(p.id),
  }));
  const abaixoDoMinimo = produtosComEstoque
    .filter((p) => p.tem_movimentacao && p.quantidade_atual < p.estoque_minimo)
    .slice(0, 5);
  const semMovimentacao = produtosComEstoque.filter((p) => !p.tem_movimentacao).slice(0, 5);

  const contasVencendo = [
    ...(contasPagarProximas ?? []).map((c) => ({ ...c, tipo: "pagar" as const })),
    ...(contasReceberProximas ?? []).map((c) => ({ ...c, tipo: "receber" as const })),
  ]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 5);

  function formatDataBr(value: string) {
    return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação da Essenza Perfumaria & Cosméticos."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento do dia" value={formatCurrency(faturamentoHoje)} icon={DollarSign} />
        <KpiCard label="Faturamento do mês" value={formatCurrency(faturamentoMes)} icon={TrendingUp} />
        <KpiCard label="Vendas no dia" value={String(vendasHoje.length)} icon={ShoppingCart} />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(ticketMedio)}
          icon={Receipt}
          hint={`Margem estimada (mês): ${margemEstimada.toFixed(1)}%`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vendas dos últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos mais vendidos (mês)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProdutos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda registrada no mês.</p>
            ) : (
              topProdutos.map((produto) => (
                <div key={produto.nome} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{produto.nome}</span>
                  <span className="font-medium text-muted-foreground">
                    {formatCurrency(produto.total)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Link href="/estoque" className="lg:col-span-1">
          <Card className="h-full transition-colors hover:border-gold/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-gold" />
                Abaixo do estoque mínimo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {abaixoDoMinimo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum produto abaixo do mínimo.</p>
              ) : (
                abaixoDoMinimo.map((item) => (
                  <div key={item.id} className="text-sm">
                    <p className="text-foreground">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantidade_atual} em estoque (mínimo {item.estoque_minimo})
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/estoque" className="lg:col-span-1">
          <Card className="h-full transition-colors hover:border-gold/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageX className="size-4 text-gold" />
                Sem movimentação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {semMovimentacao.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todos os produtos já tiveram movimentação.
                </p>
              ) : (
                semMovimentacao.map((item) => (
                  <p key={item.id} className="text-sm text-foreground">
                    {item.nome}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro" className="lg:col-span-1">
          <Card className="h-full transition-colors hover:border-gold/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-gold" />
                Contas próximas do vencimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contasVencendo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada vencendo nos próximos 7 dias.</p>
              ) : (
                contasVencendo.map((conta) => (
                  <div key={`${conta.tipo}-${conta.id}`} className="text-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-foreground">{conta.descricao}</p>
                      <Badge variant={conta.tipo === "pagar" ? "outline" : "secondary"}>
                        {conta.tipo === "pagar" ? "A pagar" : "A receber"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vence em {formatDataBr(conta.vencimento)} — {formatCurrency(conta.valor)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/marketing" className="lg:col-span-1">
          <Card className="h-full transition-colors hover:border-gold/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-4 text-gold" />
                Marketing por e-mail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">{emailsSentCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">e-mails registrados até agora</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
