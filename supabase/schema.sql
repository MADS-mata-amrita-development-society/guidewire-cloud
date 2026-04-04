-- ================================================
-- AEGIS INSURANCE — DATABASE SCHEMA v2
-- Run this in the Supabase SQL Editor
-- ================================================
-- Changes from v1:
--   • Helper functions use SECURITY DEFINER + search_path to prevent RLS recursion
--   • Atomic claim approval via database trigger (not client-side)
--   • handle_new_user() auto-creates driver_profiles and wallets
-- ================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ================================================
-- TABLES
-- ================================================

-- Companies
create table if not exists public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  logo_url text,
  contact_email text not null,
  contact_phone text,
  created_at timestamptz default now()
);

-- Users (all roles: driver, manager, admin)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  phone text,
  role text not null check (role in ('driver', 'manager', 'admin')),
  company_id uuid references public.companies(id) on delete set null,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Driver Profiles (1:1 with users where role='driver')
create table if not exists public.driver_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  zone text not null default '',
  city text not null default '',
  avg_weekly_earnings numeric(10,2) default 0,
  tier text not null default 'basic' check (tier in ('basic', 'standard', 'premium')),
  premium_amount numeric(10,2) default 0,
  tier_updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Wallets
create table if not exists public.wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  balance numeric(12,2) default 0,
  updated_at timestamptz default now()
);

-- Wallet Transactions
create table if not exists public.wallet_transactions (
  id uuid default uuid_generate_v4() primary key,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  amount numeric(10,2) not null,
  type text not null check (type in ('credit', 'debit')),
  description text not null default '',
  related_claim_id uuid,
  created_at timestamptz default now()
);

-- Claims
create table if not exists public.claims (
  id uuid default uuid_generate_v4() primary key,
  driver_id uuid references public.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete set null,
  claim_type text not null check (claim_type in ('natural_disaster', 'strike_curfew')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  description text not null default '',
  claimed_amount numeric(10,2) not null,
  approved_amount numeric(10,2),
  rejection_reason text,
  reviewed_by uuid references public.users(id) on delete set null,
  filed_at timestamptz default now(),
  reviewed_at timestamptz,
  location_text text,
  event_date date,
  evidence jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb
);

-- Disruption Events
create table if not exists public.disruption_events (
  id uuid default uuid_generate_v4() primary key,
  event_type text not null check (event_type in ('flood', 'heavy_rain', 'strike', 'curfew')),
  city text not null,
  zone text not null,
  description text not null default '',
  event_date date not null,
  severity text not null default 'moderate' check (severity in ('low', 'moderate', 'severe')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Add foreign key for wallet_transactions -> claims (safe if already exists)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'fk_wallet_tx_claim'
  ) then
    alter table public.wallet_transactions
      add constraint fk_wallet_tx_claim
      foreign key (related_claim_id) references public.claims(id) on delete set null;
  end if;
end $$;

-- ================================================
-- INDEXES
-- ================================================

create index if not exists idx_users_company on public.users(company_id);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_claims_driver on public.claims(driver_id);
create index if not exists idx_claims_company on public.claims(company_id);
create index if not exists idx_claims_status on public.claims(status);
create index if not exists idx_wallet_tx_wallet on public.wallet_transactions(wallet_id);
create index if not exists idx_disruption_active on public.disruption_events(is_active);

-- ================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- These bypass RLS to avoid infinite recursion when
-- used inside RLS policies.
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

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.claims enable row level security;
alter table public.disruption_events enable row level security;

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

drop policy if exists "Managers see company drivers wallets" on public.wallets;
create policy "Managers see company drivers wallets" on public.wallets
  for select using (
    public.is_manager()
    and public.get_profile_company(user_id) = public.get_user_company()
  );

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

-- DISRUPTION EVENTS (read-only for all authenticated, write for admins)
drop policy if exists "All authenticated can read disruptions" on public.disruption_events;
create policy "All authenticated can read disruptions" on public.disruption_events
  for select using (auth.uid() is not null);

drop policy if exists "Admins can manage disruptions" on public.disruption_events;
create policy "Admins can manage disruptions" on public.disruption_events
  for all using (public.is_admin());

-- ================================================
-- TRIGGER: Atomic claim approval → wallet credit
-- Ported from guidewire-cloud. When a claim status
-- transitions to 'approved', this trigger atomically
-- credits the driver's wallet and logs the transaction.
-- This replaces the old client-side multi-step logic.
-- ================================================

create or replace function public.handle_claim_approval_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_amount numeric(10,2);
begin
  -- Only fire when status changes TO 'approved'
  if (old.status is distinct from 'approved') and (new.status = 'approved') then
    v_amount := coalesce(new.approved_amount, new.claimed_amount);

    -- Find or create the driver's wallet
    select id into v_wallet_id from public.wallets where user_id = new.driver_id;

    if v_wallet_id is null then
      insert into public.wallets (user_id, balance, updated_at)
      values (new.driver_id, 0, now())
      returning id into v_wallet_id;
    end if;

    -- Credit the wallet
    update public.wallets
    set balance = balance + v_amount,
        updated_at = now()
    where id = v_wallet_id;

    -- Log the transaction
    insert into public.wallet_transactions (wallet_id, amount, type, description, related_claim_id)
    values (v_wallet_id, v_amount, 'credit', 'Claim approved – payout credited', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_claim_approval_credit on public.claims;
create trigger trg_claim_approval_credit
  after update on public.claims
  for each row
  execute function public.handle_claim_approval_credit();

-- ================================================
-- TRIGGER: Auto-create user profile + driver extras
-- after auth signup. Creates users row, and if role
-- is 'driver', also creates driver_profile + wallet.
-- ================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_company_id uuid;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'driver');
  v_company_id := (new.raw_user_meta_data->>'company_id')::uuid;

  -- Create the users row
  insert into public.users (id, email, full_name, role, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    v_company_id
  )
  on conflict (id) do update
  set role = excluded.role,
      full_name = excluded.full_name,
      company_id = excluded.company_id;

  -- For drivers, auto-create driver_profile and wallet
  if v_role = 'driver' then
    insert into public.driver_profiles (user_id, zone, city, tier)
    values (new.id, '', '', 'basic')
    on conflict (user_id) do nothing;

    insert into public.wallets (user_id, balance)
    values (new.id, 0)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================
-- SEED DATA
-- ================================================

-- Companies (safe to run repeatedly)
insert into public.companies (id, name, contact_email) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Blinkit', 'ops@blinkit.com'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Swiggy', 'ops@swiggy.com'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Zepto', 'ops@zepto.com'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Zomato', 'ops@zomato.com')
on conflict (id) do nothing;

-- Disruption events seed
insert into public.disruption_events (event_type, city, zone, description, event_date, severity, is_active) values
  ('heavy_rain', 'Bangalore', 'Koramangala', 'Heavy rainfall causing waterlogging', '2026-04-01', 'moderate', true),
  ('strike', 'Bangalore', 'All Zones', 'Transport union strike', '2026-03-20', 'severe', false)
on conflict do nothing;
