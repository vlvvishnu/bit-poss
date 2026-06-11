import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase'
import ShareInvoiceButton from '../components/invoice/ShareInvoiceButton'
import { invoiceUrl, isValidCustomerPhone, normalizeIndianPhone } from '../utils/invoice'

const BRAND = '#0F6E56'
const ACCENT = '#1D9E75'
const cache = new Map()

const L = {
  page: { minHeight:'100vh', background:'#F7FAF8', fontFamily:'Inter, system-ui, sans-serif', color:'#10231D', paddingBottom:40 },
  top: { position:'sticky', top:0, zIndex:5, background:'#fff', borderBottom:'1px solid #DDE7E2', padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  wrap: { width:'100%', maxWidth:520, margin:'0 auto', padding:'0 14px' },
  card: { background:'#fff', border:'1px solid #DDE7E2', borderRadius:22, overflow:'hidden', marginTop:18, boxShadow:'0 16px 42px rgba(15,110,86,0.08)' },
  input: { width:'100%', border:'1.5px solid #B8D7CC', borderRadius:12, padding:'13px 14px', fontSize:16, outline:'none' },
  btn: { width:'100%', border:'none', borderRadius:12, padding:'13px 14px', background:BRAND, color:'#fff', fontWeight:800, cursor:'pointer' },
}

function fmt(iso) {
  return new Date(iso).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true })
}

function orderKind(order) {
  return order?.order_type === 'dine' || order?.order_type === 'dine-in' ? 'dine-in' : 'takeaway'
}

function FriendlyState({ icon='🧾', title, body }) {
  return (
    <div style={{ ...L.page, display:'grid', placeItems:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:46, marginBottom:12 }}>{icon}</div>
        <h2 style={{ margin:'0 0 8px', fontSize:22 }}>{title}</h2>
        <p style={{ margin:0, color:'#61746D', lineHeight:1.5 }}>{body}</p>
      </div>
    </div>
  )
}

function PhoneGate({ onSave, saving, error }) {
  const [phone, setPhone] = useState('')
  const normalized = normalizeIndianPhone(phone)
  return (
    <div style={{ ...L.page, display:'grid', placeItems:'center', padding:18 }}>
      <div style={{ width:'100%', maxWidth:420, background:'#fff', border:'1px solid #DDE7E2', borderRadius:24, padding:22, boxShadow:'0 18px 50px rgba(15,110,86,0.12)' }}>
        <div style={{ fontSize:42, marginBottom:10 }}>📱</div>
        <h1 style={{ margin:'0 0 8px', fontSize:24, letterSpacing:-0.4 }}>Enter your mobile number to view your invoice</h1>
        <p style={{ margin:'0 0 18px', color:'#61746D', lineHeight:1.45 }}>Takeaway invoices require a mobile number. We will save it once and unlock your invoice immediately.</p>
        <input autoFocus inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10 digit mobile number" style={L.input}/>
        <button disabled={saving || !isValidCustomerPhone(phone)} onClick={()=>onSave(normalized)} style={{ ...L.btn, marginTop:12, opacity:(saving || !isValidCustomerPhone(phone)) ? 0.55 : 1 }}>{saving ? 'Saving…' : 'View invoice'}</button>
        {error && <div style={{ color:'#B42318', marginTop:10, fontSize:13 }}>{error}</div>}
      </div>
    </div>
  )
}

function SaveNumberPrompt({ order, onSaved }) {
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function save() {
    const normalized = normalizeIndianPhone(phone)
    if (!/^\d{10}$/.test(normalized)) { setMessage('Please enter a valid 10 digit mobile number.'); return }
    setSaving(true); setMessage('')
    const { error } = await supabase.from('orders').update({ customer_phone: normalized }).eq('id', order.id).is('customer_phone', null)
    setSaving(false)
    if (error) { setMessage('We could not save this right now. Please try again.'); return }
    setMessage('Saved! Scan the table QR anytime to retrieve past invoices.')
    onSaved(normalized)
  }

  return (
    <div className="no-print" style={{ marginTop:18, border:'1px dashed #9BD7C1', background:'#F0FBF6', borderRadius:16, padding:14 }}>
      <div style={{ fontWeight:800, marginBottom:4 }}>Save this invoice to your number for future retrieval</div>
      <div style={{ color:'#61746D', fontSize:13, marginBottom:10 }}>Optional for dine-in orders. Your invoice is visible either way.</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <input inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10 digit mobile" style={{ ...L.input, flex:'1 1 180px' }}/>
        <button onClick={save} disabled={saving} style={{ ...L.btn, width:'auto', minWidth:120 }}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      {message && <div style={{ marginTop:9, color:message.startsWith('Saved') ? BRAND : '#B42318', fontSize:13 }}>{message}</div>}
    </div>
  )
}

