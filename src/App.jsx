import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore } from './store/useStore'
import Landing from './pages/Landing'
import POS from './pages/POS'
import Toast from './components/ui/Toast'

export default function App() {
  const [status, setStatus] = useState('loading')
  const { setUser, setTenantId, setSettings } = useStore()

  async function bootstrap(session) {
    if (!session?.user) {
      setUser(null)
      setTenantId(null)
      setStatus('guest')
      return
    }

    setUser(session.user)

    // tenants table links via owner_email (not a user_id FK)
    const { data: tenantData, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_email', session.user.email)
      .maybeSingle()

    if (error) console.error('[BITE] tenant fetch error:', error.message)

    if (tenantData) {
      setTenantId(tenantData.id)
      setSettings(tenantData)
    } else {
      console.error('[BITE] No tenant found for email:', session.user.email)
    }

    setStatus('authed')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      bootstrap(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return
        bootstrap(session)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0D0B08'
      }}>
        <span style={{
          width: 28, height: 28,
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#E8440A',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite'
        }}/>
      </div>
    )
  }

  return (
    <>
      <Toast />
      {status === 'authed' ? <POS /> : <Landing />}
    </>
  )
}