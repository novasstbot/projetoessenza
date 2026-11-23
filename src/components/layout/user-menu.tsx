"use client";

import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/server/auth/session";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
  estoquista: "Estoquista",
};

type UserMenuProps = {
  fullName: string | null;
  email: string | null;
  role: UserRole;
};

export function UserMenu({ fullName, email, role }: UserMenuProps) {
  const router = useRouter();
  const displayName = fullName || email || "Usuário";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <UserIcon className="size-4" />
            <span className="truncate">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
