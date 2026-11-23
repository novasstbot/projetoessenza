-- Profiles, roles and session trigger.

create type public.user_role as enum ('admin', 'gerente', 'vendedor', 'estoquista');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'vendedor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Bypasses RLS (owned by the table owner) so policies elsewhere can check
-- the caller's role without recursing into profiles' own policies.
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.current_user_role() = 'admin');

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.current_user_role() = 'admin')
  with check (auth.uid() = id or public.current_user_role() = 'admin');

-- Non-admins can update their own row, but never their own role.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and public.current_user_role() <> 'admin' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- Creates a profile automatically whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
