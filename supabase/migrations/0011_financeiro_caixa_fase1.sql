-- Caixa e Financeiro, fase 1: contas financeiras, ledger financeiro geral
-- (separado do ledger de sessão de caixa), sangria, suprimento, despesa em
-- dinheiro, fechamento preciso com contagem de cédulas.

-- Dados de teste existentes (confirmado pelo usuário que podem ser
-- removidos) — limpa antes de alterar o schema, em ordem de dependência.
delete from public.movimentacoes_caixa;
delete from public.venda_pagamentos;
delete from public.itens_venda;
delete from public.vendas;
delete from public.caixas;

create type public.conta_financeira_tipo as enum (
  'caixa_fisico', 'cofre', 'banco', 'pix', 'recebiveis_cartao', 'transito'
);

create table public.contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  tipo public.conta_financeira_tipo not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.contas_financeiras (nome, tipo) values
  ('Caixa Físico', 'caixa_fisico'),
  ('Cofre', 'cofre'),
  ('Pix', 'pix'),
  ('Recebíveis Cartão', 'recebiveis_cartao'),
  ('Dinheiro em Trânsito', 'transito');

alter table public.contas_financeiras enable row level security;

create policy "contas_financeiras_select_authenticated"
  on public.contas_financeiras for select
  using (auth.uid() is not null);

create policy "contas_financeiras_manage_admin_gerente"
  on public.contas_financeiras for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

alter table public.formas_pagamento
  add column conta_financeira_id uuid references public.contas_financeiras (id);

update public.formas_pagamento set conta_financeira_id =
  (select id from public.contas_financeiras where nome = 'Caixa Físico')
  where nome = 'Dinheiro';
update public.formas_pagamento set conta_financeira_id =
  (select id from public.contas_financeiras where nome = 'Pix')
  where nome = 'Pix';
update public.formas_pagamento set conta_financeira_id =
  (select id from public.contas_financeiras where nome = 'Recebíveis Cartão')
  where nome in ('Cartão de débito', 'Cartão de crédito');

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text not null default 'outros',
  valor numeric(12, 2) not null check (valor > 0),
  forma text not null default 'dinheiro',
  caixa_id uuid references public.caixas (id),
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.despesas enable row level security;

create policy "despesas_select_authenticated"
  on public.despesas for select
  using (auth.uid() is not null);

create type public.movimentacao_categoria as enum (
  'venda', 'suprimento', 'sangria', 'despesa', 'devolucao', 'ajuste', 'transferencia'
);

create table public.movimentacoes_financeiras (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas_financeiras (id),
  tipo public.movimentacao_caixa_tipo not null,
  categoria public.movimentacao_categoria not null,
  valor numeric(12, 2) not null check (valor > 0),
  descricao text not null,
  venda_id uuid references public.vendas (id),
  despesa_id uuid references public.despesas (id),
  movimentacao_caixa_id uuid references public.movimentacoes_caixa (id),
  autorizado_por uuid references public.profiles (id),
  estorno_de_id uuid references public.movimentacoes_financeiras (id),
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index movimentacoes_financeiras_conta_idx on public.movimentacoes_financeiras (conta_id);

alter table public.movimentacoes_financeiras enable row level security;

create policy "movimentacoes_financeiras_select_authenticated"
  on public.movimentacoes_financeiras for select
  using (auth.uid() is not null);

alter table public.movimentacoes_caixa
  add column categoria public.movimentacao_categoria not null default 'venda',
  add column despesa_id uuid references public.despesas (id),
  add column autorizado_por uuid references public.profiles (id),
  add column estorno_de_id uuid references public.movimentacoes_caixa (id);

alter table public.caixas add column contagem_cedulas jsonb;

create type public.sangria_destino_tipo as enum (
  'cofre', 'deposito_bancario', 'transito', 'retirada_proprietario', 'outro'
);

-- Venda: roteia cada pagamento para o ledger certo — dinheiro vai para o
-- caixa da sessão, Pix/cartão vão para a conta financeira correspondente
-- (nunca entram na gaveta física).
create or replace function public.finalizar_venda(
  p_itens jsonb,
  p_pagamentos jsonb,
  p_desconto numeric default 0,
  p_cliente_id uuid default null
)
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
  v_conta record;
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

  insert into public.vendas (caixa_id, cliente_id, subtotal, desconto, total, user_id)
  values (v_caixa_id, p_cliente_id, v_subtotal, coalesce(p_desconto, 0), v_total, v_user_id)
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

    select cf.id as conta_id, cf.tipo into v_conta
      from public.formas_pagamento fp
      join public.contas_financeiras cf on cf.id = fp.conta_financeira_id
      where fp.id = (v_pagamento ->> 'forma_pagamento_id')::uuid;

    if v_conta.tipo = 'caixa_fisico' then
      insert into public.movimentacoes_caixa
        (caixa_id, tipo, categoria, valor, descricao, forma_pagamento_id, venda_id, user_id)
      values (
        v_caixa_id, 'entrada', 'venda', (v_pagamento ->> 'valor')::numeric,
        'Venda ' || v_venda_id, (v_pagamento ->> 'forma_pagamento_id')::uuid, v_venda_id, v_user_id
      );
    else
      insert into public.movimentacoes_financeiras
        (conta_id, tipo, categoria, valor, descricao, venda_id, user_id)
      values (
        v_conta.conta_id, 'entrada', 'venda', (v_pagamento ->> 'valor')::numeric,
        'Venda ' || v_venda_id, v_venda_id, v_user_id
      );
    end if;
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'create', 'vendas', v_venda_id::text, jsonb_build_object('total', v_total));

  return v_venda_id;
