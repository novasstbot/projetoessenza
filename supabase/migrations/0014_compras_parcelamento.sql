-- Parcelamento de compras a prazo: até 10 parcelas, mensais a partir do
-- vencimento informado na criação da compra.

alter table public.compras
  add column parcelas integer not null default 1 check (parcelas between 1 and 10);

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

    v_valor_parcela := round(v_total / v_compra.parcelas, 2);
    v_resto := round(v_total - (v_valor_parcela * v_compra.parcelas), 2);

    for v_i in 1..v_compra.parcelas loop
      insert into public.contas_pagar (descricao, categoria, valor, vencimento, compra_id, fornecedor_id, user_id)
      values (
        'Compra ' || p_compra_id ||
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
