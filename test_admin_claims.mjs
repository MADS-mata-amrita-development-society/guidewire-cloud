import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data: auth } = await sb.auth.signInWithPassword({email:'admin@aegis.com', password:'qwertyuiop'});
console.log('User ID:', auth.user?.id);

// Test 1: fetchPendingClaims query exactly as it appears in api.ts
const r1 = await sb.from('claims')
  .select('*, driver:users!claims_driver_id_fkey(id, full_name, email, company_id)')
  .eq('status', 'pending')
  .order('filed_at', { ascending: false });
console.log('fetchPendingClaims result - count:', r1.data?.length, '| error:', r1.error?.message || 'none');

// Test 2: fetchAllClaims query exactly as it appears (used by dashboard)
const r2 = await sb.from('claims')
  .select('*, driver:users!claims_driver_id_fkey(id, full_name, email)')
  .order('filed_at', { ascending: false });
console.log('fetchAllClaims result - count:', r2.data?.length, '| error:', r2.error?.message || 'none');

// Test 3: Does driver profile sub-query break things?
const driverIds = [...new Set((r1.data || []).map(c => c.driver_id))];
console.log('Driver IDs found:', driverIds);
if (driverIds.length > 0) {
  const r3 = await sb.from('driver_profiles').select('user_id, zone, city, tier').in('user_id', driverIds);
  console.log('driver_profiles query - count:', r3.data?.length, '| error:', r3.error?.message || 'none');
}
