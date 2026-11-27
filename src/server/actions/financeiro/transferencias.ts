"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  transferenciaSchema,
  aporteRetiradaSchema,
  type TransferenciaFormValues,
  type AporteRetiradaFormValues,
} from "@/modules/financeiro/schemas";

export async function registrarTransferencia(values: TransferenciaFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = transferenciaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_transferencia", {
    p_conta_origem_id: parsed.contaOrigemId,
    p_conta_destino_id: parsed.contaDestinoId,
    p_valor: parsed.valor,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
}

export async function registrarAporte(values: AporteRetiradaFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = aporteRetiradaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_aporte", {
    p_conta_destino_id: parsed.contaId,
    p_valor: parsed.valor,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
}

export async function registrarRetirada(values: AporteRetiradaFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = aporteRetiradaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_retirada", {
    p_conta_origem_id: parsed.contaId,
    p_valor: parsed.valor,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/caixa");
}
