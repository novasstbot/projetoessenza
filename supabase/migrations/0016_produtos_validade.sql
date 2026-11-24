-- Validade do produto, usada no Estoque para alertar sobre produtos
-- próximos de vencer. O parâmetro de "quantos dias é 'próximo'" fica
-- hardcoded por enquanto (30 dias) — vira configurável em Configurações
-- numa etapa futura.

alter table public.produtos add column validade date;
