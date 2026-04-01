# Aegis UI/UX Specification v1 (Iteration 1)

## 1. Scope and Product Decisions for Iteration 1

This document defines the page-by-page UI/UX blueprint before implementation.

Decisions locked for this iteration:
- No fraud engine and no automated verification.
- Every claim is sent to Admin for manual review.
- No external payment gateway integration.
- Use in-app account balance ledger for approved claims.
- Separate dashboard login pages.
- Subdomain-oriented deployment model:
  - driver.example.com
  - manager.example.com
  - admin.example.com
- Design language: white base + sky-blue accents inspired by the reference button.
- Typography:
  - Main UI font: Lato
  - Serif accent font: Domine

## 2. Visual Design System (White + Sky Blue)

### 2.1 Color Tokens

- --bg: #f7fbff
- --surface: #ffffff
- --surface-soft: #eef6ff
- --primary-100: #d5ebff
- --primary-200: #b9dcff
- --primary-300: #9accff
- --primary-400: #79baff
- --primary-500: #5da8ff
- --primary-600: #438fe6
- --primary-700: #3273bf
- --text-900: #17324d
- --text-700: #365873
- --text-500: #668198
- --border: #d8e9f8
- --success: #1f9d63
- --warning: #e6a92b
- --danger: #cc4c4c
- --focus-ring: rgba(93, 168, 255, 0.35)

### 2.2 Surface and Elevation

- Cards: white with 1px cool-blue border + soft shadow.
- Top-level backgrounds: white with subtle radial sky-blue gradients for depth.
- Buttons:
  - Primary: glossy sky-blue gradient + inner highlight + soft outer glow.
  - Secondary: white with blue border.
  - Danger: low-saturation red accent only for destructive actions.

### 2.3 Typography

- Headline: Domine (600/700), large sections and key metrics.
- Body/UI: Lato (400/500/600).
- Number-heavy stats: Lato 700 with improved letter spacing.

### 2.4 Motion and Micro-interactions

- Page entrance: 180ms fade-up.
- Card stagger: 40ms interval, max 6 cards.
- Button hover: gradient shift + 1px translate up.
- Focus states: visible ring for keyboard navigation.

### 2.5 Accessibility Targets

- WCAG AA contrast for all text states.
- Keyboard-complete navigation for dashboards.
- Large touch targets (44px min) on Driver PWA.

## 3. Information Architecture

### Driver App (Mobile-first PWA)
- /login
- /dashboard
- /claims/new
- /claims/history
- /claims/:id
- /balance
- /profile

### Manager App (Desktop-first, responsive)
- /login
- /overview
- /zones
- /claims
- /drivers
- /reports

### Admin App (Desktop-first)
- /login
- /review-queue
- /claims/:id
- /decisions-log
- /drivers
- /companies
- /settings/workflows

## 4. Driver Dashboard UX Plan

### 4.1 Driver Login Page
Goal:
- Fast sign-in for active delivery shifts.

Layout:
- Centered auth card on white background with sky-blue ambient gradient.
- Brand mark + short trust line ("Income safety for every disruption day").
- Form fields: phone/email, password, remember device.
- Primary CTA: "Sign in to Driver App".
- Secondary links: forgot password, onboarding support.

Interactions:
- Real-time input validation and clear inline errors.
- Loading state on submit with disabled CTA.

### 4.2 Driver Home (/dashboard)
Goal:
- Immediate clarity on account status and next actions.

Mobile layout sections:
- Header: greeting + current tier chip.
- Balance card: "Available Balance" + weekly summary delta.
- Claim status rail: latest claim with status badge (Pending Admin Review / Approved / Rejected).
- Quick actions:
  - New Claim
  - Claim History
  - View Balance Ledger
- Tier and coverage snapshot card.

Interactions:
- Pull-to-refresh on mobile.
- Status chips are color coded and readable in monochrome.

### 4.3 New Claim Page (/claims/new)
Goal:
- Frictionless claim creation in under 90 seconds.

Flow:
1. Select disruption type (rain/flood/strike/curfew/other).
2. Pick date and shift window missed.
3. Auto-capture location (editable with reason).
4. Add note and optional proof (photo upload).
5. Review and submit.

UX details:
- Stepper with progress indicator.
- Sticky submit bar at bottom for one-handed use.
- Confirm modal clarifies manual admin review SLA.

### 4.4 Claim History (/claims/history)
Goal:
- Help drivers quickly understand claim outcomes.

Layout:
- Search + filter chips by status and date.
- List cards: date, disruption type, amount requested, status.
- Empty state with "Start first claim" CTA.

### 4.5 Claim Detail (/claims/:id)
Goal:
- Full transparency for each claim.

Sections:
- Summary card (amount, date, status).
- Timeline:
  - Submitted
  - Under Admin Review
  - Decision Issued
  - Balance Updated (if approved)
- Admin note block for rejection reason or requested clarifications.

### 4.6 Balance Page (/balance)
Goal:
- Show trustable in-app ledger.

