import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore } from './store/useStore'
import Landing from './pages/Landing'
import POS from './pages/POS'
import Toast from './components/ui/Toast'

export default function App() {
  const [status, setStatus] = useState('loading') // 'loading' | 'authed' | 'guest'
  const { setUser, setTenantId, setSettings } = useStore()

  async function bootstrap(session) {
    if (!session?.user) {
      setUser(null)
      setTenantId(null)
      setStatus('guest')
      return
    }
    setUser(session.user)
    // Load tenant
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    if (data) {
      setTenantId(data.id)
      setSettings(data)
    }
    setStatus('authed')
  }

  useEffect(() => {
    // 1. Check existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      bootstrap(session)
    })

    // 2. Listen for sign-in / sign-out events
    // This fires AFTER signInWithPassword resolves — so the Landing page
    // sign-in button triggers this and we redirect immediately.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Only re-bootstrap if status has already been determined
        // (avoids double-bootstrap on initial load)
        bootstrap(session)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg, #0D0B08)'
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