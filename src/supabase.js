import { createClient } from '@supabase/supabase-js'

// Env vars injected by Cloudflare _worker.js into window.__ENV__
// or from Vite .env.local for local dev
function getEnv(key, viteKey) {
  return (
    window.__ENV__?.[key] ||
    import.meta.env[viteKey] ||
    ''
  )
}

const SUPABASE_URL  = getEnv('SUPABASE_URL',       'VITE_SUPABASE_URL')
const SUPABASE_ANON = getEnv('SUPABASE_ANON_KEY',  'VITE_SUPABASE_ANON_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('[BITE] Supabase keys missing. Check Cloudflare env vars or .env.local')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,      // keep session in localStorage
    autoRefreshToken:  true,      // auto-refresh JWT
    detectSessionInUrl: true,     // handle magic link callbacks
    storageKey: 'bite-pos-auth',  // named key to avoid conflicts
  },
})
