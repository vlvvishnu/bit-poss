import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore } from './store/useStore'
import Landing from './pages/Landing'
import POS from './pages/POS'
import Toast from './components/ui/Toast'

export default function App() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setTenantId } = useStore()

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        await loadTenantId(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadTenantId(session.user.id)
        } else {
          setUser(null)
          setTenantId(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function loadTenantId(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .maybeSingle()
    if (error) console.error('[BITE] profiles error:', error)
    if (data?.tenant_id) {
      setTenantId(data.tenant_id)
    } else {
      // Fallback: try tenants table directly via owner_email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: tenant, error: te } = await supabase
          .from('tenants')
          .select('id')
          .eq('owner_email', user.email)
          .maybeSingle()
        if (te) console.error('[BITE] tenants fallback error:', te)
        if (tenant?.id) {
          setTenantId(tenant.id)
          // Auto-fix: create missing profile row
          await supabase.from('profiles').upsert({
            id: userId,
            tenant_id: tenant.id,
            role: 'owner',
          })
        }
      }
    }
  }

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0D0B08'
    }}>
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  )

  return (
    <>
      {user ? <POS /> : <Landing />}
      <Toast />
    </>
  )
}