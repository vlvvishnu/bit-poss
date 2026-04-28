import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

// ── Order Type Bar ────────────────────────────────────────────────
function OrderTypeBar() {
  const { orderType, setOrderType, tableNumber, tableName, setTable, settings } = useStore()
  const [pickerOpen, setPickerOpen] = useState(false)
  const tableCount = settings?.table_count || 10
  const tables = Array.from({ length: tableCount }, (_, i) => ({
    num: i + 1, name: `T${i + 1}`,
  }))

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap', position:'relative' }}>
      {[
        { id:'dine',     label:'🍽 Dine In' },
        { id:'takeaway', label:'🛍 Takeaway' },
        { id:'stall',    label:'🏪 Stall' },
      ].map(t => (
        <button key={t.id} onClick={() => setOrderType(t.id)} style={{
          background: orderType===t.id ? 'var(--brand-lt)' : 'var(--card)',
          border: `1.5px solid ${orderType===t.id ? 'rgba(232,68,10,0.3)' : 'var(--border)'}`,
          borderRadius: 'var(--r-sm)', padding:'5px 12px',
          color: orderType===t.id ? 'var(--brand)' : 'var(--text2)',
          fontSize:12, fontWeight:600, cursor:'pointer',
        }}>{t.label}</button>
      ))}

      {orderType === 'dine' && (
        <>
          <button onClick={() => setPickerOpen(p => !p)} style={{
            background: tableNumber ? 'var(--brand)' : 'var(--card)',
            border: `1.5px solid ${tableNumber ? 'var(--brand)' : 'var(--border)'}`,
            borderRadius:'var(--r-sm)', padding:'5px 12px',
            color: tableNumber ? '#fff' : 'var(--text2)',
            fontSize:12, fontWeight:700, cursor:'pointer',
          }}>
            {tableNumber ? `Table ${tableName||tableNumber}` : '+ Select Table'} ▾
          </button>

          {pickerOpen && (
            <div style={{
              position:'fixed', inset:0, zIndex:300,
            }} onClick={() => setPickerOpen(false)}>
              <div onClick={e => e.stopPropagation()} style={{
                position:'absolute', top:100, left:12,
                background:'var(--card2)', border:'1px solid var(--border2)',
                borderRadius:'var(--r-lg)', padding:16, minWidth:240,
                boxShadow:'0 12px 40px rgba(0,0,0,0.4)', zIndex:400,
                animation:'popIn 0.15s ease',
              }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
                  Select Table
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {tables.map(t => (
                    <button key={t.num} onClick={() => { setTable(t.num, t.name); setPickerOpen(false) }} style={{
                      minWidth:42, height:36, borderRadius:8,
                      background: tableNumber===t.num ? 'var(--brand)' : 'var(--card)',
                      border: `1.5px solid ${tableNumber===t.num ? 'var(--brand)' : 'var(--border2)'}`,
                      color: tableNumber===t.num ? '#fff' : 'var(--text)',
                      fontSize:12, fontWeight:700, cursor:'pointer',
                    }}>{t.name}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Menu ──────────────────────────────────────────────────────────
function MenuPane() {
  const { categories, products, addToCart, cart } = useStore()
  const [activeCat, setActiveCat] = useState('all')

  const groups = useMemo(() => {
    const filtered = activeCat === 'all' ? products : products.filter(p => String(p.category_id) === activeCat)
    const map = {}
    filtered.forEach(p => {
      const key = p.category_id || 'other'
      if (!map[key]) map[key] = { name: p.catName||'Other', icon: p.catIcon||'', items:[] }
      map[key].items.push(p)
    })
    return Object.values(map)
  }, [products, activeCat])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Category strip */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', borderBottom:'1px solid var(--border)', flexShrink:0, scrollbarWidth:'none' }}>
        {[{ id:'all', name:'All', icon:'' }, ...categories].map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(String(cat.id))} style={{
            flexShrink:0, padding:'4px 12px', borderRadius:20,
            background: activeCat===String(cat.id) ? 'var(--brand-lt)' : 'none',
            border: `1.5px solid ${activeCat===String(cat.id) ? 'rgba(232,68,10,0.3)' : 'var(--border)'}`,
            color: activeCat===String(cat.id) ? 'var(--brand)' : 'var(--text2)',
            fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
          }}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:'auto', padding:12 }}>
        {products.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'var(--text2)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🍽</div>
            <div>No products yet. Add them in Products tab.</div>
          </div>
        )}
        {groups.map(group => (
          <div key={group.name}>
            {activeCat === 'all' && (
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'10px 0 6px' }}>
                {group.icon} {group.name}
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:12 }}>
              {group.items.map(p => {
                const qty = cart[p.id]?.qty
                const oos = p.out_of_stock
                return (
                  <button key={p.id} onClick={() => !oos && addToCart(p)} disabled={oos}
                    style={{
                      background: qty ? 'var(--brand-lt2)' : 'var(--card)',
                      border: `1.5px solid ${qty ? 'rgba(232,68,10,0.25)' : 'var(--border)'}`,
                      borderRadius:'var(--r)', padding:'10px 8px',
                      cursor: oos ? 'not-allowed' : 'pointer',
                      opacity: oos ? 0.45 : 1,
                      display:'flex', flexDirection:'column', gap:4,
                      textAlign:'left', position:'relative',
                    }}>
                    <span style={{ fontSize:22 }}>{p.icon||'🍽'}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.3 }}>{p.name}</span>
                    <span style={{ fontSize:12, color:'var(--brand)', fontWeight:700 }}>₹{Number(p.price).toFixed(2)}</span>
                    {qty && <span style={{ position:'absolute', top:6, right:6, background:'var(--brand)', color:'#fff', fontSize:10, fontWeight:800, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center' }}>{qty}</span>}
                    {oos && <span style={{ fontSize:10, color:'var(--red)', fontWeight:600 }}>Out of stock</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Cart ──────────────────────────────────────────────────────────
function CartPane({ onCheckout }) {
  const { cart, cartItems, cartSubtotal, addToCart, removeFromCart, clearCart, orderType, tableNumber, tableName, settings } = useStore()
  const items = cartItems()
  const sub = cartSubtotal()
  const taxRate = (settings?.tax_rate||0)/100
  const tax = sub * taxRate
  const total = sub + tax

  const typeLabel = orderType==='dine' ? `🍽 Table ${tableName||tableNumber||'?'}` : orderType==='takeaway' ? '🛍 Takeaway' : '🏪 Stall'

  return (
    <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column', borderLeft:'1px solid var(--border)', background:'var(--bg)' }}>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>Current Order</div>
          <div style={{ fontSize:11, color:'var(--brand)', fontWeight:600 }}>{typeLabel}</div>
        </div>
        {items.length > 0 && <button onClick={clearCart} style={{ background:'none', border:'none', color:'var(--text2)', fontSize:11, cursor:'pointer', padding:'2px 6px' }}>Clear</button>}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 16px', color:'var(--text3)' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🛒</div>
            <div style={{ fontSize:12 }}>Tap items to add</div>
          </div>
        ) : items.map(item => (
          <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px' }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{item.icon||'🍽'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
              <div style={{ fontSize:11, color:'var(--brand)', fontWeight:600 }}>₹{(item.price*item.qty).toFixed(2)}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <button onClick={() => removeFromCart(item.id)} style={{ width:22, height:22, borderRadius:'50%', background:'var(--card2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>−</button>
              <span style={{ fontSize:12, fontWeight:700, minWidth:16, textAlign:'center' }}>{item.qty}</span>
              <button onClick={() => addToCart(item)} style={{ width:22, height:22, borderRadius:'50%', background:'var(--brand)', border:'none', color:'#fff', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div style={{ borderTop:'1px solid var(--border)', padding:14, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:4 }}>
            <span>Subtotal</span><span>₹{sub.toFixed(2)}</span>
          </div>
          {taxRate > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)', marginBottom:8 }}>
              <span>Tax ({settings?.tax_rate}%)</span><span>₹{tax.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:800, marginBottom:12 }}>
            <span>Total</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout} style={{ width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:13, fontWeight:700, fontSize:14 }}>
            Checkout →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Checkout Modal ────────────────────────────────────────────────
function CheckoutModal({ open, onClose, onSuccess }) {
  const { cart, cartItems, cartSubtotal, clearCart, orderType, tableNumber, tableName, tenantId, settings, showToast } = useStore()
  const [step, setStep]           = useState(1)
  const [phone, setPhone]         = useState('')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [payMethod, setPayMethod] = useState('upi')
  const [loading, setLoading]     = useState(false)

  const items   = cartItems()
  const sub     = cartSubtotal()
  const taxRate = (settings?.tax_rate||0)/100
  const tax     = sub * taxRate
  const total   = sub + tax
  const upiId   = settings?.upi_id||''

  const PAY = [
    { id:'upi',   icon:'📱', label:'UPI / QR',  sub:'GPay, PhonePe, Paytm' },
    { id:'cash',  icon:'💵', label:'Cash',       sub:'Collect from customer' },
    { id:'card',  icon:'💳', label:'Card',       sub:'Debit / Credit' },
    { id:'other', icon:'🔖', label:'Other',      sub:'Voucher, wallet' },
  ]

  function reset() { setStep(1); setPhone(''); setName(''); setEmail(''); setPayMethod('upi') }
  function handleClose() { reset(); onClose() }

  async function placeOrder() {
    if (!tenantId) return
    setLoading(true)
    try {
      // 1. Insert order
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          tenant_id:      tenantId,
          subtotal:       sub.toFixed(2),
          tax:            tax.toFixed(2),
          total:          total.toFixed(2),
          status:         orderType === 'dine' ? 'pending' : 'paid',
          payment_method: payMethod,
          order_type:     orderType,
          table_number:   tableNumber ? String(tableNumber) : null,
          customer_name:  name||null,
          customer_email: email||null,
          customer_phone: phone,
          paid_at:        orderType !== 'dine' ? new Date().toISOString() : null,
        })
        .select('id, order_number')
        .single()

      if (oErr) throw oErr

      // 2. Insert order items
      const { error: iErr } = await supabase.from('order_items').insert(
        items.map(i => ({
          tenant_id:    tenantId,
          order_id:     order.id,
          product_id:   i.id,
          product_name: i.name,
          product_icon: i.icon,
          unit_price:   i.price,
          qty:          i.qty,
          line_total:   i.price * i.qty,
          status:       'active',
        }))
      )
      if (iErr) throw iErr

      clearCart()
      showToast(`Order #${order.order_number} placed!`, 'success')
      onSuccess({ ...order, total, payMethod, upiId, isDine: orderType === 'dine' })
      handleClose()
    } catch (err) {
      showToast(err.message||'Error placing order', 'error')
    } finally {
      setLoading(false)
    }
  }

  const orderLabel = orderType==='dine' ? `🍽 Dine In — Table ${tableName||tableNumber||'?'}` : orderType==='takeaway' ? '🛍 Takeaway' : '🏪 Stall'

  return (
    <Modal open={open} onClose={handleClose} title="Checkout"
      footer={
        step===1 ? (
          <button form="co-form" type="submit" style={{ width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:13, fontWeight:700, fontSize:14 }}>
            Next: Payment →
          </button>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setStep(1)} style={{ flex:'0 0 80px', background:'var(--card2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8, padding:12, fontWeight:600 }}>← Back</button>
            <button onClick={placeOrder} disabled={loading} style={{ flex:1, background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:12, fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {loading && <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />}
              {loading ? 'Placing…' : orderType==='dine' ? 'Send to Kitchen →' : 'Place Order →'}
            </button>
          </div>
        )
      }>

      {/* Steps */}
      <div style={{ display:'flex', gap:0, marginBottom:20, background:'var(--bg)', borderRadius:8, padding:3 }}>
        {[['1 · Customer',1],['2 · Payment',2]].map(([label,s]) => (
          <div key={s} style={{ flex:1, textAlign:'center', padding:'7px', borderRadius:6, fontSize:12, fontWeight:600, background: step===s ? 'var(--card2)' : 'transparent', color: step>=s ? 'var(--text)' : 'var(--text3)' }}>{label}</div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 12px', marginBottom:16, fontSize:12 }}>
        <div style={{ color:'var(--brand)', fontWeight:700, marginBottom:6 }}>{orderLabel} · {items.length} item{items.length!==1?'s':''}</div>
        {items.map(i => (
          <div key={i.id} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', color:'var(--text2)' }}>
            <span>{i.icon} {i.name} ×{i.qty}</span>
            <span>₹{(i.price*i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:14, borderTop:'1px solid var(--border)', marginTop:6, paddingTop:6 }}>
          <span>Total</span><span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Step 1 */}
      {step===1 && (
        <form id="co-form" onSubmit={e => { e.preventDefault(); setStep(2) }} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { label:'Phone *', value:phone, set:setPhone, type:'tel', placeholder:'+91 98765 43210', required:true },
            { label:'Name (optional)', value:name, set:setName, placeholder:'Customer name' },
            { label:'Email (optional)', value:email, set:setEmail, type:'email', placeholder:'email@example.com' },
          ].map(f => (
            <label key={f.label} style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{f.label}</span>
              <input value={f.value} onChange={e => f.set(e.target.value)} type={f.type||'text'}
                placeholder={f.placeholder} required={f.required||false}
                style={{ width:'100%', padding:'10px 12px', background:'var(--bg)', border:'1.5px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:14, outline:'none', fontFamily:"'DM Sans'" }} />
            </label>
          ))}
        </form>
      )}

      {/* Step 2 */}
      {step===2 && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:10 }}>Select payment method</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {PAY.map(m => {
              const warn = m.id==='upi' && !upiId
              return (
                <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                  background: payMethod===m.id ? 'var(--brand-lt)' : 'var(--card2)',
                  border: `2px solid ${payMethod===m.id ? 'rgba(232,68,10,0.4)' : warn ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                  borderRadius:10, padding:'14px 10px', cursor:'pointer', textAlign:'center', transition:'all 0.12s',
                }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{m.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{m.label}</div>
                  <div style={{ fontSize:10, color: warn ? 'var(--amber)' : 'var(--text3)', marginTop:2 }}>{warn ? '⚠ UPI not set' : m.sub}</div>
                </button>
              )
            })}
          </div>
          {orderType==='dine' && (
            <div style={{ marginTop:14, background:'var(--brand-lt)', border:'1px solid rgba(232,68,10,0.2)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'var(--brand)', fontWeight:600 }}>
              🍽 Dine In order — will be sent to kitchen. Table stays open until checkout.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Success / KOT Modal ───────────────────────────────────────────
function SuccessModal({ order, onClose }) {
  if (!order) return null
  const upiLink = order.upiId && order.payMethod==='upi'
    ? `upi://pay?pa=${order.upiId}&pn=BITE&am=${order.total}&cu=INR&tn=Order%20${order.order_number}`
    : null

  return (
    <Modal open={!!order} onClose={onClose} title={order.isDine ? '🍳 Sent to Kitchen' : '✅ Order Complete'}
      footer={<button onClick={onClose} style={{ width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:13, fontWeight:700 }}>New Order</button>}>
      <div style={{ textAlign:'center', padding:'8px 0' }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{order.isDine ? '🍽' : '✅'}</div>
        <div style={{ fontFamily:"'Plus Jakarta Sans'", fontSize:20, fontWeight:800 }}>Order #{order.order_number}</div>
        <div style={{ fontSize:28, fontWeight:800, color:'var(--brand)', margin:'8px 0 4px' }}>₹{Number(order.total).toFixed(2)}</div>
        {order.isDine ? (
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16, lineHeight:1.6 }}>
            Order sent to kitchen.<br/>
            <span style={{ color:'var(--brand)', fontWeight:600 }}>Table stays open</span> until payment is collected.
          </div>
        ) : (
          <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>
            {order.payMethod==='upi' ? '📱 UPI' : order.payMethod==='cash' ? '💵 Cash' : order.payMethod}
          </div>
        )}
        {upiLink && (
          <a href={upiLink} style={{ display:'inline-block', background:'var(--brand)', color:'#fff', borderRadius:10, padding:'10px 24px', fontWeight:700, fontSize:14, textDecoration:'none', marginBottom:16 }}>
            📱 Open UPI App
          </a>
        )}
        {order.customer_phone && (
          <a href={`https://wa.me/${order.customer_phone.replace(/\D/g,'')}?text=Your bill from BITE. ₹${order.total}`}
            target="_blank" rel="noreferrer"
            style={{ display:'inline-block', padding:'7px 14px', background:'#25D366', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, textDecoration:'none', marginLeft:8 }}>
            💬 WhatsApp
          </a>
        )}
      </div>
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function OrderPage() {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const { orderType, tableNumber, showToast } = useStore()

  function handleCheckout() {
    if (orderType==='dine' && !tableNumber) {
      showToast('Please select a table first', 'warning')
      return
    }
    setCheckoutOpen(true)
  }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', flexDirection:'column' }}>
      <OrderTypeBar />
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <MenuPane />
        <CartPane onCheckout={handleCheckout} />
      </div>
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onSuccess={order => setSuccessOrder(order)} />
      <SuccessModal order={successOrder} onClose={() => setSuccessOrder(null)} />
    </div>
  )
}