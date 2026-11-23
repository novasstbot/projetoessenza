-- Estoque module: immutable movement ledger + current-stock view.
-- Current stock is always derived from the ledger, never stored directly,
-- so there is a single source of truth once Compras/PDV also write here.

create type public.movimentacao_tipo as enum ('entrada', 'saida');

create type public.movimentacao_origem as enum (
  'manual', 'compra', 'venda', 'ajuste_inventario'
);

create table public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete restrict,
  tipo public.movimentacao_tipo not null,
  quantidade integer not null check (quantidade > 0),
  motivo text not null,
  origem public.movimentacao_origem not null default 'manual',
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index movimentacoes_estoque_produto_idx on public.movimentacoes_estoque (produto_id);
create index movimentacoes_estoque_created_at_idx on public.movimentacoes_estoque (created_at desc);

alter table public.movimentacoes_estoque enable row level security;

-- Every authenticated user reads stock levels/history; only admin, gerente
-- and estoquista register movements. Entries are never updated or deleted —
-- a correction is a new, offsetting movement, keeping the ledger immutable.
create policy "movimentacoes_estoque_select_authenticated"
  on public.movimentacoes_estoque for select
  using (auth.uid() is not null);

create policy "movimentacoes_estoque_insert_admin_gerente_estoquista"
  on public.movimentacoes_estoque for insert
  with check (public.current_user_role() in ('admin', 'gerente', 'estoquista'));

create view public.estoque_atual
with (security_invoker = true) as
select
  produto_id,
  sum(case when tipo = 'entrada' then quantidade else -quantidade end)::integer as quantidade_atual
from public.movimentacoes_estoque
group by produto_id;

grant select on public.estoque_atual to anon, authenticated, service_role;
