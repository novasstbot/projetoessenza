"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { taxonomySchema, type TaxonomyFormValues } from "@/modules/produtos/schemas";

async function createTaxonomy(
  table: "categorias" | "marcas" | "produto_linhas",
  values: TaxonomyFormValues,
) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = taxonomySchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.from(table).insert({ nome: parsed.nome });

  if (error) {
    throw new Error(error.code === "23505" ? "Esse nome já existe." : error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: table,
  });

  revalidatePath("/produtos");
}

async function deleteTaxonomy(table: "categorias" | "marcas" | "produto_linhas", id: string) {
  const profile = await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    throw new Error(
      error.code === "23503"
        ? "Não é possível remover: existem produtos vinculados."
        : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "delete",
    entity: table,
    entity_id: id,
  });

  revalidatePath("/produtos");
}

export async function createCategoria(values: TaxonomyFormValues) {
  return createTaxonomy("categorias", values);
}

export async function deleteCategoria(id: string) {
  return deleteTaxonomy("categorias", id);
}

export async function createMarca(values: TaxonomyFormValues) {
  return createTaxonomy("marcas", values);
}

export async function deleteMarca(id: string) {
  return deleteTaxonomy("marcas", id);
}

export async function createLinha(values: TaxonomyFormValues) {
  return createTaxonomy("produto_linhas", values);
}

export async function deleteLinha(id: string) {
  return deleteTaxonomy("produto_linhas", id);
}
