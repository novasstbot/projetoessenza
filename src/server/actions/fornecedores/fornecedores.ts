"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { fornecedorSchema, type FornecedorFormValues } from "@/modules/fornecedores/schemas";

function normalize(values: FornecedorFormValues) {
  return {
    nome: values.nome,
    cnpj_cpf: values.cnpj_cpf || null,
    telefone: values.telefone || null,
    email: values.email || null,
  };
}

export async function createFornecedor(values: FornecedorFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = fornecedorSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fornecedores")
    .insert(normalize(parsed))
    .select("id")
    .single();

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe um fornecedor com esse CNPJ/CPF." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "fornecedores",
    entity_id: data.id,
  });

  revalidatePath("/fornecedores");
}

export async function updateFornecedor(id: string, values: FornecedorFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = fornecedorSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.from("fornecedores").update(normalize(parsed)).eq("id", id);

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe um fornecedor com esse CNPJ/CPF." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "fornecedores",
    entity_id: id,
  });

  revalidatePath("/fornecedores");
}

export async function toggleFornecedorAtivo(id: string, ativo: boolean) {
  const profile = await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase.from("fornecedores").update({ ativo }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "fornecedores",
    entity_id: id,
  });

  revalidatePath("/fornecedores");
}
