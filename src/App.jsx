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
    console.log('[BITE] bootstrap called, session:', session?.user?.email || 'none')

    if (!session?.user) {
      setUser(null)
      setTenantId(null)
      setStatus('guest')
      return
    }

    setUser(session.user)

    // Try fetching tenant — log whatever comes back
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    console.log('[BITE] tenant fetch → data:', data, 'error:', error)

    if (data) {
      setTenantId(data.id)
      setSettings(data)
    }

    // Set authed regardless — POS will handle missing tenant gracefully
    setStatus('authed')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[BITE] getSession:', session?.user?.email || 'no session')
      bootstrap(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[BITE] onAuthStateChange event:', event)
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

  console.log('[BITE] rendering status:', status)

  return (
    <>
      <Toast />
      {status === 'authed' ? <POS /> : <Landing />}
    </>
  )
}