import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { useTheme, getFontSizeLabel } from '../store/useTheme'
import OrderPage from '../components/order/OrderPage'
import KDS from '../components/kitchen/KDS'
import ProductsPage from '../components/manage/Products'
import CategoriesPage from '../components/manage/Categories'
import HistoryPage from '../components/manage/History'
import SettingsPage from '../components/manage/Settings'
import AddonsPage from '../components/manage/Addons'
import SampleMenuSeeder from '../components/manage/SampleMenuSeeder'

const TOP_NAV = [
  { id: 'takeaway', label: 'Takeaway', isOrder: true },
  { id: 'delivery', label: 'Delivery', isOrder: true },
  { id: 'dine',     label: 'Dine In',  isOrder: true },
]

const MORE_NAV = [
  { id: 'history',    icon: '📋', label: 'History'    },
  { id: 'kitchen',    icon: '🍳', label: 'Kitchen'    },
  { id: 'manage',     icon: '🧰', label: 'Manage items' },
  { id: 'settings',   icon: '⚙️', label: 'Settings'   },
]

function MoreMenu({ page, setPage, onSignOut, dark, toggleTheme, fontIndex, increaseFont, decreaseFont, resetFont, autoRotate, onToggleAutoRotate }) {
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
        fontSize: 'var(--fs-12)', fontWeight: 600, cursor: 'pointer',
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
                fontSize: 'var(--fs-13)', fontWeight: page === n.id ? 600 : 400,
              }}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
          <button onClick={toggleTheme} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 14px', background: 'none',
            border: 'none', textAlign: 'left', cursor: 'pointer',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 'var(--fs-13)',
          }}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span>🔠</span>
              <span style={{ flex:1, color:'var(--text)', fontSize: 'var(--fs-13)', fontWeight:700 }}>Font size</span>
              <span style={{ color:'var(--text3)', fontSize: 'var(--fs-11)' }}>{getFontSizeLabel(fontIndex)}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
              <button onClick={decreaseFont} style={{ background:'var(--card2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 0', fontWeight:800 }}>A−</button>
              <button onClick={resetFont} style={{ background:'var(--card2)', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 0', fontSize: 'var(--fs-11)', fontWeight:700 }}>Reset</button>
              <button onClick={increaseFont} style={{ background:'var(--card2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 0', fontWeight:800 }}>A+</button>
            </div>
          </div>
          <button onClick={onToggleAutoRotate} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 14px', background: 'none',
            border: 'none', textAlign: 'left', cursor: 'pointer',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 'var(--fs-13)',
          }}>
            <span>{autoRotate ? '🔄' : '📱'}</span>
            <span style={{ flex:1 }}>Auto rotate</span>
            <span style={{ color:autoRotate ? 'var(--brand)' : 'var(--text3)', fontWeight:700 }}>{autoRotate ? 'On' : 'Off'}</span>
          </button>
          <button onClick={() => { setOpen(false); onSignOut() }} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 14px', background: 'none',
            border: 'none', textAlign: 'left', cursor: 'pointer',
            color: 'var(--red)', fontSize: 'var(--fs-13)',
          }}>
            <span>↩</span><span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}

function ManagePage({ onRefresh }) {
  const [tab, setTab] = useState('products')
  const tabs = [{id:'products',label:'Products'},{id:'categories',label:'Categories'},{id:'addons',label:'Add-ons'}]
  return <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
    <div style={{ maxWidth:1200, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize:'var(--fs-18)' }}>Manage</h2>
      </div>
      <div style={{ display:'flex', gap:14, borderBottom:'1px solid var(--border)', overflowX:'auto', whiteSpace:'nowrap', marginBottom:14 }}>
        {tabs.map(t => <button key={t.id} onClick={()=>setTab(t.id)} style={{ border:'none', background:'none', color:tab===t.id?'var(--brand)':'var(--text2)', fontWeight:tab===t.id?700:500, padding:'8px 0', borderBottom:tab===t.id?'2px solid var(--brand)':'2px solid transparent' }}>{t.label}</button>)}
      </div>
      {tab==='products' ? <ProductsPage onRefresh={onRefresh}/> : tab==='categories' ? <CategoriesPage onRefresh={onRefresh}/> : <AddonsPage embedded />}
    </div>
  </div>
}

