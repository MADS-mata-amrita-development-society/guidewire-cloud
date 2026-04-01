import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import logoImage from './assets/logo.png'

type AppRole = 'driver' | 'manager' | 'admin' | 'unknown'

type Profile = {
  id: string
  role: Exclude<AppRole, 'unknown'>
  full_name: string
  company_id: string | null
  balance: number
}

type Claim = {
  id: string
  claim_type: string
  disruption_date: string
  requested_amount: number
  status: 'pending_review' | 'approved' | 'rejected'
  details: string | null
  admin_notes: string | null
  driver_id: string
  company_id?: string | null
  created_at: string
  decided_at?: string | null
  decided_by?: string | null
}

type LedgerEntry = {
  id: string
  entry_type: 'credit' | 'debit' | 'adjustment'
  amount: number
  note: string | null
  claim_id: string | null
  created_at: string
}

type Company = {
  id: string
  name: string
}

type NavItem = {
  label: string
  href: string
  hint: string
}

const roleNav: Record<Exclude<AppRole, 'unknown'>, NavItem[]> = {
  driver: [
    { label: 'Overview', href: '/dashboard', hint: 'Today and this week' },
    { label: 'Submit Claim', href: '/claims/new', hint: 'Manual review queue' },
    { label: 'Claim History', href: '/claims/history', hint: 'Past outcomes' },
    { label: 'Balance', href: '/balance', hint: 'Ledger and credits' },
    { label: 'Profile', href: '/profile', hint: 'Identity and account' },
  ],
  manager: [
    { label: 'Overview', href: '/overview', hint: 'Company pulse' },
    { label: 'Claims', href: '/claims', hint: 'All submissions' },
    { label: 'Drivers', href: '/drivers', hint: 'Workforce roster' },
    { label: 'Reports', href: '/reports', hint: 'Operational readouts' },
    { label: 'Zones', href: '/zones', hint: 'Coverage status' },
  ],
  admin: [
    { label: 'Review Queue', href: '/review-queue', hint: 'Pending manual decisions' },
    { label: 'Decisions Log', href: '/decisions-log', hint: 'Approved and rejected' },
    { label: 'Drivers', href: '/drivers', hint: 'Identity and balances' },
    { label: 'Companies', href: '/companies', hint: 'Tenants and IDs' },
    { label: 'Workflow Settings', href: '/settings/workflows', hint: 'SLA and controls' },
  ],
}

function detectRole(hostname: string): AppRole {
  const host = hostname.toLowerCase()
  if (host.startsWith('driver.') || host.includes('driver.localhost')) return 'driver'
  if (host.startsWith('manager.') || host.includes('manager.localhost')) return 'manager'
  if (host.startsWith('admin.') || host.includes('admin.localhost')) return 'admin'
  return 'unknown'
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function currency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: Claim['status']) {
  if (status === 'pending_review') return 'Pending Review'
  return titleCase(status)
}

function statusTone(status: Claim['status']) {
  if (status === 'approved') return 'ok'
  if (status === 'rejected') return 'danger'
  return 'warn'
}

function AppMark({ role }: { role: Exclude<AppRole, 'unknown'> }) {
  return (
    <div className="app-mark" aria-label="Aegis">
      <img className="app-mark-logo" src={logoImage} alt="Aegis logo" />
      <div>
        <p className="kicker">Aegis Claims</p>
        <p className="mark-meta">{titleCase(role)} Workspace</p>
      </div>
    </div>
  )
}

function StatusPill({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'danger' | 'info' }) {
  return <span className={`status-pill ${tone}`}>{text}</span>
}

function MetricTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <article className="metric-tile">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-caption">{caption}</p>
    </article>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="section-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  )
}

function LoadingState({ text }: { text: string }) {
  return (
    <section className="panel-surface loading-state" aria-live="polite">
      <p className="kicker">Loading</p>
      <h2>{text}</h2>
      <div className="skeleton-stack" aria-hidden="true">
        <div className="skeleton-line large" />
        <div className="skeleton-line medium" />
        <div className="skeleton-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    </section>
  )
}

function EmptyTableRow({ message, colSpan }: { message: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        {message}
      </td>
    </tr>
  )
}

