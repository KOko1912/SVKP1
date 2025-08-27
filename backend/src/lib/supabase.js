// src/lib/supabase.js
let _client;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[Supabase] Falta variable de entorno: ${name}`);
  }
  return v;
}

async function getSupabase() {
  if (_client) return _client;

  const url  = requireEnv('SUPABASE_URL');
  const key  = requireEnv('SUPABASE_SERVICE_ROLE'); // server-side (permite subir)
  // Nota: usa la ANON_KEY en el frontend, no aquí.

  const { createClient } = await import('@supabase/supabase-js');
  _client = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        'X-Client-Info': 'svkp-backend/1.0.0'
      }
    }
  });
  return _client;
}

module.exports = { getSupabase };
