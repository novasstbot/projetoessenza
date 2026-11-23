import {
  DollarSign,
  ShoppingCart,
  Receipt,
  TrendingUp,
  AlertTriangle,
  PackageX,
  Mail,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DemoBadge } from "@/components/layout/demo-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// Dados fictícios — serão substituídos por consultas reais quando os
// módulos de Vendas, Estoque e Financeiro forem construídos.
const demoSales = [
  { day: "Seg", total: 1240 },
  { day: "Ter", total: 980 },
  { day: "Qua", total: 1510 },
  { day: "Qui", total: 1320 },
  { day: "Sex", total: 1870 },
  { day: "Sáb", total: 2240 },
  { day: "Dom", total: 760 },
];

const demoTopProducts = [
  { name: "Perfume Essenza Noir 100ml", total: "R$ 4.320,00" },
  { name: "Hidratante Corporal Rosé 200ml", total: "R$ 2.180,00" },
  { name: "Kit Presente Essenza", total: "R$ 1.960,00" },
];

const demoLowStock = [
  { name: "Perfume Essenza Gold 50ml", quantity: 2, minimum: 10 },
  { name: "Sabonete Líquido Rosé 250ml", quantity: 4, minimum: 15 },
];

const demoNoMovement = [
  { name: "Água de Colônia Essenza 30ml" },
  { name: "Creme Esfoliante Corporal" },
];

const demoAccountsDue = [
  { description: "Fornecedor Aroma Distribuidora", dueDate: "25/11", amount: "R$ 3.200,00" },
  { description: "Aluguel da loja", dueDate: "30/11", amount: "R$ 4.500,00" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { count: emailsSentCount } = await supabase
    .from("email_logs")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação da Essenza Perfumaria & Cosméticos."
        actions={<DemoBadge />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento do dia" value="R$ 1.870,00" icon={DollarSign} />
        <KpiCard label="Faturamento do mês" value="R$ 38.420,00" icon={TrendingUp} />
        <KpiCard label="Vendas no dia" value="23" icon={ShoppingCart} />
        <KpiCard label="Ticket médio" value="R$ 81,30" icon={Receipt} hint="Margem estimada: 42%" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vendas da semana</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={demoSales} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demoTopProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{product.name}</span>
                <span className="font-medium text-muted-foreground">{product.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-gold" />
              Abaixo do estoque mínimo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoLowStock.map((item) => (
              <div key={item.name} className="text-sm">
                <p className="text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} em estoque (mínimo {item.minimum})
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageX className="size-4 text-gold" />
              Sem movimentação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoNoMovement.map((item) => (
              <p key={item.name} className="text-sm text-foreground">
                {item.name}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contas próximas do vencimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoAccountsDue.map((account) => (
              <div key={account.description} className="text-sm">
                <p className="text-foreground">{account.description}</p>
                <p className="text-xs text-muted-foreground">
                  Vence em {account.dueDate} — {account.amount}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-gold" />
              Marketing por e-mail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {emailsSentCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              e-mails registrados até agora (dado real, não fictício)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
