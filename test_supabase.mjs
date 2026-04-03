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

  if (res.error) {
    console.error('Auth error (aegis):', res.error.message);
    res = await supabase.auth.signInWithPassword({
      email: 'driver@gmail.com',
      password: 'qwertyuiop'
    });
    if (res.error) {
      console.error('Auth error (gmail):', res.error.message);
      return;
    }
  }

  const userId = res.data.user.id;
  console.log('Logged in successfully. User ID:', userId);

  console.log('Fetching users row...');
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  console.log('UsersRow error:', userErr);

  console.log('Fetching driver profile...');
  const { data: profile, error: profileErr } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  console.log('Profile error:', profileErr);

  console.log('Fetching wallet...');
  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  console.log('Wallet error:', walletErr);
}

test().catch(console.error);
