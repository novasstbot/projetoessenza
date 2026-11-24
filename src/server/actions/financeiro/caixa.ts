"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  sangriaSchema,
  suprimentoSchema,
  despesaCaixaSchema,
  ajusteCaixaSchema,
  type SangriaFormValues,
  type SuprimentoFormValues,
  type DespesaCaixaFormValues,
  type AjusteCaixaFormValues,
} from "@/modules/financeiro/schemas";

export async function registrarSangria(caixaId: string, values: SangriaFormValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = sangriaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_sangria", {
    p_caixa_id: caixaId,
    p_valor: parsed.valor,
    p_destino_tipo: parsed.destinoTipo,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}

export async function registrarSuprimento(caixaId: string, values: SuprimentoFormValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = suprimentoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_suprimento", {
    p_caixa_id: caixaId,
    p_valor: parsed.valor,
    p_origem_conta_id: parsed.origemContaId,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}

export async function registrarDespesaCaixa(caixaId: string, values: DespesaCaixaFormValues) {
  await requireRole(["admin", "gerente", "vendedor"]);
  const parsed = despesaCaixaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_despesa_caixa", {
    p_caixa_id: caixaId,
    p_descricao: parsed.descricao,
    p_categoria: parsed.categoria,
    p_valor: parsed.valor,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}

export async function registrarAjusteCaixa(caixaId: string, values: AjusteCaixaFormValues) {
  await requireRole(["admin", "gerente"]);
  const parsed = ajusteCaixaSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_ajuste_caixa", {
    p_caixa_id: caixaId,
    p_tipo: parsed.tipo,
    p_valor: parsed.valor,
    p_motivo: parsed.motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/caixa");
  revalidatePath("/pdv");
}
