"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  baixarRecebivelSchema,
  estornoSchema,
  type BaixarRecebivelFormValues,
  type EstornoFormValues,
} from "@/modules/financeiro/schemas";

export async function baixarRecebivelCartao(recebivelId: string, values: BaixarRecebivelFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = baixarRecebivelSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("baixar_recebivel_cartao", {
    p_recebivel_id: recebivelId,
    p_valor_recebido: parsed.valorRecebido,
    p_conta_destino_id: parsed.contaFinanceiraId || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}

export async function marcarRecebivelDivergente(recebivelId: string, values: EstornoFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = estornoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_recebivel_divergente", {
    p_recebivel_id: recebivelId,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}

export async function anteciparRecebivel(recebivelId: string, values: EstornoFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = estornoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("antecipar_recebivel", {
    p_recebivel_id: recebivelId,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}
