import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'
import { useTheme } from '../store/useTheme'
import OrderPage from '../components/order/OrderPage'
import ProductsPage from '../components/manage/Products'
import CategoriesPage from '../components/manage/Categories'
import HistoryPage from '../components/manage/History'
import SettingsPage from '../components/manage/Settings'

const NAV = [
  { id: 'order',      icon: '🛒', label: 'Order'      },
  { id: 'history',    icon: '📋', label: 'History'    },
  { id: 'products',   icon: '🍽', label: 'Products'   },
  { id: 'categories', icon: '🏷', label: 'Categories' },
  { id: 'settings',   icon: '⚙️', label: 'Settings'   },
]

const PAGES = {
  order:      <OrderPage />,
  history:    <HistoryPage />,
  products:   <ProductsPage />,
  categories: <CategoriesPage />,
  settings:   <SettingsPage />,
}

export default function POS() {
  const { page, setPage, setCategories, setProducts, tenantId, user, showToast, settings, setSettings } = useStore()
  const { dark, toggle: toggleTheme } = useTheme()
  const [mobNavOpen, setMobNavOpen] = useState(false)
  const [clock, setClock] = useState('')

  // Load initial data
  useEffect(() => {
    if (!tenantId) return
    loadData()
    loadSettings()
  }, [tenantId])

  // Clock
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
      ...p,
      catName: p.categories?.name || '',
      catIcon: p.categories?.icon || '',
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top nav */}
      <nav style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)', background: 'var(--bg)',
        padding: '0 12px', gap: 4,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 17,
          letterSpacing: '-0.5px', marginRight: 16, flexShrink: 0,
          color: 'var(--text)',
        }}>
          BITE<span style={{ color: 'var(--brand)' }}>.</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, fontFamily: "'DM Sans'", marginLeft: 4 }}>
            by Pay4
          </span>
        </div>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{
                background: page === n.id ? 'var(--card2)' : 'none',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                color: page === n.id ? 'var(--text)' : 'var(--text2)',
                padding: '6px 12px',
                fontSize: 12, fontWeight: page === n.id ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', flexShrink: 0,
              }}>
              <span style={{ fontSize: 13 }}>{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text2)',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '3px 8px', maxWidth: 120,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{bizName}</div>
          <button onClick={toggleTheme} title="Toggle theme" style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text2)', padding: '4px 8px',
            fontSize: 14, cursor: 'pointer',
          }}>{dark ? '☀️' : '🌙'}</button>
          <button onClick={handleSignOut} style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text2)', padding: '4px 8px',
            fontSize: 11, cursor: 'pointer',
          }}>↩ Out</button>
        </div>
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {PAGES[page]}
      </div>
    </div>
  )
}