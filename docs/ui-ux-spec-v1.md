# Aegis Insurance — UI/UX Specification v1

This document defines the page-by-page UI/UX blueprint for the Aegis Insurance PWA.

## 1. Design Decisions (Locked for v1)

- No fraud engine and no automated verification.
- Every claim is sent to Admin for manual review.
- No external payment gateway integration.
- Use in-app wallet balance ledger for approved claims.
- Separate dashboard login pages per role.
- Subdomain-oriented deployment model:
  - `driver.example.com`
  - `manager.example.com`
  - `admin.example.com`
- Design language: professional, utilitarian, clean.
- Typography:
  - Main UI font: **Inter** (400/500/600)
  - Serif accent font: **Domine** (600/700) for key metrics

## 2. Design System

### 2.1 Color Tokens
- `--aegis-50`: `#F0F6FF` (page backgrounds)
- `--aegis-100`: `#E0EEFF` (soft surfaces)
- `--aegis-200`: `#C8E0FF`
- `--aegis-300`: `#A8CEFF`
- `--aegis-400`: `#8DBDFF`
- `--aegis-500`: `#6AA1F5` (primary)
- `--aegis-600`: `#5089D9` (primary hover)
- `--aegis-700`: `#3A6FB5`
- `--aegis-gray-50`: `#F9FAFB`
- `--aegis-gray-900`: `#1A1A2E`
- `--aegis-success`: `#059669`
- `--aegis-warning`: `#D97706`
- `--aegis-danger`: `#DC2626`

### 2.2 Surfaces & Elevation
- Cards: white with 1px `var(--aegis-gray-200)` border, `4px 12px` shadow.
- Backgrounds: `#F9FAFB` (gray-50).
- Buttons:
  - Primary: frosted sky-blue gradient (`#8DBDFF → #6AA1F5`) + inset highlight (`rgba(255,255,255,0.2)`).
  - Secondary: white with blue border.
  - No outer glows. No glossy effects.

### 2.3 Border Radius
- Cards, inputs: `8px`
- Buttons: `8px`
- Badges: `4px`

### 2.4 Motion
- Page entrance: `180ms` fade-in (opacity 0→1).
- No stagger animations.
- No bounce/pulse effects.
- Button hover: `translateY(-1px)` + shadow increase. Subtle only.
- Focus ring: `0 0 0 3px rgba(106,161,245,0.25)`.

### 2.5 Accessibility
- WCAG AA contrast for all text.
- Keyboard-complete navigation for desktop dashboards.
- Touch targets: 44px minimum on Driver PWA.

## 3. Route Map

### Driver App (Mobile-first PWA)
- `/login`
- `/` (dashboard)
- `/file-claim`
- `/claims` (claim history)
- `/wallet`
- `/profile`

### Manager App (Desktop-first, responsive)
- `/login`
- `/` (dashboard)
- `/drivers`
- `/claims`
- `/analytics`

### Admin App (Desktop-first)
- `/login`
- `/` (dashboard)
- `/claims` (review queue)
- `/drivers`
- `/companies`
- `/wallets`
- `/settings`

## 4. Driver Pages

### 4.1 Login (`/login`)
- Centered auth card on light background.
- Brand mark + trust line.
- Fields: email, password.
- Primary CTA: "Sign In".
- Real-time validation, loading state on submit.

### 4.2 Dashboard (`/`)
- Greeting + current tier badge.
- Wallet balance card (tappable → `/wallet`).
- Active disruption alert (if any).
- Policy card with tier coverage.
- "File a New Claim" CTA button.
- Recent claims list (last 3).

### 4.3 File Claim (`/file-claim`)
- 3-step wizard with progress bar.
- Step 1: Select disruption type (Natural Disaster / Strike).
- Step 2: Date, location, amount, description.
- Step 3: Review all details.
- Submit → confirm modal → success state.
- Sticky bottom nav for one-handed mobile use.

### 4.4 Claim History (`/claims`)
- Filter chips by status.
- Card list: date, type, amount, status badge.
- Empty state with "File a Claim" CTA.

### 4.5 Wallet (`/wallet`)
- Balance hero card.
- Transaction list: credit/debit, description, amount, date.
- Empty state for new wallets.

### 4.6 Profile (`/profile`)
- Avatar + name.
- Contact info (email, phone).
- Zone/city from driver profile.
- Tier selector with save.
- Wallet balance summary.
- Sign out button.

## 5. Manager Pages

### 5.1 Login
- Same card layout as driver, branded for manager portal.

### 5.2 Dashboard (`/`)
- KPI stats: active drivers, pending claims, total payouts.
- Recent claims table.

### 5.3 Drivers (`/drivers`)
- Table with driver profiles, zones, tiers, balances.
- Company-scoped via RLS.

### 5.4 Claims (`/claims`)
- Table: driver, type, amount, status, filed date.
- Company-scoped via RLS.

### 5.5 Analytics (`/analytics`)
- Bar chart: claims by month.
- Donut chart: tier distribution.
- Line chart: monthly payouts.

## 6. Admin Pages

### 6.1 Login
- Minimal centered form with strict hierarchy.

### 6.2 Dashboard (`/`)
- KPI stats: companies, drivers, pending claims, total payouts.
- Pending claims alert banner.
- Recent claims table.

### 6.3 Claim Review (`/claims`)
- Card list of pending claims.
- Each card shows: driver info, claim type, description, amount.
- Approve/Reject buttons per card.
- Approve modal: editable approved amount.
- Reject modal: required reason text.
- Decision triggers atomic DB operations.

### 6.4 Drivers (`/drivers`)
- Table: driver name, email, zone, tier, balance.
- Search/filter.

### 6.5 Companies (`/companies`)
- Table: company name, driver count, pending claims, total payouts.

### 6.6 Wallets (`/wallets`)
- Pool balance card.
- Transaction log table.
- Top-up modal: select driver, amount, note.

### 6.7 Settings (`/settings`)
- Tier configuration display.
- Disruption event management (placeholder).
- System configuration (placeholder).

## 7. Cross-Dashboard Standards

- Consistent status taxonomy: `Pending`, `Approved`, `Rejected`.
- Every data state has: loading spinner, empty state, error state, data state.
- Responsive layout: desktop sidebar nav, mobile bottom nav.
- All status badges are color-coded and readable in monochrome.
- Form validation: inline errors.

## 8. Subdomain & Auth Model

- Host-aware app shell maps hostname to role portal.
- Separate login pages per portal.
- Auth via Supabase email/password.
- Profile fetched from `public.users` after auth.
- Role mismatch → redirect hint.

## 9. Usability Targets

- Driver: submit claim in < 90 seconds on phone.
- Admin: process claim decision in < 2 minutes with full rationale.
- Manager: understand pipeline in < 30 seconds from overview.
- All primary actions reachable via keyboard on desktop.
