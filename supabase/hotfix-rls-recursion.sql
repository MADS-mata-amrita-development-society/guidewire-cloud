-- ================================================
-- HOTFIX: Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor if you encounter:
--   "infinite recursion detected in policy for relation"
--
-- Root cause: RLS policies on public.users query
-- public.users via get_user_role(), causing recursion.
-- Fix: All helper functions use SECURITY DEFINER which
-- bypasses RLS when querying the users table.
-- ================================================

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.role from public.users u where u.id = auth.uid();
$$;

create or replace function public.get_user_company()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.company_id from public.users u where u.id = auth.uid();
$$;

create or replace function public.get_profile_company(target_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.company_id from public.users u where u.id = target_user_id;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.get_user_role() = 'admin';
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.get_user_role() = 'manager';
$$;

create or replace function public.is_driver()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.get_user_role() = 'driver';
$$;

-- Recreate all RLS policies using the safe helper functions

-- COMPANIES
drop policy if exists "Admins can do everything on companies" on public.companies;
create policy "Admins can do everything on companies" on public.companies
  for all using (public.is_admin());

drop policy if exists "Managers see own company" on public.companies;
create policy "Managers see own company" on public.companies
  for select using (public.is_manager() and id = public.get_user_company());

drop policy if exists "Drivers see own company" on public.companies;
create policy "Drivers see own company" on public.companies
  for select using (public.is_driver() and id = public.get_user_company());

-- USERS
drop policy if exists "Admins full access to users" on public.users;
create policy "Admins full access to users" on public.users
  for all using (public.is_admin());

drop policy if exists "Users see own row" on public.users;
create policy "Users see own row" on public.users
  for select using (id = auth.uid());

drop policy if exists "Managers see company users" on public.users;
create policy "Managers see company users" on public.users
  for select using (
    public.is_manager()
    and company_id = public.get_user_company()
  );

-- DRIVER PROFILES
drop policy if exists "Admins full access to driver_profiles" on public.driver_profiles;
create policy "Admins full access to driver_profiles" on public.driver_profiles
  for all using (public.is_admin());

drop policy if exists "Drivers see own profile" on public.driver_profiles;
create policy "Drivers see own profile" on public.driver_profiles
  for select using (user_id = auth.uid());

drop policy if exists "Drivers update own profile" on public.driver_profiles;
create policy "Drivers update own profile" on public.driver_profiles
  for update using (user_id = auth.uid());

drop policy if exists "Managers see company drivers profiles" on public.driver_profiles;
create policy "Managers see company drivers profiles" on public.driver_profiles
  for select using (
    public.is_manager()
    and public.get_profile_company(user_id) = public.get_user_company()
  );

-- WALLETS
drop policy if exists "Admins full access to wallets" on public.wallets;
create policy "Admins full access to wallets" on public.wallets
  for all using (public.is_admin());

drop policy if exists "Users see own wallet" on public.wallets;
create policy "Users see own wallet" on public.wallets
  for select using (user_id = auth.uid());

-- WALLET TRANSACTIONS
drop policy if exists "Admins full access to wallet_transactions" on public.wallet_transactions;
create policy "Admins full access to wallet_transactions" on public.wallet_transactions
  for all using (public.is_admin());

drop policy if exists "Users see own transactions" on public.wallet_transactions;
create policy "Users see own transactions" on public.wallet_transactions
  for select using (
    wallet_id in (select id from public.wallets where user_id = auth.uid())
  );

-- CLAIMS
drop policy if exists "Admins full access to claims" on public.claims;
create policy "Admins full access to claims" on public.claims
  for all using (public.is_admin());

drop policy if exists "Drivers see own claims" on public.claims;
create policy "Drivers see own claims" on public.claims
  for select using (public.is_driver() and driver_id = auth.uid());

drop policy if exists "Drivers insert own claims" on public.claims;
create policy "Drivers insert own claims" on public.claims
  for insert with check (
    public.is_driver()
    and driver_id = auth.uid()
  );

drop policy if exists "Managers see company claims" on public.claims;
create policy "Managers see company claims" on public.claims
  for select using (
    public.is_manager()
    and company_id = public.get_user_company()
  );

-- DISRUPTION EVENTS
drop policy if exists "All authenticated can read disruptions" on public.disruption_events;
create policy "All authenticated can read disruptions" on public.disruption_events
  for select using (auth.uid() is not null);

drop policy if exists "Admins can manage disruptions" on public.disruption_events;
create policy "Admins can manage disruptions" on public.disruption_events
  for all using (public.is_admin());
