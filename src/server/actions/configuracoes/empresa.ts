"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { processarImagem } from "@/server/actions/produtos/imagens";

export type ConfiguracaoEmpresa = {
  id: string;
  nome: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  logo_thumb: string | null;
  logo_medio: string | null;
};

// Tabela pensada pra ter no máximo 1 linha — cria vazia na primeira
// leitura se ainda não existir nenhuma (evita o app ter que saber se é
// create ou update na primeira vez que alguém abre essa tela).
export async function getConfiguracaoEmpresa(): Promise<ConfiguracaoEmpresa> {
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("configuracoes_empresa")
    .select("id, nome, cnpj, endereco, telefone, email, logo_thumb, logo_medio")
    .limit(1)
    .maybeSingle();

  if (existente) return existente;

  const { data: nova, error } = await supabase
    .from("configuracoes_empresa")
    .insert({})
    .select("id, nome, cnpj, endereco, telefone, email, logo_thumb, logo_medio")
    .single();

  if (error) throw new Error(error.message);
  return nova;
}

export async function updateConfiguracaoEmpresa(
  id: string,
  values: { nome: string; cnpj: string; endereco: string; telefone: string; email: string },
) {
  const profile = await requireRole(["admin"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("configuracoes_empresa")
    .update({
      nome: values.nome || null,
      cnpj: values.cnpj || null,
      endereco: values.endereco || null,
      telefone: values.telefone || null,
      email: values.email || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "configuracoes_empresa",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
}

export async function uploadLogoEmpresa(formData: FormData) {
  const profile = await requireRole(["admin"]);

  const file = formData.get("file");
  const id = formData.get("id") as string | null;
  if (!(file instanceof File) || !id) {
    throw new Error("Dados inválidos.");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Formato não suportado. Use JPEG, PNG ou WebP.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Imagem muito grande (máximo 10MB).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { thumb, media } = await processarImagem(buffer);

  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("configuracoes_empresa")
    .select("logo_thumb, logo_medio")
    .eq("id", id)
    .single();

  const novoId = crypto.randomUUID();
  const pathThumb = `empresa/${novoId}-thumb.webp`;
  const pathMedio = `empresa/${novoId}-medio.webp`;

  const storage = supabase.storage.from("produto-imagens");
  const { error: uploadThumbError } = await storage.upload(pathThumb, thumb, {
    contentType: "image/webp",
  });
  if (uploadThumbError) throw new Error(uploadThumbError.message);

  const { error: uploadMedioError } = await storage.upload(pathMedio, media, {
    contentType: "image/webp",
  });
  if (uploadMedioError) {
    await storage.remove([pathThumb]);
    throw new Error(uploadMedioError.message);
  }

  const { error: updateError } = await supabase
    .from("configuracoes_empresa")
    .update({ logo_thumb: pathThumb, logo_medio: pathMedio })
    .eq("id", id);

  if (updateError) {
    await storage.remove([pathThumb, pathMedio]);
    throw new Error(updateError.message);
  }

  const pathsAntigos = [atual?.logo_thumb, atual?.logo_medio].filter(
    (p): p is string => Boolean(p),
  );
  if (pathsAntigos.length > 0) {
    await storage.remove(pathsAntigos);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "configuracoes_empresa",
    entity_id: id,
  });

  revalidatePath("/configuracoes");
}
