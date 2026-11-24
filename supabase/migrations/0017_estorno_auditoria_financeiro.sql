-- Auditoria financeira: nenhum lançamento é apagado ou editado — toda
-- correção (venda cancelada, sangria/suprimento/despesa/ajuste errado,
-- baixa de conta a pagar/receber errada) gera um lançamento de estorno
-- novo, ligado ao original via estorno_de_id, mantendo o histórico
-- original intacto. Só admin/gerente pode estornar.

-- Falta saber de qual conta a pagar/receber veio uma baixa, pra achar o
-- lançamento certo na hora de estornar.
alter table public.movimentacoes_financeiras
  add column conta_pagar_id uuid references public.contas_pagar (id),
  add column conta_receber_id uuid references public.contas_receber (id);

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

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, conta_pagar_id, user_id)
  values (p_conta_financeira_id, 'saida', 'pagamento', v_conta.valor, v_conta.descricao, p_conta_pagar_id, v_user_id);

  update public.contas_pagar
  set status = 'pago', pago_em = now(), conta_financeira_id = p_conta_financeira_id
  where id = p_conta_pagar_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'pagar', 'contas_pagar', p_conta_pagar_id::text, jsonb_build_object('valor', v_conta.valor));
end;
$$;

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

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, conta_receber_id, user_id)
  values (p_conta_financeira_id, 'entrada', 'recebimento', v_conta.valor, v_conta.descricao, p_conta_receber_id, v_user_id);

  update public.contas_receber
  set status = 'recebido', recebido_em = now(), conta_financeira_id = p_conta_financeira_id
  where id = p_conta_receber_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'receber', 'contas_receber', p_conta_receber_id::text, jsonb_build_object('valor', v_conta.valor));
end;
$$;

-- Cancela uma venda: devolve estoque, reverte o dinheiro (caixa e/ou contas
-- financeiras, dependendo de como cada pagamento entrou) e marca a venda
-- como cancelada — nunca apaga a venda nem os lançamentos originais.
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
      v_mov.caixa_id, 'saida', 'devolucao', v_mov.valor,
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

grant execute on function public.cancelar_venda(uuid, text) to authenticated;

-- Estorna uma movimentação de caixa manual (sangria, suprimento, despesa,
-- ajuste) e a movimentação financeira ligada a ela, se houver. Vendas têm
-- função própria (cancelar_venda) porque também precisam devolver estoque.
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

  insert into public.movimentacoes_caixa
    (caixa_id, tipo, categoria, valor, descricao, forma_pagamento_id, despesa_id, estorno_de_id, autorizado_por, user_id)
  values (
    v_mov.caixa_id,
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

grant execute on function public.estornar_movimentacao_caixa(uuid, text) to authenticated;

-- Estorna uma baixa de conta a pagar/receber: lança a reversão financeira e
-- volta a conta para pendente, pra poder ser baixada de novo corretamente.
create or replace function public.estornar_baixa_conta_pagar(p_conta_pagar_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta record;
  v_fin record;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para estornar baixas';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do estorno';
  end if;

  select * into v_conta from public.contas_pagar where id = p_conta_pagar_id and status = 'pago';
  if v_conta.id is null then
    raise exception 'Conta não encontrada ou não está paga';
  end if;

  select * into v_fin
    from public.movimentacoes_financeiras
    where conta_pagar_id = p_conta_pagar_id and estorno_de_id is null
    order by created_at desc limit 1;
  if v_fin.id is null then
    raise exception 'Lançamento original da baixa não encontrado';
  end if;
  if exists (select 1 from public.movimentacoes_financeiras where estorno_de_id = v_fin.id) then
    raise exception 'Esta baixa já foi estornada';
  end if;

  insert into public.movimentacoes_financeiras
    (conta_id, tipo, categoria, valor, descricao, conta_pagar_id, estorno_de_id, autorizado_por, user_id)
  values (
    v_fin.conta_id, 'entrada', 'pagamento', v_fin.valor,
    'Estorno: ' || v_fin.descricao || ' — ' || p_motivo,
    p_conta_pagar_id, v_fin.id, v_user_id, v_user_id
  );

  update public.contas_pagar
  set status = 'pendente', pago_em = null, conta_financeira_id = null
  where id = p_conta_pagar_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'estorno', 'contas_pagar', p_conta_pagar_id::text, jsonb_build_object('motivo', p_motivo, 'valor', v_fin.valor));
end;
$$;

grant execute on function public.estornar_baixa_conta_pagar(uuid, text) to authenticated;

create or replace function public.estornar_baixa_conta_receber(p_conta_receber_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta record;
  v_fin record;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para estornar baixas';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do estorno';
  end if;

  select * into v_conta from public.contas_receber where id = p_conta_receber_id and status = 'recebido';
  if v_conta.id is null then
    raise exception 'Conta não encontrada ou não está recebida';
  end if;

  select * into v_fin
    from public.movimentacoes_financeiras
    where conta_receber_id = p_conta_receber_id and estorno_de_id is null
    order by created_at desc limit 1;
  if v_fin.id is null then
    raise exception 'Lançamento original da baixa não encontrado';
  end if;
  if exists (select 1 from public.movimentacoes_financeiras where estorno_de_id = v_fin.id) then
    raise exception 'Esta baixa já foi estornada';
  end if;

  insert into public.movimentacoes_financeiras
    (conta_id, tipo, categoria, valor, descricao, conta_receber_id, estorno_de_id, autorizado_por, user_id)
  values (
    v_fin.conta_id, 'saida', 'recebimento', v_fin.valor,
    'Estorno: ' || v_fin.descricao || ' — ' || p_motivo,
    p_conta_receber_id, v_fin.id, v_user_id, v_user_id
  );

  update public.contas_receber
  set status = 'pendente', recebido_em = null, conta_financeira_id = null
  where id = p_conta_receber_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'estorno', 'contas_receber', p_conta_receber_id::text, jsonb_build_object('motivo', p_motivo, 'valor', v_fin.valor));
end;
$$;

grant execute on function public.estornar_baixa_conta_receber(uuid, text) to authenticated;

-- Toda escrita em contas_pagar/contas_receber passa a ir só por insert
-- direto (criação) ou pelas funções security definer acima (baixar/
-- estornar) — fecha a policy "for all" que permitia update/delete direto.
drop policy "contas_pagar_manage_admin_gerente" on public.contas_pagar;
create policy "contas_pagar_insert_admin_gerente"
  on public.contas_pagar for insert
  with check (public.current_user_role() in ('admin', 'gerente'));

drop policy "contas_receber_manage_admin_gerente" on public.contas_receber;
create policy "contas_receber_insert_admin_gerente"
  on public.contas_receber for insert
  with check (public.current_user_role() in ('admin', 'gerente'));
