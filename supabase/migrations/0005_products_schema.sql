-- Products module: categories, brands and products (EAN + internal code).

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_interno text not null unique,
  codigo_ean text unique,
  categoria_id uuid references public.categorias (id) on delete set null,
  marca_id uuid references public.marcas (id) on delete set null,
  custo numeric(12, 2) not null default 0,
  preco_venda numeric(12, 2) not null default 0,
  estoque_minimo integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index produtos_categoria_idx on public.produtos (categoria_id);
create index produtos_marca_idx on public.produtos (marca_id);
create index produtos_nome_idx on public.produtos (nome);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger produtos_set_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();

alter table public.categorias enable row level security;
alter table public.marcas enable row level security;
alter table public.produtos enable row level security;

-- Reference/catalog data: every authenticated user reads it (PDV, Estoque,
-- Compras all depend on it); only admin/gerente manage it.
create policy "categorias_select_authenticated"
  on public.categorias for select
  using (auth.uid() is not null);

create policy "categorias_manage_admin_gerente"
  on public.categorias for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create policy "marcas_select_authenticated"
  on public.marcas for select
  using (auth.uid() is not null);

create policy "marcas_manage_admin_gerente"
  on public.marcas for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create policy "produtos_select_authenticated"
  on public.produtos for select
  using (auth.uid() is not null);

create policy "produtos_manage_admin_gerente"
  on public.produtos for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));
