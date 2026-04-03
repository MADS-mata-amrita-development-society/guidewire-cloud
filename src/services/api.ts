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
  } catch (e: any) {
    console.error('[fileClaim] Exception:', e);
    return { data: null, error: { message: e?.message || 'Failed to submit claim' } };
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

  // Fetch driver profiles separately to avoid inner join issues
  if (data && data.length > 0) {
    const driverIds = [...new Set(data.map((c: any) => c.driver_id))];
    const { data: profiles } = await supabase
      .from('driver_profiles')
      .select('user_id, zone, city, tier')
      .in('user_id', driverIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    data.forEach((claim: any) => {
      claim.driver_profile = profileMap.get(claim.driver_id) || null;
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
  // Find or create wallet
  let { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (!wallet) {
    const { data: newWallet, error: createErr } = await supabase
      .from('wallets')
      .insert({ user_id: userId, balance: 0 })
      .select('id, balance')
      .single();
    if (createErr || !newWallet) return { error: createErr || { message: 'Could not create wallet' } };
    wallet = newWallet;
  }

  await supabase
    .from('wallets')
    .update({ balance: wallet.balance + amount, updated_at: new Date().toISOString() })
    .eq('id', wallet.id);

  const { error } = await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    amount,
    type: 'credit',
    description,
  });

  return { error };
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
  return { error };
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
