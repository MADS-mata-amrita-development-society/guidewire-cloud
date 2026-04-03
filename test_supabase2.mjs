import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dobnffpekopglrlxodvu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvYm5mZnBla29wZ2xybHhvZHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjkzNTYsImV4cCI6MjA5MDgwNTM1Nn0.t92Zmnz_kH0vSs4uZ1j37qiKwR0k6deFCJJwcKmuHmg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Signing in...');
  let res = await supabase.auth.signInWithPassword({
    email: 'driver@aegis.com',
    password: 'qwertyuiop'
  });

  const userId = res.data.user.id;
  console.log('Logged in successfully. User ID:', userId);

  console.log('Fetching driver claims...');
  const { data: claims, error: claimsErr } = await supabase
    .from('claims')
    .select('*')
    .eq('driver_id', userId)
    .order('filed_at', { ascending: false });
  console.log('Claims error:', claimsErr?.message || claimsErr);

  console.log('Fetching active disruptions...');
  const { data: disrupt, error: disruptErr } = await supabase
    .from('disruptions')
    .select('*')
    .eq('status', 'active');
  console.log('Disruptions error:', disruptErr?.message || disruptErr);
}

test().catch(console.error);
