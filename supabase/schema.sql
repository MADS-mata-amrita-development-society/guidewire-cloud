-- Aegis Iteration 1 schema
-- Manual admin claim review only, no fraud engine, no payment gateway.

create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('driver', 'manager', 'admin')),
  full_name text not null,
  company_id uuid references public.companies(id),
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  claim_type text not null,
  disruption_date date not null,
  details text,
  requested_amount numeric(12,2) not null check (requested_amount > 0),
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  admin_notes text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  claim_id uuid references public.claims(id),
  entry_type text not null check (entry_type in ('credit', 'debit', 'adjustment')),
  amount numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_claims_driver on public.claims(driver_id);
create index if not exists idx_claims_company on public.claims(company_id);
create index if not exists idx_claims_status on public.claims(status);
create index if not exists idx_ledger_profile on public.ledger_entries(profile_id);

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

create or replace function public.handle_claim_approval_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'approved' and new.status = 'approved' then
    insert into public.ledger_entries (profile_id, claim_id, entry_type, amount, note)
    values (new.driver_id, new.id, 'credit', new.requested_amount, 'Claim approved');

    update public.profiles
    set balance = balance + new.requested_amount
    where id = new.driver_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_claim_approval_credit on public.claims;
create trigger trg_claim_approval_credit
after update on public.claims
for each row
execute function public.handle_claim_approval_credit();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.claims enable row level security;
alter table public.ledger_entries enable row level security;

-- Companies policies
drop policy if exists "admin read companies" on public.companies;
create policy "admin read companies"
on public.companies
for select
using (public.is_admin());

drop policy if exists "manager read own company" on public.companies;
create policy "manager read own company"
on public.companies
for select
using (
  public.is_manager()
  and id = public.current_company_id()
);

drop policy if exists "driver read own company" on public.companies;
create policy "driver read own company"
on public.companies
for select
using (
  public.is_driver()
  and id = public.current_company_id()
);

-- Profiles policies
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
using (
  public.is_manager()
  and company_id = public.current_company_id()
);

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

-- Claims policies
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
using (
  public.is_manager()
  and company_id = public.current_company_id()
);

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

-- Ledger policies
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

-- Seed minimal companies (safe to run repeatedly)
insert into public.companies(name)
values ('Velocity Eats'), ('Rapid Cart')
on conflict (name) do nothing;
