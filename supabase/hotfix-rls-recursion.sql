-- HOTFIX: Fix infinite recursion in RLS policies on public.profiles.
-- Run this in Supabase SQL Editor for existing databases.

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.company_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.profile_company_id(target_profile_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id from public.profiles p where p.id = target_profile_id;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_role() = 'manager';
$$;

create or replace function public.is_driver()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_role() = 'driver';
$$;

drop policy if exists "admin read companies" on public.companies;
create policy "admin read companies"
on public.companies
for select
using (public.is_admin());

drop policy if exists "manager read own company" on public.companies;
create policy "manager read own company"
on public.companies
for select
using (public.is_manager() and id = public.current_company_id());

drop policy if exists "driver read own company" on public.companies;
create policy "driver read own company"
on public.companies
for select
using (public.is_driver() and id = public.current_company_id());

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles"
on public.profiles
for select
using (public.is_admin());

drop policy if exists "manager read company profiles" on public.profiles;
create policy "manager read company profiles"
on public.profiles
for select
using (public.is_manager() and company_id = public.current_company_id());

drop policy if exists "user update own name" on public.profiles;
create policy "user update own name"
on public.profiles
for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = public.current_role()
  and company_id is not distinct from public.current_company_id()
);

drop policy if exists "driver create own claim" on public.claims;
create policy "driver create own claim"
on public.claims
for insert
with check (
  public.is_driver()
  and driver_id = auth.uid()
  and company_id = public.current_company_id()
  and status = 'pending_review'
);

drop policy if exists "driver read own claims" on public.claims;
create policy "driver read own claims"
on public.claims
for select
using (public.is_driver() and driver_id = auth.uid());

drop policy if exists "manager read company claims" on public.claims;
create policy "manager read company claims"
on public.claims
for select
using (public.is_manager() and company_id = public.current_company_id());

drop policy if exists "admin read all claims" on public.claims;
create policy "admin read all claims"
on public.claims
for select
using (public.is_admin());

drop policy if exists "admin decide claims" on public.claims;
create policy "admin decide claims"
on public.claims
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "driver read own ledger" on public.ledger_entries;
create policy "driver read own ledger"
on public.ledger_entries
for select
using (public.is_driver() and profile_id = auth.uid());

drop policy if exists "manager read company ledger" on public.ledger_entries;
create policy "manager read company ledger"
on public.ledger_entries
for select
using (
  public.is_manager()
  and public.profile_company_id(profile_id) = public.current_company_id()
);

drop policy if exists "admin read all ledger" on public.ledger_entries;
create policy "admin read all ledger"
on public.ledger_entries
for select
using (public.is_admin());
