-- Permite distinguir perda/quebra de um ajuste manual comum no relatório de
-- movimentações de estoque (antes só existia "manual" pra qualquer saída
-- sem origem automática).
alter type public.movimentacao_origem add value if not exists 'perda';
