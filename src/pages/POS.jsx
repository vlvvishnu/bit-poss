import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { useTheme } from '../store/useTheme'
import OrderPage from '../components/order/OrderPage'
import TableView from '../components/order/TableView'
import TableSession from '../components/order/TableSession'
import KDS from '../components/kitchen/KDS'
import ProductsPage from '../components/manage/Products'
import CategoriesPage from '../components/manage/Categories'
import HistoryPage from '../components/manage/History'
import SettingsPage from '../components/manage/Settings'
import Modal from '../components/ui/Modal'

const NAV = [
  { id: 'order',      icon: '🛒', label: 'Order'      },
  { id: 'kitchen',    icon: '🍳', label: 'Kitchen'    },
  { id: 'history',    icon: '📋', label: 'History'    },
  { id: 'products',   icon: '🏷', label: 'Products'   },
  { id: 'categories', icon: '📦', label: 'Categories' },
  { id: 'settings',   icon: '⚙️', label: 'Settings'   },
]

// ── Table checkout modal ──────────────────────────────────────────
function TableCheckoutModal({ data, onClose, onDone }) {
  const { tenantId, showToast } = useStore()
  const [payMethod, setPayMethod] = useState('cash')
  const [loading, setLoading]    = useState(false)

  if (!data) return null
  const { orders, activeItems, sub, tax, total, tableLabel, tableNumber } = data

  const PAY = [
    { id: 'upi',   icon: '📱', label: 'UPI'  },
    { id: 'cash',  icon: '💵', label: 'Cash' },
    { id: 'card',  icon: '💳', label: 'Card' },
    { id: 'other', icon: '🔖', label: 'Other' },
  ]

  async function confirmPayment() {
    setLoading(true)
    try {
      // Mark all open orders for this table as paid
      const orderIds = orders.map(o => o.id)
      await supabase.from('orders')
        .update({ status: 'paid', payment_method: payMethod, paid_at: new Date().toISOString() })
        .in('id', orderIds)
      showToast(`${tableLabel} checked out ✓`, 'success')
      onDone()
    } catch (e) {
      showToast(e.message || 'Error', 'error')
    }
    setLoading(false)
  }

  return (
    <Modal open title={`Checkout — ${tableLabel}`} onClose={onClose}
      footer={
        <button onClick={confirmPayment} disabled={loading} style={{
          width: '100%', background: 'var(--green)', color: '#fff',
          border: 'none', borderRadius: 8, padding: 13, fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />}
          {loading ? 'Processing…' : `Collect ₹${total.toFixed(2)} →`}
        </button>
      }>
      {/* Bill */}
      <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--brand)' }}>{tableLabel} — Final Bill</div>
        {activeItems.map(i => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
            <span>{i.product_icon} {i.product_name} ×{i.qty}</span>
            <span>₹{(Number(i.unit_price) * i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
          <span>Subtotal</span><span>₹{sub.toFixed(2)}</span>
        </div>
        {tax > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
            <span>Tax</span><span>₹{tax.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
          <span>Total</span><span style={{ color: 'var(--brand)' }}>₹{total.toFixed(2)}</span>
        </div>
      </div>
      {/* Payment method */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>Payment method</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {PAY.map(m => (
          <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
            background: payMethod === m.id ? 'var(--brand-lt)' : 'var(--card2)',
            border: `2px solid ${payMethod === m.id ? 'rgba(232,68,10,0.4)' : 'var(--border)'}`,
            borderRadius: 10, padding: '12px 6px', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{m.label}</div>
          </button>
        ))}
      </div>
    </Modal>
  )
}

export default function POS() {
  const { page, setPage, setCategories, setProducts, tenantId, user, showToast, settings, setSettings } = useStore()
  const { dark, toggle: toggleTheme } = useTheme()
  const [clock, setClock]         = useState('')
  const [openTable, setOpenTable] = useState(null)    // { table_number, table_name, ... }
  const [checkoutData, setCheckoutData] = useState(null)

  useEffect(() => {
    if (!tenantId) return
    loadData()
    loadSettings()
  }, [tenantId])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
    }
    tick()
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])

  async function loadData() {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('products').select('*, categories(name,icon)').eq('tenant_id', tenantId).order('sort_order'),
    ])
    setCategories(cats || [])
    setProducts((prods || []).map(p => ({
      ...p, catName: p.categories?.name || '', catIcon: p.categories?.icon || '',
    })))
  }

  async function loadSettings() {
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) setSettings(data)
  }

  async function handleSignOut() {
    if (!confirm('Sign out?')) return
    await supabase.auth.signOut()
  }

  const bizName = settings?.biz_name || settings?.name || user?.user_metadata?.biz_name || 'BITE.'

  // If a table is open, show table session full screen
  if (openTable) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
        <TableSession
          table={openTable}
          onClose={() => setOpenTable(null)}
          onCheckout={(data) => setCheckoutData(data)}
        />
        <TableCheckoutModal
          data={checkoutData}
          onClose={() => setCheckoutData(null)}
          onDone={() => { setCheckoutData(null); setOpenTable(null) }}
        />
      </div>
    )
  }

  const PAGES = {
    order:      <OrderPage />,
    tables:     <TableView onOpenTable={t => setOpenTable(t)} />,
    kitchen:    <KDS />,
    history:    <HistoryPage />,
    products:   <ProductsPage />,
    categories: <CategoriesPage />,
    settings:   <SettingsPage />,
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '0 12px', gap: 2 }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px', marginRight: 12, flexShrink: 0 }}>
          BITE<span style={{ color: 'var(--brand)' }}>.</span>
        </div>
        <div style={{ display: 'flex', gap: 1, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              background: page === n.id ? 'var(--card2)' : 'none',
              border: 'none', borderRadius: 'var(--r-sm)',
              color: page === n.id ? 'var(--text)' : 'var(--text2)',
              padding: '6px 10px', fontSize: 12,
              fontWeight: page === n.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 4,
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 13 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bizName}
          </div>
          <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', padding: '4px 8px', fontSize: 14, cursor: 'pointer' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
            ↩ Out
          </button>
        </div>
      </nav>

      {/* Page */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {PAGES[page] || PAGES.order}
      </div>
    </div>
  )
}
