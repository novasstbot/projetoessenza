"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { UserRole } from "@/server/auth/session";

type AppShellProps = {
  fullName: string | null;
  email: string | null;
  role: UserRole;
  menusNegados: string[];
  children: React.ReactNode;
};

export function AppShell({ fullName, email, role, menusNegados, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        menusNegados={menusNegados}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          fullName={fullName}
          email={email}
          role={role}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
