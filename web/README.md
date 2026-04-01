# Aegis Frontend (Iteration 1)

React + TypeScript + Vite frontend for role-specific dashboards.

Current implementation focus:
- Driver dashboard (mobile-first)
- Manager dashboard (read-only ops)
- Admin dashboard (manual review)
- Separate login page per role
- Host/subdomain-aware routing in a single app shell
- White + sky-blue visual system with Lato and Domine fonts

Out of scope in this iteration:
- Fraud engine and automated verification
- Payment gateway integration

## Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Supabase Backend Setup

This frontend is wired to real Supabase auth + database.

1. Create a Supabase project.
2. Run SQL from `../supabase/schema.sql` in SQL Editor.
3. Create auth users for each role (driver, manager, admin).
4. Insert matching rows in `public.profiles` using auth user ids.
5. Copy `.env.example` to `.env` and set:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Detailed guide: `../supabase/SETUP.md`.

## Local Subdomain Setup

Add local hostnames in `/etc/hosts`:

```text
127.0.0.1 driver.localhost
127.0.0.1 manager.localhost
127.0.0.1 admin.localhost
```

Then open:
- `http://driver.localhost:5173/login`
- `http://manager.localhost:5173/login`
- `http://admin.localhost:5173/login`

If the host does not match one of the role subdomains, the app shows a basic landing message.

## UX Spec Source

The page-by-page UX plan for this iteration is documented at:
- `../docs/ui-ux-spec-v1.md`
