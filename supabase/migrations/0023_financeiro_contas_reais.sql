-- Fase 1 da evolução do Financeiro: contas financeiras reais (múltiplas
-- contas bancárias, saldo inicial), transferência entre contas, aporte e
-- retirada do proprietário. Pix e Recebíveis Cartão deixam de ser
-- pseudo-contas genéricas (ficam inativas, preservando histórico/FK) — o
-- usuário cadastra contas bancárias reais e reaponta as formas de
-- pagamento manualmente depois de aplicar esta migration.

alter table public.contas_financeiras
  add column banco_nome text,
  add column agencia text,
  add column numero_conta text,
  add column saldo_inicial numeric(12, 2) not null default 0,
  add column data_saldo_inicial date;

alter table public.movimentacoes_financeiras
  add column transferencia_grupo_id uuid;

alter type public.movimentacao_categoria add value if not exists 'aporte';
alter type public.movimentacao_categoria add value if not exists 'retirada_socio';

-- Cadastro de contas financeiras e configuração de formas de pagamento
-- passam a ser só do admin (antes admin+gerente); gerente continua
-- operando transferências/baixas/recebíveis no dia a dia.
drop policy if exists "contas_financeiras_manage_admin_gerente" on public.contas_financeiras;
create policy "contas_financeiras_manage_admin"
  on public.contas_financeiras for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "formas_pagamento_manage_admin_gerente" on public.formas_pagamento;
create policy "formas_pagamento_manage_admin"
  on public.formas_pagamento for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Nunca apaga histórico: Pix e Recebíveis Cartão viram contas inativas.
update public.contas_financeiras set ativo = false where nome in ('Pix', 'Recebíveis Cartão');

create or replace function public.registrar_transferencia(
  p_conta_origem_id uuid, p_conta_destino_id uuid, p_valor numeric, p_motivo text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_grupo_id uuid := gen_random_uuid();
  v_origem_ativa boolean;
  v_destino_ativa boolean;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para registrar transferência';
  end if;
  if p_conta_origem_id = p_conta_destino_id then
    raise exception 'Conta de origem e destino não podem ser a mesma';
  end if;
  if p_valor <= 0 then
    raise exception 'Valor inválido';
  end if;

  select ativo into v_origem_ativa from public.contas_financeiras where id = p_conta_origem_id;
  select ativo into v_destino_ativa from public.contas_financeiras where id = p_conta_destino_id;
  if v_origem_ativa is null or v_destino_ativa is null then
    raise exception 'Conta financeira não encontrada';
  end if;
  if not v_origem_ativa or not v_destino_ativa then
    raise exception 'Conta financeira inativa';
  end if;

  insert into public.movimentacoes_financeiras
    (conta_id, tipo, categoria, valor, descricao, transferencia_grupo_id, user_id)
  values (p_conta_origem_id, 'saida', 'transferencia', p_valor, p_motivo, v_grupo_id, v_user_id);

  insert into public.movimentacoes_financeiras
    (conta_id, tipo, categoria, valor, descricao, transferencia_grupo_id, user_id)
  values (p_conta_destino_id, 'entrada', 'transferencia', p_valor, p_motivo, v_grupo_id, v_user_id);

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (
    v_user_id, 'transferencia', 'movimentacoes_financeiras', v_grupo_id::text,
    jsonb_build_object('origem', p_conta_origem_id, 'destino', p_conta_destino_id, 'valor', p_valor)
  );

  return v_grupo_id;
end;
$$;

create or replace function public.registrar_aporte(
  p_conta_destino_id uuid, p_valor numeric, p_motivo text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_mov_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para registrar aporte';
  end if;
  if p_valor <= 0 then raise exception 'Valor inválido'; end if;
  if not exists (select 1 from public.contas_financeiras where id = p_conta_destino_id and ativo) then
    raise exception 'Conta financeira não encontrada ou inativa';
  end if;

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, user_id)
  values (p_conta_destino_id, 'entrada', 'aporte', p_valor, p_motivo, v_user_id)
  returning id into v_mov_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'aporte', 'movimentacoes_financeiras', v_mov_id::text, jsonb_build_object('conta', p_conta_destino_id, 'valor', p_valor));

  return v_mov_id;
end;
$$;

create or replace function public.registrar_retirada(
  p_conta_origem_id uuid, p_valor numeric, p_motivo text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_mov_id uuid;
begin
  if v_user_id is null or public.current_user_role() not in ('admin', 'gerente') then
    raise exception 'Sem permissão para registrar retirada';
  end if;
  if p_valor <= 0 then raise exception 'Valor inválido'; end if;
  if not exists (select 1 from public.contas_financeiras where id = p_conta_origem_id and ativo) then
    raise exception 'Conta financeira não encontrada ou inativa';
  end if;

  insert into public.movimentacoes_financeiras (conta_id, tipo, categoria, valor, descricao, user_id)
  values (p_conta_origem_id, 'saida', 'retirada_socio', p_valor, p_motivo, v_user_id)
  returning id into v_mov_id;

  insert into public.audit_logs (user_id, action, entity, entity_id, metadata)
  values (v_user_id, 'retirada', 'movimentacoes_financeiras', v_mov_id::text, jsonb_build_object('conta', p_conta_origem_id, 'valor', p_valor));

  return v_mov_id;
end;
$$;

grant execute on function public.registrar_transferencia(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.registrar_aporte(uuid, numeric, text) to authenticated;
grant execute on function public.registrar_retirada(uuid, numeric, text) to authenticated;
