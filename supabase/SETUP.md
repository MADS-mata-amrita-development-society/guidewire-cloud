# Supabase Setup Guide (Aegis Insurance)

## 1. Create Project

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**.
3. Run `supabase/schema.sql`.

If you already ran an older schema version and see:
`infinite recursion detected in policy for relation "users"`
run `supabase/hotfix-rls-recursion.sql` once.

## 2. Auth Settings

1. Go to **Authentication → Providers → Email**.
2. Enable **Email/Password**.
3. For local testing, disable email confirmation (or manually confirm users in the Auth dashboard).

## 3. Create Test Users

Create three users in **Authentication → Users → Add User**:
- `driver@example.com` (password: `test1234`)
- `manager@example.com` (password: `test1234`)
- `admin@example.com` (password: `test1234`)

Use passwords you can remember for local testing.

## 4. Fix User Rows

After users are created, run `supabase/fix-users.sql` in the SQL Editor.

This script will:
- Set roles correctly (`driver`, `manager`, `admin`) based on email patterns
- Assign users to companies (Blinkit by default)
- Create missing `driver_profiles` for all drivers
- Create missing `wallets` for all users

If your emails don't match the patterns (`%admin%`, `%manager%`, `%driver%`), uncomment and edit the manual override section in the SQL script.

## 5. Frontend Environment

In the project root:

1. Copy `.env.example` to `.env` (or edit `.env` directly).
2. Fill values from **Supabase Project Settings → API**:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 6. Local Subdomains

Add to `/etc/hosts`:

```text
127.0.0.1 driver.localhost
127.0.0.1 manager.localhost
127.0.0.1 admin.localhost
```

Then start the app:

```bash
npm install
npm run dev
```

Open:
- `http://driver.localhost:5173/login`
- `http://manager.localhost:5173/login`
- `http://admin.localhost:5173/login`

## 7. Functional Validation

1. **Sign in as driver** and submit a claim.
2. **Sign in as admin** and approve/reject the claim from the review queue.
3. **Sign in as driver** and verify:
   - Claim status updates
   - Balance updates on approval (handled atomically by DB trigger)
   - Wallet transaction entry is created
4. **Sign in as manager** and verify company-level claims/drivers views.

## 8. Architecture Notes

### Atomic Claim Approval
When an admin approves a claim, only the `claims` row is updated. A PostgreSQL trigger (`trg_claim_approval_credit`) then atomically:
- Credits the driver's wallet
- Creates a `wallet_transactions` entry
- This ensures data consistency even if the client connection drops mid-operation.

### RLS Policies
All RLS policies use `SECURITY DEFINER` helper functions (`is_admin()`, `is_driver()`, `is_manager()`, `get_user_role()`, `get_user_company()`) to prevent infinite recursion when policies query the same table they protect.