end;
$$;

grant execute on function public.finalizar_venda(jsonb, jsonb, numeric, uuid) to authenticated;

-- Sangria: retira dinheiro do caixa; se o destino for uma conta real
-- (cofre/depósito bancário/trânsito), cria a entrada correspondente lá.
create or replace function public.registrar_sangria(
  p_caixa_id uuid,
  p_valor numeric,
  p_destino_tipo public.sangria_destino_tipo,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_saldo numeric;
  v_mov_caixa_id uuid;
  v_conta_destino_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente', 'vendedor') then
    raise exception 'Sem permissão para registrar sangria';
  end if;
  if p_valor <= 0 then
    raise exception 'Valor inválido';
  end if;

  select valor_abertura
    + coalesce(sum(case when tipo = 'entrada' then valor else -valor end), 0)
    into v_saldo
    from public.caixas c
    left join public.movimentacoes_caixa m on m.caixa_id = c.id
    where c.id = p_caixa_id and c.status = 'aberto'
    group by c.valor_abertura;

  if v_saldo is null then
    raise exception 'Caixa não encontrado ou não está aberto';
  end if;
  if p_valor > v_saldo then
    raise exception 'Saldo insuficiente em caixa (disponível: %)', v_saldo;
  end if;

  insert into public.movimentacoes_caixa (caixa_id, tipo, categoria, valor, descricao, user_id)
  values (p_caixa_id, 'saida', 'sangria', p_valor, p_motivo, v_user_id)
  returning id into v_mov_caixa_id;

  if p_destino_tipo in ('cofre', 'deposito_bancario', 'transito') then
    v_conta_destino_id := (
      select id from public.contas_financeiras
      where tipo = case when p_destino_tipo = 'cofre' then 'cofre'::conta_financeira_tipo
                         else 'transito'::conta_financeira_tipo end
      limit 1
    );
    insert into public.movimentacoes_financeiras
      (conta_id, tipo, categoria, valor, descricao, movimentacao_caixa_id, user_id)
    values (v_conta_destino_id, 'entrada', 'sangria', p_valor, p_motivo, v_mov_caixa_id, v_user_id);
  end if;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'sangria', 'movimentacoes_caixa', v_mov_caixa_id::text,
    jsonb_build_object('destino', p_destino_tipo, 'valor', p_valor));

  return v_mov_caixa_id;
end;
$$;

grant execute on function public.registrar_sangria(uuid, numeric, public.sangria_destino_tipo, text) to authenticated;

-- Suprimento: dinheiro sai de uma conta real e entra no caixa da sessão.
create or replace function public.registrar_suprimento(
  p_caixa_id uuid,
  p_valor numeric,
  p_origem_conta_id uuid,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mov_caixa_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente', 'vendedor') then
    raise exception 'Sem permissão para registrar suprimento';
  end if;
  if p_valor <= 0 then
    raise exception 'Valor inválido';
  end if;
  if not exists (select 1 from public.caixas where id = p_caixa_id and status = 'aberto') then
    raise exception 'Caixa não encontrado ou não está aberto';
  end if;

  insert into public.movimentacoes_caixa (caixa_id, tipo, categoria, valor, descricao, user_id)
  values (p_caixa_id, 'entrada', 'suprimento', p_valor, p_motivo, v_user_id)
  returning id into v_mov_caixa_id;

  insert into public.movimentacoes_financeiras
    (conta_id, tipo, categoria, valor, descricao, movimentacao_caixa_id, user_id)
  values (p_origem_conta_id, 'saida', 'suprimento', p_valor, p_motivo, v_mov_caixa_id, v_user_id);

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'suprimento', 'movimentacoes_caixa', v_mov_caixa_id::text,
    jsonb_build_object('origem_conta_id', p_origem_conta_id, 'valor', p_valor));

  return v_mov_caixa_id;
