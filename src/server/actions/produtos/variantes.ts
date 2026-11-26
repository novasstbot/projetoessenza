"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { varianteSchema, type VarianteFormValues } from "@/modules/produtos/schemas";

function normalizeVariante(values: VarianteFormValues) {
  return {
    nome: values.nome,
    codigo_interno: values.codigo_interno,
    custo: values.custo,
    preco_venda: values.preco_venda,
    estoque_minimo: values.estoque_minimo,
    validade: values.validade || null,
  };
}

export async function createVariante(produtoId: string, values: VarianteFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = varianteSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produto_variantes")
    .insert({ produto_id: produtoId, ...normalizeVariante(parsed) })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe uma variação com esse código interno." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "produto_variantes",
    entity_id: data.id,
  });

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");

  return data.id as string;
}

export async function updateVariante(varianteId: string, produtoId: string, values: VarianteFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = varianteSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase
    .from("produto_variantes")
    .update(normalizeVariante(parsed))
    .eq("id", varianteId);

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe uma variação com esse código interno." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "produto_variantes",
    entity_id: varianteId,
  });

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");
}

export async function toggleVarianteAtivo(varianteId: string, produtoId: string, ativo: boolean) {
  const profile = await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("produto_variantes")
    .update({ ativo })
    .eq("id", varianteId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "produto_variantes",
    entity_id: varianteId,
  });

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");
}

// Variações sem histórico (nenhuma venda, compra ou movimentação de
// estoque) podem ser removidas de verdade; com histórico, a constraint de
// chave estrangeira bloqueia a exclusão — peça pro usuário desativar em
// vez de excluir.
export async function deleteVariante(varianteId: string, produtoId: string) {
  const profile = await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase.from("produto_variantes").delete().eq("id", varianteId);

  if (error) {
    throw new Error(
      error.code === "23503"
        ? "Não é possível excluir: esta variação já tem movimentações, vendas ou compras. Desative-a em vez de excluir."
        : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "delete",
    entity: "produto_variantes",
    entity_id: varianteId,
  });

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");
}

export async function setVarianteAtributo(varianteId: string, produtoId: string, atributo: string, valor: string) {
  await requireRole(["admin", "gerente"]);
  if (!atributo.trim() || !valor.trim()) {
    throw new Error("Preencha o atributo e o valor.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("produto_variante_atributos")
    .upsert(
      { variante_id: varianteId, atributo: atributo.trim(), valor: valor.trim() },
      { onConflict: "variante_id,atributo" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/produtos/${produtoId}`);
}

export async function removeVarianteAtributo(id: string, produtoId: string) {
  await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase.from("produto_variante_atributos").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/produtos/${produtoId}`);
}
