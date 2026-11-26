"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { finalizarVendaSchema, type FinalizarVendaValues } from "@/modules/pdv/schemas";
import { estornoSchema, type EstornoFormValues } from "@/modules/financeiro/schemas";

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
      "id, total, desconto, status, created_at, customers(full_name), itens_venda(quantidade, preco_unitario, subtotal, produto_variantes(nome)), venda_pagamentos(valor, formas_pagamento(nome))",
    )
    .eq("caixa_id", caixaId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function cancelarVenda(vendaId: string, values: EstornoFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = estornoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_venda", {
    p_venda_id: vendaId,
    p_motivo: parsed.motivo,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  revalidatePath("/caixa");
}
