import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Logging in as driver@aegis.com...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'driver@aegis.com',
    password: 'qwertyuiop'
  });
  if (authErr) return console.error('Auth err', authErr);

  console.log('Filing claim...');
  const { data, error } = await supabase
    .from('claims')
    .insert({
      driver_id: auth.user.id,
      company_id: null,
      claim_type: 'natural_disaster',
      description: 'Test claim from Node',
      claimed_amount: 100,
      location_text: 'Test Location',
      event_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    })
    .select()
    .single();

  console.log('Claim result:', { data, error });
}

run();
