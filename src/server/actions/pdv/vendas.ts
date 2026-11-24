"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { finalizarVendaSchema, type FinalizarVendaValues } from "@/modules/pdv/schemas";

export async function finalizarVenda(values: FinalizarVendaValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = finalizarVendaSchema.parse(values);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalizar_venda", {
    p_itens: parsed.itens,
    p_pagamentos: parsed.pagamentos,
    p_desconto: parsed.desconto,
    p_cliente_id: parsed.clienteId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  revalidatePath("/caixa");

  return data as string;
}

export async function getVendasCaixa(caixaId: string) {
  await requireRole(["admin", "gerente", "vendedor"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendas")
    .select(
      "id, total, desconto, created_at, customers(full_name), itens_venda(quantidade, preco_unitario, subtotal, produtos(nome))",
    )
    .eq("caixa_id", caixaId)
    .eq("status", "concluida")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