export default function Invoice() {
  const token = window.location.pathname.split('/invoice/')[1]?.split('?')[0]
  const [order, setOrder] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const printRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) { setError('Invalid invoice link.'); setLoading(false); return }
      if (cache.has(token)) {
        const cached = cache.get(token)
        setOrder(cached.order); setTenant(cached.tenant); setLoading(false)
        return
      }
      setLoading(true); setError('')
      let result = await supabase.from('orders').select('*, order_items(id,product_name,product_icon,qty,unit_price,status,notes)').eq('invoice_token', token).maybeSingle()
      if (!result.data && !result.error) {
        result = await supabase.from('orders').select('*, order_items(id,product_name,product_icon,qty,unit_price,status,notes)').eq('id', token).maybeSingle()
      }
      if (cancelled) return
      if (result.error || !result.data) { setError('Invoice not found.'); setLoading(false); return }
      const { data:t } = await supabase.from('tenants').select('id,biz_name,name,logo_url,address,phone,upi_id').eq('id', result.data.tenant_id).maybeSingle()
      if (cancelled) return
      cache.set(token, { order: result.data, tenant: t || null })
      setOrder(result.data); setTenant(t || null); setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [token])

  async function savePhone(normalized) {
    setPhoneSaving(true); setPhoneError('')
    const { data, error } = await supabase.from('orders')
      .update({ customer_phone: normalized })
      .eq('id', order.id)
      .is('customer_phone', null)
      .select('*, order_items(id,product_name,product_icon,qty,unit_price,status,notes)')
      .maybeSingle()
    setPhoneSaving(false)
    if (error) { setPhoneError('We could not save this number. Please try again.'); return }
    const updated = data || { ...order, customer_phone: normalized }
    setOrder(updated)
    cache.set(token, { order: updated, tenant })
  }

  const activeItems = useMemo(() => (order?.order_items || []).filter(i => i.status !== 'rejected'), [order])
  const restaurantName = tenant?.biz_name || tenant?.name || 'Restaurant'
  const kind = orderKind(order)
  const gated = order && kind === 'takeaway' && !order.customer_phone
  const url = invoiceUrl(order?.invoice_token || token)

  if (loading) return <FriendlyState icon="" title="Loading invoice…" body="Please wait while we fetch your bill." />
  if (error) return <FriendlyState title={error} body="Please check the link or ask staff for help." />
  if (gated) return <PhoneGate onSave={savePhone} saving={phoneSaving} error={phoneError} />

  return (
    <div style={L.page}>
      <style>{`@media print{.no-print{display:none!important}body{background:#fff}.print-card{box-shadow:none!important;border:none!important;margin:0!important}}`}</style>
      <div style={L.top} className="no-print">
        <strong style={{ color:BRAND, fontSize:20 }}>BITE.</strong>
        <span style={{ color:'#61746D', fontSize:13 }}>Invoice</span>
      </div>
      <main style={L.wrap}>
        <div ref={printRef} className="print-card" style={L.card}>
          <div style={{ background:BRAND, color:'#fff', padding:22 }}>
            {tenant?.logo_url && <img alt="" src={tenant.logo_url} style={{ width:54, height:54, objectFit:'contain', background:'#fff', borderRadius:14, padding:6, marginBottom:10 }}/>}
            <h1 style={{ margin:'0 0 6px', fontSize:25, letterSpacing:-0.5 }}>{restaurantName}</h1>
            {tenant?.address && <div style={{ opacity:0.75, fontSize:13 }}>{tenant.address}</div>}
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginTop:18 }}>
              <div>
                <div style={{ opacity:0.7, fontSize:11, textTransform:'uppercase', letterSpacing:1 }}>Invoice</div>
                <div style={{ fontWeight:900, fontSize:22, color:'#BDF4DF' }}>#{order.order_number || String(order.id).slice(0, 8)}</div>
              </div>
              <div style={{ textAlign:'right', fontSize:12, opacity:0.86 }}>
                <div>{fmt(order.created_at)}</div>
                <div style={{ marginTop:5, display:'inline-block', background:'rgba(255,255,255,0.14)', borderRadius:999, padding:'4px 9px' }}>{kind === 'dine-in' ? 'Dine-in' : 'Takeaway'}</div>
                {kind === 'dine-in' && order.table_number && <div style={{ marginTop:5 }}>Table {order.table_number}</div>}
              </div>
            </div>
          </div>
          <div style={{ padding:18 }}>
            <div style={{ fontSize:11, fontWeight:900, color:'#61746D', textTransform:'uppercase', letterSpacing:0.8, marginBottom:7 }}>Items</div>
            {activeItems.map((item, idx) => (
              <div key={item.id || idx} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'10px 0', borderBottom:idx < activeItems.length - 1 ? '1px solid #EDF3F0' : 'none' }}>
                <div>
                  <div style={{ fontWeight:750 }}>{item.product_icon || '🍽'} {item.product_name}</div>
                  {item.notes && <div style={{ color:ACCENT, fontSize:12, marginTop:2 }}>📝 {item.notes}</div>}
                  <div style={{ color:'#61746D', fontSize:13 }}>₹{Number(item.unit_price).toFixed(2)} × {item.qty}</div>
                </div>
                <strong>₹{(Number(item.unit_price) * Number(item.qty)).toFixed(2)}</strong>
              </div>
            ))}
            <div style={{ borderTop:'1px solid #DDE7E2', marginTop:12, paddingTop:12, display:'grid', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', color:'#61746D' }}><span>Subtotal</span><span>₹{Number(order.subtotal || order.total || 0).toFixed(2)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', color:'#61746D' }}><span>Tax</span><span>₹{Number(order.tax || 0).toFixed(2)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:900, color:BRAND }}><span>Grand total</span><span>₹{Number(order.total || 0).toFixed(2)}</span></div>
            </div>
            <div className="no-print" style={{ display:'grid', gap:10, marginTop:18 }}>
              <ShareInvoiceButton restaurantName={restaurantName} total={order.total} url={url}/>
              <button onClick={() => window.print()} style={{ ...L.btn, background:ACCENT }}>Download PDF</button>
            </div>
            {kind === 'dine-in' && !order.customer_phone && <SaveNumberPrompt order={order} onSaved={phone => setOrder(o => ({ ...o, customer_phone: phone }))}/>}
          </div>
        </div>
      </main>
    </div>
  )
}
