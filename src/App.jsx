import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore } from './store/useStore'
import { useTheme } from './store/useTheme'
import Landing from './pages/Landing'
import Install from './pages/Install'
import POS from './pages/POS'
import Toast from './components/ui/Toast'

export default function App() {
  const [status, setStatus] = useState('loading')
  const { setUser, setTenantId } = useStore()
  const { init: initTheme } = useTheme()

  useEffect(() => {
    initTheme()

    let resolved = false
    function resolve(s) {
      if (resolved) return
      resolved = true
      setStatus(s)
    }

    // Absolute fallback — never spin forever
    const hardTimer = setTimeout(() => resolve('guest'), 6000)

    async function boot() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { resolve('guest'); return }

        setUser(session.user)
        // Load tenant with its own timeout
        await Promise.race([
          loadTenant(session.user),
          new Promise(r => setTimeout(r, 3000)),  // 3s max for tenant load
        ])
        resolve('authed')
      } catch (e) {
        console.error('[BITE] boot:', e?.message)
        resolve('guest')
      } finally {
        clearTimeout(hardTimer)
      }
    }

    boot()

    // Also listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null); setTenantId(null)
          setStatus('guest')
        }
        if (event === 'SIGNED_IN' && session?.user && status !== 'loading') {
          setUser(session.user)
          await loadTenant(session.user)
          setStatus('authed')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(hardTimer)
    }
  }, [])

  async function loadTenant(authUser) {
    try {
      const { data: profile } = await supabase
        .from('profiles').select('tenant_id')
        .eq('id', authUser.id).maybeSingle()
      if (profile?.tenant_id) { setTenantId(profile.tenant_id); return }

      // Fallback: owner_email
      const { data: tenant } = await supabase
        .from('tenants').select('id')
        .eq('owner_email', authUser.email).maybeSingle()
      if (tenant?.id) {
        setTenantId(tenant.id)
        await supabase.from('profiles').upsert({
          id: authUser.id, tenant_id: tenant.id, role: 'owner'
        })
      }
    } catch (e) {
      console.error('[BITE] loadTenant:', e?.message)
    }
  }

  // /install route — standalone page, no auth needed
  if (window.location.pathname === '/install') return <Install />

  if (status === 'loading') return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', background:'#0D0B08', gap:14 }}>
      <div style={{ width:36, height:36,
        border:'3px solid rgba(232,68,10,0.2)',
        borderTopColor:'#E8440A', borderRadius:'50%',
        animation:'spin 0.7s linear infinite' }} />
      <div style={{ color:'rgba(255,255,255,0.2)', fontSize:12, letterSpacing:'0.5px' }}>
        BITE.
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      {status === 'authed' ? <POS /> : <Landing />}
      <Toast />
    </>
  )
}
