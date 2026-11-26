"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import {
  produtoRapidoSchema,
  produtoSchema,
  type ProdutoRapidoFormValues,
  type ProdutoFormValues,
} from "@/modules/produtos/schemas";

function tipoDoCodigo(codigo: string) {
  if (codigo.length === 13) return "ean_13";
  if (codigo.length === 8) return "ean_8";
  if (codigo.length === 12) return "upc_a";
  return "outro";
}

function normalizeProduto(values: ProdutoRapidoFormValues) {
  return {
    nome: values.nome,
    descricao: values.descricao || null,
    fabricante: values.fabricante || null,
    categoria_id: values.categoria_id || null,
    marca_id: values.marca_id || null,
    linha_id: values.linha_id || null,
  };
}

function normalizeVariante(values: ProdutoRapidoFormValues, produto_id: string) {
  return {
    produto_id,
    nome: values.nome,
    codigo_interno: values.codigo_interno,
    custo: values.custo,
    preco_venda: values.preco_venda,
    estoque_minimo: values.estoque_minimo,
    validade: values.validade || null,
  };
}

// Cadastro rápido: cria o produto principal e sua variação padrão em
// sequência. Não é uma RPC porque não mexe em estoque/dinheiro — se a
// segunda escrita falhar, desfaz a primeira pra não deixar produto órfão
// sem variação.
export async function createProduto(values: ProdutoRapidoFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = produtoRapidoSchema.parse(values);

  const supabase = await createClient();
  const { data: produto, error: produtoError } = await supabase
    .from("produtos")
    .insert(normalizeProduto(parsed))
    .select("id")
    .single();

  if (produtoError) {
    throw new Error(produtoError.message);
  }

  const { data: variante, error: varianteError } = await supabase
    .from("produto_variantes")
    .insert(normalizeVariante(parsed, produto.id))
    .select("id")
    .single();

  if (varianteError) {
    await supabase.from("produtos").delete().eq("id", produto.id);
    throw new Error(
      varianteError.code === "23505"
        ? "Já existe uma variação com esse código interno."
        : varianteError.message,
    );
  }

  if (parsed.codigo_ean) {
    const { error: codigoError } = await supabase.from("produto_codigos_barra").insert({
      variante_id: variante.id,
      codigo: parsed.codigo_ean,
      tipo: tipoDoCodigo(parsed.codigo_ean),
      principal: true,
    });
    if (codigoError) {
      await supabase.from("produtos").delete().eq("id", produto.id);
      throw new Error(
        codigoError.code === "23505" ? "Esse código de barras já está em uso." : codigoError.message,
      );
    }
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "create",
    entity: "produtos",
    entity_id: produto.id,
  });

  revalidatePath("/produtos");

  return produto.id as string;
}

// Fase B: edita só os dados gerais do produto principal — variações têm
// suas próprias ações (src/server/actions/produtos/variantes.ts).
export async function updateProdutoPrincipal(id: string, values: ProdutoFormValues) {
  const profile = await requireRole(["admin", "gerente"]);
  const parsed = produtoSchema.parse(values);

  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update({
      nome: parsed.nome,
      descricao: parsed.descricao || null,
      fabricante: parsed.fabricante || null,
      categoria_id: parsed.categoria_id || null,
      marca_id: parsed.marca_id || null,
      linha_id: parsed.linha_id || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: "update",
    entity: "produtos",
    entity_id: id,
  });

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${id}`);
}

export async function toggleProdutoAtivo(id: string, ativo: boolean) {
  const profile = await requireRole(["admin", "gerente"]);

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").update({ ativo }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    user_id: profile.id,
    action: ativo ? "activate" : "deactivate",
    entity: "produtos",
    entity_id: id,
  });

  revalidatePath("/produtos");
}