export default function POS() {
  const { page, setPage, setCategories, setProducts, tenantId, user,
          settings, setSettings, setTenantId, setUser,
          categories, products, showToast } = useStore()
  const { dark, toggle: toggleTheme, fontIndex, increaseFont, decreaseFont, resetFont } = useTheme()
  const [clock, setClock] = useState('')
  const [dataLoaded, setDataLoaded] = useState(() => categories.length > 0 || products.length > 0)
  const [menuLoadedTenantId, setMenuLoadedTenantId] = useState(null)
  const [tenantHasProducts, setTenantHasProducts] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  const [sampleOpen, setSampleOpen] = useState(false)
  const [autoRotate, setAutoRotate] = useState(() => localStorage.getItem('bite_auto_rotate') === '1')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const menuCheckedForTenant = menuLoadedTenantId === tenantId
  const shouldOfferSampleMenu = menuCheckedForTenant && tenantHasProducts === false
  const samplePromptKey = tenantId ? `bite_sample_prompt_seen_${tenantId}` : null

  useEffect(() => {
    if (!tenantId || !dataLoaded || !shouldOfferSampleMenu || !samplePromptKey) return
    if (localStorage.getItem(samplePromptKey)) return
    setSampleOpen(true)
    localStorage.setItem(samplePromptKey, '1')
  }, [tenantId, dataLoaded, shouldOfferSampleMenu, samplePromptKey])

  function dismissSamplePrompt() {
    if (samplePromptKey) localStorage.setItem(samplePromptKey, '1')
    setSampleOpen(false)
  }

  function openSamplePrompt() {
    setSampleOpen(true)
  }

  async function applyOrientationPreference(allowRotate) {
    try {
      if (!window.screen?.orientation) return
      if (allowRotate) {
        if (window.screen.orientation.lock) await window.screen.orientation.lock('any')
        else window.screen.orientation.unlock?.()
        return
      }
      await window.screen.orientation.lock?.('portrait-primary')
    } catch {
      // The manifest still enforces portrait for installed PWAs when runtime locking is unavailable.
    }
  }

  function toggleAutoRotate() {
    setAutoRotate(prev => {
      const next = !prev
      localStorage.setItem('bite_auto_rotate', next ? '1' : '0')
      applyOrientationPreference(next)
      return next
    })
  }

  useEffect(() => {
    const apply = () => applyOrientationPreference(autoRotate)
    apply()
    window.addEventListener('pageshow', apply)
    document.addEventListener('visibilitychange', apply)
    window.screen?.orientation?.addEventListener?.('change', apply)
    return () => {
      window.removeEventListener('pageshow', apply)
      document.removeEventListener('visibilitychange', apply)
      window.screen?.orientation?.removeEventListener?.('change', apply)
    }
  }, [autoRotate])


  // ── Primary data load — fires when tenantId is set ─────────────
  useEffect(() => {
    if (!tenantId) {
      setDataLoaded(true)
      return
    }

    let cancelled = false
    async function hydrate() {
      setDataLoaded(false)
      setMenuLoadedTenantId(null)
      setTenantHasProducts(null)
      setCategories([])
      setProducts([])
      const menuPromise = loadData(tenantId)
      const settingsPromise = loadSettings()
      const timeout = new Promise(resolve => setTimeout(() => resolve('timeout'), 4500))
      const result = await Promise.race([Promise.allSettled([menuPromise, settingsPromise]), timeout])

      if (result === 'timeout') {
        console.warn('[BITE] POS data load is slow; rendering app shell while requests continue')
        menuPromise.catch(() => {})
        settingsPromise.catch(() => {})
      }
      if (!cancelled) setDataLoaded(true)
    }

    hydrate()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

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

  async function loadData(activeTenantId = tenantId) {
    if (!activeTenantId) return
    try {
      const [{ data:cats, error:catError }, { data:prods, error:prodError }] = await Promise.all([
        supabase.from('categories').select('*').eq('tenant_id', activeTenantId).order('sort_order'),
        supabase.from('products')
          .select('*, categories(name,icon)')
          .eq('tenant_id', activeTenantId)
          .order('sort_order'),
      ])
      if (catError) throw catError
      if (prodError) throw prodError
      if (useStore.getState().tenantId !== activeTenantId) return
      setCategories(cats || [])
      const productRows = (prods || []).map(p => ({
        ...p,
        catName: p.categories?.name || '',
        catIcon: p.categories?.icon || '',
      }))
      setProducts(productRows)
      setTenantHasProducts(productRows.length > 0)
      setMenuLoadedTenantId(activeTenantId)
    } catch (error) {
      console.error('[BITE] menu load error:', error)
      setTenantHasProducts(null)
      setMenuLoadedTenantId(null)
      showToast?.('Menu is taking longer to load. You can still use the app.', 'warning')
    } finally {
      setDataLoaded(true)
    }
  }

  async function loadSettings() {
    if (!tenantId) return
    try {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
      if (error) throw error
      if (data) setSettings(data)
    } catch (error) {
      console.error('[BITE] settings load error:', error)
    }
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
    if (page === 'manage')     return <ManagePage onRefresh={loadData} />
    if (page === 'settings')   return <SettingsPage />
    return <OrderPage defaultType={page} key={page} onAddSampleMenu={openSamplePrompt} />
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
          fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize: 'var(--fs-16)',
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
              padding: isMobile ? '5px 8px' : '5px 10px', fontSize: 'var(--fs-12)',
              fontWeight: page===n.id ? 700 : 400,
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}>{n.label}</button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display:'flex', alignItems:'center', gap:8,
          marginLeft:'auto', flexShrink:0 }}>
          {!isMobile && (
            <span style={{ fontSize: 'var(--fs-11)', color:'var(--text3)',
              fontVariantNumeric:'tabular-nums' }}>{clock}</span>
          )}
          <MoreMenu
            page={page} setPage={setPage}
            onSignOut={handleSignOut}
            dark={dark} toggleTheme={toggleTheme}
            fontIndex={fontIndex}
            increaseFont={increaseFont}
            decreaseFont={decreaseFont}
            resetFont={resetFont}
            autoRotate={autoRotate}
            onToggleAutoRotate={toggleAutoRotate}
          />
        </div>
      </nav>

      {tenantId && dataLoaded && shouldOfferSampleMenu && (
        <div style={{
          margin: isMobile ? '8px 10px 0' : '10px 14px 0',
          padding: '10px 12px', borderRadius: 12,
          background: 'var(--brand-lt2)', border: '1px solid rgba(168,217,200,0.35)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--fs-13)', color: 'var(--text)' }}>No products added yet</div>
            <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text2)' }}>
              Add sample categories and products now, then edit them anytime.
            </div>
          </div>
          <button onClick={openSamplePrompt} style={{
            background: 'var(--brand)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '9px 13px', fontSize: 'var(--fs-12)', fontWeight: 800,
          }}>Add sample menu</button>
        </div>
      )}

      {tenantId && !dataLoaded && (
        <div style={{ height:3, background:'var(--brand-lt)', flexShrink:0, overflow:'hidden' }}>
          <div style={{ width:'42%', height:'100%', background:'var(--brand)', animation:'loadBar 1s ease-in-out infinite' }}/>
        </div>
      )}

      {/* ── Page content ───────────────────────────────────────── */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {renderPage()}
      </div>

      <SampleMenuSeeder
        open={sampleOpen}
        onClose={dismissSamplePrompt}
        onSeeded={() => {
          setTenantHasProducts(true)
          setMenuLoadedTenantId(tenantId)
          if (samplePromptKey) localStorage.setItem(samplePromptKey, '1')
        }}
      />
    </div>
  )
}
