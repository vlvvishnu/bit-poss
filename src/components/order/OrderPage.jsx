import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

// ── Checkout / Payment Modal — shared for ALL order types ──────────
function CheckoutModal({ open, onClose, orderType, tableNum, tableName, onSuccess }) {
  const { cart, cartItems, cartSubtotal, clearCart, tenantId, settings, showToast } = useStore()
  const [step, setStep]           = useState(1)
  const [phone, setPhone]         = useState('')
  const [name,  setName]          = useState('')
  const [email, setEmail]         = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [loading, setLoading]     = useState(false)
  const [error,   setError]       = useState('')

  const items   = cartItems()
  const sub     = cartSubtotal()
  const taxRate = (settings?.tax_rate || 0) / 100
  const tax     = sub * taxRate
  const total   = sub + tax
  const upiId   = settings?.upi_id || ''

  const PAY = [
    { id:'cash',  icon:'💵', label:'Cash',      note:'Collect now'   },
    { id:'upi',   icon:'📱', label:'UPI / QR',  note: upiId ? upiId.slice(0,15) : '⚠ Set in Settings' },
    { id:'card',  icon:'💳', label:'Card',       note:'Debit/Credit'  },
    { id:'other', icon:'🔖', label:'Other',      note:'Voucher, etc'  },
  ]

  function reset() { setStep(1); setPhone(''); setName(''); setEmail(''); setPayMethod('cash'); setError('') }
  function handleClose() { reset(); onClose() }

  const isDine = orderType === 'dine'
  const typeLabel =
    orderType === 'dine'     ? `🍽 Table ${tableName || tableNum}` :
    orderType === 'delivery' ? '🚚 Delivery' : '🛍 Takeaway'

  async function placeOrder() {
    if (!tenantId) { setError('Not connected — please refresh the page.'); return }
    if (items.length === 0) { setError('Cart is empty.'); return }

    setLoading(true)
    setError('')

    try {
      const orderRow = {
        tenant_id:      tenantId,
        status:         isDine ? 'pending' : 'paid',
        order_type:     orderType,
        payment_method: payMethod,
        subtotal:       Number(sub.toFixed(2)),
        tax:            Number(tax.toFixed(2)),
        total:          Number(total.toFixed(2)),
        customer_name:  name  || null,
        customer_email: email || null,
        customer_phone: phone || null,
        table_number:   isDine && tableNum ? String(tableNum) : null,
        paid_at:        isDine ? null : new Date().toISOString(),
      }

      const { data: order, error: oErr } = await supabase
        .from('orders').insert(orderRow).select('id,order_number').single()

      if (oErr) throw new Error(oErr.message)

      const itemRows = items.map(i => ({
        tenant_id:    tenantId,
        order_id:     order.id,
        product_id:   i.id,
        product_name: i.name,
        product_icon: i.icon || '',
        unit_price:   Number(i.price),
        qty:          Number(i.qty),
        status:       'active',
      }))

      const { error: iErr } = await supabase.from('order_items').insert(itemRows)
      if (iErr) throw new Error(iErr.message)

      clearCart()
      showToast(isDine ? `Table ${tableName||tableNum} order sent to kitchen! 🍳` : `Order #${order.order_number} placed ✓`, 'success')
      onSuccess({ ...order, total, payMethod, upiId, isDine })
      handleClose()
    } catch (e) {
      setError(e.message || 'Error placing order. Please try again.')
    }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Checkout"
      footer={
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {error && (
            <div style={{ fontSize:12, color:'var(--red)', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, padding:'8px 10px' }}>
              ⚠ {error}
            </div>
          )}
          {step === 1 ? (
            <button onClick={() => { setError(''); setStep(2) }}
              style={{ width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:13, fontWeight:700, fontSize:14, cursor:'pointer' }}>
              Next: Payment →
            </button>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setStep(1); setError('') }}
                style={{ flex:'0 0 72px', background:'var(--card2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8, padding:12, fontWeight:600, cursor:'pointer' }}>
                ← Back
              </button>
              <button onClick={placeOrder} disabled={loading}
                style={{ flex:1, background:loading?'var(--card2)':'var(--brand)', color:loading?'var(--text2)':'#fff', border:'none', borderRadius:8, padding:12, fontWeight:700, fontSize:14, cursor:loading?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {loading && <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.6s linear infinite', display:'inline-block' }} />}
                {loading ? 'Placing order…' : isDine ? '🍳 Send to Kitchen' : `Place Order · ₹${total.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      }>

      {/* Step tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:16, background:'var(--bg)', borderRadius:8, padding:3 }}>
        {[['1 · Customer',1],['2 · Payment',2]].map(([label,s]) => (
          <div key={s} style={{ flex:1, textAlign:'center', padding:7, borderRadius:6, fontSize:12, fontWeight:600,
            background:step===s?'var(--card2)':'transparent', color:step>=s?'var(--text)':'var(--text3)' }}>
            {label}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 12px', marginBottom:14, fontSize:12 }}>
        <div style={{ color:'var(--brand)', fontWeight:700, marginBottom:5 }}>
          {typeLabel} · {items.length} item{items.length!==1?'s':''}
        </div>
        {items.map(i => (
          <div key={i.id} style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', color:'var(--text2)', borderBottom:'1px solid var(--border)' }}>
            <span>{i.icon} {i.name} ×{i.qty}</span>
            <span>₹{(i.price*i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:800, marginTop:5 }}>
          <span>Total</span><span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Step 1 — Customer details */}
      {step===1 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:'Phone', value:phone, set:setPhone, type:'tel', placeholder:'+91 98765 43210' },
            { label:'Name',  value:name,  set:setName,  placeholder:'Customer name (optional)' },
            { label:'Email', value:email, set:setEmail, type:'email', placeholder:'Optional' },
          ].map(f => (
            <label key={f.label} style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{f.label}</span>
              <input value={f.value} onChange={e => f.set(e.target.value)} type={f.type||'text'} placeholder={f.placeholder}
                style={{ width:'100%', padding:'9px 12px', background:'var(--bg)', border:'1.5px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:14, outline:'none', fontFamily:"'DM Sans'" }} />
            </label>
          ))}
        </div>
      )}

      {/* Step 2 — Payment */}
      {step===2 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:10 }}>
            Payment Method
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {PAY.map(m => (
              <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                background: payMethod===m.id ? 'var(--brand-lt)' : 'var(--card2)',
                border: `2px solid ${payMethod===m.id ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius:10, padding:'12px 8px', cursor:'pointer', textAlign:'center', transition:'all 0.1s',
              }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{m.label}</div>
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{m.note}</div>
              </button>
            ))}
          </div>
          {isDine && (
            <div style={{ marginTop:12, background:'var(--brand-lt)', border:'1px solid rgba(232,68,10,0.2)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--brand)', fontWeight:600 }}>
              🍽 Order sent to kitchen · Table stays open till final checkout
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Success modal ──────────────────────────────────────────────────
function SuccessModal({ order, onClose }) {
  if (!order) return null
  const upiLink = order.upiId && order.payMethod==='upi'
    ? `upi://pay?pa=${order.upiId}&pn=BITE&am=${order.total}&cu=INR&tn=Order${order.order_number}`
    : null
  return (
    <Modal open onClose={onClose} title={order.isDine?'Sent to Kitchen 🍳':'Order Complete ✅'}
      footer={<button onClick={onClose} style={{ width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:13, fontWeight:700, cursor:'pointer' }}>New Order</button>}>
      <div style={{ textAlign:'center', padding:'8px 0' }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{order.isDine?'🍳':'✅'}</div>
        <div style={{ fontFamily:"'Plus Jakarta Sans'", fontSize:20, fontWeight:800 }}>
          {order.isDine ? 'Kitchen notified!' : `Order #${order.order_number}`}
        </div>
        <div style={{ fontSize:28, fontWeight:800, color:'var(--brand)', margin:'8px 0 16px' }}>₹{Number(order.total).toFixed(2)}</div>
        {upiLink && (
          <a href={upiLink} style={{ display:'inline-block', background:'var(--brand)', color:'#fff', borderRadius:10, padding:'10px 24px', fontWeight:700, fontSize:14, textDecoration:'none' }}>
            📱 Open UPI App
          </a>
        )}
      </div>
    </Modal>
  )
}

// ── Table picker (for Dine In within order tab) ────────────────────
function TablePicker({ count, selected, onSelect }) {
  const tables = Array.from({ length: count }, (_, i) => ({ num: i+1, name: `T${i+1}` }))
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'8px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', alignSelf:'center', marginRight:4 }}>TABLE:</span>
      {tables.map(t => (
        <button key={t.num} onClick={() => onSelect(selected===t.num ? null : t.num)}
          style={{
            minWidth:36, height:28, borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer',
            background: selected===t.num ? 'var(--brand)' : 'var(--card)',
            border: `1.5px solid ${selected===t.num ? 'var(--brand)' : 'var(--border)'}`,
            color: selected===t.num ? '#fff' : 'var(--text2)',
          }}>{t.name}</button>
      ))}
    </div>
  )
}

// ── Main OrderPage ─────────────────────────────────────────────────
export default function OrderPage() {
  const { categories, products, addToCart, removeFromCart, cart, cartItems, cartSubtotal,
          clearCart, settings, showToast } = useStore()

  const [orderType, setOrderType] = useState('takeaway')
  const [tableNum, setTableNum]   = useState(null)
  const [activeCat, setActiveCat] = useState('all')
  const [cartOpen, setCartOpen]   = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const items    = cartItems()
  const sub      = cartSubtotal()
  const taxRate  = (settings?.tax_rate||0)/100
  const total    = sub + sub * taxRate
  const cartCount = items.reduce((s,i) => s+i.qty, 0)
  const tableCount = settings?.table_count || 10
  const tableName = tableNum ? `T${tableNum}` : null

  function handleCheckout() {
    if (orderType==='dine' && !tableNum) {
      showToast('Please select a table first', 'warning'); return
    }
    if (items.length===0) {
      showToast('Cart is empty', 'warning'); return
    }
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  const groups = useMemo(() => {
    const filtered = activeCat==='all' ? products
      : products.filter(p => String(p.category_id)===activeCat)
    if (activeCat !== 'all') return [{ name:'', icon:'', items:filtered }]
    const map = {}
    filtered.forEach(p => {
      const key = p.category_id||'other'
      if (!map[key]) map[key] = { name:p.catName||'Other', icon:p.catIcon||'', items:[] }
      map[key].items.push(p)
    })
    return Object.values(map)
  }, [products, activeCat])

  const TYPES = [
    { id:'takeaway', label:'🛍 Takeaway' },
    { id:'delivery', label:'🚚 Delivery' },
    { id:'dine',     label:'🍽 Dine In'  },
  ]

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* Order type bar */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap' }}>
        {TYPES.map(t => (
          <button key={t.id} onClick={() => { setOrderType(t.id); setTableNum(null) }} style={{
            background: orderType===t.id ? 'var(--brand-lt)' : 'var(--card)',
            border: `1.5px solid ${orderType===t.id ? 'rgba(232,68,10,0.3)' : 'var(--border)'}`,
            borderRadius:'var(--r-sm)', padding:'6px 14px',
            color: orderType===t.id ? 'var(--brand)' : 'var(--text2)',
            fontSize:13, fontWeight:600, cursor:'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Table picker — only for Dine In */}
      {orderType==='dine' && (
        <TablePicker count={tableCount} selected={tableNum} onSelect={setTableNum} />
      )}

      {/* Category strip */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', borderBottom:'1px solid var(--border)', flexShrink:0, scrollbarWidth:'none' }}>
        {[{ id:'all', name:'All', icon:'' }, ...categories].map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(String(cat.id))} style={{
            flexShrink:0, padding:'4px 12px', borderRadius:20, whiteSpace:'nowrap',
            background: activeCat===String(cat.id) ? 'var(--brand-lt)' : 'none',
            border: `1.5px solid ${activeCat===String(cat.id) ? 'rgba(232,68,10,0.3)' : 'var(--border)'}`,
            color: activeCat===String(cat.id) ? 'var(--brand)' : 'var(--text2)',
            fontSize:12, fontWeight:600, cursor:'pointer',
          }}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      {/* Content — menu + cart side by side on desktop */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Menu */}
        <div style={{ flex:1, overflowY:'auto', padding:12 }}>
          {products.length===0 && (
            <div style={{ textAlign:'center', padding:40, color:'var(--text2)' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🍽</div>
              <div>No products yet. Add them in Products.</div>
            </div>
          )}
          {groups.map((group,gi) => (
            <div key={gi}>
              {group.name && (
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.5px', padding:'10px 0 6px' }}>
                  {group.icon} {group.name}
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:12 }}>
                {group.items.map(p => {
                  const qty = cart[p.id]?.qty
                  return (
                    <button key={p.id} onClick={() => !p.out_of_stock && addToCart(p)} disabled={p.out_of_stock}
                      style={{
                        background: qty ? 'var(--brand-lt2)' : 'var(--card)',
                        border: `1.5px solid ${qty ? 'rgba(232,68,10,0.25)' : 'var(--border)'}`,
                        borderRadius:'var(--r)', padding:'10px 8px',
                        cursor: p.out_of_stock ? 'not-allowed' : 'pointer',
                        opacity: p.out_of_stock ? 0.45 : 1,
                        display:'flex', flexDirection:'column', gap:4,
                        textAlign:'left', position:'relative',
                      }}>
                      <span style={{ fontSize:22 }}>{p.icon||'🍽'}</span>
                      <span style={{ fontSize:12, fontWeight:500, color:'var(--text2)', lineHeight:1.3 }}>{p.name}</span>
                      <span style={{ fontSize:12, color:'var(--brand)', fontWeight:700 }}>₹{Number(p.price).toFixed(2)}</span>
                      {qty && <span style={{ position:'absolute', top:6, right:6, background:'var(--brand)', color:'#fff', fontSize:10, fontWeight:800, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center' }}>{qty}</span>}
                      {p.out_of_stock && <span style={{ fontSize:10, color:'var(--red)', fontWeight:600 }}>Out of stock</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {/* Bottom padding for mobile FAB */}
          {isMobile && <div style={{ height:80 }} />}
        </div>

        {/* Desktop cart */}
        {!isMobile && (
          <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column', borderLeft:'1px solid var(--border)', background:'var(--bg)' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>Cart</div>
                <div style={{ fontSize:11, color:'var(--brand)', fontWeight:600 }}>
                  {orderType==='dine' ? `🍽 ${tableNum ? `Table ${tableName}` : 'Select table ▾'}` : orderType==='delivery' ? '🚚 Delivery' : '🛍 Takeaway'}
                </div>
              </div>
              {items.length>0 && <button onClick={() => clearCart()} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:11, cursor:'pointer' }}>Clear</button>}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
              {items.length===0 ? (
                <div style={{ textAlign:'center', padding:'32px 16px', color:'var(--text3)' }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🛒</div>
                  <div style={{ fontSize:12 }}>Tap items to add</div>
                </div>
              ) : items.map(item => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px' }}>
                  <span style={{ fontSize:16 }}>{item.icon||'🍽'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize:11, color:'var(--brand)', fontWeight:600 }}>₹{(item.price*item.qty).toFixed(2)}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                    <button onClick={() => removeFromCart(item.id)} style={{ width:22, height:22, borderRadius:'50%', background:'var(--card2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:12, fontWeight:700, minWidth:16, textAlign:'center' }}>{item.qty}</span>
                    <button onClick={() => addToCart(item)} style={{ width:22, height:22, borderRadius:'50%', background:'var(--brand)', border:'none', color:'#fff', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            {items.length>0 && (
              <div style={{ borderTop:'1px solid var(--border)', padding:14, flexShrink:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:800, marginBottom:12 }}>
                  <span>Total</span><span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} style={{ width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:13, fontWeight:700, fontSize:14, cursor:'pointer' }}>
                  Checkout →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile floating cart bar */}
      {isMobile && cartCount > 0 && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'10px 12px',
          background:'var(--bg)',
          borderTop:'1px solid var(--border)',
        }}>
          <button onClick={() => setCartOpen(true)} style={{
            width:'100%', background:'var(--brand)', color:'#fff',
            border:'none', borderRadius:12, padding:'14px 20px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            fontWeight:700, fontSize:14, cursor:'pointer',
          }}>
            <span style={{ background:'rgba(255,255,255,0.25)', borderRadius:8, padding:'2px 8px', fontSize:13 }}>{cartCount} items</span>
            <span>View Cart · ₹{total.toFixed(2)}</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Mobile cart drawer */}
      {isMobile && cartOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
          onClick={e => e.target===e.currentTarget && setCartOpen(false)}>
          <div style={{ background:'var(--card)', borderRadius:'16px 16px 0 0', maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:15 }}>Cart · {cartCount} items</span>
              <button onClick={() => setCartOpen(false)} style={{ background:'none', border:'none', fontSize:18, color:'var(--text2)', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', padding:'8px 0', flex:1 }}>
              {items.map(item => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px' }}>
                  <span style={{ fontSize:18 }}>{item.icon||'🍽'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{item.name}</div>
                    <div style={{ fontSize:12, color:'var(--brand)', fontWeight:600 }}>₹{(item.price*item.qty).toFixed(2)}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => removeFromCart(item.id)} style={{ width:26, height:26, borderRadius:'50%', background:'var(--card2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:14, fontWeight:700, minWidth:20, textAlign:'center' }}>{item.qty}</span>
                    <button onClick={() => addToCart(item)} style={{ width:26, height:26, borderRadius:'50%', background:'var(--brand)', border:'none', color:'#fff', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding:16, borderTop:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:800, marginBottom:12 }}>
                <span>Total</span><span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
              </div>
              <button onClick={handleCheckout} style={{ width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:12, padding:14, fontWeight:700, fontSize:15, cursor:'pointer' }}>
                Checkout →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout + Success modals */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        orderType={orderType}
        tableNum={tableNum}
        tableName={tableName}
        onSuccess={o => setSuccessOrder(o)}
      />
      <SuccessModal order={successOrder} onClose={() => setSuccessOrder(null)} />
    </div>
  )
}
