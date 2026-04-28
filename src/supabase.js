import { createClient } from '@supabase/supabase-js'

const env = window.__ENV__ || {}

const SUPABASE_URL  = env.SUPABASE_URL  || import.meta.env.VITE_SUPABASE_URL  || ''
const SUPABASE_ANON = env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    '[BITE] Supabase not configured.\n' +
    'Local dev: create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n' +
    'Production: set SUPABASE_URL and SUPABASE_ANON_KEY in Cloudflare Pages env vars'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
export const BREVO_KEY = env.BREVO_KEY || import.meta.env.VITE_BREVO_KEY || ''
