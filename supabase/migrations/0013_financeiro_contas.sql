-- Financeiro: contas a pagar e a receber, integradas com Compras (compra a
-- prazo gera conta a pagar automaticamente ao ser recebida) e com o ledger
-- de contas financeiras já existente (baixa gera movimentação).

alter type public.movimentacao_categoria add value if not exists 'pagamento';
alter type public.movimentacao_categoria add value if not exists 'recebimento';

alter table public.compras
  add column forma_pagamento text not null default 'a_vista'
    check (forma_pagamento in ('a_vista', 'a_prazo')),
  add column vencimento_pagamento date;

create type public.contas_pagar_status as enum ('pendente', 'pago', 'cancelado');

create table public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text not null default 'outros',
  valor numeric(12, 2) not null check (valor > 0),
  vencimento date not null,
  status public.contas_pagar_status not null default 'pendente',
  compra_id uuid references public.compras (id),
  fornecedor_id uuid references public.fornecedores (id),
  conta_financeira_id uuid references public.contas_financeiras (id),
  pago_em timestamptz,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index contas_pagar_vencimento_idx on public.contas_pagar (vencimento);
create index contas_pagar_status_idx on public.contas_pagar (status);

alter table public.contas_pagar enable row level security;

create policy "contas_pagar_select_authenticated"
  on public.contas_pagar for select
  using (auth.uid() is not null);

create policy "contas_pagar_manage_admin_gerente"
  on public.contas_pagar for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create type public.contas_receber_status as enum ('pendente', 'recebido', 'cancelado');

create table public.contas_receber (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  vencimento date not null,
  status public.contas_receber_status not null default 'pendente',
  cliente_id uuid references public.customers (id),
  venda_id uuid references public.vendas (id),
  conta_financeira_id uuid references public.contas_financeiras (id),
  recebido_em timestamptz,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index contas_receber_vencimento_idx on public.contas_receber (vencimento);
create index contas_receber_status_idx on public.contas_receber (status);

alter table public.contas_receber enable row level security;

create policy "contas_receber_select_authenticated"
  on public.contas_receber for select
  using (auth.uid() is not null);

create policy "contas_receber_manage_admin_gerente"
  on public.contas_receber for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

-- Receber compra: agora também cria a conta a pagar quando a compra é a
-- prazo (com vencimento informado na criação da compra).
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
  v_compra record;
  v_total numeric := 0;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente', 'estoquista') then
    raise exception 'Sem permissão para receber compras';
  end if;

  select * into v_compra from public.compras where id = p_compra_id for update;
  if v_compra.id is null then
    raise exception 'Compra não encontrada';
  end if;
  if v_compra.status <> 'rascunho' then
    raise exception 'Compra já foi recebida ou cancelada';
  end if;

  if not exists (select 1 from public.itens_compra where compra_id = p_compra_id) then
    raise exception 'Compra sem itens';
  end if;

  for v_item in
    select produto_id, quantidade, custo_unitario, subtotal
      from public.itens_compra where compra_id = p_compra_id
  loop
    insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, motivo, origem, user_id)
    values (v_item.produto_id, 'entrada', v_item.quantidade, 'Compra ' || p_compra_id, 'compra', v_user_id);

    update public.produtos set custo = v_item.custo_unitario where id = v_item.produto_id;

    v_total := v_total + v_item.subtotal;
  end loop;

  update public.compras
  set status = 'recebida', recebida_em = now(), recebida_por = v_user_id
  where id = p_compra_id;

  if v_compra.forma_pagamento = 'a_prazo' then
    if v_compra.vencimento_pagamento is null then
      raise exception 'Compra a prazo precisa de vencimento para gerar a conta a pagar';
    end if;

    insert into public.contas_pagar (descricao, categoria, valor, vencimento, compra_id, fornecedor_id, user_id)
    values ('Compra ' || p_compra_id, 'fornecedor', v_total, v_compra.vencimento_pagamento, p_compra_id, v_compra.fornecedor_id, v_user_id);
  end if;

  insert into public.audit_logs (user_id, action, entity, entity_id)
  values (v_user_id, 'receber', 'compras', p_compra_id::text);
end;
$$;

grant execute on function public.receber_compra(uuid) to authenticated;

create or replace function public.baixar_conta_pagar(p_conta_pagar_id uuid, p_conta_financeira_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta record;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para baixar contas a pagar';
  end if;

  select * into v_conta from public.contas_pagar where id = p_conta_pagar_id and status = 'pendente';
  if v_conta.id is null then
    raise exception 'Conta não encontrada ou já baixada';
  end if;

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, user_id)
  values (p_conta_financeira_id, 'saida', 'pagamento', v_conta.valor, v_conta.descricao, v_user_id);

  update public.contas_pagar
  set status = 'pago', pago_em = now(), conta_financeira_id = p_conta_financeira_id
  where id = p_conta_pagar_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'pagar', 'contas_pagar', p_conta_pagar_id::text, jsonb_build_object('valor', v_conta.valor));
end;
$$;

grant execute on function public.baixar_conta_pagar(uuid, uuid) to authenticated;

create or replace function public.baixar_conta_receber(p_conta_receber_id uuid, p_conta_financeira_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta record;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para baixar contas a receber';
  end if;

  select * into v_conta from public.contas_receber where id = p_conta_receber_id and status = 'pendente';
  if v_conta.id is null then
    raise exception 'Conta não encontrada ou já baixada';
  end if;

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, user_id)
  values (p_conta_financeira_id, 'entrada', 'recebimento', v_conta.valor, v_conta.descricao, v_user_id);

  update public.contas_receber
  set status = 'recebido', recebido_em = now(), conta_financeira_id = p_conta_financeira_id
  where id = p_conta_receber_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'receber', 'contas_receber', p_conta_receber_id::text, jsonb_build_object('valor', v_conta.valor));
end;
$$;

grant execute on function public.baixar_conta_receber(uuid, uuid) to authenticated;
