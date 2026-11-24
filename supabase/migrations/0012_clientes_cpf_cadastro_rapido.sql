-- Permite cadastrar cliente só com telefone (ex.: cadastro rápido no PDV) e
-- adiciona CPF/CNPJ para busca e identificação.

alter table public.customers alter column email drop not null;
alter table public.customers drop constraint customers_email_key;
create unique index customers_email_unique_idx on public.customers (email) where email is not null;

alter table public.customers add column cpf_cnpj text;
create unique index customers_cpf_cnpj_unique_idx on public.customers (cpf_cnpj) where cpf_cnpj is not null;

alter table public.customers
  add constraint customers_email_or_phone_check check (email is not null or phone is not null);
