-- Fase C: imagens de produto e de variação. Bucket público (leitura livre
-- pela URL pública do Storage), escrita restrita a admin/gerente.

insert into storage.buckets (id, name, public)
values ('produto-imagens', 'produto-imagens', true)
on conflict (id) do nothing;

create policy "produto_imagens_bucket_select_public"
  on storage.objects for select
  using (bucket_id = 'produto-imagens');

create policy "produto_imagens_bucket_manage_admin_gerente"
  on storage.objects for all
  using (bucket_id = 'produto-imagens' and public.current_user_role() in ('admin', 'gerente'))
  with check (bucket_id = 'produto-imagens' and public.current_user_role() in ('admin', 'gerente'));

create table public.produto_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  path_thumb text not null,
  path_medium text not null,
  principal boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index produto_imagens_produto_id_idx on public.produto_imagens (produto_id);

create unique index produto_imagens_principal_idx
  on public.produto_imagens (produto_id)
  where principal;

alter table public.produto_imagens enable row level security;

create policy "produto_imagens_select_authenticated"
  on public.produto_imagens for select
  using (auth.uid() is not null);

create policy "produto_imagens_manage_admin_gerente"
  on public.produto_imagens for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create table public.variante_imagens (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.produto_variantes (id) on delete cascade,
  path_thumb text not null,
  path_medium text not null,
  principal boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index variante_imagens_variante_id_idx on public.variante_imagens (variante_id);

create unique index variante_imagens_principal_idx
  on public.variante_imagens (variante_id)
  where principal;

alter table public.variante_imagens enable row level security;

create policy "variante_imagens_select_authenticated"
  on public.variante_imagens for select
  using (auth.uid() is not null);

create policy "variante_imagens_manage_admin_gerente"
  on public.variante_imagens for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));
