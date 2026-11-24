"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { novaCompraSchema, type NovaCompraValues } from "@/modules/compras/schemas";

export async function criarCompra(values: NovaCompraValues) {
  const profile = await requireRole(["admin", "gerente", "estoquista"]);
  const parsed = novaCompraSchema.parse(values);

  const supabase = await createClient();

  const { data: compra, error: compraError } = await supabase
    .from("compras")
    .insert({
      fornecedor_id: parsed.fornecedor_id,
      observacao: parsed.observacao || null,
      forma_pagamento: parsed.formaPagamento,
      vencimento_pagamento: parsed.vencimentoPagamento || null,
      user_id: profile.id,
    })
    .select("id")
    .single();

  if (compraError) {
    throw new Error(compraError.message);
  }

  const { error: itensError } = await supabase.from("itens_compra").insert(
    parsed.itens.map((item) => ({
      compra_id: compra.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      custo_unitario: item.custo_unitario,
    })),
  );

  if (itensError) {
    throw new Error(itensError.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "compras",
    entity_id: compra.id,
  });

  revalidatePath("/compras");
}

export async function receberCompra(compraId: string) {
  await requireRole(["admin", "gerente", "estoquista"]);

  const supabase = await createClient();
  const { error } = await supabase.rpc("receber_compra", { p_compra_id: compraId });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/compras");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

export async function cancelarCompra(compraId: string) {
  const profile = await requireRole(["admin", "gerente", "estoquista"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("compras")
    .update({ status: "cancelada" })
    .eq("id", compraId)
    .eq("status", "rascunho");

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "cancelar",
    entity: "compras",
    entity_id: compraId,
  });

  revalidatePath("/compras");
}