function LoginPage({ role }: { role: Exclude<AppRole, 'unknown'> }) {
  const roleTitle = titleCase(role)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    setLoading(false)
  }

  return (
    <main className="login-shell">
      <section className="login-story panel-surface">
        <img className="brand-hero-logo" src={logoImage} alt="Aegis logo" />
        <p className="kicker">Manual Settlement Workflow</p>
        <h1>{roleTitle} Sign In</h1>
        <p>
          Claims are triaged, validated, and approved manually by Admin. This release uses in-app balance credits only and
          does not process external payouts.
        </p>
        <div className="story-points">
          <div>
            <strong>Queue-first</strong>
            <span>Every submission is routed into a human review queue.</span>
          </div>
          <div>
            <strong>Audit clarity</strong>
            <span>Decisions include notes, timestamps, and company context.</span>
          </div>
          <div>
            <strong>Subdomain security</strong>
            <span>Each role logs in only on its designated workspace host.</span>
          </div>
        </div>
      </section>

      <form className="login-form panel-surface" onSubmit={handleSubmit} aria-label={`${roleTitle} login form`}>
        <SectionTitle title={`Welcome to ${roleTitle}`} subtitle="Use your organization credentials to continue." />

        <label htmlFor="email" className="field-label">
          {role === 'driver' ? 'Phone or email' : 'Work email'}
        </label>
        <input id="email" className="field-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          className="field-input"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : `Sign in to ${roleTitle}`}
        </button>

        <p className="inline-note">If access fails, verify you are using the correct role subdomain and account.</p>
        {error ? <p className="feedback error">{error}</p> : null}
      </form>
    </main>
  )
}

function WorkspaceLayout({
  role,
  profile,
  children,
}: {
  role: Exclude<AppRole, 'unknown'>
  profile: Profile
  children: ReactNode
}) {
  const nav = roleNav[role]
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <main className={`workspace-shell ${mobileMenuOpen ? 'menu-open' : ''}`}>
      <aside className="workspace-nav" aria-label="Primary navigation">
        <AppMark role={role} />
        <nav aria-label="Workspace navigation" className="nav-list">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={closeMobileMenu}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              end
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </NavLink>
          ))}
        </nav>

        <div className="nav-footer">
          <p className="kicker">Signed in as</p>
          <p className="identity-name">{profile.full_name}</p>
          <p className="mark-meta">{profile.id.slice(0, 8).toUpperCase()}</p>
          <button className="btn btn-secondary" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar panel-surface">
          <button
            className="menu-toggle"
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <p className="kicker">{window.location.hostname}</p>
            <h1>{titleCase(role)} Operations Console</h1>
          </div>
          <div className="topbar-meta">
            <StatusPill text="Manual Review Mode" tone="warn" />
            <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
          </div>
        </header>
        {children}
      </section>

      <button
        type="button"
        className="menu-overlay"
        aria-label="Close menu overlay"
        onClick={closeMobileMenu}
      />
    </main>
  )
}

