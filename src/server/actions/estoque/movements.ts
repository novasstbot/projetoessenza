"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { movimentacaoSchema, type MovimentacaoFormValues } from "@/modules/estoque/schemas";

export async function createMovimentacao(values: MovimentacaoFormValues) {
  const profile = await requireRole(["admin", "gerente", "estoquista"]);
  const parsed = movimentacaoSchema.parse(values);

  const supabase = await createClient();

  if (parsed.tipo === "saida") {
    const { data: estoque } = await supabase
      .from("estoque_atual")
      .select("quantidade_atual")
      .eq("produto_id", parsed.produto_id)
      .maybeSingle();

    const atual = estoque?.quantidade_atual ?? 0;
    if (parsed.quantidade > atual) {
      throw new Error(`Estoque insuficiente (disponível: ${atual}).`);
    }
  }

  const { data, error } = await supabase
    .from("movimentacoes_estoque")
    .insert({
      produto_id: parsed.produto_id,
      tipo: parsed.tipo,
      quantidade: parsed.quantidade,
      motivo: parsed.motivo,
      origem: "manual",
      user_id: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: parsed.tipo,
    entity: "movimentacoes_estoque",
    entity_id: data.id,
    metadata: { produto_id: parsed.produto_id, quantidade: parsed.quantidade },
  });

  revalidatePath("/estoque");
}
