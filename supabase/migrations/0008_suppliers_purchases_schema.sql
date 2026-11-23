-- Fornecedores + Compras module. Receiving a purchase is the only way
-- stock entries with origem='compra' are created and product cost is
-- refreshed — always atomic, via receber_compra().

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj_cpf text unique,
  telefone text,
  email text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger fornecedores_set_updated_at
  before update on public.fornecedores
  for each row execute function public.set_updated_at();

alter table public.fornecedores enable row level security;

create policy "fornecedores_select_authenticated"
  on public.fornecedores for select
  using (auth.uid() is not null);

create policy "fornecedores_manage_admin_gerente"
  on public.fornecedores for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create type public.compra_status as enum ('rascunho', 'recebida', 'cancelada');

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores (id),
  status public.compra_status not null default 'rascunho',
  observacao text,
  user_id uuid references public.profiles (id) on delete set null,
  recebida_por uuid references public.profiles (id) on delete set null,
  recebida_em timestamptz,
  created_at timestamptz not null default now()
);

create index compras_fornecedor_idx on public.compras (fornecedor_id);
create index compras_created_at_idx on public.compras (created_at desc);

alter table public.compras enable row level security;

create policy "compras_select_authenticated"
  on public.compras for select
  using (auth.uid() is not null);

create policy "compras_manage_admin_gerente_estoquista"
  on public.compras for all
  using (public.current_user_role() in ('admin', 'gerente', 'estoquista'))
  with check (public.current_user_role() in ('admin', 'gerente', 'estoquista'));

create table public.itens_compra (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  quantidade integer not null check (quantidade > 0),
  custo_unitario numeric(12, 2) not null check (custo_unitario >= 0),
  subtotal numeric(12, 2) generated always as (quantidade * custo_unitario) stored
);

create index itens_compra_compra_idx on public.itens_compra (compra_id);

alter table public.itens_compra enable row level security;

create policy "itens_compra_select_authenticated"
  on public.itens_compra for select
  using (auth.uid() is not null);

create policy "itens_compra_manage_admin_gerente_estoquista"
  on public.itens_compra for all
  using (public.current_user_role() in ('admin', 'gerente', 'estoquista'))
  with check (public.current_user_role() in ('admin', 'gerente', 'estoquista'));

-- Receives a purchase atomically: stock-in movements (origem='compra'),
-- refreshes product cost, flips the purchase to 'recebida'. SECURITY
-- DEFINER so it can update produtos.custo even though itens_compra
-- managers (estoquista) can't update produtos directly.
create or replace function public.receber_compra(p_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_user_id uuid := auth.uid();
  v_status public.compra_status;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente', 'estoquista') then
    raise exception 'Sem permissão para receber compras';
  end if;

  select status into v_status from public.compras where id = p_compra_id for update;
  if v_status is null then
    raise exception 'Compra não encontrada';
  end if;
  if v_status <> 'rascunho' then
    raise exception 'Compra já foi recebida ou cancelada';
  end if;

  if not exists (select 1 from public.itens_compra where compra_id = p_compra_id) then
    raise exception 'Compra sem itens';
  end if;

  for v_item in
    select produto_id, quantidade, custo_unitario from public.itens_compra where compra_id = p_compra_id
  loop
    insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, motivo, origem, user_id)
    values (v_item.produto_id, 'entrada', v_item.quantidade, 'Compra ' || p_compra_id, 'compra', v_user_id);

    update public.produtos set custo = v_item.custo_unitario where id = v_item.produto_id;
  end loop;

  update public.compras
  set status = 'recebida', recebida_em = now(), recebida_por = v_user_id
  where id = p_compra_id;

  insert into public.audit_logs (user_id, action, entity, entity_id)
  values (v_user_id, 'receber', 'compras', p_compra_id::text);
end;
$$;

grant execute on function public.receber_compra(uuid) to authenticated;
