import { PageHeader } from "@/components/layout/page-header";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import type { Cliente } from "@/modules/clientes/types";

export default async function ClientesPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage =
    profile?.role === "admin" || profile?.role === "gerente" || profile?.role === "vendedor";

  const { data: clientes } = await supabase
    .from("customers")
    .select(
      "id, full_name, email, phone, cpf_cnpj, data_nascimento, ativo, created_at, communication_preferences(email_opt_in)",
    )
    .order("full_name");

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes, histórico de compras e preferências de comunicação."
      />
      <ClientesTable clientes={(clientes as unknown as Cliente[]) ?? []} canManage={canManage} />
    </div>
  );
}
