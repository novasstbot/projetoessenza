-- Corrige cancelar_venda/estornar_movimentacao_caixa: a devolução em
-- dinheiro de uma venda (ou o estorno de uma sangria/suprimento/despesa/
-- ajuste) de um caixa JÁ FECHADO não deve reescrever a conferência daquele
-- caixa antigo (valor_fechamento_informado é fixo, mas o "esperado" é
-- calculado a partir das movimentações — lançar a devolução no caixa
-- antigo criava uma sobra artificial nele). O dinheiro sai de fato da
-- gaveta de hoje, então a devolução deve ser lançada no caixa aberto
-- atual, não no caixa original da venda/movimentação.

create or replace function public.cancelar_venda(p_venda_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_venda record;
  v_item record;
  v_mov record;
  v_caixa_aberto_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para cancelar vendas';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do cancelamento';
  end if;

  select * into v_venda from public.vendas where id = p_venda_id and status = 'concluida';
  if v_venda.id is null then
    raise exception 'Venda não encontrada ou já cancelada';
  end if;

  if exists (
    select 1 from public.movimentacoes_caixa
    where venda_id = p_venda_id and tipo = 'entrada' and categoria = 'venda'
  ) then
    select id into v_caixa_aberto_id from public.caixas where status = 'aberto' limit 1;
    if v_caixa_aberto_id is null then
      raise exception 'Nenhum caixa aberto para registrar a devolução em dinheiro';
    end if;
  end if;

  for v_item in select produto_id, quantidade from public.itens_venda where venda_id = p_venda_id
  loop
    insert into public.movimentacoes_estoque (produto_id, tipo, quantidade, motivo, origem, user_id)
    values (
      v_item.produto_id, 'entrada', v_item.quantidade,
      'Cancelamento venda ' || p_venda_id || ': ' || p_motivo, 'venda', v_user_id
    );
  end loop;

  for v_mov in
    select * from public.movimentacoes_caixa
    where venda_id = p_venda_id and tipo = 'entrada' and categoria = 'venda'
  loop
    insert into public.movimentacoes_caixa
      (caixa_id, tipo, categoria, valor, descricao, forma_pagamento_id, venda_id, estorno_de_id, autorizado_por, user_id)
    values (
      v_caixa_aberto_id, 'saida', 'devolucao', v_mov.valor,
      'Cancelamento venda ' || p_venda_id || ': ' || p_motivo,
      v_mov.forma_pagamento_id, p_venda_id, v_mov.id, v_user_id, v_user_id
    );
  end loop;

  for v_mov in
    select * from public.movimentacoes_financeiras
    where venda_id = p_venda_id and tipo = 'entrada' and categoria = 'venda'
  loop
    insert into public.movimentacoes_financeiras
      (conta_id, tipo, categoria, valor, descricao, venda_id, estorno_de_id, autorizado_por, user_id)
    values (
      v_mov.conta_id, 'saida', 'devolucao', v_mov.valor,
      'Cancelamento venda ' || p_venda_id || ': ' || p_motivo,
      p_venda_id, v_mov.id, v_user_id, v_user_id
    );
  end loop;

  update public.vendas set status = 'cancelada' where id = p_venda_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'cancel', 'vendas', p_venda_id::text, jsonb_build_object('motivo', p_motivo, 'total', v_venda.total));
end;
$$;

create or replace function public.estornar_movimentacao_caixa(p_movimentacao_id uuid, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mov record;
  v_fin record;
  v_novo_mov_id uuid;
  v_caixa_aberto_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para estornar movimentações';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do estorno';
  end if;

  select * into v_mov from public.movimentacoes_caixa where id = p_movimentacao_id;
  if v_mov.id is null then
    raise exception 'Movimentação não encontrada';
  end if;
  if v_mov.categoria = 'venda' then
    raise exception 'Vendas são canceladas por cancelar_venda, não estornadas aqui';
  end if;
  if v_mov.estorno_de_id is not null then
    raise exception 'Não é possível estornar um estorno';
  end if;
  if exists (select 1 from public.movimentacoes_caixa where estorno_de_id = p_movimentacao_id) then
    raise exception 'Esta movimentação já foi estornada';
  end if;

  select id into v_caixa_aberto_id from public.caixas where status = 'aberto' limit 1;
  if v_caixa_aberto_id is null then
    raise exception 'Nenhum caixa aberto para registrar o estorno';
  end if;

  insert into public.movimentacoes_caixa
    (caixa_id, tipo, categoria, valor, descricao, forma_pagamento_id, despesa_id, estorno_de_id, autorizado_por, user_id)
  values (
    v_caixa_aberto_id,
    case when v_mov.tipo = 'entrada' then 'saida' else 'entrada' end,
    v_mov.categoria, v_mov.valor,
    'Estorno: ' || v_mov.descricao || ' — ' || p_motivo,
    v_mov.forma_pagamento_id, v_mov.despesa_id, v_mov.id, v_user_id, v_user_id
  )
  returning id into v_novo_mov_id;

  for v_fin in
    select * from public.movimentacoes_financeiras where movimentacao_caixa_id = p_movimentacao_id
  loop
    insert into public.movimentacoes_financeiras
      (conta_id, tipo, categoria, valor, descricao, movimentacao_caixa_id, estorno_de_id, autorizado_por, user_id)
    values (
      v_fin.conta_id,
      case when v_fin.tipo = 'entrada' then 'saida' else 'entrada' end,
      v_fin.categoria, v_fin.valor,
      'Estorno: ' || v_fin.descricao || ' — ' || p_motivo,
      v_novo_mov_id, v_fin.id, v_user_id, v_user_id
    );
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'estorno', 'movimentacoes_caixa', p_movimentacao_id::text, jsonb_build_object('motivo', p_motivo, 'valor', v_mov.valor));

  return v_novo_mov_id;
end;
$$;
