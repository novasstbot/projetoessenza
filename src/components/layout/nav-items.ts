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
  // Mesmo id usado em permissoes_menu_negadas (role, menu_id) — por padrão
  // todo item aparece pra todo mundo; só aparece negado se existir uma
  // linha pra esse papel + esse id (ver Configurações → Permissões).
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "pdv", label: "PDV / Vendas", href: "/pdv", icon: ShoppingCart },
  { id: "produtos", label: "Produtos", href: "/produtos", icon: Package },
  { id: "estoque", label: "Estoque", href: "/estoque", icon: Boxes },
  { id: "compras", label: "Compras", href: "/compras", icon: Truck },
  { id: "clientes", label: "Clientes", href: "/clientes", icon: Users },
  { id: "fornecedores", label: "Fornecedores", href: "/fornecedores", icon: Building2 },
  { id: "financeiro", label: "Financeiro", href: "/financeiro", icon: Wallet },
  { id: "caixa", label: "Caixa", href: "/caixa", icon: Landmark },
  { id: "relatorios", label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { id: "marketing", label: "Marketing e Relacionamento", href: "/marketing", icon: Mail },
  { id: "configuracoes", label: "Configurações", href: "/configuracoes", icon: Settings },
];
