-- PDV / Vendas module: payment methods, cash register sessions and sales.
-- Sales always go through finalizar_venda() so item, stock and cash-drawer
-- writes stay atomic — no direct insert policy exists on vendas/itens_venda/
-- venda_pagamentos, only select.

create table public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true
);

insert into public.formas_pagamento (nome) values
  ('Dinheiro'), ('Cartão de débito'), ('Cartão de crédito'), ('Pix');

alter table public.formas_pagamento enable row level security;

create policy "formas_pagamento_select_authenticated"
  on public.formas_pagamento for select
  using (auth.uid() is not null);

create policy "formas_pagamento_manage_admin_gerente"
  on public.formas_pagamento for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create type public.caixa_status as enum ('aberto', 'fechado');

create table public.caixas (
  id uuid primary key default gen_random_uuid(),
  status public.caixa_status not null default 'aberto',
  valor_abertura numeric(12, 2) not null,
  aberto_por uuid references public.profiles (id) on delete set null,
  aberto_em timestamptz not null default now(),
  valor_fechamento_informado numeric(12, 2),
  observacao_fechamento text,
  fechado_por uuid references public.profiles (id) on delete set null,
  fechado_em timestamptz
);

-- Only one open register session at a time.
create unique index caixas_only_one_open_idx on public.caixas (status) where status = 'aberto';

alter table public.caixas enable row level security;

create policy "caixas_select_authenticated"
  on public.caixas for select
  using (auth.uid() is not null);

create policy "caixas_insert_admin_gerente_vendedor"
  on public.caixas for insert
  with check (public.current_user_role() in ('admin', 'gerente', 'vendedor'));

create policy "caixas_update_admin_gerente_vendedor"
  on public.caixas for update
  using (public.current_user_role() in ('admin', 'gerente', 'vendedor'))
  with check (public.current_user_role() in ('admin', 'gerente', 'vendedor'));

create type public.movimentacao_caixa_tipo as enum ('entrada', 'saida');

create table public.movimentacoes_caixa (
  id uuid primary key default gen_random_uuid(),
  caixa_id uuid not null references public.caixas (id) on delete restrict,
  tipo public.movimentacao_caixa_tipo not null,
  valor numeric(12, 2) not null check (valor > 0),
  descricao text not null,
  forma_pagamento_id uuid references public.formas_pagamento (id),
  venda_id uuid,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index movimentacoes_caixa_caixa_idx on public.movimentacoes_caixa (caixa_id);

alter table public.movimentacoes_caixa enable row level security;

create policy "movimentacoes_caixa_select_authenticated"
  on public.movimentacoes_caixa for select
  using (auth.uid() is not null);

create policy "movimentacoes_caixa_insert_admin_gerente_vendedor"
  on public.movimentacoes_caixa for insert
  with check (public.current_user_role() in ('admin', 'gerente', 'vendedor'));

create type public.venda_status as enum ('concluida', 'cancelada');

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  caixa_id uuid not null references public.caixas (id),
  cliente_id uuid references public.customers (id),
  subtotal numeric(12, 2) not null,
  desconto numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  status public.venda_status not null default 'concluida',
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index vendas_caixa_idx on public.vendas (caixa_id);
create index vendas_created_at_idx on public.vendas (created_at desc);

alter table public.vendas enable row level security;

create policy "vendas_select_authenticated"
  on public.vendas for select
  using (auth.uid() is not null);

create table public.itens_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(12, 2) not null,
  custo_unitario numeric(12, 2) not null,
  subtotal numeric(12, 2) not null
);

create index itens_venda_venda_idx on public.itens_venda (venda_id);

alter table public.movimentacoes_caixa
  add constraint movimentacoes_caixa_venda_id_fkey
  foreign key (venda_id) references public.vendas (id);

alter table public.itens_venda enable row level security;

create policy "itens_venda_select_authenticated"
  on public.itens_venda for select
  using (auth.uid() is not null);

create table public.venda_pagamentos (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete cascade,
  forma_pagamento_id uuid not null references public.formas_pagamento (id),
  valor numeric(12, 2) not null check (valor > 0)
);

create index venda_pagamentos_venda_idx on public.venda_pagamentos (venda_id);

alter table public.venda_pagamentos enable row level security;

