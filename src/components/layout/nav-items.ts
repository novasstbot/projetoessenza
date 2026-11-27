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
import type { UserRole } from "@/server/auth/session";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  // Sem esse campo, o item aparece pra todo mundo. Hoje só o vendedor tem
  // o menu restrito (vira só PDV, já que abrir/fechar caixa e
  // sangria/suprimento/despesa moraram pro PDV).
  roles?: UserRole[];
};

// Fora do PDV, todo o resto continua igual pra admin/gerente/estoquista
// (sidebar nunca restringiu ninguém antes) — só o vendedor passa a ver
// só "PDV / Vendas", já que abrir/fechar caixa e sangria/suprimento/
// despesa moraram todos pro PDV.
const todosMenosVendedor: UserRole[] = ["admin", "gerente", "estoquista"];

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: todosMenosVendedor },
  { label: "PDV / Vendas", href: "/pdv", icon: ShoppingCart },
  { label: "Produtos", href: "/produtos", icon: Package, roles: todosMenosVendedor },
  { label: "Estoque", href: "/estoque", icon: Boxes, roles: todosMenosVendedor },
  { label: "Compras", href: "/compras", icon: Truck, roles: todosMenosVendedor },
  { label: "Clientes", href: "/clientes", icon: Users, roles: todosMenosVendedor },
  { label: "Fornecedores", href: "/fornecedores", icon: Building2, roles: todosMenosVendedor },
  { label: "Financeiro", href: "/financeiro", icon: Wallet, roles: todosMenosVendedor },
  { label: "Caixa", href: "/caixa", icon: Landmark, roles: todosMenosVendedor },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, roles: todosMenosVendedor },
  { label: "Marketing e Relacionamento", href: "/marketing", icon: Mail, roles: todosMenosVendedor },
  { label: "Configurações", href: "/configuracoes", icon: Settings, roles: todosMenosVendedor },
];
