import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { normalizeIndianPhone } from '../../utils/invoice'

const BRAND = '#0F6E56'
const inputStyle = { width:'100%', border:'1.5px solid #B8D7CC', borderRadius:12, padding:'12px 13px', fontSize:16, outline:'none' }
const ACTIVE = ['pending','preparing','ready','open','in-progress']
function fmt(iso) { return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) }
function statusLabel(status) { return status === 'preparing' || status === 'in-progress' ? 'Preparing' : status === 'ready' ? 'Ready' : 'Received' }

export default function TableLanding() {
  const match = window.location.pathname.match(/^\/t\/([^/]+)\/table\/([^/]+)/)
  const slug = match?.[1]
  const tableNumber = match?.[2]
  const [tenant, setTenant] = useState(null)
  const [active, setActive] = useState(null)
  const [invalid, setInvalid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [phone, setPhone] = useState('')
  const [history, setHistory] = useState([])
  const [historySearched, setHistorySearched] = useState(false)
  const timerRef = useRef(null)

  async function loadTenant() {
    const { data } = await supabase.from('tenants').select('id,biz_name,name,logo_url,table_count').eq('slug', slug).maybeSingle()
    setTenant(data || null)
    const count = Number(data?.table_count || 0)
    if (!data || !Number.isFinite(Number(tableNumber)) || Number(tableNumber) < 1 || Number(tableNumber) > count) setInvalid(true)
    return data
  }

  async function loadActive(knownTenant = tenant) {
    if (!knownTenant?.id || invalid) return
    const { data } = await supabase.from('orders')
      .select('id,status,total,created_at,order_items(product_name,product_icon,qty,unit_price,status)')
      .eq('tenant_id', knownTenant.id).eq('table_number', String(tableNumber)).in('status', ACTIVE).order('created_at', { ascending:false }).limit(1).maybeSingle()
    setActive(data || null); setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    async function boot() { const t = await loadTenant(); if (!cancelled) await loadActive(t) }
    boot()
    return () => { cancelled = true }
  }, [slug, tableNumber])

  useEffect(() => {
    function schedule() {
      clearInterval(timerRef.current)
      if (document.hidden || invalid) return
      timerRef.current = setInterval(() => loadActive(), 12000)
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    return () => { clearInterval(timerRef.current); document.removeEventListener('visibilitychange', schedule) }
  }, [tenant?.id, invalid])

  async function lookupHistory(e) {
    e.preventDefault()
    const normalized = normalizeIndianPhone(phone)
    if (!/^\d{10}$/.test(normalized)) return
    const { data } = await supabase.from('orders')
      .select('id,invoice_token,created_at,total')
      .eq('tenant_id', tenant.id).eq('table_number', String(tableNumber)).eq('customer_phone', normalized).in('status', ['paid','completed']).order('created_at', { ascending:false }).limit(20)
    setHistory(data || []); setHistorySearched(true)
  }

  if (invalid && !loading) return <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', fontFamily:'Inter,sans-serif', padding:20, textAlign:'center' }}>This table no longer exists. Please ask staff for help.</div>

  const items = (active?.order_items || []).filter(i => i.status !== 'rejected')
  return (
    <div style={{ minHeight:'100vh', background:'#F7FAF8', fontFamily:'Inter,system-ui,sans-serif', color:'#10231D', padding:'20px 14px' }}>
      <main style={{ maxWidth:560, margin:'0 auto' }}>
        <section style={{ background:'#fff', border:'1px solid #DDE7E2', borderRadius:24, padding:18, boxShadow:'0 16px 42px rgba(15,110,86,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>{tenant?.logo_url && <img alt="" src={tenant.logo_url} style={{ width:54, height:54, objectFit:'contain' }}/>}<h1 style={{ margin:'8px 0 0', color:BRAND }}>Table {tableNumber}</h1></div>
            {active && <span style={{ background:'#E7F7F1', color:BRAND, borderRadius:999, padding:'7px 11px', fontWeight:900 }}>{statusLabel(active.status)}</span>}
          </div>
          {loading ? <p>Loading order…</p> : active ? (
            <div style={{ marginTop:14 }}>
              {items.map((item, idx) => <div key={idx} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #EDF3F0', padding:'9px 0' }}><span>{item.product_icon || '🍽'} {item.product_name} ×{item.qty}</span><strong>₹{(Number(item.unit_price) * item.qty).toFixed(2)}</strong></div>)}
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:14, fontSize:20, fontWeight:900, color:BRAND }}><span>Running total</span><span>₹{Number(active.total).toFixed(2)}</span></div>
            </div>
          ) : <div style={{ textAlign:'center', padding:24 }}>{tenant?.logo_url && <img alt="" src={tenant.logo_url} style={{ width:70, height:70, objectFit:'contain' }}/>}<p>No active order on this table</p></div>}
        </section>
        <section style={{ marginTop:14, background:'#fff', border:'1px solid #DDE7E2', borderRadius:18, overflow:'hidden' }}>
          <button onClick={() => setExpanded(v => !v)} style={{ width:'100%', padding:15, border:'none', background:'#fff', fontWeight:900, textAlign:'left' }}>View your past invoices {expanded ? '−' : '+'}</button>
          {expanded && <form onSubmit={lookupHistory} style={{ padding:15, borderTop:'1px solid #EDF3F0', display:'grid', gap:10 }}><input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="numeric" placeholder="Enter mobile number" style={inputStyle}/><button style={{ border:'none', borderRadius:12, padding:12, background:BRAND, color:'#fff', fontWeight:900 }}>Find invoices</button>{historySearched && (history.length ? history.map(o => <a key={o.id} href={`/invoice/${o.invoice_token || o.id}`} style={{ color:BRAND, textDecoration:'none', padding:'8px 0' }}>{fmt(o.created_at)} · ₹{Number(o.total).toFixed(2)}</a>) : <div style={{ color:'#61746D' }}>No invoices found for this number.</div>)}</form>}
        </section>
      </main>
    </div>
  )
}
