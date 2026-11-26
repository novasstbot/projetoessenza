"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { codigoBarraSchema, type CodigoBarraFormValues } from "@/modules/produtos/schemas";

function tipoDoCodigo(codigo: string) {
  if (codigo.length === 13) return "ean_13";
  if (codigo.length === 8) return "ean_8";
  if (codigo.length === 12) return "upc_a";
  return "outro";
}

export async function addCodigoBarra(
  varianteId: string,
  produtoId: string,
  values: CodigoBarraFormValues,
) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = codigoBarraSchema.parse(values);

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("produto_codigos_barra")
    .select("id")
    .eq("variante_id", varianteId);

  const { data, error } = await supabase
    .from("produto_codigos_barra")
    .insert({
      variante_id: varianteId,
      codigo: parsed.codigo,
      tipo: tipoDoCodigo(parsed.codigo),
      principal: (existentes ?? []).length === 0,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      error.code === "23505" ? "Esse código de barras já está em uso." : error.message,
    );
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "produto_codigos_barra",
    entity_id: data.id,
  });

  revalidatePath(`/produtos/${produtoId}`);
}

export async function removeCodigoBarra(id: string, produtoId: string) {
  const profile = await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase.from("produto_codigos_barra").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "delete",
    entity: "produto_codigos_barra",
    entity_id: id,
  });

  revalidatePath(`/produtos/${produtoId}`);
}

// Só um código principal por variação — desmarca os outros antes de marcar
// o escolhido (a constraint de unicidade parcial no banco não permite dois
// ao mesmo tempo).
export async function setCodigoPrincipal(id: string, varianteId: string, produtoId: string) {
  await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error: unsetError } = await supabase
    .from("produto_codigos_barra")
    .update({ principal: false })
    .eq("variante_id", varianteId);
  if (unsetError) throw new Error(unsetError.message);

  const { error } = await supabase
    .from("produto_codigos_barra")
    .update({ principal: true })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/produtos/${produtoId}`);
}