create policy "venda_pagamentos_select_authenticated"
  on public.venda_pagamentos for select
  using (auth.uid() is not null);

-- Finalizes a sale atomically: validates stock, creates the sale, items,
-- stock-out movements and cash-drawer entries. SECURITY DEFINER bypasses
-- the (intentionally missing) insert policies on vendas/itens_venda/
-- venda_pagamentos/movimentacoes_estoque so writes only happen this way.
create or replace function public.finalizar_venda(p_itens jsonb, p_pagamentos jsonb, p_desconto numeric default 0)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caixa_id uuid;
  v_venda_id uuid;
  v_subtotal numeric := 0;
  v_total numeric;
  v_total_pagamentos numeric;
  v_item jsonb;
  v_pagamento jsonb;
  v_produto record;
  v_estoque_atual integer;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente', 'vendedor') then
    raise exception 'Sem permissão para registrar vendas';
  end if;

  select id into v_caixa_id from public.caixas where status = 'aberto' limit 1;
  if v_caixa_id is null then
    raise exception 'Nenhum caixa aberto';
  end if;

  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'Venda sem itens';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    select id, preco_venda, custo into v_produto
      from public.produtos
      where id = (v_item ->> 'produto_id')::uuid and ativo = true;

    if v_produto.id is null then
      raise exception 'Produto inválido ou inativo';
    end if;

    select coalesce(sum(case when tipo = 'entrada' then quantidade else -quantidade end), 0)
      into v_estoque_atual
      from public.movimentacoes_estoque
      where produto_id = v_produto.id;

    if (v_item ->> 'quantidade')::integer > v_estoque_atual then
      raise exception 'Estoque insuficiente para um dos produtos (disponível: %)', v_estoque_atual;
    end if;

    v_subtotal := v_subtotal + (v_produto.preco_venda * (v_item ->> 'quantidade')::integer);
  end loop;

  v_total := v_subtotal - coalesce(p_desconto, 0);
  if v_total < 0 then
    raise exception 'Desconto maior que o subtotal da venda';
  end if;

  select coalesce(sum((p ->> 'valor')::numeric), 0) into v_total_pagamentos
    from jsonb_array_elements(p_pagamentos) p;

  if round(v_total_pagamentos, 2) <> round(v_total, 2) then
    raise exception 'A soma dos pagamentos não corresponde ao total da venda';
  end if;

  insert into public.vendas (caixa_id, subtotal, desconto, total, user_id)
  values (v_caixa_id, v_subtotal, coalesce(p_desconto, 0), v_total, v_user_id)
  returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    select preco_venda, custo into v_produto from public.produtos where id = (v_item ->> 'produto_id')::uuid;

    insert into public.itens_venda (venda_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal)
    values (
      v_venda_id,
      (v_item ->> 'produto_id')::uuid,
      (v_item ->> 'quantidade')::integer,
      v_produto.preco_venda,
      v_produto.custo,
      v_produto.preco_venda * (v_item ->> 'quantidade')::integer
    );

    insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, motivo, origem, user_id)
    values (
      (v_item ->> 'produto_id')::uuid,
      'saida',
      (v_item ->> 'quantidade')::integer,
      'Venda ' || v_venda_id,
      'venda',
      v_user_id
    );
  end loop;

  for v_pagamento in select * from jsonb_array_elements(p_pagamentos)
  loop
    insert into public.venda_pagamentos (venda_id, forma_pagamento_id, valor)
    values (v_venda_id, (v_pagamento ->> 'forma_pagamento_id')::uuid, (v_pagamento ->> 'valor')::numeric);

    insert into public.movimentacoes_caixa (caixa_id, tipo, valor, descricao, forma_pagamento_id, venda_id, user_id)
    values (
      v_caixa_id,
      'entrada',
      (v_pagamento ->> 'valor')::numeric,
      'Venda ' || v_venda_id,
      (v_pagamento ->> 'forma_pagamento_id')::uuid,
      v_venda_id,
      v_user_id
    );
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'create', 'vendas', v_venda_id::text, jsonb_build_object('total', v_total));

  return v_venda_id;
end;
$$;

grant execute on function public.finalizar_venda(jsonb, jsonb, numeric) to authenticated;
