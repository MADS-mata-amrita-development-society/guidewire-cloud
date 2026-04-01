# Supabase Setup Guide (Aegis Iteration 1)

## 1. Create Project

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.

If you already ran an older schema version and see:
`infinite recursion detected in policy for relation "profiles"`
run `supabase/hotfix-rls-recursion.sql` once.

## 2. Auth Settings

1. Go to Authentication -> Providers -> Email.
2. Enable Email/Password.
3. For local testing, disable email confirmation (or manually confirm users).

## 3. Create Test Users

Create three users in Authentication -> Users:
- `driver@example.com`
- `manager@example.com`
- `admin@example.com`

Use passwords you can remember for local testing.

## 4. Create Profile Rows

After users are created, run this SQL in SQL Editor and replace UUIDs with auth user ids:

```sql
-- Replace these with actual auth.users ids and company ids from companies table.
insert into public.profiles (id, role, full_name, company_id)
values
  ('DRIVER_USER_UUID', 'driver', 'Driver One', (select id from public.companies where name = 'Velocity Eats')),
  ('MANAGER_USER_UUID', 'manager', 'Manager One', (select id from public.companies where name = 'Velocity Eats')),
  ('ADMIN_USER_UUID', 'admin', 'Admin One', null)
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name,
    company_id = excluded.company_id;
```

## 5. Frontend Environment

In `web`:

1. Copy `.env.example` to `.env`.
2. Fill values from Supabase Project Settings -> API:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 6. Local Subdomains

Add to `/etc/hosts`:

```text
127.0.0.1 driver.localhost
127.0.0.1 manager.localhost
127.0.0.1 admin.localhost
```

Then start app:

```bash
cd web
npm install
npm run dev
```

Open:
- `http://driver.localhost:5173/login`
- `http://manager.localhost:5173/login`
- `http://admin.localhost:5173/login`

## 7. Functional Validation

1. Sign in as driver and submit a claim.
2. Sign in as admin and approve/reject the claim from review queue.
3. Sign in as driver and verify:
- claim status updates
- balance updates on approval
- ledger entry is created
4. Sign in as manager and verify company-level claims/drivers views.