Sections:
- Current balance hero card.
- Ledger table/list:
  - credit/debit
  - source (claim id/manual adjustment)
  - timestamp
- Export as CSV (future), disabled for v1.

### 4.7 Profile Page (/profile)
Goal:
- Manage essentials only.

Sections:
- Account info.
- Linked company and rider id.
- Notification preferences.
- Sign out and support contact.

## 5. Manager Dashboard UX Plan

### 5.1 Manager Login
Goal:
- Company scoped secure entry.

Layout:
- Split screen:
  - Left: value messaging and uptime trust indicators.
  - Right: login card.

Fields:
- Work email
- Password
- Company workspace id

### 5.2 Overview Page (/overview)
Goal:
- Fast operational visibility.

Top KPIs:
- Active drivers
- Claims pending admin review
- Claims approved this week
- Average decision time

Main modules:
- Zone impact panel.
- Claim trend chart (7/30 day toggle).
- Recent high-priority claims list.

### 5.3 Zones Page (/zones)
Goal:
- Geographic disruption monitoring.

Modules:
- Zone list with status pills.
- Affected driver counts.
- Claims in queue per zone.

### 5.4 Claims Monitor (/claims)
Goal:
- Track pipeline health.

Table columns:
- claim id
- driver id
- zone
- submitted at
- current status
- decision age

Capabilities:
- Multi-filter, saved views, CSV export placeholder.

### 5.5 Drivers Page (/drivers)
Goal:
- Company-level visibility into workforce support outcomes.

Cards/table:
- Driver profile mini-card + recent claim statuses.
- Balance assistance totals.

### 5.6 Reports Page (/reports)
Goal:
- Share snapshots with operations leadership.

Widgets:
- Weekly claims summary.
- Approval/rejection ratio.
- Average admin turnaround.

## 6. Admin Dashboard UX Plan

### 6.1 Admin Login
Goal:
- Secure, high-trust access for decisions.

Layout:
- Minimal centered form with strict visual hierarchy.
- Optional future 2FA slot reserved in UI.

### 6.2 Review Queue (/review-queue)
Goal:
- Efficient claim decisioning with low cognitive load.

Layout:
- Split panel:
  - Left queue list with filters and priority tags.
  - Right preview pane for selected claim.

Queue item contents:
- claim id
- driver name/id
- disruption type
- submitted age
- requested amount

Primary actions:
- Open full claim
- Approve
- Reject
- Request clarification

### 6.3 Claim Decision Page (/claims/:id)
Goal:
- Prevent bad decisions and keep full auditability.

Sections:
- Claim packet summary.
- Driver context panel (history summary).
- Evidence attachments.
- Decision form with required rationale for rejection.

Decision safety UX:
- Sticky action footer.
- Destructive action confirmation modal.
- Keyboard shortcuts for reviewers (future-ready).

### 6.4 Decisions Log (/decisions-log)
Goal:
- Complete audit and accountability.

Table:
- decision timestamp
- admin user
- claim id
- action taken
- rationale excerpt

### 6.5 Drivers and Companies Admin Pages
Goal:
- Basic operational management for v1.

Functions:
- View profile details.
- Soft disable account.
- Add notes for internal operations.

### 6.6 Workflow Settings (/settings/workflows)
Goal:
- Manual-review workflow controls only.

Controls:
- SLA targets.
- queue sorting strategy.
- notification templates.

## 7. Cross-Dashboard UX Standards

- Consistent status taxonomy:
  - Pending Review
  - Approved
  - Rejected
  - Balance Credited
- Every important state has:
  - loading
  - empty
  - error
  - success presentation.
- Breadcrumbs on desktop, bottom navigation on driver mobile.
- Form validation strategy:
  - inline field errors
  - top summary block on submit failure.

## 8. Subdomain and Login Experience Plan

Routing model:
- Host-aware app shell maps host to app role:
  - driver.* -> Driver app routes
  - manager.* -> Manager app routes
  - admin.* -> Admin app routes

Auth model for v1:
- Separate login pages and role-scoped sessions.
- If role mismatch detected, redirect to correct subdomain login.

Development host mapping:
- driver.localhost
- manager.localhost
- admin.localhost

## 9. V1 API Contract Assumptions (UI-facing)

- Auth endpoints per role prefix:
  - /api/driver/auth/login
  - /api/manager/auth/login
  - /api/admin/auth/login
- Claims:
  - POST /api/driver/claims
  - GET /api/driver/claims
  - GET /api/admin/review-queue
  - POST /api/admin/claims/:id/decision
- Balance:
  - GET /api/driver/balance
  - GET /api/driver/balance/ledger

## 10. Usability Acceptance Criteria for Iteration 1

- Driver can submit claim in < 90 seconds on phone.
- Admin can process a claim decision in < 2 minutes with full rationale logging.
- Manager can understand current claim pipeline in < 30 seconds from overview page.
- All primary actions are reachable via keyboard on desktop dashboards.
- Visual language is consistent with white + sky-blue glossy accents and professional tone.
