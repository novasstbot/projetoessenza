-- Generaliza a lógica de operadora (taxa/antecipação/prazo) pra cobrir
-- Boleto além de cartão, e constrói Permissões por perfil (menu), Usuários
-- e Configurações gerais (dados da empresa) em Configurações.

-- `eh_cartao` passa a significar "usa operadora/modalidade com recebível",
-- não mais "é cartão" especificamente — renomear em vez de criar coluna
-- nova preserva o dado e os índices/constraints existentes.
alter table public.formas_pagamento rename column eh_cartao to usa_operadora;

alter type public.operadora_modalidade_tipo add value if not exists 'boleto';

alter table public.profiles add column ativo boolean not null default true;

-- Permissões por perfil no menu: guarda só as NEGAÇÕES (por padrão todo
-- mundo vê um item; só entra aqui o que um papel específico não deve ver).
-- Mais seguro contra esquecer de liberar uma página nova no futuro.
create table public.permissoes_menu_negadas (
  role public.user_role not null,
  menu_id text not null,
  primary key (role, menu_id)
);

alter table public.permissoes_menu_negadas enable row level security;

create policy "permissoes_menu_negadas_select_authenticated"
  on public.permissoes_menu_negadas for select
  using (auth.uid() is not null);

create policy "permissoes_menu_negadas_manage_admin"
  on public.permissoes_menu_negadas for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Seed: exatamente o comportamento de hoje — vendedor só vê PDV (e agora
-- também Configurações, por causa da aba Perfil, que é de todo mundo).
insert into public.permissoes_menu_negadas (role, menu_id)
select 'vendedor', menu_id from unnest(array[
  'dashboard', 'produtos', 'estoque', 'compras', 'clientes',
  'fornecedores', 'financeiro', 'caixa', 'relatorios', 'marketing'
]) as menu_id;

create table public.configuracoes_empresa (
  id uuid primary key default gen_random_uuid(),
  nome text,
  cnpj text,
  endereco text,
  telefone text,
  email text,
  logo_thumb text,
  logo_medio text,
  updated_at timestamptz not null default now()
);

alter table public.configuracoes_empresa enable row level security;

create policy "configuracoes_empresa_select_authenticated"
  on public.configuracoes_empresa for select
  using (auth.uid() is not null);

create policy "configuracoes_empresa_manage_admin"
  on public.configuracoes_empresa for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- auth.users não é legível via RLS normal — função de leitura pontual,
-- só admin, só pra listar usuários com e-mail na tela de Usuários.
create or replace function public.listar_usuarios()
returns table (id uuid, full_name text, role public.user_role, ativo boolean, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Sem permissão para listar usuários';
  end if;

  return query
    select p.id, p.full_name, p.role, p.ativo, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.full_name;
end;
$$;

grant execute on function public.listar_usuarios() to authenticated;

-- finalizar_venda: mesma lógica da Fase 2, só troca eh_cartao por
-- usa_operadora (a coluna foi renomeada acima).
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
    select id, usa_operadora, conta_financeira_id into v_forma
      from public.formas_pagamento where id = (v_pagamento ->> 'forma_pagamento_id')::uuid;

    if v_forma.id is null then
      raise exception 'Forma de pagamento inválida';
    end if;

    if v_forma.usa_operadora then
      if v_pagamento ->> 'operadora_modalidade_id' is null then
        raise exception 'Selecione a operadora/modalidade dessa forma de pagamento';
      end if;

      select id, operadora_id, taxa_percentual, taxa_antecipacao_percentual, prazo_dias, conta_destino_id, parcelas
        into v_modalidade
        from public.operadora_modalidades
        where id = (v_pagamento ->> 'operadora_modalidade_id')::uuid and ativo = true;

      if v_modalidade.id is null then
        raise exception 'Modalidade inválida ou inativa';
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
      if v_forma.conta_financeira_id is null then
        raise exception 'Forma de pagamento "%" ainda não tem conta de destino configurada (Configurações)', (
          select nome from public.formas_pagamento where id = v_forma.id
        );
      end if;

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
