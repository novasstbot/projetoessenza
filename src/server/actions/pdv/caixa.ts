"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  abrirCaixaSchema,
  fecharCaixaSchema,
  type AbrirCaixaFormValues,
  type FecharCaixaFormValues,
} from "@/modules/pdv/schemas";

export async function abrirCaixa(values: AbrirCaixaFormValues) {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = abrirCaixaSchema.parse(values);

  const supabase = await createClient();

  const { data: aberto } = await supabase
    .from("caixas")
    .select("id")
    .eq("status", "aberto")
    .maybeSingle();
  if (aberto) {
    throw new Error("Já existe um caixa aberto.");
  }

  const { data: caixa, error } = await supabase
    .from("caixas")
    .insert({ valor_abertura: parsed.valor_abertura, aberto_por: profile.id })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (parsed.valor_abertura > 0) {
    await supabase.from("movimentacoes_caixa").insert({
      caixa_id: caixa.id,
      tipo: "entrada",
      valor: parsed.valor_abertura,
      descricao: "Abertura de caixa",
      user_id: profile.id,
    });
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "abrir",
    entity: "caixas",
    entity_id: caixa.id,
  });

  revalidatePath("/pdv");
  revalidatePath("/caixa");
}

export async function fecharCaixa(caixaId: string, values: FecharCaixaFormValues) {
  const profile = await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = fecharCaixaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase
    .from("caixas")
    .update({
      status: "fechado",
      fechado_em: new Date().toISOString(),
      fechado_por: profile.id,
      valor_fechamento_informado: parsed.valor_fechamento_informado,
      observacao_fechamento: parsed.observacao_fechamento || null,
    })
    .eq("id", caixaId)
    .eq("status", "aberto");

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "fechar",
    entity: "caixas",
    entity_id: caixaId,
  });

  revalidatePath("/pdv");
  revalidatePath("/caixa");
}
