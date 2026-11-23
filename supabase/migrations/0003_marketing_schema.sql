-- Marketing & relationship module skeleton (email via Resend).
-- `customers` is the seed the future Clientes module extends — not duplicated.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.communication_preferences (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  email_opt_in boolean not null default false,
  opt_in_source text,
  opt_in_at timestamptz,
  opt_out_at timestamptz
);

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  subject text not null,
  html text not null,
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.email_campaign_status as enum (
  'draft', 'scheduled', 'sending', 'sent', 'canceled'
);

create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid not null references public.email_templates (id),
  segment jsonb not null default '{}'::jsonb,
  status public.email_campaign_status not null default 'draft',
  scheduled_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create type public.email_log_status as enum (
  'queued', 'sent', 'delivered', 'bounced', 'complained', 'failed'
);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  customer_id uuid not null references public.customers (id) on delete cascade,
  template_key text not null,
  resend_message_id text,
  status public.email_log_status not null default 'queued',
  idempotency_key text not null unique,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_logs_customer_idx on public.email_logs (customer_id);
create index email_logs_campaign_idx on public.email_logs (campaign_id);

create type public.email_event_type as enum (
  'delivered', 'bounced', 'complained', 'opened', 'clicked'
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  email_log_id uuid not null references public.email_logs (id) on delete cascade,
  event_type public.email_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index email_events_log_idx on public.email_events (email_log_id);

alter table public.customers enable row level security;
alter table public.communication_preferences enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_events enable row level security;

create policy "customers_manage_admin_gerente"
  on public.customers for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create policy "communication_preferences_manage_admin_gerente"
  on public.communication_preferences for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create policy "email_templates_manage_admin_gerente"
  on public.email_templates for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

create policy "email_campaigns_manage_admin_gerente"
  on public.email_campaigns for all
  using (public.current_user_role() in ('admin', 'gerente'))
  with check (public.current_user_role() in ('admin', 'gerente'));

-- email_logs / email_events are written by server-side code with the
-- service role (bypasses RLS); authenticated users only read them.
create policy "email_logs_select_admin_gerente"
  on public.email_logs for select
  using (public.current_user_role() in ('admin', 'gerente'));

create policy "email_events_select_admin_gerente"
  on public.email_events for select
  using (public.current_user_role() in ('admin', 'gerente'));
