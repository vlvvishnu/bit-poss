import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { normalizeIndianPhone } from '../../utils/invoice'

const BRAND = '#0F6E56'
const inputStyle = { width:'100%', border:'1.5px solid #B8D7CC', borderRadius:12, padding:'13px 14px', fontSize:16, outline:'none' }

function fmt(iso) { return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) }

export default function TakeawayLookup() {
  const slug = window.location.pathname.split('/t/')[1]?.split('/takeaway')[0]
  const params = new URLSearchParams(window.location.search)
  const [tenant, setTenant] = useState(null)
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadTenant() {
      const { data } = await supabase.from('tenants').select('id,biz_name,name,logo_url').eq('slug', slug).maybeSingle()
      if (!cancelled) { setTenant(data || null); setLoading(false) }
    }
    loadTenant()
    return () => { cancelled = true }
  }, [slug])

  async function lookup(e) {
    e.preventDefault()
    const normalized = normalizeIndianPhone(phone)
    if (!/^\d{10}$/.test(normalized)) { setError('Please enter a valid 10 digit mobile number.'); return }
    setLoading(true); setError(''); setSearched(true)
    const { data, error:err } = await supabase.from('orders')
      .select('id,invoice_token,created_at,total,order_type,order_items(product_name,qty,unit_price,status)')
      .eq('tenant_id', tenant.id).eq('customer_phone', normalized).in('status', ['paid','completed']).order('created_at', { ascending:false }).limit(20)
    setLoading(false)
    if (err) { setError('We could not load invoices right now. Please try again.'); return }
    setOrders(data || [])
  }

  if (!tenant && !loading) return <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', fontFamily:'Inter,sans-serif', padding:20, textAlign:'center' }}>Restaurant not found. Please ask staff for help.</div>

  return (
    <div style={{ minHeight:'100vh', background:'#F7FAF8', fontFamily:'Inter,system-ui,sans-serif', color:'#10231D', padding:'24px 14px' }}>
      <main style={{ maxWidth:520, margin:'0 auto' }}>
        <section style={{ background:'#fff', border:'1px solid #DDE7E2', borderRadius:24, padding:22, boxShadow:'0 16px 42px rgba(15,110,86,0.08)' }}>
          {tenant?.logo_url && <img alt="" src={tenant.logo_url} style={{ width:64, height:64, objectFit:'contain', marginBottom:12 }}/>}
          <h1 style={{ margin:'0 0 4px', color:BRAND }}>{tenant?.biz_name || tenant?.name || 'Restaurant'}</h1>
          <h2 style={{ margin:'0 0 16px', fontSize:22 }}>View your invoices</h2>
          <form onSubmit={lookup} style={{ display:'grid', gap:10 }}>
            <input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="numeric" placeholder="Enter your mobile number" style={inputStyle}/>
            <button disabled={loading} style={{ border:'none', borderRadius:12, padding:'13px 14px', background:BRAND, color:'#fff', fontWeight:900 }}>{loading ? 'Loading…' : 'Find invoices'}</button>
          </form>
          {error && <div style={{ marginTop:10, color:'#B42318', fontSize:13 }}>{error}</div>}
        </section>
        {searched && !loading && (
          <section style={{ marginTop:16 }}>
            {orders.length ? orders.map(order => (
              <a key={order.id} href={`/invoice/${order.invoice_token || order.id}`} style={{ display:'block', textDecoration:'none', color:'inherit', background:'#fff', border:'1px solid #DDE7E2', borderRadius:16, padding:14, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}><strong>{fmt(order.created_at)}</strong><strong style={{ color:BRAND }}>₹{Number(order.total).toFixed(2)}</strong></div>
                <div style={{ color:'#61746D', fontSize:13, marginTop:4 }}>{order.order_type === 'dine' ? 'Dine-in' : 'Takeaway'} · {(order.order_items || []).filter(i=>i.status !== 'rejected').length} items</div>
              </a>
            )) : <div style={{ textAlign:'center', color:'#61746D', padding:24 }}>No invoices found for this number. Please check the number or ask staff.</div>}
          </section>
        )}
      </main>
    </div>
  )
}
