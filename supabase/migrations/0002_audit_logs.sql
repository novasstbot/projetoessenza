-- Audit trail for sensitive operations, used by every future module.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- Writes happen only through server-side code (service role / server
-- actions), never directly from the client.
create policy "audit_logs_select_admin_gerente"
  on public.audit_logs for select
  using (public.current_user_role() in ('admin', 'gerente'));