end;
$$;

grant execute on function public.registrar_suprimento(uuid, numeric, uuid, text) to authenticated;

-- Despesa paga em dinheiro: cria a despesa e a saída do caixa juntas.
create or replace function public.registrar_despesa_caixa(
  p_caixa_id uuid,
  p_descricao text,
  p_categoria text,
  p_valor numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_despesa_id uuid;
  v_mov_caixa_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente', 'vendedor') then
    raise exception 'Sem permissão para registrar despesa';
  end if;
  if p_valor <= 0 then
    raise exception 'Valor inválido';
  end if;
  if not exists (select 1 from public.caixas where id = p_caixa_id and status = 'aberto') then
    raise exception 'Caixa não encontrado ou não está aberto';
  end if;

  insert into public.despesas (descricao, categoria, valor, forma, caixa_id, user_id)
  values (p_descricao, p_categoria, p_valor, 'dinheiro', p_caixa_id, v_user_id)
  returning id into v_despesa_id;

  insert into public.movimentacoes_caixa
    (caixa_id, tipo, categoria, valor, descricao, despesa_id, user_id)
  values (p_caixa_id, 'saida', 'despesa', p_valor, p_descricao, v_despesa_id, v_user_id)
  returning id into v_mov_caixa_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'create', 'despesas', v_despesa_id::text, jsonb_build_object('valor', p_valor));

  return v_despesa_id;
end;
$$;

grant execute on function public.registrar_despesa_caixa(uuid, text, text, numeric) to authenticated;

-- Ajuste autorizado: só admin/gerente, autorizado_por = quem está logado
-- (só eles têm a permissão, então a autorização já está implícita no papel).
create or replace function public.registrar_ajuste_caixa(
  p_caixa_id uuid,
  p_tipo public.movimentacao_caixa_tipo,
  p_valor numeric,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mov_caixa_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para registrar ajuste';
  end if;
  if p_valor <= 0 then
    raise exception 'Valor inválido';
  end if;
  if not exists (select 1 from public.caixas where id = p_caixa_id and status = 'aberto') then
    raise exception 'Caixa não encontrado ou não está aberto';
  end if;

  insert into public.movimentacoes_caixa
    (caixa_id, tipo, categoria, valor, descricao, autorizado_por, user_id)
  values (p_caixa_id, p_tipo, 'ajuste', p_valor, p_motivo, v_user_id, v_user_id)
  returning id into v_mov_caixa_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'ajuste', 'movimentacoes_caixa', v_mov_caixa_id::text,
    jsonb_build_object('tipo', p_tipo, 'valor', p_valor));

  return v_mov_caixa_id;
end;
$$;

grant execute on function public.registrar_ajuste_caixa(uuid, public.movimentacao_caixa_tipo, numeric, text) to authenticated;

-- Fechamento: calcula o esperado no servidor e exige justificativa quando a
-- diferença não é zero.
create or replace function public.fechar_caixa(
  p_caixa_id uuid,
  p_valor_informado numeric,
  p_contagem jsonb,
  p_observacao text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_abertura numeric;
  v_entradas numeric;
  v_saidas numeric;
  v_esperado numeric;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente', 'vendedor') then
    raise exception 'Sem permissão para fechar caixa';
  end if;

  select valor_abertura into v_abertura
    from public.caixas where id = p_caixa_id and status = 'aberto';
  if v_abertura is null then
    raise exception 'Caixa não encontrado ou não está aberto';
  end if;

  select
    coalesce(sum(case when tipo = 'entrada' then valor else 0 end), 0),
    coalesce(sum(case when tipo = 'saida' then valor else 0 end), 0)
    into v_entradas, v_saidas
    from public.movimentacoes_caixa
    where caixa_id = p_caixa_id;

  v_esperado := v_abertura + v_entradas - v_saidas;

  if abs(p_valor_informado - v_esperado) > 0.01 and coalesce(trim(p_observacao), '') = '' then
    raise exception 'Diferença de % entre esperado e informado — justificativa obrigatória',
      round(p_valor_informado - v_esperado, 2);
  end if;

  update public.caixas
  set status = 'fechado',
    fechado_em = now(),
    fechado_por = v_user_id,
    valor_fechamento_informado = p_valor_informado,
    contagem_cedulas = p_contagem,
    observacao_fechamento = nullif(trim(p_observacao), '')
  where id = p_caixa_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'fechar', 'caixas', p_caixa_id::text,
    jsonb_build_object('esperado', v_esperado, 'informado', p_valor_informado));
end;
$$;

grant execute on function public.fechar_caixa(uuid, numeric, jsonb, text) to authenticated;
