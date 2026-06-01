import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('campaign_participants')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching:', error);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data found or table is empty.');
    // Try to get a list of columns anyway by selecting a non-existent row?
    // No, but we can try to fetch from information_schema via RPC if available?
    // Let's just try to insert a dummy row and see if it fails.
  }
}

checkSchema();
