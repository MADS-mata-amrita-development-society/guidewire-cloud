-- ================================================
-- FIX-USERS: Populate the database correctly
-- Run this in the Supabase SQL Editor AFTER running
-- schema.sql (or after upgrading an existing DB).
--
-- This script:
--  1. Lists all auth users so you can see their IDs
--  2. Updates user roles in public.users
--  3. Creates missing driver_profiles for drivers
--  4. Creates missing wallets for all users
--  5. Assigns users to companies
-- ================================================

-- ============================================================
-- STEP 1: See all auth users and their current public.users row
-- Run this SELECT first to see the current state:
-- ============================================================
-- select
--   au.id,
--   au.email,
--   au.raw_user_meta_data->>'role' as meta_role,
--   au.raw_user_meta_data->>'full_name' as meta_name,
--   u.role as current_role,
--   u.company_id,
--   u.full_name
-- from auth.users au
-- left join public.users u on u.id = au.id
-- order by au.email;

-- ============================================================
-- STEP 2: Update roles based on email convention
-- Adjust these WHERE clauses to match your actual user emails.
-- ============================================================

-- Set the admin user
update public.users
set role = 'admin',
    company_id = null
where email ilike '%admin%'
  and role != 'admin';

-- Set the manager user (assign to first company: Blinkit)
update public.users
set role = 'manager',
    company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
where email ilike '%manager%'
  and role != 'manager';

-- Set the driver user (assign to first company: Blinkit)
update public.users
set role = 'driver',
    company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
where email ilike '%driver%'
  and role != 'driver';

-- ============================================================
-- If your emails don't follow the pattern above, use these
-- manual overrides (uncomment and set UUIDs from Step 1):
-- ============================================================

-- update public.users set role = 'admin', company_id = null
--   where id = 'YOUR_ADMIN_USER_UUID';

-- update public.users set role = 'manager', company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
--   where id = 'YOUR_MANAGER_USER_UUID';

-- update public.users set role = 'driver', company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
--   where id = 'YOUR_DRIVER_USER_UUID';

-- ============================================================
-- STEP 3: Create missing driver_profiles for all driver users
-- ============================================================

insert into public.driver_profiles (user_id, zone, city, tier)
select u.id, '', '', 'basic'
from public.users u
where u.role = 'driver'
  and not exists (
    select 1 from public.driver_profiles dp where dp.user_id = u.id
  );

-- ============================================================
-- STEP 4: Create missing wallets for ALL users
-- ============================================================

insert into public.wallets (user_id, balance)
select u.id, 0
from public.users u
where not exists (
  select 1 from public.wallets w where w.user_id = u.id
);

-- ============================================================
-- STEP 5: Also update auth.users raw_user_meta_data to match
-- (so the handle_new_user trigger won't overwrite on next login)
-- ============================================================

update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'),
  '{role}',
  to_jsonb((select role from public.users where id = auth.users.id))
)
where id in (select id from public.users);

-- ============================================================
-- STEP 6: Verify the results
-- ============================================================

-- Check users are correct:
-- select id, email, full_name, role, company_id from public.users order by email;

-- Check driver_profiles exist:
-- select dp.*, u.full_name from public.driver_profiles dp join public.users u on u.id = dp.user_id;

-- Check wallets exist:
-- select w.*, u.full_name from public.wallets w join public.users u on u.id = w.user_id;
