import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data: auth } = await sb.auth.signInWithPassword({email:'admin@aegis.com', password:'qwertyuiop'});
if (!auth.user) { console.log('Login failed'); process.exit(1); }

console.log('Logged in as:', auth.user.email);

// Test 1: FK-named join
const r1 = await sb.from('claims').select('*, driver:users!claims_driver_id_fkey(id,full_name,email)').eq('status','pending').limit(3);
console.log('FK join - error:', r1.error?.message || 'none', '| count:', r1.data?.length);
if (r1.data?.[0]) console.log('FK join sample driver:', JSON.stringify(r1.data[0].driver));

// Test 2: Implicit join (Supabase picks the FK automatically)
const r2 = await sb.from('claims').select('*, driver:users(id,full_name,email)').eq('status','pending').limit(3);
console.log('Implicit join - error:', r2.error?.message || 'none', '| count:', r2.data?.length);
if (r2.data?.[0]) console.log('Implicit join sample driver:', JSON.stringify(r2.data[0].driver));

// Test 3: Raw claims
const r3 = await sb.from('claims').select('id,status,claimed_amount,driver_id').eq('status','pending');
console.log('Raw claims count:', r3.data?.length, '| error:', r3.error?.message || 'none');
