import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore } from './store/useStore'
import { useTheme } from './store/useTheme'
import Landing from './pages/Landing'
import POS from './pages/POS'
import Toast from './components/ui/Toast'

export default function App() {
  const [status, setStatus] = useState('loading') // 'loading' | 'authed' | 'guest'
  const { setUser, setTenantId } = useStore()
  const { init: initTheme } = useTheme()

  useEffect(() => {
    initTheme()

    // Hard timeout — never hang
    const timer = setTimeout(() => setStatus(s => s === 'loading' ? 'guest' : s), 5000)

    // Listen FIRST — catches the initial session event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[BITE] auth event:', event, session?.user?.email)
        clearTimeout(timer)

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setTenantId(null)
          setStatus('guest')
          return
        }

        if (session?.user) {
          setUser(session.user)
          await loadTenant(session.user)
          setStatus('authed')
        }
      }
    )

    // Also do an explicit getSession in case onAuthStateChange doesn't fire
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        clearTimeout(timer)
        setStatus(s => s === 'loading' ? 'guest' : s)
      }
      // If session exists, onAuthStateChange will handle it
    })

    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function loadTenant(authUser) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id)
        return
      }

      // Fallback: find tenant by owner_email
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_email', authUser.email)
        .maybeSingle()

      if (tenant?.id) {
        setTenantId(tenant.id)
        await supabase.from('profiles').upsert({
          id: authUser.id,
          tenant_id: tenant.id,
          role: 'owner',
        })
      }
    } catch (e) {
      console.error('[BITE] loadTenant:', e?.message)
    }
  }

  if (status === 'loading') return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0D0B08', gap: 14,
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid rgba(232,68,10,0.25)',
        borderTopColor: '#E8440A',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, letterSpacing: '0.5px' }}>
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
