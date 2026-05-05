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

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error) console.warn('[BITE] tenant fetch error:', error.message)

    if (data) {
      setTenantId(data.id)
      setSettings(data)
    }

    setStatus('authed')
  }

  useEffect(() => {
    // getSession handles the initial load — covers both fresh visits and refreshes
    supabase.auth.getSession().then(({ data: { session } }) => {
      bootstrap(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // INITIAL_SESSION fires on page load — already handled by getSession above, skip it
        // Only react to actual sign-in / sign-out events
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