"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";

export type TipoEntidadeImagem = "produto" | "variante";

const CONFIG = {
  produto: { tabela: "produto_imagens", coluna: "produto_id" },
  variante: { tabela: "variante_imagens", coluna: "variante_id" },
} as const;

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

async function processarImagem(buffer: Buffer) {
  const base = sharp(buffer).rotate();

  const thumb = await base
    .clone()
    .resize(160, 160, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  const media = await base
    .clone()
    .resize(600, 600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  return { thumb, media };
}

export async function uploadImagem(formData: FormData) {
  const profile = await requireRole(["admin", "gerente"]);

  const file = formData.get("file");
  const tipo = formData.get("tipo") as TipoEntidadeImagem | null;
  const entidadeId = formData.get("entidadeId") as string | null;
  const produtoId = formData.get("produtoId") as string | null;

  if (!(file instanceof File) || !tipo || !entidadeId || !produtoId || !CONFIG[tipo]) {
    throw new Error("Dados inválidos.");
  }
  if (!TIPOS_ACEITOS.includes(file.type)) {
    throw new Error("Formato não suportado. Use JPEG, PNG ou WebP.");
  }
  if (file.size > TAMANHO_MAXIMO) {
    throw new Error("Imagem muito grande (máximo 10MB).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { thumb, media } = await processarImagem(buffer);

  const { tabela, coluna } = CONFIG[tipo];
  const id = crypto.randomUUID();
  const pathThumb = `${tipo}s/${entidadeId}/${id}-thumb.webp`;
  const pathMedium = `${tipo}s/${entidadeId}/${id}-medium.webp`;

  const supabase = await createClient();
  const storage = supabase.storage.from("produto-imagens");

  const { error: uploadThumbError } = await storage.upload(pathThumb, thumb, {
    contentType: "image/webp",
  });
  if (uploadThumbError) throw new Error(uploadThumbError.message);

  const { error: uploadMediaError } = await storage.upload(pathMedium, media, {
    contentType: "image/webp",
  });
  if (uploadMediaError) {
    await storage.remove([pathThumb]);
    throw new Error(uploadMediaError.message);
  }

  const { count } = await supabase
    .from(tabela)
    .select("id", { count: "exact", head: true })
    .eq(coluna, entidadeId);

  const { error: insertError } = await supabase.from(tabela).insert({
    [coluna]: entidadeId,
    path_thumb: pathThumb,
    path_medium: pathMedium,
    principal: (count ?? 0) === 0,
    ordem: count ?? 0,
  });

  if (insertError) {
    await storage.remove([pathThumb, pathMedium]);
    throw new Error(insertError.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: tabela,
    entity_id: entidadeId,
  });

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");
}

export async function removeImagem(
  id: string,
  tipo: TipoEntidadeImagem,
  entidadeId: string,
  produtoId: string,
) {
  const profile = await requireRole(["admin", "gerente"]);
  const { tabela, coluna } = CONFIG[tipo];

  const supabase = await createClient();
  const { data: imagem, error: fetchError } = await supabase
    .from(tabela)
    .select("path_thumb, path_medium, principal")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error: deleteError } = await supabase.from(tabela).delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);

  await supabase.storage.from("produto-imagens").remove([imagem.path_thumb, imagem.path_medium]);

  if (imagem.principal) {
    const { data: proxima } = await supabase
      .from(tabela)
      .select("id")
      .eq(coluna, entidadeId)
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (proxima) {
      await supabase.from(tabela).update({ principal: true }).eq("id", proxima.id);
    }
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "delete",
    entity: tabela,
    entity_id: entidadeId,
  });

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");
}

export async function setImagemPrincipal(
  id: string,
  tipo: TipoEntidadeImagem,
  entidadeId: string,
  produtoId: string,
) {
  await requireRole(["admin", "gerente"]);
  const { tabela, coluna } = CONFIG[tipo];

  const supabase = await createClient();
  const { error: unsetError } = await supabase
    .from(tabela)
    .update({ principal: false })
    .eq(coluna, entidadeId);
  if (unsetError) throw new Error(unsetError.message);

  const { error } = await supabase.from(tabela).update({ principal: true }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");
}
