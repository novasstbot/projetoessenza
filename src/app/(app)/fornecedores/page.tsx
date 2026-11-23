import { PageHeader } from "@/components/layout/page-header";
import { FornecedoresTable } from "@/components/fornecedores/fornecedores-table";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";

export default async function FornecedoresPage() {
  const [supabase, profile] = await Promise.all([createClient(), getProfile()]);
  const canManage = profile?.role === "admin" || profile?.role === "gerente";

  const { data: fornecedores } = await supabase
    .from("fornecedores")
    .select("id, nome, cnpj_cpf, telefone, email, ativo")
    .order("nome");

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores utilizados nos pedidos de compra."
      />
      <FornecedoresTable fornecedores={fornecedores ?? []} canManage={canManage} />
    </div>
  );
}
