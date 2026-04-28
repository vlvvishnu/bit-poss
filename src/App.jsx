import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore } from './store/useStore'
import { useTheme } from './store/useTheme'
import Landing from './pages/Landing'
import POS from './pages/POS'
import Toast from './components/ui/Toast'

export default function App() {
  const [loading, setLoading]   = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const { user, setUser, setTenantId } = useStore()
  const { init: initTheme } = useTheme()

  useEffect(() => {
    initTheme()
    let done = false

    // Hard 4-second timeout — never hang forever
    const timer = setTimeout(() => {
      if (!done) { done = true; setLoading(false); setTimedOut(true) }
    }, 4000)

    async function boot() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (session?.user) {
          setUser(session.user)
          await loadTenant(session.user)
        }
      } catch (e) {
        console.error('[BITE] boot error:', e?.message)
      } finally {
        if (!done) { done = true; clearTimeout(timer); setLoading(false) }
      }
    }

    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') { setUser(null); setTenantId(null) }
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadTenant(session.user)
        }
      }
    )
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function loadTenant(authUser) {
    try {
      // Try profiles first
      const { data: profile } = await supabase
        .from('profiles').select('tenant_id').eq('id', authUser.id).maybeSingle()
      if (profile?.tenant_id) { setTenantId(profile.tenant_id); return }

      // Fallback: find by owner_email
      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('owner_email', authUser.email).maybeSingle()
      if (tenant?.id) {
        setTenantId(tenant.id)
        // Auto-create profile
        await supabase.from('profiles').upsert({
          id: authUser.id, tenant_id: tenant.id, role: 'owner'
        })
      }
    } catch (e) {
      console.error('[BITE] loadTenant error:', e?.message)
    }
  }

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0D0B08', gap:16 }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(232,68,10,0.3)', borderTopColor:'#E8440A', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12 }}>Loading BITE.</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      {user ? <POS /> : <Landing />}
      <Toast />
    </>
  )
}
