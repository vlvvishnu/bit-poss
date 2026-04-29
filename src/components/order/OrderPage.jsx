import React, { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

// ── helpers ───────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    pending:   { label:'⏳ Waiting',   bg:'rgba(245,158,11,0.12)', color:'#F59E0B' },
    preparing: { label:'🔥 Preparing', bg:'rgba(59,130,246,0.12)', color:'#3B82F6' },
    ready:     { label:'✅ Ready',      bg:'rgba(34,197,94,0.12)',  color:'#22C55E' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:5,
      background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{s.label}</span>
  )
}

// ── Running Order panel ───────────────────────────────────────────
function RunningOrder({ tableNum, tableName, onCheckout, extraItems=[] }) {
  const { tenantId, settings, showToast } = useStore()
  const [orderItems, setOrderItems] = useState([])
  const [orderId, setOrderId]       = useState(null)
  const taxRate = (settings?.tax_rate||0)/100

  useEffect(() => {
    if (!tenantId || !tableNum) { setOrderItems([]); setOrderId(null); return }
    load()
    const ch = supabase.channel(`ro-${tableNum}`)
      .on('postgres_changes',{ event:'*', schema:'public', table:'order_items' }, load)
      .on('postgres_changes',{ event:'*', schema:'public', table:'orders' }, load)
      .subscribe()
    return () => ch.unsubscribe()
  }, [tenantId, tableNum])

  async function load() {
    if (!tenantId || !tableNum) return
    const { data:orders } = await supabase.from('orders')
      .select('id,status,order_items(id,product_name,product_icon,qty,unit_price,status,notes)')
      .eq('tenant_id', tenantId).eq('order_type','dine')
      .eq('table_number', String(tableNum))
      .in('status',['pending','preparing','ready'])
      .order('created_at',{ ascending:true })

    if (!orders?.length) { setOrderItems([]); setOrderId(null); return }
    const all = orders.flatMap(o =>
      (o.order_items||[]).map(i => ({ ...i, orderStatus:o.status, orderId:o.id }))
    )
    setOrderItems(all)
    setOrderId(orders[0].id)
  }

  async function removeItem(item) {
    await supabase.from('order_items')
      .update({ status:'rejected', rejected_at:new Date().toISOString() })
      .eq('id', item.id)
    showToast(`"${item.product_name}" removed`, 'info')
    load()
  }

  // Merge optimistic items (shown immediately, disappear when real data loads)
  const realIds  = new Set(orderItems.map(i => i.id))
  const optimistic = extraItems.filter(i => !realIds.has(i.id))
  const active   = [
    ...orderItems.filter(i => i.status !== 'rejected'),
    ...optimistic,
  ]
  const rejected = orderItems.filter(i => i.status === 'rejected')
  const sub   = active.reduce((s,i) => s + Number(i.unit_price)*i.qty, 0)
  const tax   = sub * taxRate
  const total = sub + tax

  if (!tableNum) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      color:'var(--text3)', textAlign:'center', padding:24, flex:1 }}>
      <div><div style={{ fontSize:24, marginBottom:6 }}>🍽</div>
      <div style={{ fontSize:12 }}>Select a table</div></div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize:13,
          color:'var(--text)' }}>📋 {tableName} — Running Order</div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>
          {active.length} item{active.length!==1?'s':''} · Live</div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {orderItems.length===0 ? (
          <div style={{ textAlign:'center', padding:'24px 16px', color:'var(--text3)' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>🍳</div>
            <div style={{ fontSize:11 }}>Nothing sent yet</div>
          </div>
        ) : (
          <>
            {active.map(item => (
              <div key={item.id} style={{ display:'flex', alignItems:'flex-start',
                gap:8, padding:'7px 14px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>
                  {item.product_icon||'🍽'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>
                    {item.product_name}
                    <span style={{ color:'var(--text3)', marginLeft:4 }}>×{item.qty}</span>
                  </div>
                  {item.notes && (
                    <div style={{ fontSize:10, color:'var(--amber)', marginTop:1 }}>
                      📝 {item.notes}</div>
                  )}
                  <div style={{ marginTop:3 }}>
                    <StatusPill status={item.orderStatus} />
                  </div>
                </div>
                <div style={{ flexShrink:0, textAlign:'right' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--brand)' }}>
                    ₹{(Number(item.unit_price)*item.qty).toFixed(2)}</div>
                  {item.orderStatus==='pending' && (
                    <button onClick={() => removeItem(item)}
                      style={{ fontSize:10, color:'var(--text3)', background:'none',
                        border:'none', cursor:'pointer', padding:0, marginTop:2 }}>
                      remove</button>
                  )}
                </div>
              </div>
            ))}
            {rejected.length>0 && (
              <div style={{ padding:'5px 14px', opacity:0.5 }}>
                {rejected.map(item => (
                  <div key={item.id} style={{ display:'flex', gap:8, padding:'3px 0',
                    textDecoration:'line-through', fontSize:11, color:'var(--text3)' }}>
                    <span>{item.product_icon||'🍽'}</span>
                    <span style={{ flex:1 }}>{item.product_name} ×{item.qty}</span>
                    <span style={{ color:'var(--red)' }}>removed</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {active.length>0 && (
        <div style={{ borderTop:'1px solid var(--border)', padding:12, flexShrink:0 }}>
          {taxRate>0 && (
            <div style={{ display:'flex', justifyContent:'space-between',
              fontSize:11, color:'var(--text3)', marginBottom:2 }}>
              <span>Subtotal</span><span>₹{sub.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between',
            fontSize:14, fontWeight:800, marginBottom:10,
            borderTop: taxRate>0 ? '1px solid var(--border)' : 'none',
            paddingTop: taxRate>0 ? 6 : 0 }}>
            <span>Total</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          <button onClick={() => onCheckout({ orderId, total, sub, tax, activeItems:active, tableNum, tableName })}
            style={{ width:'100%', background:'#16A34A', color:'#fff', border:'none',
              borderRadius:'var(--r)', padding:'10px', fontWeight:700, fontSize:13,
              cursor:'pointer' }}>
            💳 Checkout & Pay
          </button>
        </div>
      )}
    </div>
  )
}

// ── New Items cart ─────────────────────────────────────────────────
function NewItemsCart({ items, orderType, tableNum, tableName, onAdd, onRemove,
  onSendToKitchen, onCheckout, sendingKOT, settings }) {
  const isDine  = orderType==='dine'
  const sub     = items.reduce((s,i) => s+i.price*i.qty, 0)
  const taxRate = (settings?.tax_rate||0)/100
  const total   = sub + sub*taxRate
  const count   = items.reduce((s,i) => s+i.qty, 0)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize:13,
          color:'var(--text)' }}>🛒 New Items</div>
        <div style={{ fontSize:10, color:'var(--brand)', fontWeight:600, marginTop:1 }}>
          {isDine ? (tableNum ? `🍽 ${tableName}` : '🍽 Select table') :
           orderType==='delivery' ? '🚚 Delivery' : '🛍 Takeaway'}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
        {items.length===0 ? (
          <div style={{ textAlign:'center', padding:'24px 16px', color:'var(--text3)' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>🛒</div>
            <div style={{ fontSize:11 }}>Tap menu to add</div>
          </div>
        ) : items.map(item => (
          <div key={item.id} style={{ display:'flex', alignItems:'center',
            gap:8, padding:'6px 14px' }}>
            <span style={{ fontSize:14, flexShrink:0 }}>{item.icon||'🍽'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap',
                color:'var(--text)' }}>{item.name}</div>
              <div style={{ fontSize:11, color:'var(--brand)', fontWeight:600 }}>
                ₹{(item.price*item.qty).toFixed(2)}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
              <button onClick={() => onRemove(item.id)}
                style={{ width:20, height:20, borderRadius:'50%',
                  background:'var(--card2)', border:'1px solid var(--border)',
                  color:'var(--text)', fontSize:13, display:'flex',
                  alignItems:'center', justifyContent:'center', cursor:'pointer' }}>−</button>
              <span style={{ fontSize:12, fontWeight:700, minWidth:14,
                textAlign:'center' }}>{item.qty}</span>
              <button onClick={() => onAdd(item)}
                style={{ width:20, height:20, borderRadius:'50%',
                  background:'var(--brand)', border:'none', color:'#fff',
                  fontSize:13, display:'flex', alignItems:'center',
                  justifyContent:'center', cursor:'pointer' }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {items.length>0 && (
        <div style={{ borderTop:'1px solid var(--border)', padding:12,
          flexShrink:0, display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            fontSize:13, fontWeight:700 }}>
            <span style={{ color:'var(--text2)' }}>{count} item{count!==1?'s':''}</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          {isDine ? (
            <button onClick={onSendToKitchen} disabled={sendingKOT||!tableNum}
              style={{ width:'100%', border:'none', borderRadius:'var(--r)',
                padding:'11px', fontWeight:800, fontSize:14,
                cursor:!tableNum?'default':'pointer',
                background:!tableNum?'var(--card2)':'#E8440A',
                color:!tableNum?'var(--text3)':'#fff',
                display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              {sendingKOT
                ? <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.4)',
                    borderTopColor:'#fff',borderRadius:'50%',
                    animation:'spin 0.6s linear infinite',display:'inline-block' }} />
                : '🍳'}
              {sendingKOT?'Sending…':!tableNum?'Select table first':'Send to Kitchen'}
            </button>
          ) : (
            <button onClick={onCheckout}
              style={{ width:'100%', background:'var(--brand)', color:'#fff',
                border:'none', borderRadius:'var(--r)', padding:'11px',
                fontWeight:700, fontSize:14, cursor:'pointer' }}>
              Checkout · ₹{total.toFixed(2)} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Checkout modal ─────────────────────────────────────────────────
function CheckoutModal({ open, onClose, checkoutData, onSuccess }) {
  const { clearCart, tenantId, settings, showToast } = useStore()
  const [step, setStep]           = useState(1)
  const [phone, setPhone]         = useState('')
  const [name,  setName]          = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [loading, setLoading]     = useState(false)
  const [error,   setError]       = useState('')

  if (!checkoutData) return null
  const { items, orderType, tableNum, tableName, total, sub, tax,
    existingOrderId } = checkoutData
  const isDine = orderType==='dine'
  const upiId  = settings?.upi_id||''
  const PAY = [
    { id:'cash',  icon:'💵', label:'Cash'    },
    { id:'upi',   icon:'📱', label:'UPI'     },
    { id:'card',  icon:'💳', label:'Card'    },
    { id:'other', icon:'🔖', label:'Other'   },
  ]

  function reset() { setStep(1);setPhone('');setName('');setPayMethod('cash');setError('') }
  function handleClose() { reset(); onClose() }

  async function confirm() {
    if (!tenantId) { setError('Not connected — refresh page'); return }
    setLoading(true); setError('')
    try {
      if (isDine && existingOrderId) {
        const { error } = await supabase.from('orders')
          .update({ status:'paid', payment_method:payMethod,
            paid_at:new Date().toISOString() })
          .eq('id', existingOrderId)
        if (error) throw error
        showToast('Table checked out ✓','success')
        onSuccess({ order_number:'—', total, payMethod, isDine:true })
        handleClose()
      } else {
        const txRate = (settings?.tax_rate||0)/100
        const s = sub || items.reduce((a,i)=>a+Number(i.unit_price||i.price)*i.qty,0)
        const t = tax  || s*txRate
        const { data:order, error:oErr } = await supabase.from('orders')
          .insert({
            tenant_id:tenantId, status:'paid', order_type:orderType,
            payment_method:payMethod,
            subtotal:Number(s.toFixed(2)), tax:Number(t.toFixed(2)),
            total:Number(total.toFixed(2)),
            customer_name:name||null, customer_phone:phone||null,
            paid_at:new Date().toISOString(),
          }).select('id,order_number').single()
        if (oErr) throw oErr
        const { error:iErr } = await supabase.from('order_items').insert(
          items.map(i => ({
            tenant_id:tenantId, order_id:order.id,
            product_id:i.id||i.product_id,
            product_name:i.name||i.product_name,
            product_icon:i.icon||i.product_icon||'',
            unit_price:Number(i.price||i.unit_price),
            qty:Number(i.qty), status:'active',
          }))
        )
        if (iErr) throw iErr
        clearCart()
        showToast(`Order #${order.order_number} placed ✓`,'success')
        onSuccess({ ...order, total, payMethod, isDine:false })
        handleClose()
      }
    } catch(e) { setError(e.message||'Error — try again') }
    setLoading(false)
  }

  const typeLabel = isDine ? `🍽 ${tableName||'Table '+tableNum}`
    : orderType==='delivery' ? '🚚 Delivery' : '🛍 Takeaway'

  const BtnSpinner = () => (
    <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.4)',
      borderTopColor:'#fff',borderRadius:'50%',
      animation:'spin 0.6s linear infinite',display:'inline-block' }} />
  )

  return (
    <Modal open={open} onClose={handleClose}
      title={isDine ? `Checkout — ${tableName}` : 'Checkout'}
      footer={
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {error && (
            <div style={{ fontSize:12,color:'var(--red)',background:'rgba(239,68,68,0.08)',
              border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,padding:'8px 10px' }}>
              ⚠ {error}
            </div>
          )}
          {isDine ? (
            <button onClick={confirm} disabled={loading}
              style={{ width:'100%',background:loading?'var(--card2)':'#16A34A',
                color:loading?'var(--text3)':'#fff',border:'none',borderRadius:8,
                padding:13,fontWeight:700,fontSize:14,cursor:loading?'default':'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
              {loading && <BtnSpinner />}
              {loading?'Processing…':`Collect ₹${total.toFixed(2)} →`}
            </button>
          ) : step===1 ? (
            <button onClick={() => { setError('');setStep(2) }}
              style={{ width:'100%',background:'var(--brand)',color:'#fff',border:'none',
                borderRadius:8,padding:13,fontWeight:700,fontSize:14,cursor:'pointer' }}>
              Next: Payment →
            </button>
          ) : (
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={() => { setStep(1);setError('') }}
                style={{ flex:'0 0 72px',background:'var(--card2)',color:'var(--text)',
                  border:'1px solid var(--border)',borderRadius:8,padding:12,
                  fontWeight:600,cursor:'pointer' }}>← Back</button>
              <button onClick={confirm} disabled={loading}
                style={{ flex:1,background:loading?'var(--card2)':'var(--brand)',
                  color:loading?'var(--text3)':'#fff',border:'none',borderRadius:8,
                  padding:12,fontWeight:700,fontSize:14,cursor:loading?'default':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                {loading && <BtnSpinner />}
                {loading?'Placing…':`Place Order · ₹${total.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      }>

      {/* Step tabs */}
      {!isDine && (
        <div style={{ display:'flex',gap:0,marginBottom:14,background:'var(--bg)',
          borderRadius:8,padding:3 }}>
          {[['1 · Customer',1],['2 · Payment',2]].map(([label,s]) => (
            <div key={s} style={{ flex:1,textAlign:'center',padding:7,borderRadius:6,
              fontSize:12,fontWeight:600,
              background:step===s?'var(--card2)':'transparent',
              color:step>=s?'var(--text)':'var(--text3)' }}>{label}</div>
          ))}
        </div>
      )}

      {/* Bill */}
      <div style={{ background:'var(--bg)',borderRadius:8,padding:'10px 12px',
        marginBottom:14,fontSize:12 }}>
        <div style={{ color:'var(--brand)',fontWeight:700,marginBottom:5 }}>
          {typeLabel}</div>
        {(items||[]).map((i,idx) => (
          <div key={idx} style={{ display:'flex',justifyContent:'space-between',
            padding:'2px 0',color:'var(--text2)',borderBottom:'1px solid var(--border)' }}>
            <span>{i.product_icon||i.icon||'🍽'} {i.product_name||i.name} ×{i.qty}</span>
            <span>₹{(Number(i.unit_price||i.price)*i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:14,
          fontWeight:800,marginTop:5 }}>
          <span>Total</span>
          <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer step */}
      {!isDine && step===1 && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {[
            { label:'Phone', value:phone, set:setPhone, type:'tel', placeholder:'+91 98765' },
            { label:'Name',  value:name,  set:setName,  placeholder:'Optional' },
          ].map(f => (
            <label key={f.label} style={{ display:'flex',flexDirection:'column',gap:4 }}>
              <span style={{ fontSize:11,fontWeight:700,color:'var(--text2)',
                textTransform:'uppercase',letterSpacing:'0.4px' }}>{f.label}</span>
              <input value={f.value} onChange={e=>f.set(e.target.value)}
                type={f.type||'text'} placeholder={f.placeholder}
                style={{ width:'100%',padding:'9px 12px',background:'var(--bg)',
                  border:'1.5px solid var(--border2)',borderRadius:8,
                  color:'var(--text)',fontSize:14,outline:'none' }} />
            </label>
          ))}
        </div>
      )}

      {/* Payment step */}
      {(isDine || step===2) && (
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--text2)',
            textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:10 }}>
            Payment Method</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            {PAY.map(m => (
              <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                background:payMethod===m.id?'var(--brand-lt)':'var(--card2)',
                border:`2px solid ${payMethod===m.id?'var(--brand)':'var(--border)'}`,
                borderRadius:10,padding:'12px 8px',cursor:'pointer',textAlign:'center' }}>
                <div style={{ fontSize:24,marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:12,fontWeight:700,color:'var(--text)' }}>{m.label}</div>
                {m.id==='upi'&&!upiId&&(
                  <div style={{ fontSize:10,color:'var(--amber)',marginTop:2 }}>Set in Settings</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function SuccessModal({ order, onClose }) {
  if (!order) return null
  return (
    <Modal open onClose={onClose}
      title={order.isDine?'Table Checked Out ✓':'Order Complete ✓'}
      footer={<button onClick={onClose} style={{ width:'100%',background:'var(--brand)',
        color:'#fff',border:'none',borderRadius:8,padding:13,fontWeight:700,
        cursor:'pointer' }}>Done</button>}>
      <div style={{ textAlign:'center',padding:'8px 0' }}>
        <div style={{ fontSize:48,marginBottom:8 }}>✅</div>
        <div style={{ fontSize:28,fontWeight:800,color:'var(--brand)',margin:'8px 0' }}>
          ₹{Number(order.total).toFixed(2)}</div>
        <div style={{ fontSize:13,color:'var(--text2)' }}>
          {order.payMethod==='cash'?'💵 Cash':order.payMethod==='upi'?'📱 UPI':
           order.payMethod==='card'?'💳 Card':'🔖 Other'}</div>
      </div>
    </Modal>
  )
}

function TablePicker({ count, selected, onSelect }) {
  const tables = Array.from({ length:count }, (_,i) => i+1)
  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:5,padding:'6px 12px',
      borderBottom:'1px solid var(--border)',flexShrink:0,alignItems:'center' }}>
      <span style={{ fontSize:10,fontWeight:700,color:'var(--text3)',
        textTransform:'uppercase',letterSpacing:'0.5px',marginRight:2 }}>Table:</span>
      {tables.map(n => (
        <button key={n} onClick={() => onSelect(selected===n?null:n)} style={{
          minWidth:32,height:25,borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
          background:selected===n?'var(--brand)':'var(--card)',
          border:`1.5px solid ${selected===n?'var(--brand)':'var(--border)'}`,
          color:selected===n?'#fff':'var(--text2)' }}>T{n}</button>
      ))}
    </div>
  )
}

// ── Mobile bottom sheet ────────────────────────────────────────────
// Shows TWO tabs: Running Order + New Items
function MobileBottomSheet({ open, onClose, tab, setTab,
  tableNum, tableName, items, orderType, onAdd, onRemove,
  onSendToKitchen, onCheckout, onTableCheckout,
  sendingKOT, settings, runningOrderRef }) {

  const isDine = orderType==='dine'
  const sub     = items.reduce((s,i)=>s+i.price*i.qty,0)
  const taxRate = (settings?.tax_rate||0)/100
  const total   = sub+sub*taxRate
  const count   = items.reduce((s,i)=>s+i.qty,0)

  if (!open) return null
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,
      display:'flex',flexDirection:'column',justifyContent:'flex-end' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--card)',borderRadius:'16px 16px 0 0',
        maxHeight:'80vh',display:'flex',flexDirection:'column',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.4)' }}>

        {/* drag handle */}
        <div style={{ display:'flex',justifyContent:'center',padding:'10px 0 0' }}>
          <div style={{ width:36,height:4,borderRadius:2,background:'var(--border2)' }} />
        </div>

        {/* tabs — only for dine in */}
        {isDine ? (
          <div style={{ display:'flex',padding:'8px 16px 0',gap:6 }}>
            {[['new','🛒 New Items'],['running','📋 Running Order']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                flex:1,padding:'8px',borderRadius:8,border:'none',
                background:tab===t?'var(--brand-lt)':'var(--card2)',
                color:tab===t?'var(--brand)':'var(--text2)',
                fontWeight:tab===t?700:500,fontSize:12,cursor:'pointer' }}>{l}</button>
            ))}
            <button onClick={onClose} style={{ background:'none',border:'none',
              color:'var(--text2)',fontSize:18,cursor:'pointer',padding:'0 4px' }}>✕</button>
          </div>
        ) : (
          <div style={{ display:'flex',justifyContent:'space-between',
            alignItems:'center',padding:'8px 16px 0' }}>
            <span style={{ fontWeight:700,fontSize:14 }}>🛒 Cart · {count}</span>
            <button onClick={onClose} style={{ background:'none',border:'none',
              color:'var(--text2)',fontSize:18,cursor:'pointer' }}>✕</button>
          </div>
        )}

        {/* content */}
        <div style={{ flex:1,overflowY:'auto',minHeight:0,marginTop:8 }}>
          {(!isDine || tab==='new') && (
            items.length===0 ? (
              <div style={{ textAlign:'center',padding:'24px',color:'var(--text3)' }}>
                <div style={{ fontSize:22,marginBottom:6 }}>🛒</div>
                <div style={{ fontSize:12 }}>Tap menu to add</div>
              </div>
            ) : items.map(item => (
              <div key={item.id} style={{ display:'flex',alignItems:'center',
                gap:10,padding:'8px 16px',borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:18 }}>{item.icon||'🍽'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500,color:'var(--text)' }}>{item.name}</div>
                  <div style={{ fontSize:12,color:'var(--brand)',fontWeight:600 }}>
                    ₹{(item.price*item.qty).toFixed(2)}</div>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <button onClick={()=>onRemove(item.id)}
                    style={{ width:26,height:26,borderRadius:'50%',background:'var(--card2)',
                      border:'1px solid var(--border)',color:'var(--text)',fontSize:16,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      cursor:'pointer' }}>−</button>
                  <span style={{ fontSize:14,fontWeight:700 }}>{item.qty}</span>
                  <button onClick={()=>onAdd(item)}
                    style={{ width:26,height:26,borderRadius:'50%',background:'var(--brand)',
                      border:'none',color:'#fff',fontSize:16,display:'flex',
                      alignItems:'center',justifyContent:'center',cursor:'pointer' }}>+</button>
                </div>
              </div>
            ))
          )}
          {isDine && tab==='running' && (
            <div style={{ padding:'0 4px' }} ref={runningOrderRef}>
              <RunningOrder tableNum={tableNum} tableName={tableName}
                onCheckout={onTableCheckout} />
            </div>
          )}
        </div>

        {/* footer CTA */}
        <div style={{ padding:'12px 16px 20px',borderTop:'1px solid var(--border)' }}>
          {(!isDine || tab==='new') && items.length>0 && (
            <>
              <div style={{ display:'flex',justifyContent:'space-between',
                fontSize:14,fontWeight:800,marginBottom:10 }}>
                <span>Total</span>
                <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
              </div>
              {isDine ? (
                <button onClick={onSendToKitchen} disabled={sendingKOT||!tableNum}
                  style={{ width:'100%',border:'none',borderRadius:12,padding:14,
                    fontWeight:800,fontSize:15,
                    background:!tableNum?'var(--card2)':'#E8440A',
                    color:!tableNum?'var(--text3)':'#fff',
                    cursor:!tableNum?'default':'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                  {sendingKOT
                    ? <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.4)',
                        borderTopColor:'#fff',borderRadius:'50%',
                        animation:'spin 0.6s linear infinite',display:'inline-block' }} />
                    : '🍳'}
                  {sendingKOT?'Sending…':!tableNum?'Select table first':'Send to Kitchen'}
                </button>
              ) : (
                <button onClick={onCheckout}
                  style={{ width:'100%',background:'var(--brand)',color:'#fff',
                    border:'none',borderRadius:12,padding:14,fontWeight:700,
                    fontSize:15,cursor:'pointer' }}>
                  Checkout · ₹{total.toFixed(2)} →
                </button>
              )}
            </>
          )}
          {isDine && tab==='running' && (
            <div style={{ fontSize:12,color:'var(--text3)',textAlign:'center' }}>
              Use Checkout & Pay button above ↑
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export default function OrderPage() {
  const { categories, products, addToCart, removeFromCart, cart, cartItems,
          cartSubtotal, clearCart, settings, tenantId, showToast } = useStore()

  const [orderType, setOrderType]   = useState('takeaway')
  const [tableNum, setTableNum]     = useState(null)
  const [activeCat, setActiveCat]   = useState('all')
  const [sendingKOT, setSendingKOT] = useState(false)
  const [checkoutData, setCheckoutData] = useState(null)
  const [successOrder, setSuccessOrder] = useState(null)
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [sheetTab, setSheetTab]     = useState('new') // 'new' | 'running'
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
  const runningRef = useRef(null)

  // Optimistic running order items — shown immediately after send
  const [pendingItems, setPendingItems] = useState([])

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Clear pending items when table changes
  useEffect(() => { setPendingItems([]) }, [tableNum])

  const isDine     = orderType==='dine'
  const items      = cartItems()
  const sub        = cartSubtotal()
  const taxRate    = (settings?.tax_rate||0)/100
  const total      = sub + sub*taxRate
  const cartCount  = items.reduce((s,i)=>s+i.qty, 0)
  const tableCount = settings?.table_count||10
  const tableName  = tableNum ? `T${tableNum}` : null

  async function handleSendToKitchen() {
    if (!tableNum) { showToast('Select a table first','warning'); return }
    if (!items.length) { showToast('No items to send','warning'); return }
    if (!tenantId) { showToast('Not connected — refresh','error'); return }

    setSendingKOT(true)

    // Optimistic update — show items immediately
    const optimisticItems = items.map(i => ({
      id: `opt-${Date.now()}-${i.id}`,
      product_name: i.name,
      product_icon: i.icon||'',
      qty: i.qty,
      unit_price: i.price,
      status: 'active',
      orderStatus: 'pending',
      orderId: null,
      notes: null,
      optimistic: true,
    }))
    setPendingItems(prev => [...prev, ...optimisticItems])

    try {
      const s   = sub
      const t   = s * taxRate
      const tot = s + t

      // Find existing open order for table
      const { data: existing } = await supabase.from('orders')
        .select('id')
        .eq('tenant_id', tenantId).eq('order_type','dine')
        .eq('table_number', String(tableNum))
        .in('status',['pending','preparing','ready'])
        .maybeSingle()

      let orderId = existing?.id

      if (!orderId) {
        const { data:o, error } = await supabase.from('orders').insert({
          tenant_id:      tenantId,
          status:         'pending',
          order_type:     'dine',
          table_number:   String(tableNum),
          payment_method: 'cash',
          subtotal:       Number(s.toFixed(2)),
          tax:            Number(t.toFixed(2)),
          total:          Number(tot.toFixed(2)),
        }).select('id').single()
        if (error) throw error
        orderId = o.id
      } else {
        // Update total — use try/catch inline, NOT .catch() on rpc
        try {
          await supabase.rpc('increment_order_total', {
            order_id:orderId, add_subtotal:s, add_tax:t, add_total:tot
          })
        } catch(rpcErr) {
          // Best effort — totals will be recalculated at checkout
          console.warn('[BITE] increment_order_total failed:', rpcErr?.message)
        }
      }

      const { error } = await supabase.from('order_items').insert(
        items.map(i => ({
          tenant_id:    tenantId,
          order_id:     orderId,
          product_id:   i.id,
          product_name: i.name,
          product_icon: i.icon||'',
          unit_price:   Number(i.price),
          qty:          Number(i.qty),
          status:       'active',
        }))
      )
      if (error) throw error

      clearCart()
      setPendingItems([]) // RunningOrder will now show real data
      showToast(`🍳 ${cartCount} item${cartCount!==1?'s':''} sent to kitchen!`,'success')

      // Switch sheet to running order tab on mobile
      if (isMobile) { setSheetTab('running') }
    } catch(e) {
      setPendingItems([]) // clear optimistic on failure
      showToast(e.message||'Error sending to kitchen','error')
    }
    setSendingKOT(false)
  }

  function openCheckout() {
    if (!items.length) { showToast('No items','warning'); return }
    setCheckoutData({
      items, orderType, tableNum, tableName,
      total, sub, tax:sub*taxRate, existingOrderId:null,
    })
    setSheetOpen(false)
  }

  function openTableCheckout(data) {
    setCheckoutData({
      items: data.activeItems, orderType:'dine',
      tableNum:data.tableNum, tableName:data.tableName,
      total:data.total, sub:data.sub, tax:data.tax,
      existingOrderId:data.orderId,
    })
    setSheetOpen(false)
  }

  const groups = useMemo(() => {
    const filtered = activeCat==='all' ? products
      : products.filter(p => String(p.category_id)===activeCat)
    if (activeCat!=='all') return [{ name:'', icon:'', items:filtered }]
    const map = {}
    filtered.forEach(p => {
      const key = p.category_id||'other'
      if (!map[key]) map[key]={ name:p.catName||'Other', icon:p.catIcon||'', items:[] }
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
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',
      position:'relative' }}>

      {/* Type bar */}
      <div style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 12px',
        borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        {TYPES.map(t => (
          <button key={t.id}
            onClick={() => { setOrderType(t.id); setTableNum(null); clearCart(); setPendingItems([]) }}
            style={{
              background:orderType===t.id?'var(--brand-lt)':'var(--card)',
              border:`1.5px solid ${orderType===t.id?'rgba(232,68,10,0.3)':'var(--border)'}`,
              borderRadius:'var(--r-sm)',padding:'6px 14px',
              color:orderType===t.id?'var(--brand)':'var(--text2)',
              fontSize:13,fontWeight:600,cursor:'pointer' }}>{t.label}</button>
        ))}
      </div>

      {/* Table picker */}
      {isDine && (
        <TablePicker count={tableCount} selected={tableNum}
          onSelect={n => { setTableNum(n); clearCart(); setPendingItems([]) }} />
      )}

      {/* Cat strip */}
      <div style={{ display:'flex',gap:6,padding:'6px 12px',overflowX:'auto',
        borderBottom:'1px solid var(--border)',flexShrink:0,scrollbarWidth:'none' }}>
        {[{ id:'all',name:'All',icon:'' }, ...categories].map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(String(cat.id))} style={{
            flexShrink:0,padding:'4px 10px',borderRadius:20,whiteSpace:'nowrap',
            background:activeCat===String(cat.id)?'var(--brand-lt)':'none',
            border:`1.5px solid ${activeCat===String(cat.id)?'rgba(232,68,10,0.3)':'var(--border)'}`,
            color:activeCat===String(cat.id)?'var(--brand)':'var(--text2)',
            fontSize:11,fontWeight:600,cursor:'pointer' }}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1,display:'flex',overflow:'hidden' }}>

        {/* Menu */}
        <div style={{ flex:1,overflowY:'auto',padding:10 }}>
          {products.length===0 && (
            <div style={{ textAlign:'center',padding:40,color:'var(--text2)' }}>
              <div style={{ fontSize:32,marginBottom:8 }}>🍽</div>
              <div>No products yet.</div>
            </div>
          )}
          {groups.map((group,gi) => (
            <div key={gi}>
              {group.name && (
                <div style={{ fontSize:10,fontWeight:700,color:'var(--text3)',
                  textTransform:'uppercase',letterSpacing:'0.5px',padding:'8px 0 5px' }}>
                  {group.icon} {group.name}
                </div>
              )}
              <div style={{ display:'grid',
                gridTemplateColumns:'repeat(auto-fill,minmax(118px,1fr))',
                gap:7,marginBottom:10 }}>
                {group.items.map(p => {
                  const qty = cart[p.id]?.qty
                  return (
                    <button key={p.id}
                      onClick={() => !p.out_of_stock && addToCart(p)}
                      disabled={p.out_of_stock}
                      style={{
                        background:qty?'var(--brand-lt2)':'var(--card)',
                        border:`1.5px solid ${qty?'rgba(232,68,10,0.25)':'var(--border)'}`,
                        borderRadius:'var(--r)',padding:'9px 7px',
                        cursor:p.out_of_stock?'not-allowed':'pointer',
                        opacity:p.out_of_stock?0.45:1,
                        display:'flex',flexDirection:'column',gap:3,
                        textAlign:'left',position:'relative' }}>
                      <span style={{ fontSize:20 }}>{p.icon||'🍽'}</span>
                      <span style={{ fontSize:11,fontWeight:500,color:'var(--text2)',
                        lineHeight:1.3 }}>{p.name}</span>
                      <span style={{ fontSize:12,color:'var(--brand)',fontWeight:700 }}>
                        ₹{Number(p.price).toFixed(2)}</span>
                      {qty && (
                        <span style={{ position:'absolute',top:5,right:5,
                          background:'var(--brand)',color:'#fff',fontSize:9,
                          fontWeight:800,borderRadius:'50%',width:16,height:16,
                          display:'flex',alignItems:'center',justifyContent:'center' }}>
                          {qty}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {isMobile && <div style={{ height:80 }} />}
        </div>

        {/* Desktop panels */}
        {!isMobile && isDine && (
          <>
            <div style={{ width:260,flexShrink:0,borderLeft:'1px solid var(--border)',
              display:'flex',flexDirection:'column',overflow:'hidden' }}>
              <RunningOrder tableNum={tableNum} tableName={tableName}
                onCheckout={openTableCheckout}
                extraItems={pendingItems} />
            </div>
            <div style={{ width:240,flexShrink:0,borderLeft:'1px solid var(--border)',
              display:'flex',flexDirection:'column',overflow:'hidden' }}>
              <NewItemsCart items={items} orderType={orderType}
                tableNum={tableNum} tableName={tableName}
                onAdd={addToCart} onRemove={removeFromCart}
                onSendToKitchen={handleSendToKitchen}
                onCheckout={openCheckout}
                sendingKOT={sendingKOT} settings={settings} />
            </div>
          </>
        )}

        {!isMobile && !isDine && (
          <div style={{ width:260,flexShrink:0,borderLeft:'1px solid var(--border)',
            display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <NewItemsCart items={items} orderType={orderType}
              tableNum={null} tableName={null}
              onAdd={addToCart} onRemove={removeFromCart}
              onSendToKitchen={handleSendToKitchen}
              onCheckout={openCheckout}
              sendingKOT={sendingKOT} settings={settings} />
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <div style={{ position:'absolute',bottom:0,left:0,right:0,
          padding:'10px 12px',background:'var(--bg)',
          borderTop:'1px solid var(--border)' }}>
          {isDine ? (
            <div style={{ display:'flex',gap:8 }}>
              {/* Send to kitchen */}
              <button onClick={cartCount>0?handleSendToKitchen:undefined}
                disabled={sendingKOT}
                style={{ flex:cartCount>0?1.4:1,
                  background:!tableNum||cartCount===0?'var(--card2)':'#E8440A',
                  color:!tableNum||cartCount===0?'var(--text3)':'#fff',
                  border:`1px solid ${!tableNum||cartCount===0?'var(--border)':'#E8440A'}`,
                  borderRadius:12,padding:'12px 10px',fontWeight:800,fontSize:13,
                  cursor:!tableNum||cartCount===0?'default':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                {sendingKOT
                  ? <span style={{ width:14,height:14,
                      border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',
                      borderRadius:'50%',animation:'spin 0.6s linear infinite',
                      display:'inline-block' }} />
                  : '🍳'}
                {sendingKOT?'Sending…':cartCount>0?`Send ${cartCount}`:'Kitchen'}
              </button>
              {/* View sheet button */}
              <button onClick={() => setSheetOpen(true)}
                style={{ flex:1,background:'var(--card)',
                  border:'1px solid var(--border)',borderRadius:12,
                  padding:'12px 10px',fontWeight:700,fontSize:12,
                  color:'var(--text)',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                📋 Order
                {cartCount>0 && (
                  <span style={{ background:'var(--brand)',color:'#fff',
                    fontSize:10,fontWeight:800,borderRadius:'50%',
                    width:18,height:18,display:'flex',alignItems:'center',
                    justifyContent:'center' }}>{cartCount}</span>
                )}
              </button>
            </div>
          ) : cartCount>0 ? (
            <button onClick={() => setSheetOpen(true)}
              style={{ width:'100%',background:'var(--brand)',color:'#fff',
                border:'none',borderRadius:12,padding:'13px 20px',
                display:'flex',alignItems:'center',justifyContent:'space-between',
                fontWeight:700,fontSize:14,cursor:'pointer' }}>
              <span style={{ background:'rgba(255,255,255,0.25)',borderRadius:8,
                padding:'2px 8px',fontSize:13 }}>{cartCount}</span>
              <span>View Cart · ₹{total.toFixed(2)}</span>
              <span>→</span>
            </button>
          ) : (
            <div style={{ height:44 }} /> // spacer when empty
          )}
        </div>
      )}

      {/* Mobile bottom sheet */}
      <MobileBottomSheet
        open={sheetOpen} onClose={() => setSheetOpen(false)}
        tab={sheetTab} setTab={setSheetTab}
        tableNum={tableNum} tableName={tableName}
        items={items} orderType={orderType}
        onAdd={addToCart} onRemove={removeFromCart}
        onSendToKitchen={handleSendToKitchen}
        onCheckout={openCheckout}
        onTableCheckout={openTableCheckout}
        sendingKOT={sendingKOT} settings={settings}
        runningOrderRef={runningRef}
      />

      <CheckoutModal open={!!checkoutData} onClose={() => setCheckoutData(null)}
        checkoutData={checkoutData}
        onSuccess={o => { setSuccessOrder(o); setCheckoutData(null) }} />
      <SuccessModal order={successOrder} onClose={() => setSuccessOrder(null)} />
    </div>
  )
}