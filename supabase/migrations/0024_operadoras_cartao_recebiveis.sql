-- Fase 2 da evolução do Financeiro: operadoras de cartão (débito/crédito à
-- vista/crédito parcelado, com taxa, taxa de antecipação e prazo por
-- modalidade) e controle de recebíveis. Venda no cartão deixa de creditar
-- o valor cheio na hora (como fazia antes) e passa a gerar um recebível
-- pendente, com baixa manual quando o dinheiro realmente cai na conta.

create table public.operadoras_cartao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.operadoras_cartao enable row level security;

create policy "operadoras_cartao_select_authenticated"
  on public.operadoras_cartao for select
  using (auth.uid() is not null);

create policy "operadoras_cartao_manage_admin"
  on public.operadoras_cartao for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create type public.operadora_modalidade_tipo as enum ('debito', 'credito_vista', 'credito_parcelado');

create table public.operadora_modalidades (
  id uuid primary key default gen_random_uuid(),
  operadora_id uuid not null references public.operadoras_cartao (id) on delete cascade,
  modalidade public.operadora_modalidade_tipo not null,
  parcelas int not null default 1,
  taxa_percentual numeric(5, 2) not null default 0,
  taxa_antecipacao_percentual numeric(5, 2),
  prazo_dias int not null default 0,
  conta_destino_id uuid references public.contas_financeiras (id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (operadora_id, modalidade, parcelas)
);

alter table public.operadora_modalidades enable row level security;

create policy "operadora_modalidades_select_authenticated"
  on public.operadora_modalidades for select
  using (auth.uid() is not null);

create policy "operadora_modalidades_manage_admin"
  on public.operadora_modalidades for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

alter table public.formas_pagamento
  add column eh_cartao boolean not null default false;

update public.formas_pagamento set eh_cartao = true
  where nome in ('Cartão de débito', 'Cartão de crédito');

alter table public.venda_pagamentos
  add column operadora_modalidade_id uuid references public.operadora_modalidades (id),
  add column parcelas int,
  add column taxa_percentual numeric(5, 2),
  add column taxa_antecipacao_percentual numeric(5, 2),
  add column valor_liquido numeric(12, 2);

create type public.recebivel_cartao_situacao as enum ('pendente', 'recebido_parcial', 'recebido', 'divergente');

create table public.recebiveis_cartao (
  id uuid primary key default gen_random_uuid(),
  venda_pagamento_id uuid not null unique references public.venda_pagamentos (id),
  operadora_id uuid not null references public.operadoras_cartao (id),
  operadora_modalidade_id uuid not null references public.operadora_modalidades (id),
  venda_id uuid not null references public.vendas (id),
  valor_bruto numeric(12, 2) not null,
  taxa_percentual numeric(5, 2) not null,
  valor_liquido numeric(12, 2) not null,
  taxa_antecipacao_percentual numeric(5, 2),
  parcelas int not null default 1,
  data_venda timestamptz not null,
  data_prevista_recebimento date not null,
  data_recebimento timestamptz,
  valor_recebido numeric(12, 2) not null default 0,
  conta_destino_id uuid not null references public.contas_financeiras (id),
  antecipado boolean not null default false,
  situacao public.recebivel_cartao_situacao not null default 'pendente',
  observacao text,
  created_at timestamptz not null default now()
);

create index recebiveis_cartao_situacao_idx on public.recebiveis_cartao (situacao);
create index recebiveis_cartao_operadora_id_idx on public.recebiveis_cartao (operadora_id);

alter table public.recebiveis_cartao enable row level security;

create policy "recebiveis_cartao_select_authenticated"
  on public.recebiveis_cartao for select
  using (auth.uid() is not null);

-- Sem policy de insert/update direta: toda escrita passa pelas RPCs
-- (finalizar_venda cria, baixar/marcar_divergente/antecipar atualizam),
-- mesmo padrão de contas_pagar/contas_receber.

-- finalizar_venda: mesma estrutura de 0020, mas o loop de pagamentos agora
-- ramifica em 3 (caixa físico / conta financeira direta / cartão com
-- recebível pendente) em vez de 2.
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
  v_variante record;
  v_conta record;
  v_forma record;
  v_modalidade record;
  v_venda_pagamento_id uuid;
  v_valor_liquido numeric;
  v_estoque_atual integer;
  v_user_id uuid := auth.uid();
  v_cliente_nome text;
  v_descricao text;
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
    select pv.id, pv.preco_venda, pv.custo into v_variante
      from public.produto_variantes pv
      join public.produtos p on p.id = pv.produto_id
      where pv.id = (v_item ->> 'variante_id')::uuid and pv.ativo = true and p.ativo = true
      for update of pv;

    if v_variante.id is null then
      raise exception 'Produto inválido ou inativo';
    end if;

    select coalesce(sum(case when tipo = 'entrada' then quantidade else -quantidade end), 0)
      into v_estoque_atual
      from public.movimentacoes_estoque
      where variante_id = v_variante.id;

    if (v_item ->> 'quantidade')::integer > v_estoque_atual then
      raise exception 'Estoque insuficiente para um dos produtos (disponível: %)', v_estoque_atual;
    end if;

    v_subtotal := v_subtotal + (v_variante.preco_venda * (v_item ->> 'quantidade')::integer);
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

  if p_cliente_id is not null then
    select full_name into v_cliente_nome from public.customers where id = p_cliente_id;
  end if;
  v_descricao := 'Venda' || case when v_cliente_nome is not null then ' - ' || v_cliente_nome else ' avulsa' end;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    select preco_venda, custo into v_variante
      from public.produto_variantes where id = (v_item ->> 'variante_id')::uuid;

    insert into public.itens_venda (venda_id, variante_id, quantidade, preco_unitario, custo_unitario, subtotal)
    values (
      v_venda_id,
      (v_item ->> 'variante_id')::uuid,
      (v_item ->> 'quantidade')::integer,
      v_variante.preco_venda,
      v_variante.custo,
      v_variante.preco_venda * (v_item ->> 'quantidade')::integer
    );

    insert into public.movimentacoes_estoque (variante_id, tipo, quantidade, motivo, origem, user_id)
    values (
      (v_item ->> 'variante_id')::uuid,
      'saida',
      (v_item ->> 'quantidade')::integer,
      v_descricao,
      'venda',
      v_user_id
    );
  end loop;

  for v_pagamento in select * from jsonb_array_elements(p_pagamentos)
  loop
    select id, eh_cartao, conta_financeira_id into v_forma
      from public.formas_pagamento where id = (v_pagamento ->> 'forma_pagamento_id')::uuid;

    if v_forma.eh_cartao then
      if v_pagamento ->> 'operadora_modalidade_id' is null then
        raise exception 'Selecione a operadora/modalidade do cartão';
      end if;

      select id, operadora_id, taxa_percentual, taxa_antecipacao_percentual, prazo_dias, conta_destino_id, parcelas
        into v_modalidade
        from public.operadora_modalidades
        where id = (v_pagamento ->> 'operadora_modalidade_id')::uuid and ativo = true;

      if v_modalidade.id is null then
        raise exception 'Modalidade de cartão inválida ou inativa';
      end if;

      v_valor_liquido := (v_pagamento ->> 'valor')::numeric * (1 - v_modalidade.taxa_percentual / 100);

      insert into public.venda_pagamentos
        (venda_id, forma_pagamento_id, valor, operadora_modalidade_id, parcelas, taxa_percentual, taxa_antecipacao_percentual, valor_liquido)
      values (
        v_venda_id, (v_pagamento ->> 'forma_pagamento_id')::uuid, (v_pagamento ->> 'valor')::numeric,
        v_modalidade.id, v_modalidade.parcelas, v_modalidade.taxa_percentual, v_modalidade.taxa_antecipacao_percentual, v_valor_liquido
      )
      returning id into v_venda_pagamento_id;

      insert into public.recebiveis_cartao
        (venda_pagamento_id, operadora_id, operadora_modalidade_id, venda_id, valor_bruto, taxa_percentual,
         valor_liquido, taxa_antecipacao_percentual, parcelas, data_venda, data_prevista_recebimento, conta_destino_id)
      values (
        v_venda_pagamento_id, v_modalidade.operadora_id, v_modalidade.id, v_venda_id, (v_pagamento ->> 'valor')::numeric,
        v_modalidade.taxa_percentual, v_valor_liquido, v_modalidade.taxa_antecipacao_percentual, v_modalidade.parcelas,
        now(), (current_date + v_modalidade.prazo_dias), v_modalidade.conta_destino_id
      );
    else
      insert into public.venda_pagamentos (venda_id, forma_pagamento_id, valor)
      values (v_venda_id, (v_pagamento ->> 'forma_pagamento_id')::uuid, (v_pagamento ->> 'valor')::numeric);

      select cf.id as conta_id, cf.tipo into v_conta
        from public.contas_financeiras cf
        where cf.id = v_forma.conta_financeira_id;

      if v_conta.tipo = 'caixa_fisico' then
        insert into public.movimentacoes_caixa
          (caixa_id, tipo, categoria, valor, descricao, forma_pagamento_id, venda_id, user_id)
        values (
          v_caixa_id, 'entrada', 'venda', (v_pagamento ->> 'valor')::numeric,
          v_descricao, (v_pagamento ->> 'forma_pagamento_id')::uuid, v_venda_id, v_user_id
        );
      else
        insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, venda_id, user_id)
        values (
          v_conta.conta_id, 'entrada', 'venda', (v_pagamento ->> 'valor')::numeric,
          v_descricao, v_venda_id, v_user_id
        );
      end if;
    end if;
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'create', 'vendas', v_venda_id::text, jsonb_build_object('total', v_total));

  return v_venda_id;