function DriverHome({ profile }: { profile: Profile }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, created_at')
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false })
      if (mounted) {
        setClaims((data ?? []) as Claim[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [profile.id])

  const pending = claims.filter((claim) => claim.status === 'pending_review').length
  const approved = claims.filter((claim) => claim.status === 'approved').length
  const recent = claims.slice(0, 5)

  if (loading) return <LoadingState text="Loading your claim overview" />

  return (
    <section className="flow-stack">
      <div className="metrics-grid">
        <MetricTile label="Available Balance" value={currency(profile.balance)} caption="In-app ledger balance" />
        <MetricTile label="Pending Claims" value={String(pending)} caption="Awaiting admin decision" />
        <MetricTile label="Approved Claims" value={String(approved)} caption="Credited to account" />
      </div>

      <article className="panel-surface">
        <SectionTitle title="Recent Claims" subtitle="Track the latest submissions and outcomes." />
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.id.slice(0, 8).toUpperCase()}</td>
                  <td>{claim.claim_type}</td>
                  <td>{formatDate(claim.disruption_date)}</td>
                  <td>{currency(claim.requested_amount)}</td>
                  <td>
                    <StatusPill text={statusLabel(claim.status)} tone={statusTone(claim.status)} />
                  </td>
                </tr>
              ))}
              {recent.length === 0 ? <EmptyTableRow message="No claims yet. Start by submitting your first claim." colSpan={5} /> : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

function DriverNewClaim({ profile }: { profile: Profile }) {
  const [claimType, setClaimType] = useState('Heavy Rain / Flood')
  const [disruptionDate, setDisruptionDate] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitClaim(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    const amount = Number(requestedAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Requested amount must be greater than zero.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('claims').insert({
      driver_id: profile.id,
      company_id: profile.company_id,
      claim_type: claimType,
      disruption_date: disruptionDate,
      requested_amount: amount,
      details,
      status: 'pending_review',
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setMessage('Claim submitted successfully. It is now waiting for manual admin review.')
    setDisruptionDate('')
    setRequestedAmount('')
    setDetails('')
    setLoading(false)
  }

  return (
    <form className="panel-surface form-stack" onSubmit={submitClaim}>
      <SectionTitle title="Submit a New Claim" subtitle="Share disruption details clearly to speed up manual review." />

      <div className="split-fields">
        <div>
          <label htmlFor="claimType" className="field-label">
            Disruption Type
          </label>
          <select id="claimType" className="field-input" value={claimType} onChange={(e) => setClaimType(e.target.value)}>
            <option>Heavy Rain / Flood</option>
            <option>Strike</option>
            <option>Curfew</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="disruptionDate" className="field-label">
            Missed Shift Date
          </label>
          <input
            id="disruptionDate"
            className="field-input"
            type="date"
            required
            value={disruptionDate}
            onChange={(e) => setDisruptionDate(e.target.value)}
          />
        </div>
      </div>

      <label htmlFor="requestedAmount" className="field-label">
        Requested Amount (INR)
      </label>
      <input
        id="requestedAmount"
        className="field-input"
        type="number"
        min="1"
        required
        value={requestedAmount}
        onChange={(e) => setRequestedAmount(e.target.value)}
      />

      <label htmlFor="details" className="field-label">
        Claim Notes
      </label>
      <textarea
        id="details"
        className="field-input"
        rows={6}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Describe what prevented your shift completion, with relevant context for review."
      />

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Claim'}
        </button>
        <p className="inline-note">Admin decisions are recorded with notes and timestamp for audit traceability.</p>
      </div>

      {message ? <p className="feedback success">{message}</p> : null}
      {error ? <p className="feedback error">{error}</p> : null}
    </form>
  )
}

function DriverHistory({ profile }: { profile: Profile }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, created_at')
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false })
      if (mounted) {
        setClaims((data ?? []) as Claim[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [profile.id])

  if (loading) return <LoadingState text="Loading full claim history" />

  return (
    <section className="panel-surface">
      <SectionTitle title="Claim History" subtitle="Every claim and outcome in one place." />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Claim ID</th>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Admin Notes</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td>{claim.id.slice(0, 8).toUpperCase()}</td>
                <td>{formatDate(claim.disruption_date)}</td>
                <td>{claim.claim_type}</td>
                <td>{currency(claim.requested_amount)}</td>
                <td>
                  <StatusPill text={statusLabel(claim.status)} tone={statusTone(claim.status)} />
                </td>
                <td>{claim.admin_notes || 'No notes added.'}</td>
              </tr>
            ))}
            {claims.length === 0 ? <EmptyTableRow message="No claims found for this account." colSpan={6} /> : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DriverBalance({ profile }: { profile: Profile }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('ledger_entries')
        .select('id, entry_type, amount, note, claim_id, created_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
      if (mounted) {
        setEntries((data ?? []) as LedgerEntry[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [profile.id])

  if (loading) return <LoadingState text="Loading balance and ledger entries" />

  return (
    <section className="flow-stack">
      <MetricTile label="Available Balance" value={currency(profile.balance)} caption="Updated on approved claim credits" />

      <article className="panel-surface">
        <SectionTitle title="Ledger Entries" subtitle="Chronological in-app balance movement." />
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.created_at)}</td>
                  <td>{titleCase(entry.entry_type)}</td>
                  <td>{entry.claim_id ? entry.claim_id.slice(0, 8).toUpperCase() : '--'}</td>
                  <td>{currency(entry.amount)}</td>
                  <td>{entry.note || 'No note added.'}</td>
                </tr>
              ))}
              {entries.length === 0 ? <EmptyTableRow message="No ledger entries yet." colSpan={5} /> : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

function DriverProfilePage({ profile }: { profile: Profile }) {
  return (
    <section className="split-panels">
      <article className="panel-surface">
        <SectionTitle title="Identity" subtitle="Personal account information." />
        <dl className="definition-list">
          <dt>Full name</dt>
          <dd>{profile.full_name}</dd>
          <dt>User ID</dt>
          <dd>{profile.id}</dd>
          <dt>Role</dt>
          <dd>Driver</dd>
        </dl>
      </article>

      <article className="panel-surface">
        <SectionTitle title="Financial Snapshot" subtitle="Current account summary." />
        <dl className="definition-list">
          <dt>Balance</dt>
          <dd>{currency(profile.balance)}</dd>
          <dt>Company ID</dt>
          <dd>{profile.company_id || 'Unassigned'}</dd>
        </dl>
      </article>
    </section>
  )
}

function ManagerOverview({ profile }: { profile: Profile }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const [{ data: claimData }, { data: driverData }] = await Promise.all([
        supabase
          .from('claims')
          .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('profiles')
          .select('id, role, full_name, company_id, balance')
          .eq('company_id', profile.company_id)
          .eq('role', 'driver')
          .order('full_name'),
      ])

      if (mounted) {
        setClaims((claimData ?? []) as Claim[])
        setDrivers((driverData ?? []) as Profile[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [profile.company_id])

  if (loading) return <LoadingState text="Loading manager overview" />

  const pending = claims.filter((claim) => claim.status === 'pending_review').length
  const approved = claims.filter((claim) => claim.status === 'approved').length
  const rejected = claims.filter((claim) => claim.status === 'rejected').length

  return (
    <section className="flow-stack">
      <div className="metrics-grid">
        <MetricTile label="Active Drivers" value={String(drivers.length)} caption="Current company workforce" />
        <MetricTile label="Pending Review" value={String(pending)} caption="Waiting for admin decision" />
        <MetricTile label="Resolved" value={String(approved + rejected)} caption="Approved + rejected" />
      </div>

      <article className="panel-surface">
        <SectionTitle title="Claim Distribution" subtitle="Quick status visibility for recent submissions." />
        <div className="status-band">
          <StatusPill text={`Approved ${approved}`} tone="ok" />
          <StatusPill text={`Rejected ${rejected}`} tone="danger" />
          <StatusPill text={`Pending ${pending}`} tone="warn" />
        </div>
      </article>

      <article className="panel-surface">
        <SectionTitle title="Recent Company Claims" subtitle="Latest activity across your drivers." />
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Driver</th>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.slice(0, 12).map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.id.slice(0, 8).toUpperCase()}</td>
                  <td>{claim.driver_id.slice(0, 8).toUpperCase()}</td>
                  <td>{claim.claim_type}</td>
                  <td>{formatDate(claim.disruption_date)}</td>
                  <td>{currency(claim.requested_amount)}</td>
                  <td>
                    <StatusPill text={statusLabel(claim.status)} tone={statusTone(claim.status)} />
                  </td>
                </tr>
              ))}
              {claims.length === 0 ? <EmptyTableRow message="No claims available for this company." colSpan={6} /> : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

function ManagerClaims({ profile }: { profile: Profile }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
      if (mounted) {
        setClaims((data ?? []) as Claim[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [profile.company_id])

  if (loading) return <LoadingState text="Loading company claims" />

  return (
    <section className="panel-surface">
      <SectionTitle title="All Company Claims" subtitle="Full claim list for manager-level tracking." />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Claim ID</th>
              <th>Driver</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Admin Notes</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td>{claim.id.slice(0, 8).toUpperCase()}</td>
                <td>{claim.driver_id.slice(0, 8).toUpperCase()}</td>
                <td>{claim.claim_type}</td>
                <td>{currency(claim.requested_amount)}</td>
                <td>
                  <StatusPill text={statusLabel(claim.status)} tone={statusTone(claim.status)} />
                </td>
                <td>{claim.admin_notes || 'No notes added.'}</td>
              </tr>
            ))}
            {claims.length === 0 ? <EmptyTableRow message="No claims recorded yet." colSpan={6} /> : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ManagerDrivers({ profile }: { profile: Profile }) {
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, full_name, company_id, balance')
        .eq('company_id', profile.company_id)
        .eq('role', 'driver')
        .order('full_name')
      if (mounted) {
        setDrivers((data ?? []) as Profile[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [profile.company_id])

  if (loading) return <LoadingState text="Loading driver roster" />

  return (
    <section className="panel-surface">
      <SectionTitle title="Driver Roster" subtitle="Current drivers in your company scope." />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Name</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.id.slice(0, 8).toUpperCase()}</td>
                <td>{driver.full_name}</td>
                <td>{currency(driver.balance)}</td>
              </tr>
            ))}
            {drivers.length === 0 ? <EmptyTableRow message="No drivers assigned to this company." colSpan={3} /> : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ManagerReports({ profile }: { profile: Profile }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
      if (mounted) {
        setClaims((data ?? []) as Claim[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [profile.company_id])

  if (loading) return <LoadingState text="Loading manager reports" />

  const totalRequested = claims.reduce((sum, claim) => sum + claim.requested_amount, 0)
  const avgClaim = claims.length ? Math.round(totalRequested / claims.length) : 0

  return (
    <section className="flow-stack">
      <div className="metrics-grid">
        <MetricTile label="Total Requested" value={currency(totalRequested)} caption="Across all visible claims" />
        <MetricTile label="Average Claim" value={currency(avgClaim)} caption="Mean requested value" />
        <MetricTile label="Claims Count" value={String(claims.length)} caption="Current data window" />
      </div>

      <article className="panel-surface">
        <SectionTitle title="Zone and Report Notes" subtitle="Operational reporting is read-only in this release." />
        <p className="inline-note">
          Next iteration will add export templates and filter presets. Current focus is dependable claim visibility and
          manager oversight.
        </p>
      </article>
    </section>
  )
}

function AdminReviewQueue({ profile }: { profile: Profile }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noteById, setNoteById] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let mounted = true
    async function loadClaims() {
      const { data, error: loadError } = await supabase
        .from('claims')
        .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true })
      if (!mounted) return
      if (loadError) {
        setError(loadError.message)
        setLoading(false)
        return
      }
      setClaims((data ?? []) as Claim[])
      setLoading(false)
    }

    void loadClaims()
    return () => {
      mounted = false
    }
  }, [refreshTick])

  async function decide(claimId: string, nextStatus: 'approved' | 'rejected') {
    setError('')
    const note = (noteById[claimId] ?? '').trim()
    if (!note) {
      setError('Add a decision note before approving or rejecting a claim.')
      return
    }

    setSavingId(claimId)
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        status: nextStatus,
        admin_notes: note,
        decided_by: profile.id,
        decided_at: new Date().toISOString(),
      })
      .eq('id', claimId)

    if (updateError) {
      setError(updateError.message)
      setSavingId(null)
      return
    }

    setNoteById((prev) => {
      const next = { ...prev }
      delete next[claimId]
      return next
    })
    setSavingId(null)
    setRefreshTick((value) => value + 1)
  }

  if (loading) return <LoadingState text="Loading manual review queue" />

  return (
    <section className="flow-stack">
      <article className="panel-surface">
        <SectionTitle
          title="Manual Review Queue"
          subtitle="Every claim requires an explicit decision and note for traceability."
        />
        {error ? <p className="feedback error">{error}</p> : null}
        <div className="review-list">
          {claims.map((claim) => (
            <article className="review-item" key={claim.id}>
              <div className="review-head">
                <h3>{claim.id.slice(0, 8).toUpperCase()}</h3>
                <StatusPill text="Pending Review" tone="warn" />
              </div>

              <dl className="review-meta">
                <div>
                  <dt>Driver</dt>
                  <dd>{claim.driver_id.slice(0, 8).toUpperCase()}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{claim.claim_type}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatDate(claim.disruption_date)}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{currency(claim.requested_amount)}</dd>
                </div>
              </dl>

              <p className="claim-detail">{claim.details || 'No additional details provided by driver.'}</p>

              <label className="field-label" htmlFor={`note-${claim.id}`}>
                Decision Note
              </label>
              <textarea
                id={`note-${claim.id}`}
                className="field-input"
                rows={3}
                value={noteById[claim.id] ?? ''}
                onChange={(e) => setNoteById((prev) => ({ ...prev, [claim.id]: e.target.value }))}
                placeholder="Write a clear rationale for audit and communication."
              />

              <div className="review-actions">
                <button className="btn btn-primary" type="button" disabled={savingId === claim.id} onClick={() => decide(claim.id, 'approved')}>
                  {savingId === claim.id ? 'Saving...' : 'Approve Claim'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={savingId === claim.id} onClick={() => decide(claim.id, 'rejected')}>
                  {savingId === claim.id ? 'Saving...' : 'Reject Claim'}
                </button>
              </div>
            </article>
          ))}

          {claims.length === 0 ? (
            <article className="panel-soft empty-panel">
              <h3>Queue is clear</h3>
              <p>No claims are waiting for manual review right now.</p>
            </article>
          ) : null}
        </div>
      </article>
    </section>
  )
}

function AdminDecisionsLog() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('claims')
        .select(
          'id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by',
        )
        .neq('status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(100)
      if (mounted) {
        setClaims((data ?? []) as Claim[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <LoadingState text="Loading decisions log" />

  return (
    <section className="panel-surface">
      <SectionTitle title="Decisions Log" subtitle="Finalized claim outcomes across all companies." />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Decision Time</th>
              <th>Admin Notes</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td>{claim.id.slice(0, 8).toUpperCase()}</td>
                <td>{claim.driver_id.slice(0, 8).toUpperCase()}</td>
                <td>
                  <StatusPill text={statusLabel(claim.status)} tone={statusTone(claim.status)} />
                </td>
                <td>{currency(claim.requested_amount)}</td>
                <td>{claim.decided_at ? formatDateTime(claim.decided_at) : '--'}</td>
                <td>{claim.admin_notes || 'No note added.'}</td>
              </tr>
            ))}
            {claims.length === 0 ? <EmptyTableRow message="No decisions logged yet." colSpan={6} /> : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdminDrivers() {
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, full_name, company_id, balance')
        .eq('role', 'driver')
        .order('full_name')
      if (mounted) {
        setDrivers((data ?? []) as Profile[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <LoadingState text="Loading all drivers" />

  return (
    <section className="panel-surface">
      <SectionTitle title="Drivers" subtitle="Cross-company driver records and balances." />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Name</th>
              <th>Company</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id}>
                <td>{driver.id.slice(0, 8).toUpperCase()}</td>
                <td>{driver.full_name}</td>
                <td>{driver.company_id ? driver.company_id.slice(0, 8).toUpperCase() : '--'}</td>
                <td>{currency(driver.balance)}</td>
              </tr>
            ))}
            {drivers.length === 0 ? <EmptyTableRow message="No driver records found." colSpan={4} /> : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      if (mounted) {
        setCompanies((data ?? []) as Company[])
        setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <LoadingState text="Loading company directory" />

  return (
    <section className="panel-surface">
      <SectionTitle title="Companies" subtitle="Tenant-level records used in claim scoping." />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Company ID</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td>{company.id.slice(0, 8).toUpperCase()}</td>
                <td>{company.name}</td>
              </tr>
            ))}
            {companies.length === 0 ? <EmptyTableRow message="No companies configured yet." colSpan={2} /> : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function WorkflowSettings() {
  return (
    <section className="panel-surface split-panels">
      <article className="panel-soft">
        <h3>Manual Decision Policy</h3>
        <p>All claims remain queue-based and require explicit admin decisions with notes.</p>
      </article>
      <article className="panel-soft">
        <h3>Payout Handling</h3>
        <p>No payment gateway is enabled. Approved claims credit the in-app balance ledger only.</p>
      </article>
    </section>
  )
}

function BasicLanding() {
  return (
    <main className="center-shell">
      <article className="panel-surface landing-panel">
        <img className="brand-hero-logo" src={logoImage} alt="Aegis logo" />
        <p className="kicker">Aegis Claims Platform</p>
        <h1>Select a Workspace Subdomain</h1>
        <p>Use one of these hosts to enter a role-specific login.</p>
        <ul>
          <li>driver.localhost:5173</li>
          <li>manager.localhost:5173</li>
          <li>admin.localhost:5173</li>
        </ul>
      </article>
    </main>
  )
}

function ConfigMissingScreen() {
  return (
    <main className="center-shell">
      <article className="panel-surface landing-panel">
        <img className="brand-hero-logo" src={logoImage} alt="Aegis logo" />
        <p className="kicker">Configuration Required</p>
        <h1>Supabase is not configured</h1>
        <p>Copy web/.env.example to web/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
      </article>
    </main>
  )
}

function RoleWorkspace({ hostRole }: { hostRole: Exclude<AppRole, 'unknown'> }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function refreshSessionAndProfile() {
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      const currentSession = data.session
      setSession(currentSession)

      if (!currentSession) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name, company_id, balance')
        .eq('id', currentSession.user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      const typedProfile = profileData as Profile
      if (typedProfile.role !== hostRole) {
        setError(`Role mismatch: this subdomain is for ${hostRole} users only.`)
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setProfile(typedProfile)
      setLoading(false)
    }

    void refreshSessionAndProfile()
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshSessionAndProfile()
    })

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [hostRole])

  const roleRoutes = useMemo(() => {
    if (hostRole === 'driver') {
      return (
        <>
          <Route path="/dashboard" element={<DriverHome profile={profile as Profile} />} />
          <Route path="/claims/new" element={<DriverNewClaim profile={profile as Profile} />} />
          <Route path="/claims/history" element={<DriverHistory profile={profile as Profile} />} />
          <Route path="/balance" element={<DriverBalance profile={profile as Profile} />} />
          <Route path="/profile" element={<DriverProfilePage profile={profile as Profile} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </>
      )
    }

    if (hostRole === 'manager') {
      return (
        <>
          <Route path="/overview" element={<ManagerOverview profile={profile as Profile} />} />
          <Route path="/claims" element={<ManagerClaims profile={profile as Profile} />} />
          <Route path="/drivers" element={<ManagerDrivers profile={profile as Profile} />} />
          <Route path="/reports" element={<ManagerReports profile={profile as Profile} />} />
          <Route path="/zones" element={<ManagerReports profile={profile as Profile} />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </>
      )
    }

    return (
      <>
        <Route path="/review-queue" element={<AdminReviewQueue profile={profile as Profile} />} />
        <Route path="/decisions-log" element={<AdminDecisionsLog />} />
        <Route path="/drivers" element={<AdminDrivers />} />
        <Route path="/companies" element={<AdminCompanies />} />
        <Route path="/settings/workflows" element={<WorkflowSettings />} />
        <Route path="*" element={<Navigate to="/review-queue" replace />} />
      </>
    )
  }, [hostRole, profile])

  if (loading) return <LoadingState text="Initializing workspace" />

  if (!session || !profile) {
    return (
      <>
        {error ? (
          <main className="center-shell">
            <article className="panel-surface landing-panel">
              <h2>Sign-in Issue</h2>
              <p className="feedback error">{error}</p>
            </article>
          </main>
        ) : null}
        <LoginPage role={hostRole} />
      </>
    )
  }

  return (
    <BrowserRouter>
      <WorkspaceLayout role={hostRole} profile={profile}>
        <Routes>{roleRoutes}</Routes>
      </WorkspaceLayout>
    </BrowserRouter>
  )
}

function App() {
  const role = detectRole(window.location.hostname)

  if (!isSupabaseConfigured) return <ConfigMissingScreen />
  if (role === 'unknown') return <BasicLanding />

  return <RoleWorkspace hostRole={role} />
}

export default App