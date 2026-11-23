-- Clientes module: extends the existing `customers` table (seeded in the
-- marketing skeleton) instead of creating a new one, per the stage-1 plan.

alter table public.customers add column ativo boolean not null default true;
alter table public.customers add column data_nascimento date;

-- Vendedores register walk-in customers at the point of sale, not just
-- admin/gerente.
drop policy "customers_manage_admin_gerente" on public.customers;
create policy "customers_manage_admin_gerente_vendedor"
  on public.customers for all
  using (public.current_user_role() in ('admin', 'gerente', 'vendedor'))
  with check (public.current_user_role() in ('admin', 'gerente', 'vendedor'));

drop policy "communication_preferences_manage_admin_gerente" on public.communication_preferences;
create policy "communication_preferences_manage_admin_gerente_vendedor"
  on public.communication_preferences for all
  using (public.current_user_role() in ('admin', 'gerente', 'vendedor'))
  with check (public.current_user_role() in ('admin', 'gerente', 'vendedor'));
