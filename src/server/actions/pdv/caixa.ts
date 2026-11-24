"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { abrirCaixaSchema, type AbrirCaixaFormValues } from "@/modules/pdv/schemas";
import { fecharCaixaSchema, type FecharCaixaValues } from "@/modules/financeiro/schemas";

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

  // valor_abertura already lives on the caixa row — no ledger entry for it,
  // so movimentacoes_caixa (entradas) cleanly means "money brought in during
  // the session" (sales, and future manual suprimentos) with no double count.

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "abrir",
    entity: "caixas",
    entity_id: caixa.id,
  });

  revalidatePath("/pdv");
  revalidatePath("/caixa");
}

export async function fecharCaixa(caixaId: string, values: FecharCaixaValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = fecharCaixaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("fechar_caixa", {
    p_caixa_id: caixaId,
    p_valor_informado: parsed.valorInformado,
    p_contagem: parsed.contagem ?? null,
    p_observacao: parsed.observacao ?? "",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pdv");
  revalidatePath("/caixa");
}
