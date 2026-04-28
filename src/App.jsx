import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useStore } from './store/useStore'
import { useTheme } from './store/useTheme'
import Landing from './pages/Landing'
import POS from './pages/POS'
import Toast from './components/ui/Toast'

export default function App() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, setTenantId } = useStore()
  const { init: initTheme } = useTheme()

  useEffect(() => {
    initTheme()
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        try { await loadTenantId(session.user.id) } catch(e) { console.error('[BITE]', e) }
      }
      if (mounted) setLoading(false)
    }).catch(() => { if (mounted) setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (session?.user) {
          setUser(session.user)
          try { await loadTenantId(session.user.id) } catch(e) {}
        } else {
          setUser(null)
          setTenantId(null)
        }
      }
    )
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  async function loadTenantId(userId) {
    const { data } = await supabase
      .from('profiles').select('tenant_id').eq('id', userId).maybeSingle()
    if (data?.tenant_id) { setTenantId(data.tenant_id); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const { data: tenant } = await supabase
        .from('tenants').select('id').eq('owner_email', user.email).maybeSingle()
      if (tenant?.id) {
        setTenantId(tenant.id)
        await supabase.from('profiles').upsert({ id: userId, tenant_id: tenant.id, role: 'owner' })
      }
    }
  }

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0D0B08', flexDirection:'column', gap:16 }}>
      <div className="spinner" style={{ width:28, height:28, borderWidth:3 }} />
      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12 }}>Loading BITE.</div>
    </div>
  )

  return (
    <>
      {user ? <POS /> : <Landing />}
      <Toast />
    </>
  )
}