-- Supabase's dashboard grants these automatically for new tables; running
-- migrations through the raw SQL editor does not, which breaks PostgREST
-- access even though RLS policies are correct. This restores the standard
-- Supabase defaults and makes them apply to future tables too.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
