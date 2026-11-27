"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navItems } from "@/components/layout/nav-items";
import { setMenuLiberadoParaPapel } from "@/server/actions/configuracoes/permissoes-menu";
import type { UserRole } from "@/server/auth/session";

// Admin nunca aparece aqui — ele sempre vê tudo, pra nunca ter como se
// trancar fora do próprio sistema configurando isso errado.
const PAPEIS: UserRole[] = ["gerente", "vendedor", "estoquista"];
const papelLabels: Record<UserRole, string> = {
  admin: "Admin",
  gerente: "Gerente",
  vendedor: "Vendedor",
  estoquista: "Estoquista",
};
// PDV nunca é negável — sem ele o vendedor não tem como trabalhar, e os
// outros papéis não dependem dele.
const itensConfiguraveis = navItems.filter((item) => item.id !== "pdv");

export function PermissoesMenuManager({
  negadas,
}: {
  negadas: { role: UserRole; menu_id: string }[];
}) {
  const router = useRouter();
  const negadoSet = new Set(negadas.map((n) => `${n.role}:${n.menu_id}`));

  async function handleToggle(role: UserRole, menuId: string, estaNegado: boolean) {
    try {
      await setMenuLiberadoParaPapel(role, menuId, estaNegado);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permissões de menu por papel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Controla quais itens do menu lateral cada papel vê. Admin sempre vê tudo; isso não
          muda o que cada ação dentro do sistema permite, só a entrada pelo menu.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-b-lg border-t border-border">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Menu</th>
                {PAPEIS.map((papel) => (
                  <th key={papel} className="px-4 py-2.5 text-center font-medium">
                    {papelLabels[papel]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itensConfiguraveis.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{item.label}</td>
                  {PAPEIS.map((papel) => {
                    const negado = negadoSet.has(`${papel}:${item.id}`);
                    return (
                      <td key={papel} className="px-4 py-2.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={negado ? `Liberar ${item.label} pra ${papelLabels[papel]}` : `Negar ${item.label} pra ${papelLabels[papel]}`}
                          onClick={() => handleToggle(papel, item.id, negado)}
                        >
                          {negado ? (
                            <EyeOff className="size-4 text-muted-foreground" />
                          ) : (
                            <Eye className="size-4 text-gold" />
                          )}
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
