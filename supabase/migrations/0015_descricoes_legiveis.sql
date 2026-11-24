-- Troca "Compra <uuid>" / "Venda <uuid>" por descrições legíveis
-- (nome do fornecedor/cliente) nos registros de estoque, caixa, financeiro
-- e contas a pagar.

create or replace function public.receber_compra(p_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_user_id uuid := auth.uid();
  v_compra record;
  v_fornecedor_nome text;
  v_descricao text;
  v_total numeric := 0;
  v_valor_parcela numeric;
  v_resto numeric;
  v_i integer;
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

  select nome into v_fornecedor_nome from public.fornecedores where id = v_compra.fornecedor_id;
  v_descricao := 'Compra de ' || coalesce(v_fornecedor_nome, 'fornecedor');

  for v_item in
    select produto_id, quantidade, custo_unitario, subtotal
      from public.itens_compra where compra_id = p_compra_id
  loop
    insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, motivo, origem, user_id)
    values (v_item.produto_id, 'entrada', v_item.quantidade, v_descricao, 'compra', v_user_id);

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

    v_valor_parcela := round(v_total / v_compra.parcelas, 2);
    v_resto := round(v_total - (v_valor_parcela * v_compra.parcelas), 2);

    for v_i in 1..v_compra.parcelas loop
      insert into public.contas_pagar (descricao, categoria, valor, vencimento, compra_id, fornecedor_id, user_id)
      values (
        v_descricao ||
          case when v_compra.parcelas > 1 then ' - Parcela ' || v_i || '/' || v_compra.parcelas else '' end,
        'fornecedor',
        v_valor_parcela + case when v_i = v_compra.parcelas then v_resto else 0 end,
        (v_compra.vencimento_pagamento + ((v_i - 1) * interval '30 days'))::date,
        p_compra_id,
        v_compra.fornecedor_id,
        v_user_id
      );
    end loop;
  end if;

  insert into public.audit_logs (user_id, action, entity, entity_id)
  values (v_user_id, 'receber', 'compras', p_compra_id::text);
end;
$$;

grant execute on function public.receber_compra(uuid) to authenticated;

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

  if p_cliente_id is not null then
    select full_name into v_cliente_nome from public.customers where id = p_cliente_id;
  end if;
  v_descricao := 'Venda' || case when v_cliente_nome is not null then ' - ' || v_cliente_nome else ' avulsa' end;

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
      v_descricao,
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
        v_descricao, (v_pagamento ->> 'forma_pagamento_id')::uuid, v_venda_id, v_user_id
      );
    else
      insert into public.movimentacoes_financeiras
        (conta_id, tipo, categoria, valor, descricao, venda_id, user_id)
      values (
        v_conta.conta_id, 'entrada', 'venda', (v_pagamento ->> 'valor')::numeric,
        v_descricao, v_venda_id, v_user_id
      );
    end if;
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'create', 'vendas', v_venda_id::text, jsonb_build_object('total', v_total));

  return v_venda_id;
end;
$$;

grant execute on function public.finalizar_venda(jsonb, jsonb, numeric, uuid) to authenticated;

-- Corrige registros já existentes que ainda têm "Compra <uuid>" / "Venda
-- <uuid>" cru (gravados antes desta migration).

update public.contas_pagar cp
set descricao = 'Compra de ' || coalesce(f.nome, 'fornecedor') ||
  case when cp.descricao ~ 'Parcela \d+/\d+$'
    then ' - ' || substring(cp.descricao from 'Parcela \d+/\d+$')
    else '' end
from public.compras c
left join public.fornecedores f on f.id = c.fornecedor_id
where cp.compra_id = c.id
  and cp.descricao ~ '^Compra [0-9a-f]{8}-';

update public.movimentacoes_estoque me
set motivo = 'Compra de ' || coalesce(f.nome, 'fornecedor')
from public.compras c
left join public.fornecedores f on f.id = c.fornecedor_id
where me.origem = 'compra'
  and me.motivo = 'Compra ' || c.id::text;

update public.movimentacoes_estoque me
set motivo = 'Venda' || case when cu.full_name is not null then ' - ' || cu.full_name else ' avulsa' end
from public.vendas v
left join public.customers cu on cu.id = v.cliente_id
where me.origem = 'venda'
  and me.motivo = 'Venda ' || v.id::text;

update public.movimentacoes_caixa mc
set descricao = 'Venda' || case when cu.full_name is not null then ' - ' || cu.full_name else ' avulsa' end
from public.vendas v
left join public.customers cu on cu.id = v.cliente_id
where mc.venda_id = v.id
  and mc.descricao = 'Venda ' || v.id::text;

update public.movimentacoes_financeiras mf
set descricao = 'Venda' || case when cu.full_name is not null then ' - ' || cu.full_name else ' avulsa' end
from public.vendas v
left join public.customers cu on cu.id = v.cliente_id
where mf.venda_id = v.id
  and mf.descricao = 'Venda ' || v.id::text;
