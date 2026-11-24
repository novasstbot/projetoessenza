"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  clienteSchema,
  clienteRapidoSchema,
  type ClienteFormValues,
  type ClienteRapidoFormValues,
} from "@/modules/clientes/schemas";

async function upsertPreference(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  optIn: boolean,
) {
  await supabase.from("communication_preferences").upsert({
    customer_id: customerId,
    email_opt_in: optIn,
    opt_in_source: "cadastro",
    opt_in_at: optIn ? new Date().toISOString() : null,
    opt_out_at: optIn ? null : new Date().toISOString(),
  });
}

export async function createCliente(values: ClienteFormValues) {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = clienteSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: parsed.full_name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      cpf_cnpj: parsed.cpf_cnpj || null,
      data_nascimento: parsed.data_nascimento || null,
      origin: "cadastro_manual",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe um cliente com esse e-mail ou CPF/CNPJ." : error.message);
  }

  await upsertPreference(supabase, data.id, parsed.email_opt_in);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "customers",
    entity_id: data.id,
  });

  revalidatePath("/clientes");
}

// Cadastro rápido feito no PDV durante a venda — sem o passo de
// autorização de e-mail (sem consentimento explícito coletado aqui).
export async function createClienteRapido(values: ClienteRapidoFormValues) {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = clienteRapidoSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: parsed.full_name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      cpf_cnpj: parsed.cpf_cnpj || null,
      data_nascimento: parsed.data_nascimento || null,
      origin: "pdv",
    })
    .select("id, full_name")
    .single();

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe um cliente com esse e-mail ou CPF/CNPJ." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "customers",
    entity_id: data.id,
    metadata: { origem: "pdv" },
  });

  revalidatePath("/clientes");
  revalidatePath("/pdv");

  return data;
}

export async function updateCliente(id: string, values: ClienteFormValues) {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = clienteSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      full_name: parsed.full_name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      cpf_cnpj: parsed.cpf_cnpj || null,
      data_nascimento: parsed.data_nascimento || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.code === "23505" ? "Já existe um cliente com esse e-mail ou CPF/CNPJ." : error.message);
  }

  await upsertPreference(supabase, id, parsed.email_opt_in);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "customers",
    entity_id: id,
  });

  revalidatePath("/clientes");
}

export async function toggleClienteAtivo(id: string, ativo: boolean) {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ ativo }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "customers",
    entity_id: id,
  });

  revalidatePath("/clientes");
}

export async function getHistoricoCompras(clienteId: string) {
  await requireRole(["admin", "gerente", "vendedor"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendas")
    .select("id, total, created_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
