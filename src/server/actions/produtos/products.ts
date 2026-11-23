"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { produtoSchema, type ProdutoFormValues } from "@/modules/produtos/schemas";

function normalize(values: ProdutoFormValues) {
  return {
    nome: values.nome,
    codigo_interno: values.codigo_interno,
    codigo_ean: values.codigo_ean || null,
    categoria_id: values.categoria_id || null,
    marca_id: values.marca_id || null,
    custo: values.custo,
    preco_venda: values.preco_venda,
    estoque_minimo: values.estoque_minimo,
  };
}

export async function createProduto(values: ProdutoFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = produtoSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtos")
    .insert(normalize(parsed))
    .select("id")
    .single();

  if (error) {
    throw new Error(
      error.code === "23505"
        ? "Já existe um produto com esse código interno ou EAN."
        : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "produtos",
    entity_id: data.id,
  });

  revalidatePath("/produtos");
}

export async function updateProduto(id: string, values: ProdutoFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = produtoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").update(normalize(parsed)).eq("id", id);

  if (error) {
    throw new Error(
      error.code === "23505"
        ? "Já existe um produto com esse código interno ou EAN."
        : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "produtos",
    entity_id: id,
  });

  revalidatePath("/produtos");
}

export async function toggleProdutoAtivo(id: string, ativo: boolean) {
  const profile = await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").update({ ativo }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "produtos",
    entity_id: id,
  });

  revalidatePath("/produtos");
}
