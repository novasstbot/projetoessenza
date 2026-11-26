import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProductForm } from "@/components/produtos/product-form";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";

export default async function NovoProdutoPage() {
  await requireRole(["admin", "gerente"]);
  const supabase = await createClient();

  const [{ data: categorias }, { data: marcas }, { data: linhas }] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("marcas").select("id, nome").order("nome"),
    supabase.from("produto_linhas").select("id, nome").order("nome"),
  ]);

  return (
    <div>
      <PageHeader
        title="Novo produto"
        description="Cadastro rápido — cria o produto com uma única variação (a padrão)."
      />
      <Card className="sm:max-w-2xl">
        <CardContent className="pt-6">
          <ProductForm
            categorias={categorias ?? []}
            marcas={marcas ?? []}
            linhas={linhas ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
