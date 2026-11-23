import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  Building2,
  Wallet,
  Landmark,
  BarChart3,
  Mail,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "PDV / Vendas", href: "/pdv", icon: ShoppingCart },
  { label: "Produtos", href: "/produtos", icon: Package },
  { label: "Estoque", href: "/estoque", icon: Boxes },
  { label: "Compras", href: "/compras", icon: Truck },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Fornecedores", href: "/fornecedores", icon: Building2 },
  { label: "Financeiro", href: "/financeiro", icon: Wallet },
  { label: "Caixa", href: "/caixa", icon: Landmark },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Marketing e Relacionamento", href: "/marketing", icon: Mail },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
