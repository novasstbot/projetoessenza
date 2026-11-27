-- Boleto estava aparecendo como um slot dentro de cada operadora de cartão
-- (ex: "Stone"), o que confunde porque Boleto não passa por operadora de
-- cartão nenhuma. Cria uma operadora "Boleto" dedicada (tipo = 'boleto',
-- única) pra guardar a taxa/prazo do Boleto separada das operadoras de
-- cartão de verdade (tipo = 'cartao', que é o default).
alter table public.operadoras_cartao add column tipo text not null default 'cartao';
alter table public.operadoras_cartao add constraint operadoras_cartao_tipo_check check (tipo in ('cartao', 'boleto'));
create unique index operadoras_cartao_boleto_singleton_idx on public.operadoras_cartao (tipo) where tipo = 'boleto';

insert into public.operadoras_cartao (nome, tipo)
select 'Boleto', 'boleto'
where not exists (select 1 from public.operadoras_cartao where tipo = 'boleto');

-- Se o usuário já tinha configurado a modalidade "boleto" dentro de outra
-- operadora (ex: Stone) durante o teste, reaponta pra operadora dedicada.
update public.operadora_modalidades om
set operadora_id = bo.id
from (select id from public.operadoras_cartao where tipo = 'boleto') bo
where om.modalidade = 'boleto' and om.operadora_id <> bo.id;

update public.recebiveis_cartao rc
set operadora_id = bo.id
from (select id from public.operadoras_cartao where tipo = 'boleto') bo
where rc.operadora_modalidade_id in (
  select id from public.operadora_modalidades where modalidade = 'boleto'
) and rc.operadora_id <> bo.id;

-- Renomear e excluir operadoras de cartão e formas de pagamento (excluir
-- é bloqueado pela FK normal quando já tem modalidade/recebível/venda
-- vinculado — mesmo padrão de categorias/marcas/linhas em Produtos).
