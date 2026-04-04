import { supabase } from '@/config/supabase.ts';

// ── Claims ──

export async function fetchDriverClaims(driverId: string) {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('driver_id', driverId)
    .order('filed_at', { ascending: false });
  return { data, error };
}

export async function fileClaim(claim: {
  driver_id: string;
  company_id: string | null;
  claim_type: 'natural_disaster' | 'strike_curfew';
  description: string;
  claimed_amount: number;
  location_text: string;
  event_date: string;
}) {
  try {
    const { data, error } = await supabase
      .from('claims')
      .insert({
        driver_id: claim.driver_id,
        company_id: claim.company_id,
        claim_type: claim.claim_type,
        description: claim.description,
        claimed_amount: claim.claimed_amount,
        location_text: claim.location_text,
        event_date: claim.event_date,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[fileClaim] Supabase error:', error);
    }
    return { data, error };
  } catch (e: unknown) {
    console.error('[fileClaim] Exception:', e);
    return { data: null, error: { message: (e as Error)?.message || 'Failed to submit claim' } };
  }
}

export async function fetchPendingClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      driver:users!claims_driver_id_fkey(id, full_name, email, company_id)
    `)
    .eq('status', 'pending')
    .order('filed_at', { ascending: false });

  // Fetch driver profiles + AI evaluations separately to avoid join edge cases.
  if (data && data.length > 0) {
    const driverIds = [...new Set(data.map((c: { driver_id: string }) => c.driver_id))];
    const claimIds = [...new Set(data.map((c: { id: string }) => c.id))];

    const { data: profiles } = await supabase
      .from('driver_profiles')
      .select('user_id, zone, city, tier, avg_weekly_earnings, premium_amount')
      .in('user_id', driverIds);

    const { data: evaluations } = await supabase
      .from('claim_ai_evaluations')
      .select('*')
      .in('claim_id', claimIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const evaluationMap = new Map((evaluations || []).map((e: { claim_id: string }) => [e.claim_id, e]));

    data.forEach((claim: Record<string, unknown> & { id: string; driver_id: string; driver_profile?: unknown; ai_evaluation?: unknown }) => {
      claim.driver_profile = profileMap.get(claim.driver_id) || null;
      claim.ai_evaluation = evaluationMap.get(claim.id) || null;
    });
  }

  return { data, error };
}

export async function fetchAllClaims(filters?: { status?: string; company_id?: string }) {
  let query = supabase
    .from('claims')
    .select(`
      *,
      driver:users!claims_driver_id_fkey(id, full_name, email, company_id)
    `)
    .order('filed_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.company_id) {
    query = query.eq('company_id', filters.company_id);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Approve a claim. The database trigger (handle_claim_approval_credit)
 * handles wallet crediting and transaction logging atomically.
 * We only need to update the claim row itself.
 */
export async function approveClaim(claimId: string, approvedAmount: number, reviewerId: string) {
  const { data, error } = await supabase
    .from('claims')
    .update({
      status: 'approved',
      approved_amount: approvedAmount,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .select('*')
    .single();

  return { data, error };
}

export async function rejectClaim(claimId: string, reason: string, reviewerId: string) {
  const { data, error } = await supabase
    .from('claims')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .select()
    .single();
  return { data, error };
}

// ── Wallet ──

export async function fetchWallet(userId: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { data, error };
}

export async function fetchWalletTransactions(walletId: string) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function adminTopUpWallet(userId: string, amount: number, description: string) {
  if (amount <= 0) {
    return { data: null, error: { message: 'Amount must be positive' } };
  }

  const { data, error } = await supabase.rpc('atomic_wallet_topup', {
    p_user_id: userId,
    p_amount: amount,
    p_description: description || 'Admin top-up',
  });

  if (error) {
    return { data: null, error };
  }

  // The RPC returns { error: "..." } on validation failure
  if (data?.error) {
    return { data: null, error: { message: data.error } };
  }

  return { data, error: null };
}

// ── Driver Profile ──

export async function fetchDriverProfile(userId: string) {
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { data, error };
}

export async function updateDriverTier(userId: string, tier: string) {
  const { error } = await supabase
    .from('driver_profiles')
    .update({ tier, tier_updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) return { error };

  // Force fresh premium in case triggers were added after existing deployments.
  await supabase.rpc('recompute_driver_premium', { p_driver_id: userId });

  return { error: null };
}

export async function recomputeDriverPremium(userId: string) {
  const { data, error } = await supabase.rpc('recompute_driver_premium', { p_driver_id: userId });
  return { data: Number(data || 0), error };
}

export async function fetchClaimAiEvaluations(claimIds: string[]) {
  if (!claimIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('claim_ai_evaluations')
    .select('*')
    .in('claim_id', claimIds);
  return { data, error };
}

// ── Companies ──

export async function fetchCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');
  return { data, error };
}

// ── Drivers (admin/manager views) ──

export async function fetchDrivers(companyId?: string) {
  let query = supabase
    .from('users')
    .select(`
      *,
      driver_profile:driver_profiles(*),
      wallet:wallets(balance)
    `)
    .eq('role', 'driver')
    .order('full_name');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
  return { data, error };
}

// ── Disruption Events ──

export async function fetchActiveDisruptions() {
  const { data, error } = await supabase
    .from('disruption_events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data, error };
}

// ── Stats ──

export async function fetchAdminStats() {
  const [companies, drivers, pending, allClaims] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
    supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('claims').select('approved_amount').eq('status', 'approved'),
  ]);

  const totalPayouts = (allClaims.data || []).reduce((sum, c) => sum + (c.approved_amount || 0), 0);

  return {
    companies: companies.count || 0,
    drivers: drivers.count || 0,
    pendingClaims: pending.count || 0,
    totalPayouts,
  };
}

export async function fetchManagerStats(companyId: string) {
  const [drivers, pending, approved] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'driver').eq('company_id', companyId),
    supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('company_id', companyId),
    supabase.from('claims').select('approved_amount').eq('status', 'approved').eq('company_id', companyId),
  ]);

  const totalPayouts = (approved.data || []).reduce((sum, c) => sum + (c.approved_amount || 0), 0);

  return {
    drivers: drivers.count || 0,
    pendingClaims: pending.count || 0,
    totalPayouts,
  };
}
