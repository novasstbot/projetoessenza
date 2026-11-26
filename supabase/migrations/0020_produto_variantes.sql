-- Produto principal + variações: o estoque, vendas e compras passam a
-- pertencer à VARIAÇÃO (ex.: "Essenza 100ml"), nunca só ao produto principal
-- ("Perfume Essenza"). Cada produto existente vira um produto principal com
-- exatamente 1 variação padrão, preservando saldo, custo, preço, código de
-- barras e histórico — sem segunda entrada de estoque.

-- 1. Linhas/coleções — mesmo padrão de categorias/marcas.
create table public.produto_linhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table public.produto_linhas enable row level security;

create policy "produto_linhas_select_authenticated"
  on public.produto_linhas for select
  using (auth.uid() is not null);

create policy "produto_linhas_manage_admin_gerente"
  on public.produto_linhas for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

-- 2. Produto principal ganha campos novos (os de venda/estoque saem daqui
-- mais abaixo, depois de migrados para a variação).
alter table public.produtos
  add column descricao text,
  add column fabricante text,
  add column linha_id uuid references public.produto_linhas (id);

-- 3. Variações.
create table public.produto_variantes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete restrict,
  nome text not null,
  codigo_interno text not null unique,
  custo numeric(12, 2) not null default 0,
  preco_venda numeric(12, 2) not null default 0,
  estoque_minimo integer not null default 0,
  validade date,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index produto_variantes_produto_idx on public.produto_variantes (produto_id);

alter table public.produto_variantes enable row level security;

create policy "produto_variantes_select_authenticated"
  on public.produto_variantes for select
  using (auth.uid() is not null);

create policy "produto_variantes_manage_admin_gerente"
  on public.produto_variantes for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

-- 4. Múltiplos códigos de barras por variação.
create table public.produto_codigos_barra (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.produto_variantes (id) on delete cascade,
  codigo text not null unique,
  tipo text not null default 'outro',
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

create index produto_codigos_barra_variante_idx on public.produto_codigos_barra (variante_id);
-- Só um código principal por variação.
create unique index produto_codigos_barra_principal_idx
  on public.produto_codigos_barra (variante_id)
  where principal;

alter table public.produto_codigos_barra enable row level security;

create policy "produto_codigos_barra_select_authenticated"
  on public.produto_codigos_barra for select
  using (auth.uid() is not null);

create policy "produto_codigos_barra_manage_admin_gerente"
  on public.produto_codigos_barra for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

-- 5. Atributos da variação (volume, cor, fragrância...) — chave-valor livre,
-- sem catálogo normalizado, já que cada combinação comercial vira uma
-- variação própria (não geramos combinações automáticas).
create table public.produto_variante_atributos (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.produto_variantes (id) on delete cascade,
  atributo text not null,
  valor text not null,
  unique (variante_id, atributo)
);

alter table public.produto_variante_atributos enable row level security;

create policy "produto_variante_atributos_select_authenticated"
  on public.produto_variante_atributos for select
  using (auth.uid() is not null);

create policy "produto_variante_atributos_manage_admin_gerente"
  on public.produto_variante_atributos for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

-- 6. As tabelas transacionais passam a apontar para a variação. Coluna
-- nova e opcional por enquanto — vira obrigatória e a antiga é removida só
-- depois do backfill, mais abaixo.
alter table public.movimentacoes_estoque add column variante_id uuid references public.produto_variantes (id);
alter table public.itens_venda add column variante_id uuid references public.produto_variantes (id);
alter table public.itens_compra add column variante_id uuid references public.produto_variantes (id);

-- 7. Migração de dados: 1 variação padrão por produto existente, com os
-- mesmos dados de venda/estoque que o produto já tinha.
insert into public.produto_variantes
  (produto_id, nome, codigo_interno, custo, preco_venda, estoque_minimo, validade, ativo, created_at)
select p.id, p.nome, p.codigo_interno, p.custo, p.preco_venda, p.estoque_minimo, p.validade, p.ativo, p.created_at
from public.produtos p;

insert into public.produto_codigos_barra (variante_id, codigo, tipo, principal)
select
  pv.id,
  p.codigo_ean,
  case
    when length(p.codigo_ean) = 13 then 'ean_13'
    when length(p.codigo_ean) = 8 then 'ean_8'
    when length(p.codigo_ean) = 12 then 'upc_a'
    else 'outro'
  end,
  true
from public.produtos p
join public.produto_variantes pv on pv.produto_id = p.id
where p.codigo_ean is not null;

update public.movimentacoes_estoque me
set variante_id = pv.id
from public.produto_variantes pv
where pv.produto_id = me.produto_id;

update public.itens_venda iv
set variante_id = pv.id
from public.produto_variantes pv
where pv.produto_id = iv.produto_id;

update public.itens_compra ic
set variante_id = pv.id
from public.produto_variantes pv
where pv.produto_id = ic.produto_id;

-- 8. estoque_atual depende de movimentacoes_estoque.produto_id — precisa
-- ser recriada antes de remover a coluna.
drop view public.estoque_atual;

alter table public.movimentacoes_estoque alter column variante_id set not null;
alter table public.itens_venda alter column variante_id set not null;
alter table public.itens_compra alter column variante_id set not null;

alter table public.movimentacoes_estoque drop column produto_id;
alter table public.itens_venda drop column produto_id;
alter table public.itens_compra drop column produto_id;

alter table public.produtos
  drop column codigo_interno,
  drop column codigo_ean,
  drop column custo,
  drop column preco_venda,
  drop column estoque_minimo,
  drop column validade;

create view public.estoque_atual
with (security_invoker = true) as
select
  variante_id,
  sum(case when tipo = 'entrada' then quantidade else -quantidade end)::integer as quantidade_atual
from public.movimentacoes_estoque
group by variante_id;

grant select on public.estoque_atual to anon, authenticated, service_role;

-- Estoque consolidado do produto principal (soma das variações) — pedido
-- explicitamente para os relatórios, sem duplicar o cálculo por variação.
create view public.estoque_atual_por_produto
with (security_invoker = true) as
select pv.produto_id, sum(ea.quantidade_atual) as quantidade_atual
from public.estoque_atual ea
join public.produto_variantes pv on pv.id = ea.variante_id
group by pv.produto_id;

grant select on public.estoque_atual_por_produto to anon, authenticated, service_role;

-- 9. RPCs: finalizar_venda, cancelar_venda e receber_compra reescritas para
-- operar por variante_id. estornar_movimentacao_caixa não referencia
-- produto/variante — não precisa de alteração.

-- Vendas: também passa a travar a linha da variação (for update) durante a
-- checagem de estoque, pra duas vendas simultâneas da mesma variação não
-- lerem o mesmo saldo "disponível" antes de qualquer uma commitar.
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

  for v_item in select variante_id, quantidade from public.itens_venda where venda_id = p_venda_id
  loop
    insert into public.movimentacoes_estoque (variante_id, tipo, quantidade, motivo, origem, user_id)
    values (
      v_item.variante_id, 'entrada', v_item.quantidade,
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
    select variante_id, quantidade, custo_unitario, subtotal
      from public.itens_compra where compra_id = p_compra_id
  loop
    insert into public.movimentacoes_estoque (variante_id, tipo, quantidade, motivo, origem, user_id)
    values (v_item.variante_id, 'entrada', v_item.quantidade, v_descricao, 'compra', v_user_id);

    update public.produto_variantes set custo = v_item.custo_unitario where id = v_item.variante_id;

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
