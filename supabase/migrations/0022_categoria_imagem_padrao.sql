-- Fase D: imagem padrão por categoria — fallback de exibição pra
-- produto/variação sem imagem própria. Reaproveita o bucket e o pipeline
-- de processamento já criados na Fase C; categoria tem no máximo 1
-- imagem, então os paths vão direto em colunas, sem tabela/índice novo.

alter table public.categorias
  add column imagem_thumb text,
  add column imagem_medium text;
