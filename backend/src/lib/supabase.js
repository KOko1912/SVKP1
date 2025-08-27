// src/lib/supabase.js
let _client;
async function getSupabase() {
  if (_client) return _client;
  const { createClient } = await import('@supabase/supabase-js');
  _client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE,
    { auth: { persistSession: false } }
  );
  return _client;
}
module.exports = { getSupabase };
