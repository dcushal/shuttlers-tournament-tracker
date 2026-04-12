import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('Fetching...');
  const { data, error } = await supabase.from('players').select('*').limit(1);
  console.log('Select:', { data, error });

  console.log('Upserting with type=member...');
  const { error: insertError } = await supabase.from('players').upsert([
    {
      id: "test-uuid-1234",
      name: "Prashant Test",
      points: 10,
      rank: 99,
      previous_rank: 99,
      is_checked_in: false,
      type: "member"
    }
  ], { onConflict: 'id' });
  console.log('Upsert with type error:', insertError);

  console.log('Upserting WITHOUT type...');
  const { error: insertError2 } = await supabase.from('players').upsert([
    {
      id: "test-uuid-1234",
      name: "Prashant Test 2",
      points: 10,
      rank: 99,
      previous_rank: 99,
      is_checked_in: false
    }
  ], { onConflict: 'id' });
  console.log('Upsert WITHOUT type error:', insertError2);
  
}
test();
