import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { useTheme } from '../store/useTheme'
import OrderPage from '../components/order/OrderPage'
import KDS from '../components/kitchen/KDS'
import ProductsPage from '../components/manage/Products'
import CategoriesPage from '../components/manage/Categories'
import HistoryPage from '../components/manage/History'
import SettingsPage from '../components/manage/Settings'

const TOP_NAV = [
  { id: 'takeaway', label: 'Takeaway', isOrder: true },
  { id: 'delivery', label: 'Delivery', isOrder: true },
  { id: 'dine',     label: 'Dine In',  isOrder: true },
]

const MORE_NAV = [
  { id: 'history',    icon: '📋', label: 'History'    },
  { id: 'kitchen',    icon: '🍳', label: 'Kitchen'    },
  { id: 'products',   icon: '🏷', label: 'Products'   },
  { id: 'categories', icon: '📦', label: 'Categories' },
  { id: 'settings',   icon: '⚙️', label: 'Settings'   },
]

function MoreMenu({ page, setPage, onSignOut, dark, toggleTheme }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isMoreActive = MORE_NAV.some(n => n.id === page)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: isMoreActive ? 'var(--card2)' : 'none',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)', padding: '5px 10px',
        color: isMoreActive ? 'var(--text)' : 'var(--text2)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>
        More ···
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--card)', border: '1px solid var(--border2)',
          borderRadius: 'var(--r)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          minWidth: 180, zIndex: 200, overflow: 'hidden',
          animation: 'popIn 0.15s ease',
        }}>
          {MORE_NAV.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 14px',
                border: 'none', textAlign: 'left', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                background: page === n.id ? 'var(--brand-lt)' : 'none',
                color: page === n.id ? 'var(--brand)' : 'var(--text)',
                fontSize: 13, fontWeight: page === n.id ? 600 : 400,
              }}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
          <button onClick={toggleTheme} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 14px', background: 'none',
            border: 'none', textAlign: 'left', cursor: 'pointer',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 13,
          }}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button onClick={() => { setOpen(false); onSignOut() }} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 14px', background: 'none',
            border: 'none', textAlign: 'left', cursor: 'pointer',
            color: 'var(--red)', fontSize: 13,
          }}>
            <span>↩</span><span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function POS() {
  const { page, setPage, setCategories, setProducts, tenantId, user,
          settings, setSettings, setTenantId, setUser } = useStore()
  const { dark, toggle: toggleTheme } = useTheme()
  const [clock, setClock] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Primary data load — fires when tenantId is set ─────────────
  useEffect(() => {
    if (!tenantId) return
    loadData().then(() => setDataLoaded(true))
    loadSettings()
  }, [tenantId])

  // ── Safety net — if POS mounted with tenantId already in store
  //    but products are still empty (e.g. after sign-in redirect),
  //    re-fetch after a short delay ───────────────────────────────
  useEffect(() => {
    if (!tenantId) return
    const t = setTimeout(() => {
      const state = useStore.getState()
      if (state.products.length === 0 && state.categories.length === 0) {
        console.log('[BITE] safety re-fetch triggered')
        loadData().then(() => setDataLoaded(true))
        loadSettings()
      }
    }, 600)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Clock ─────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  async function loadData() {
    if (!tenantId) return
    const [{ data:cats }, { data:prods }] = await Promise.all([
      supabase.from('categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('products')
        .select('*, categories(name,icon)')
        .eq('tenant_id', tenantId)
        .order('sort_order'),
    ])
    setCategories(cats || [])
    setProducts((prods || []).map(p => ({
      ...p,
      catName: p.categories?.name || '',
      catIcon: p.categories?.icon || '',
    })))
  }

  async function loadSettings() {
    if (!tenantId) return
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) setSettings(data)
  }

  async function handleSignOut() {
    if (!confirm('Sign out?')) return
    setCategories([]); setProducts([]); setSettings(null)
    setTenantId(null); setUser(null); setPage('takeaway')
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch(e) {
      window.location.reload()
    }
  }

  const bizName    = settings?.biz_name || settings?.name || user?.user_metadata?.biz_name || 'BITE.'
  const isOrderPage = TOP_NAV.find(n => n.isOrder && n.id === page)

  function renderPage() {
    if (page === 'history')    return <HistoryPage />
    if (page === 'kitchen')    return <KDS />
    if (page === 'products')   return <ProductsPage onRefresh={loadData} />
    if (page === 'categories') return <CategoriesPage onRefresh={loadData} />
    if (page === 'settings')   return <SettingsPage />
    return <OrderPage defaultType={page} key={page} />
  }

  // Show a loading indicator while tenant is set but data hasn't loaded yet
  if (tenantId && !dataLoaded) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center',
        justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:12 }}>
        <span style={{ width:24, height:24, border:'3px solid rgba(255,255,255,0.1)',
          borderTopColor:'var(--brand)', borderRadius:'50%',
          display:'inline-block', animation:'spin 0.6s linear infinite' }}/>
        <span style={{ fontSize:12, color:'var(--text3)' }}>Loading menu…</span>
      </div>
    )
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column',
      background:'var(--bg)', color:'var(--text)' }}>

      {/* ── Top nav ─────────────────────────────────────────────── */}
      <nav style={{
        height: 50, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', padding: '0 10px', gap: 2,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize:16,
          letterSpacing:'-0.5px', marginRight:8, flexShrink:0, color:'var(--text)',
        }}>BITE<span style={{ color:'var(--brand)' }}>.</span></div>

        {/* Top nav tabs */}
        <div style={{ display:'flex', gap:1, flex:1, overflowX:'auto', scrollbarWidth:'none' }}>
          {TOP_NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              background: page===n.id ? 'var(--card2)' : 'none',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              color: page===n.id ? 'var(--text)' : 'var(--text2)',
              padding: isMobile ? '5px 8px' : '5px 10px', fontSize: 12,
              fontWeight: page===n.id ? 700 : 400,
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}>{n.label}</button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:8,
          marginLeft:'auto', flexShrink:0 }}>
          {!isMobile && (
            <span style={{ fontSize:11, color:'var(--text3)',
              fontVariantNumeric:'tabular-nums' }}>{clock}</span>
          )}
          <MoreMenu
            page={page} setPage={setPage}
            onSignOut={handleSignOut}
            dark={dark} toggleTheme={toggleTheme}
          />
        </div>
      </nav>

      {/* ── Page content ───────────────────────────────────────── */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {renderPage()}
      </div>
    </div>
  )
}