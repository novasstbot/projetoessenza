import { Menu } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";
import type { UserRole } from "@/server/auth/session";

type HeaderProps = {
  onMenuClick: () => void;
  fullName: string | null;
  email: string | null;
  role: UserRole;
};

export function Header({ onMenuClick, fullName, email, role }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="text-foreground/70 hover:text-foreground lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block" />

      <UserMenu fullName={fullName} email={email} role={role} />
    </header>
  );
}