end;
$$;

grant execute on function public.finalizar_venda(jsonb, jsonb, numeric, uuid) to authenticated;

create or replace function public.baixar_recebivel_cartao(
  p_recebivel_id uuid, p_valor_recebido numeric, p_conta_destino_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_recebivel record;
  v_conta_destino uuid;
  v_novo_recebido numeric;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para dar baixa em recebível';
  end if;
  if p_valor_recebido <= 0 then
    raise exception 'Valor inválido';
  end if;

  select * into v_recebivel from public.recebiveis_cartao where id = p_recebivel_id;
  if v_recebivel.id is null then
    raise exception 'Recebível não encontrado';
  end if;
  if v_recebivel.situacao not in ('pendente', 'recebido_parcial') then
    raise exception 'Recebível já foi quitado, antecipado ou está marcado como divergente';
  end if;

  v_conta_destino := coalesce(p_conta_destino_id, v_recebivel.conta_destino_id);
  v_novo_recebido := v_recebivel.valor_recebido + p_valor_recebido;

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, user_id)
  values (v_conta_destino, 'entrada', 'recebimento', p_valor_recebido, 'Recebimento de cartão', v_user_id);

  update public.recebiveis_cartao
  set valor_recebido = v_novo_recebido,
      situacao = case when v_novo_recebido >= valor_liquido then 'recebido' else 'recebido_parcial' end,
      data_recebimento = now()
  where id = p_recebivel_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'baixa', 'recebiveis_cartao', p_recebivel_id::text, jsonb_build_object('valor', p_valor_recebido));
