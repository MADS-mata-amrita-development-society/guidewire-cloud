import { supabase } from './supabase'

// ============================================================================
// Types
// ============================================================================

export type AppRole = 'driver' | 'manager' | 'admin'

export type Profile = {
  id: string
  role: AppRole
  full_name: string
  company_id: string | null
  balance: number
}

export type Claim = {
  id: string
  claim_type: string
  disruption_date: string
  requested_amount: number
  status: 'pending_review' | 'approved' | 'rejected'
  details: string | null
  admin_notes: string | null
  driver_id: string
  company_id: string | null
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

export type LedgerEntry = {
  id: string
  profile_id: string
  entry_type: 'credit' | 'debit' | 'adjustment'
  amount: number
  note: string | null
  claim_id: string | null
  created_at: string
}

export type Company = {
  id: string
  name: string
  created_at?: string
}

export type ClaimInsert = {
  driver_id: string
  company_id: string | null
  claim_type: string
  disruption_date: string
  requested_amount: number
  details?: string
}

export type ClaimDecision = {
  claimId: string
  status: 'approved' | 'rejected'
  adminNotes: string
  decidedBy: string
}

export type ApiResult<T> = { data: T; error: null } | { data: null; error: string }

// ============================================================================
// Auth API
// ============================================================================

export async function signIn(email: string, password: string): Promise<ApiResult<{ userId: string }>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: { userId: data.user.id }, error: null }
}

export async function signOut(): Promise<ApiResult<void>> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: undefined, error: null }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data.session, error: null }
}

export function onAuthStateChange(callback: () => void) {
  return supabase.auth.onAuthStateChange(callback)
}

// ============================================================================
// Profile API
// ============================================================================

export async function fetchProfile(userId: string): Promise<ApiResult<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_id, balance')
    .eq('id', userId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Profile, error: null }
}

export async function fetchDriversByCompany(companyId: string): Promise<ApiResult<Profile[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_id, balance')
    .eq('company_id', companyId)
    .eq('role', 'driver')
    .order('full_name')

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Profile[], error: null }
}

export async function fetchAllDrivers(): Promise<ApiResult<Profile[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, company_id, balance')
    .eq('role', 'driver')
    .order('full_name')

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Profile[], error: null }
}

// ============================================================================
// Claims API
// ============================================================================

export async function fetchClaimsByDriver(driverId: string): Promise<ApiResult<Claim[]>> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function fetchClaimsByCompany(companyId: string, limit?: number): Promise<ApiResult<Claim[]>> {
  let query = supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function fetchPendingClaims(): Promise<ApiResult<Claim[]>> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function fetchDecidedClaims(limit = 100): Promise<ApiResult<Claim[]>> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, claim_type, disruption_date, requested_amount, status, details, admin_notes, driver_id, company_id, created_at, decided_at, decided_by')
    .neq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Claim[], error: null }
}

export async function createClaim(claim: ClaimInsert): Promise<ApiResult<Claim>> {
  const { data, error } = await supabase
    .from('claims')
    .insert({
      driver_id: claim.driver_id,
      company_id: claim.company_id,
      claim_type: claim.claim_type,
      disruption_date: claim.disruption_date,
      requested_amount: claim.requested_amount,
      details: claim.details ?? null,
      status: 'pending_review',
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Claim, error: null }
}

export async function decideClaim(decision: ClaimDecision): Promise<ApiResult<Claim>> {
  const { data, error } = await supabase
    .from('claims')
    .update({
      status: decision.status,
      admin_notes: decision.adminNotes,
      decided_by: decision.decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq('id', decision.claimId)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Claim, error: null }
}

// ============================================================================
// Ledger API
// ============================================================================

export async function fetchLedgerByProfile(profileId: string): Promise<ApiResult<LedgerEntry[]>> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('id, profile_id, entry_type, amount, note, claim_id, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as LedgerEntry[], error: null }
}

// ============================================================================
// Companies API
// ============================================================================

export async function fetchAllCompanies(): Promise<ApiResult<Company[]>> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: (data ?? []) as Company[], error: null }
}

export async function fetchCompanyById(companyId: string): Promise<ApiResult<Company>> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, created_at')
    .eq('id', companyId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data as Company, error: null }
}

// ============================================================================
// Combined Fetches (for pages that need multiple data sources)
// ============================================================================

export async function fetchManagerDashboardData(companyId: string) {
  const [claimsResult, driversResult] = await Promise.all([
    fetchClaimsByCompany(companyId, 50),
    fetchDriversByCompany(companyId),
  ])

  return {
    claims: claimsResult.data ?? [],
    drivers: driversResult.data ?? [],
    error: claimsResult.error || driversResult.error || null,
  }
}

// ============================================================================
// Utility: Claim Statistics
// ============================================================================

export function computeClaimStats(claims: Claim[]) {
  const pending = claims.filter((c) => c.status === 'pending_review').length
  const approved = claims.filter((c) => c.status === 'approved').length
  const rejected = claims.filter((c) => c.status === 'rejected').length
  const totalRequested = claims.reduce((sum, c) => sum + c.requested_amount, 0)
  const avgClaim = claims.length ? Math.round(totalRequested / claims.length) : 0

  return { pending, approved, rejected, totalRequested, avgClaim, total: claims.length }
}
