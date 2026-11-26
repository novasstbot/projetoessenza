type ThumbRef = { path_thumb: string; principal: boolean };

export function urlImagem(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/produto-imagens/${path}`;
}

// Imagem própria da variação tem prioridade; na ausência, cai pra imagem do
// produto principal; sem nenhuma das duas, não há imagem a exibir.
export function resolverThumb(
  variante: { variante_imagens: ThumbRef[] } | null | undefined,
  produto: { produto_imagens: ThumbRef[] } | null | undefined,
): string | null {
  const daVariante = variante?.variante_imagens.find((i) => i.principal) ?? variante?.variante_imagens[0];
  if (daVariante) return urlImagem(daVariante.path_thumb);

  const doProduto = produto?.produto_imagens.find((i) => i.principal) ?? produto?.produto_imagens[0];
  if (doProduto) return urlImagem(doProduto.path_thumb);

  return null;
}