end;
$$;

create or replace function public.marcar_recebivel_divergente(
  p_recebivel_id uuid, p_motivo text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para marcar divergência';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo da divergência';
  end if;
  if not exists (select 1 from public.recebiveis_cartao where id = p_recebivel_id) then
    raise exception 'Recebível não encontrado';
  end if;

  update public.recebiveis_cartao
  set situacao = 'divergente', observacao = p_motivo
  where id = p_recebivel_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'divergencia', 'recebiveis_cartao', p_recebivel_id::text, jsonb_build_object('motivo', p_motivo));
end;
$$;

create or replace function public.antecipar_recebivel(
  p_recebivel_id uuid, p_motivo text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_recebivel record;
  v_valor_antecipado numeric;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para antecipar recebível';
  end if;

  select * into v_recebivel from public.recebiveis_cartao where id = p_recebivel_id;
  if v_recebivel.id is null then
    raise exception 'Recebível não encontrado';
  end if;
  if v_recebivel.situacao <> 'pendente' then
    raise exception 'Só é possível antecipar um recebível ainda pendente';
  end if;
  if v_recebivel.taxa_antecipacao_percentual is null then
    raise exception 'Essa modalidade não tem antecipação configurada';
  end if;

  v_valor_antecipado := v_recebivel.valor_liquido * (1 - v_recebivel.taxa_antecipacao_percentual / 100);

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, user_id)
  values (v_recebivel.conta_destino_id, 'entrada', 'recebimento', v_valor_antecipado, 'Antecipação de recebível: ' || coalesce(p_motivo, ''), v_user_id);

  update public.recebiveis_cartao
  set situacao = 'recebido', antecipado = true, valor_recebido = v_valor_antecipado, data_recebimento = now()
  where id = p_recebivel_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'antecipacao', 'recebiveis_cartao', p_recebivel_id::text, jsonb_build_object('valor', v_valor_antecipado, 'motivo', p_motivo));
end;
$$;

grant execute on function public.baixar_recebivel_cartao(uuid, numeric, uuid) to authenticated;
grant execute on function public.marcar_recebivel_divergente(uuid, text) to authenticated;
grant execute on function public.antecipar_recebivel(uuid, text) to authenticated;
