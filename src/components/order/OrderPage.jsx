import React, { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

// ── Status pill ───────────────────────────────────────────────────
const STATUS = {
  pending:   { label:'⏳ Waiting',   bg:'rgba(245,158,11,0.12)', color:'#F59E0B' },
  preparing: { label:'🔥 Preparing', bg:'rgba(59,130,246,0.12)', color:'#3B82F6' },
  ready:     { label:'✅ Ready',      bg:'rgba(34,197,94,0.12)',  color:'#22C55E' },
  active:    { label:'⏳ Waiting',   bg:'rgba(245,158,11,0.12)', color:'#F59E0B' },
  rejected:  { label:'✕ Removed',   bg:'rgba(239,68,68,0.1)',   color:'#EF4444' },
}
function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.pending
  return <span style={{ fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:5,
    background:s.bg,color:s.color,whiteSpace:'nowrap' }}>{s.label}</span>
}

// ── Table picker ───────────────────────────────────────────────────
function TablePicker({ count, selected, onSelect, tenantId }) {
  const [activeTables, setActiveTables] = useState(new Set())

  useEffect(() => {
    if (!tenantId) return
    loadActive()
    const ch = supabase.channel('tp-active')
      .on('postgres_changes',{ event:'*', schema:'public', table:'orders' }, loadActive)
      .subscribe()
    return () => ch.unsubscribe()
  }, [tenantId])

  async function loadActive() {
    const { data } = await supabase.from('orders')
      .select('table_number')
      .eq('tenant_id', tenantId)
      .eq('order_type','dine')
      .in('status',['pending','preparing','ready'])
    setActiveTables(new Set((data||[]).map(o => Number(o.table_number))))
  }

  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'10px 14px',
      borderBottom:'1px solid var(--border)', flexShrink:0, alignItems:'center',
      background:'var(--bg)' }}>
      <span style={{ fontSize:10,fontWeight:700,color:'var(--text3)',
        textTransform:'uppercase',letterSpacing:'0.5px',marginRight:2,
        flexShrink:0 }}>Table:</span>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {Array.from({ length:count },(_,i)=>i+1).map(n => {
          const isActive  = activeTables.has(n)
          const isSelected = selected === n
          return (
            <button key={n} onClick={() => onSelect(isSelected ? null : n)}
              style={{
                position:'relative',
                minWidth:44, height:36, borderRadius:8,
                fontSize:12, fontWeight:700, cursor:'pointer',
                background: isSelected ? 'var(--brand)'
                  : isActive  ? 'var(--brand-lt)' : 'var(--card)',
                border: `2px solid ${isSelected ? 'var(--brand)'
                  : isActive ? 'rgba(232,68,10,0.35)' : 'var(--border)'}`,
                color: isSelected ? '#fff'
                  : isActive ? 'var(--brand)' : 'var(--text2)',
                transition:'all 0.1s',
              }}>
              T{n}
              {isActive && !isSelected && (
                <span style={{
                  position:'absolute', top:3, right:3,
                  width:6, height:6, borderRadius:'50%',
                  background:'var(--brand)',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── KOT Accordion ─────────────────────────────────────────────────
// One accordion item per "round" (order row)
function KOTAccordion({ order, defaultOpen, onRemoveItem, isNew }) {
  const [open, setOpen] = useState(defaultOpen)
  const active   = (order.order_items||[]).filter(i => i.status !== 'rejected')
  const rejected = (order.order_items||[]).filter(i => i.status === 'rejected')
  const subtotal = active.reduce((s,i) => s+Number(i.unit_price)*i.qty, 0)

  const statusColor = STATUS[order.status]?.color || '#F59E0B'
  const statusLabel = STATUS[order.status]?.label  || '⏳ Waiting'

  return (
    <div style={{
      border:`1px solid ${isNew ? 'rgba(232,68,10,0.3)' : 'var(--border)'}`,
      borderRadius:8, marginBottom:6, overflow:'hidden',
      background: isNew ? 'var(--brand-lt2)' : 'var(--card)',
    }}>
      {/* Header */}
      <button onClick={() => setOpen(o=>!o)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:8,
        padding:'9px 12px', background:'none', border:'none',
        cursor:'pointer', textAlign:'left',
      }}>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{open ? '▾' : '▸'}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>
              {isNew ? '🆕 New round' : `Round #${order.order_number||'?'}`}
            </span>
            <span style={{ fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:5,
              background:STATUS[order.status]?.bg||'rgba(245,158,11,0.12)',
              color:statusColor }}>{statusLabel}</span>
            {rejected.length>0 && (
              <span style={{ fontSize:10,color:'var(--red)' }}>
                {rejected.length} removed
              </span>
            )}
          </div>
          {!open && (
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
              {active.length} item{active.length!==1?'s':''} · ₹{subtotal.toFixed(2)}
            </div>
          )}
        </div>
        {open && (
          <span style={{ fontSize:12, fontWeight:700, color:'var(--brand)', flexShrink:0 }}>
            ₹{subtotal.toFixed(2)}
          </span>
        )}
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop:'1px solid var(--border)' }}>
          {active.map(item => (
            <div key={item.id} style={{ display:'flex', alignItems:'center',
              gap:8, padding:'7px 12px', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{item.product_icon||'🍽'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>
                  {item.product_name}
                  <span style={{ color:'var(--text3)', marginLeft:4 }}>×{item.qty}</span>
                </div>
                {item.notes && (
                  <div style={{ fontSize:10, color:'var(--amber)', marginTop:1 }}>
                    📝 {item.notes}</div>
                )}
                <div style={{ marginTop:2 }}>
                  <StatusPill status={item.orderStatus||order.status} />
                </div>
              </div>
              <div style={{ flexShrink:0, textAlign:'right' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--brand)' }}>
                  ₹{(Number(item.unit_price)*item.qty).toFixed(2)}</div>
                {order.status==='pending' && onRemoveItem && (
                  <button onClick={() => onRemoveItem(item)}
                    style={{ fontSize:10,color:'var(--text3)',background:'none',
                      border:'none',cursor:'pointer',padding:0,marginTop:1 }}>
                    remove</button>
                )}
              </div>
            </div>
          ))}
          {rejected.length>0 && rejected.map(item => (
            <div key={item.id} style={{ display:'flex', gap:8, padding:'5px 12px',
              opacity:0.45, textDecoration:'line-through',
              borderBottom:'1px solid var(--border)', fontSize:11, color:'var(--text3)' }}>
              <span>{item.product_icon||'🍽'}</span>
              <span style={{ flex:1 }}>{item.product_name} ×{item.qty}</span>
              <span style={{ color:'var(--red)' }}>removed</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Running Order (right panel) ────────────────────────────────────
function RunningOrder({ tableNum, tableName, onCheckout, pendingItems, newKOTItems }) {
  const { tenantId, settings, showToast } = useStore()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(false)
  const taxRate = (settings?.tax_rate||0)/100

  useEffect(() => {
    if (!tenantId || !tableNum) { setOrders([]); return }
    load()
    const ch = supabase.channel(`ro-${tableNum}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'order_items'},load)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},load)
      .subscribe()
    return () => ch.unsubscribe()
  }, [tenantId, tableNum])

  async function load() {
    if (!tenantId||!tableNum) return
    const { data } = await supabase.from('orders')
      .select('id,order_number,status,created_at,order_items(id,product_name,product_icon,qty,unit_price,status,notes,rejected_at)')
      .eq('tenant_id',tenantId).eq('order_type','dine')
      .eq('table_number',String(tableNum))
      .in('status',['pending','preparing','ready'])
      .order('created_at',{ascending:true})
    setOrders(data||[])
  }

  async function removeItem(item, orderId) {
    await supabase.from('order_items')
      .update({status:'rejected',rejected_at:new Date().toISOString()})
      .eq('id',item.id)
    showToast(`"${item.product_name}" removed`,'info')
    load()
  }

  const allActive = orders.flatMap(o =>
    (o.order_items||[]).filter(i=>i.status!=='rejected')
  )
  const sub   = allActive.reduce((s,i)=>s+Number(i.unit_price)*i.qty,0)
  const tax   = sub*taxRate
  const total = sub+tax
  const primaryOrderId = orders[0]?.id

  if (!tableNum) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',
      flex:1, color:'var(--text3)', textAlign:'center', padding:20 }}>
      <div>
        <div style={{ fontSize:28,marginBottom:8 }}>🍽</div>
        <div style={{ fontSize:12 }}>Select a table<br/>to see orders</div>
      </div>
    </div>
  )

  // Build the new KOT accordion (in-progress cart items)
  const newKOTOrder = newKOTItems?.length>0 ? {
    id: 'new-kot',
    order_number: null,
    status: 'pending',
    order_items: newKOTItems.map(i=>({
      id:i.id, product_name:i.name, product_icon:i.icon,
      qty:i.qty, unit_price:i.price, status:'active', notes:null,
    })),
  } : null

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize:13,color:'var(--text)' }}>
          📋 {tableName} — Running Order
        </div>
        <div style={{ fontSize:10,color:'var(--text3)',marginTop:1 }}>
          {orders.length} round{orders.length!==1?'s':''} · {allActive.length} active items
        </div>
      </div>

      <div style={{ flex:1,overflowY:'auto',padding:'8px 10px' }}>
        {orders.length===0 && !newKOTOrder ? (
          <div style={{ textAlign:'center',padding:'20px 16px',color:'var(--text3)' }}>
            <div style={{ fontSize:22,marginBottom:6 }}>🍳</div>
            <div style={{ fontSize:11 }}>Nothing sent yet</div>
          </div>
        ) : (
          <>
            {/* Show new-cart KOT first (open by default) */}
            {newKOTOrder && (
              <KOTAccordion
                order={newKOTOrder}
                defaultOpen={true}
                isNew={true}
                onRemoveItem={null}
              />
            )}
            {/* Existing KOT rounds */}
            {[...orders].reverse().map((order, idx) => (
              <KOTAccordion
                key={order.id}
                order={order}
                defaultOpen={idx===0&&!newKOTOrder}
                isNew={false}
                onRemoveItem={(item) => removeItem(item,order.id)}
              />
            ))}
          </>
        )}
      </div>

      {allActive.length>0 && (
        <div style={{ borderTop:'1px solid var(--border)',padding:12,flexShrink:0 }}>
          {taxRate>0 && (
            <div style={{ display:'flex',justifyContent:'space-between',
              fontSize:11,color:'var(--text3)',marginBottom:2 }}>
              <span>Subtotal</span><span>₹{sub.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display:'flex',justifyContent:'space-between',
            fontSize:14,fontWeight:800,marginBottom:10,
            borderTop:taxRate>0?'1px solid var(--border)':'none',
            paddingTop:taxRate>0?5:0 }}>
            <span>Bill Total</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => onCheckout({orderId:primaryOrderId,total,sub,tax,activeItems:allActive,tableNum,tableName})}
            style={{ width:'100%',background:'#16A34A',color:'#fff',border:'none',
              borderRadius:'var(--r)',padding:'11px',fontWeight:700,fontSize:13,cursor:'pointer' }}>
            💳 Checkout & Pay
          </button>
        </div>
      )}
    </div>
  )
}

// ── New Items panel ────────────────────────────────────────────────
function NewItemsPanel({ items, isDine, tableNum, tableName, onAdd, onRemove,
  onSendToKitchen, onCheckout, sendingKOT, settings }) {
  const sub    = items.reduce((s,i)=>s+i.price*i.qty,0)
  const taxRate= (settings?.tax_rate||0)/100
  const total  = sub+sub*taxRate
  const count  = items.reduce((s,i)=>s+i.qty,0)

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize:13,color:'var(--text)' }}>
          🛒 {isDine ? 'Add to Table' : 'New Order'}
        </div>
        <div style={{ fontSize:10,color:'var(--brand)',fontWeight:600,marginTop:1 }}>
          {isDine ? (tableNum?`Table ${tableName}`:'Select a table first') : ''}
        </div>
      </div>

      <div style={{ flex:1,overflowY:'auto',padding:'4px 0' }}>
        {items.length===0 ? (
          <div style={{ textAlign:'center',padding:'20px 16px',color:'var(--text3)' }}>
            <div style={{ fontSize:22,marginBottom:6 }}>🛒</div>
            <div style={{ fontSize:11 }}>Tap menu to add items</div>
          </div>
        ) : items.map(item => (
          <div key={item.id} style={{ display:'flex',alignItems:'center',
            gap:8,padding:'6px 14px',borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:14,flexShrink:0 }}>{item.icon||'🍽'}</span>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:12,fontWeight:500,overflow:'hidden',
                textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)' }}>
                {item.name}</div>
              <div style={{ fontSize:11,color:'var(--brand)',fontWeight:600 }}>
                ₹{(item.price*item.qty).toFixed(2)}</div>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:4,flexShrink:0 }}>
              <button onClick={()=>onRemove(item.id)}
                style={{ width:22,height:22,borderRadius:'50%',background:'var(--card2)',
                  border:'1px solid var(--border)',color:'var(--text)',fontSize:13,
                  display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>−</button>
              <span style={{ fontSize:12,fontWeight:700,minWidth:16,textAlign:'center' }}>
                {item.qty}</span>
              <button onClick={()=>onAdd(item)}
                style={{ width:22,height:22,borderRadius:'50%',background:'var(--brand)',
                  border:'none',color:'#fff',fontSize:13,display:'flex',
                  alignItems:'center',justifyContent:'center',cursor:'pointer' }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {items.length>0 && (
        <div style={{ borderTop:'1px solid var(--border)',padding:12,flexShrink:0 }}>
          <div style={{ display:'flex',justifyContent:'space-between',
            fontSize:12,fontWeight:700,marginBottom:8 }}>
            <span style={{ color:'var(--text2)' }}>{count} item{count!==1?'s':''}</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          {isDine ? (
            <button onClick={onSendToKitchen} disabled={sendingKOT||!tableNum}
              style={{ width:'100%',border:'none',borderRadius:'var(--r)',padding:'11px',
                fontWeight:800,fontSize:14,cursor:!tableNum?'default':'pointer',
                background:!tableNum?'var(--card2)':'#E8440A',
                color:!tableNum?'var(--text3)':'#fff',
                display:'flex',alignItems:'center',justifyContent:'center',gap:7 }}>
              {sendingKOT
                ? <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.4)',
                    borderTopColor:'#fff',borderRadius:'50%',
                    animation:'spin 0.6s linear infinite',display:'inline-block' }}/>
                : '🍳'}
              {sendingKOT?'Sending…':!tableNum?'Select table first':'Send to Kitchen'}
            </button>
          ) : (
            <button onClick={onCheckout}
              style={{ width:'100%',background:'var(--brand)',color:'#fff',border:'none',
                borderRadius:'var(--r)',padding:'11px',fontWeight:700,fontSize:14,cursor:'pointer' }}>
              Checkout · ₹{total.toFixed(2)} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Checkout Modal ─────────────────────────────────────────────────
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
    { id:'cash', icon:'💵', label:'Cash'   },
    { id:'upi',  icon:'📱', label:'UPI'    },
    { id:'card', icon:'💳', label:'Card'   },
    { id:'other',icon:'🔖', label:'Other'  },
  ]

  function reset() { setStep(1);setPhone('');setName('');setPayMethod('cash');setError('') }
  function handleClose() { reset(); onClose() }

  async function confirm() {
    if (!tenantId) { setError('Not connected — refresh'); return }
    setLoading(true); setError('')
    try {
      if (isDine && existingOrderId) {
        const { error } = await supabase.from('orders')
          .update({status:'paid',payment_method:payMethod,paid_at:new Date().toISOString()})
          .eq('id',existingOrderId)
        if (error) throw error
        showToast('Table checked out ✓','success')
        onSuccess({ order_number:'—', total, payMethod, isDine:true })
        handleClose()
      } else {
        const txRate = (settings?.tax_rate||0)/100
        const s = sub || (items||[]).reduce((a,i)=>a+Number(i.unit_price||i.price)*i.qty,0)
        const t = tax || s*txRate
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
          (items||[]).map(i=>({
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

  const Spinner = () => <span style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.4)',
    borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.6s linear infinite',
    display:'inline-block' }} />

  return (
    <Modal open={open} onClose={handleClose}
      title={isDine?`Checkout — ${tableName}`:'Checkout'}
      footer={
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {error && <div style={{ fontSize:12,color:'var(--red)',background:'rgba(239,68,68,0.08)',
            border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,padding:'8px 10px' }}>⚠ {error}</div>}
          {isDine ? (
            <button onClick={confirm} disabled={loading}
              style={{ width:'100%',background:loading?'var(--card2)':'#16A34A',
                color:loading?'var(--text3)':'#fff',border:'none',borderRadius:8,
                padding:13,fontWeight:700,fontSize:14,cursor:loading?'default':'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
              {loading&&<Spinner/>}
              {loading?'Processing…':`Collect ₹${total.toFixed(2)} →`}
            </button>
          ) : step===1 ? (
            <button onClick={()=>{setError('');setStep(2)}}
              style={{ width:'100%',background:'var(--brand)',color:'#fff',border:'none',
                borderRadius:8,padding:13,fontWeight:700,fontSize:14,cursor:'pointer' }}>
              Next: Payment →
            </button>
          ) : (
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={()=>{setStep(1);setError('')}}
                style={{ flex:'0 0 72px',background:'var(--card2)',color:'var(--text)',
                  border:'1px solid var(--border)',borderRadius:8,padding:12,
                  fontWeight:600,cursor:'pointer' }}>← Back</button>
              <button onClick={confirm} disabled={loading}
                style={{ flex:1,background:loading?'var(--card2)':'var(--brand)',
                  color:loading?'var(--text3)':'#fff',border:'none',borderRadius:8,
                  padding:12,fontWeight:700,fontSize:14,cursor:loading?'default':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                {loading&&<Spinner/>}
                {loading?'Placing…':`Place Order · ₹${total.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      }>
      {!isDine&&(
        <div style={{ display:'flex',gap:0,marginBottom:14,background:'var(--bg)',
          borderRadius:8,padding:3 }}>
          {[['1 · Customer',1],['2 · Payment',2]].map(([l,s])=>(
            <div key={s} style={{ flex:1,textAlign:'center',padding:7,borderRadius:6,
              fontSize:12,fontWeight:600,background:step===s?'var(--card2)':'transparent',
              color:step>=s?'var(--text)':'var(--text3)' }}>{l}</div>
          ))}
        </div>
      )}
      <div style={{ background:'var(--bg)',borderRadius:8,padding:'10px 12px',marginBottom:14 }}>
        <div style={{ color:'var(--brand)',fontWeight:700,fontSize:12,marginBottom:5 }}>
          {isDine?`🍽 ${tableName}`:orderType==='delivery'?'🚚 Delivery':'🛍 Takeaway'}
        </div>
        {(items||[]).map((i,idx)=>(
          <div key={idx} style={{ display:'flex',justifyContent:'space-between',
            padding:'2px 0',color:'var(--text2)',fontSize:12,borderBottom:'1px solid var(--border)' }}>
            <span>{i.product_icon||i.icon||'🍽'} {i.product_name||i.name} ×{i.qty}</span>
            <span>₹{(Number(i.unit_price||i.price)*i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:800,marginTop:5 }}>
          <span>Total</span><span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
        </div>
      </div>
      {!isDine&&step===1&&(
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {[
            {label:'Phone',value:phone,set:setPhone,type:'tel',placeholder:'+91 98765 43210'},
            {label:'Name', value:name, set:setName, placeholder:'Optional'},
          ].map(f=>(
            <label key={f.label} style={{ display:'flex',flexDirection:'column',gap:4 }}>
              <span style={{ fontSize:11,fontWeight:700,color:'var(--text2)',
                textTransform:'uppercase',letterSpacing:'0.4px' }}>{f.label}</span>
              <input value={f.value} onChange={e=>f.set(e.target.value)}
                type={f.type||'text'} placeholder={f.placeholder}
                style={{ width:'100%',padding:'9px 12px',background:'var(--bg)',
                  border:'1.5px solid var(--border2)',borderRadius:8,
                  color:'var(--text)',fontSize:14,outline:'none' }}/>
            </label>
          ))}
        </div>
      )}
      {(isDine||step===2)&&(
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--text2)',
            textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:10 }}>
            Payment Method</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            {PAY.map(m=>(
              <button key={m.id} onClick={()=>setPayMethod(m.id)} style={{
                background:payMethod===m.id?'var(--brand-lt)':'var(--card2)',
                border:`2px solid ${payMethod===m.id?'var(--brand)':'var(--border)'}`,
                borderRadius:10,padding:'12px 8px',cursor:'pointer',textAlign:'center' }}>
                <div style={{ fontSize:24,marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize:12,fontWeight:700,color:'var(--text)' }}>{m.label}</div>
                {m.id==='upi'&&!upiId&&<div style={{ fontSize:10,color:'var(--amber)',marginTop:2 }}>Set in Settings</div>}
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
    <Modal open onClose={onClose} title={order.isDine?'Table Checked Out ✓':'Order Complete ✓'}
      footer={<button onClick={onClose} style={{ width:'100%',background:'var(--brand)',color:'#fff',
        border:'none',borderRadius:8,padding:13,fontWeight:700,cursor:'pointer' }}>Done</button>}>
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

// ── Mobile bottom sheet ────────────────────────────────────────────
// ── Mobile Sheet ──────────────────────────────────────────────────
// Single bottom sheet that shows either:
//   - For takeaway/delivery: simple cart list + checkout CTA
//   - For dine-in: tabs between "Cart" and "Running Order" (accordion)
function MobileSheet({
  open, onClose,
  isDine, tableNum, tableName,
  items, onAdd, onRemove,
  onSendToKitchen, onCheckout, onTableCheckout,
  sendingKOT, settings, pendingItems,
}) {
  const [tab, setTab] = useState('cart')  // 'cart' | 'running'

  // Reset to cart tab whenever sheet opens
  useEffect(() => { if (open) setTab('cart') }, [open])

  const sub     = items.reduce((s,i) => s + i.price * i.qty, 0)
  const taxRate = (settings?.tax_rate || 0) / 100
  const total   = sub + sub * taxRate
  const count   = items.reduce((s,i) => s + i.qty, 0)

  if (!open) return null

  const showCart    = !isDine || tab === 'cart'
  const showRunning = isDine  && tab === 'running'

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:300,
        display:'flex', flexDirection:'column', justifyContent:'flex-end',
        background:'rgba(0,0,0,0.55)', backdropFilter:'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet panel — full height with scroll inside */}
      <div style={{
        background:'var(--card)', borderRadius:'18px 18px 0 0',
        height:'90vh',           // tall enough to scroll
        display:'flex', flexDirection:'column',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.45)',
      }}>

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0', flexShrink:0 }}>
          <div style={{ width:40, height:4, borderRadius:2, background:'var(--border2)' }}/>
        </div>

        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', gap:8,
          padding:'8px 16px 0', flexShrink:0 }}>
          {isDine ? (
            // Two tabs for dine-in
            <>
              {[['cart','🛒 Cart'],['running','📋 Running Order']].map(([t,l]) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex:1, padding:'9px 8px', borderRadius:10, border:'none',
                  background: tab===t ? 'var(--brand-lt)' : 'var(--card2)',
                  color: tab===t ? 'var(--brand)' : 'var(--text2)',
                  fontWeight: tab===t ? 700 : 500, fontSize:13, cursor:'pointer',
                  borderBottom: tab===t ? '2px solid var(--brand)' : '2px solid transparent',
                }}>{l}</button>
              ))}
            </>
          ) : (
            <span style={{ flex:1, fontWeight:800, fontSize:15, color:'var(--text)' }}>
              🛒 Cart
            </span>
          )}
          <button onClick={onClose} style={{ background:'none', border:'none',
            color:'var(--text2)', fontSize:20, cursor:'pointer', padding:'0 4px',
            flexShrink:0, lineHeight:1 }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>

          {/* Cart tab */}
          {showCart && (
            items.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 16px', color:'var(--text3)' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>🛒</div>
                <div style={{ fontSize:13 }}>Tap items in the menu to add</div>
              </div>
            ) : items.map(item => (
              <div key={item.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 16px', borderBottom:'1px solid var(--border)',
              }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{item.icon||'🍽'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'var(--text)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize:12, color:'var(--brand)', fontWeight:700, marginTop:1 }}>
                    ₹{(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <button onClick={() => onRemove(item.id)} style={{
                    width:30, height:30, borderRadius:'50%',
                    background:'var(--card2)', border:'1px solid var(--border)',
                    color:'var(--text)', fontSize:18,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer',
                  }}>−</button>
                  <span style={{ fontSize:15, fontWeight:800, minWidth:20,
                    textAlign:'center', color:'var(--text)' }}>{item.qty}</span>
                  <button onClick={() => onAdd(item)} style={{
                    width:30, height:30, borderRadius:'50%',
                    background:'var(--brand)', border:'none', color:'#fff',
                    fontSize:18, display:'flex', alignItems:'center',
                    justifyContent:'center', cursor:'pointer',
                  }}>+</button>
                </div>
              </div>
            ))
          )}

          {/* Running Order tab — uses same KOTAccordion as desktop */}
          {showRunning && (
            <div style={{ padding:'8px 12px' }}>
              <RunningOrder
                tableNum={tableNum}
                tableName={tableName}
                onCheckout={data => { onTableCheckout(data); onClose() }}
                pendingItems={pendingItems}
                newKOTItems={items.length > 0 ? items : null}
              />
            </div>
          )}
        </div>

        {/* Sticky footer CTA */}
        {showCart && (
          <div style={{
            borderTop:'1px solid var(--border)',
            padding:'14px 16px 24px', flexShrink:0,
            background:'var(--card)',
          }}>
            {items.length > 0 ? (
              <>
                <div style={{ display:'flex', justifyContent:'space-between',
                  fontSize:15, fontWeight:800, marginBottom:12 }}>
                  <span style={{ color:'var(--text)' }}>Total</span>
                  <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
                </div>
                {isDine ? (
                  <button
                    onClick={onSendToKitchen}
                    disabled={sendingKOT || !tableNum}
                    style={{
                      width:'100%', border:'none', borderRadius:14,
                      padding:'15px', fontWeight:800, fontSize:16,
                      background: !tableNum ? 'var(--card2)' : '#E8440A',
                      color: !tableNum ? 'var(--text3)' : '#fff',
                      cursor: !tableNum ? 'default' : 'pointer',
                      display:'flex', alignItems:'center',
                      justifyContent:'center', gap:8,
                    }}>
                    {sendingKOT
                      ? <span style={{ width:16, height:16,
                          border:'2px solid rgba(255,255,255,0.4)',
                          borderTopColor:'#fff', borderRadius:'50%',
                          animation:'spin 0.6s linear infinite',
                          display:'inline-block' }} />
                      : '🍳'}
                    {sendingKOT ? 'Sending to kitchen…'
                      : !tableNum ? 'Select a table first'
                      : `Send ${count} item${count!==1?'s':''} to Kitchen`}
                  </button>
                ) : (
                  <button onClick={onCheckout} style={{
                    width:'100%', background:'var(--brand)', color:'#fff',
                    border:'none', borderRadius:14, padding:'15px',
                    fontWeight:700, fontSize:16, cursor:'pointer',
                  }}>
                    Checkout · ₹{total.toFixed(2)} →
                  </button>
                )}
              </>
            ) : (
              <div style={{ textAlign:'center', color:'var(--text3)', fontSize:12,
                padding:'4px 0' }}>
                Add items from the menu above
              </div>
            )}
          </div>
        )}

        {/* Running order footer — just a hint, checkout is inside RunningOrder */}
        {showRunning && (
          <div style={{ borderTop:'1px solid var(--border)',
            padding:'10px 16px 20px', flexShrink:0, background:'var(--card)' }}>
            <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center' }}>
              Tap "Checkout & Pay" above to close the table
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


// ── Main OrderPage ─────────────────────────────────────────────────
export default function OrderPage({ defaultType = 'takeaway' }) {
  const { categories, products, addToCart, removeFromCart, cart, cartItems,
          cartSubtotal, clearCart, settings, tenantId, showToast } = useStore()

  const [orderType]          = useState(defaultType)
  const [tableNum, setTableNum]     = useState(null)
  const [activeCat, setActiveCat]   = useState('all')
  const [sendingKOT, setSendingKOT] = useState(false)
  const [checkoutData, setCheckoutData] = useState(null)
  const [successOrder, setSuccessOrder] = useState(null)
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 860)
  const [pendingItems, setPendingItems] = useState([]) // optimistic

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 860)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Clear pending when table changes
  useEffect(() => { setPendingItems([]) }, [tableNum])

  const isDine     = orderType === 'dine'
  const items      = cartItems()
  const sub        = cartSubtotal()
  const taxRate    = (settings?.tax_rate||0)/100
  const total      = sub + sub*taxRate
  const cartCount  = items.reduce((s,i)=>s+i.qty,0)
  const tableCount = settings?.table_count || 10
  const tableName  = tableNum ? `T${tableNum}` : null

  async function handleSendToKitchen() {
    if (!tableNum) { showToast('Select a table first','warning'); return }
    if (!items.length) { showToast('No items','warning'); return }
    if (!tenantId) { showToast('Not connected — refresh','error'); return }
    setSendingKOT(true)
    // Optimistic
    const optimistic = items.map(i=>({ ...i, id:`opt-${Date.now()}-${i.id}`, optimistic:true }))
    setPendingItems(p=>[...p,...optimistic])
    try {
      const s=sub, t=s*taxRate, tot=s+t
      const { data:existing } = await supabase.from('orders')
        .select('id')
        .eq('tenant_id',tenantId).eq('order_type','dine')
        .eq('table_number',String(tableNum))
        .in('status',['pending','preparing','ready'])
        .maybeSingle()

      let orderId = existing?.id
      if (!orderId) {
        const { data:o, error } = await supabase.from('orders').insert({
          tenant_id:tenantId, status:'pending', order_type:'dine',
          table_number:String(tableNum), payment_method:'cash',
          subtotal:Number(s.toFixed(2)), tax:Number(t.toFixed(2)), total:Number(tot.toFixed(2)),
        }).select('id').single()
        if (error) throw error
        orderId = o.id
      } else {
        try {
          await supabase.rpc('increment_order_total',{order_id:orderId,add_subtotal:s,add_tax:t,add_total:tot})
        } catch(e) { console.warn('[BITE] rpc failed:',e?.message) }
      }

      const { error } = await supabase.from('order_items').insert(
        items.map(i=>({
          tenant_id:tenantId, order_id:orderId,
          product_id:i.id, product_name:i.name,
          product_icon:i.icon||'', unit_price:Number(i.price),
          qty:Number(i.qty), status:'active',
        }))
      )
      if (error) throw error

      clearCart(); setPendingItems([])
      showToast(`🍳 ${cartCount} item${cartCount!==1?'s':''} sent!`,'success')
      if (isMobile) setSheetTab('running')
    } catch(e) {
      setPendingItems([])
      showToast(e.message||'Error','error')
    }
    setSendingKOT(false)
  }

  function openCheckout() {
    if (!items.length) { showToast('Cart is empty','warning'); return }
    setCheckoutData({ items, orderType, tableNum, tableName, total, sub,
      tax:sub*taxRate, existingOrderId:null })
    setSheetOpen(false)
  }

  function openTableCheckout(data) {
    setCheckoutData({ items:data.activeItems, orderType:'dine',
      tableNum:data.tableNum, tableName:data.tableName,
      total:data.total, sub:data.sub, tax:data.tax,
      existingOrderId:data.orderId })
    setSheetOpen(false)
  }

  const groups = useMemo(() => {
    const filtered = activeCat==='all'
      ? products : products.filter(p=>String(p.category_id)===activeCat)
    if (activeCat!=='all') return [{ name:'', icon:'', items:filtered }]
    const map = {}
    filtered.forEach(p => {
      const key = p.category_id||'other'
      if (!map[key]) map[key]={ name:p.catName||'Other', icon:p.catIcon||'', items:[] }
      map[key].items.push(p)
    })
    return Object.values(map)
  }, [products, activeCat])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column',
      overflow:'hidden', position:'relative' }}>

      {/* Table picker — dine in only */}
      {isDine && (
        <TablePicker count={tableCount} selected={tableNum}
          onSelect={n=>{ setTableNum(n); clearCart(); setPendingItems([]) }}
          tenantId={tenantId} />
      )}

      {/* Category strip */}
      <div style={{ display:'flex', gap:5, padding:'6px 12px', overflowX:'auto',
        borderBottom:'1px solid var(--border)', flexShrink:0, scrollbarWidth:'none' }}>
        {[{ id:'all', name:'All', icon:'' },...categories].map(cat=>(
          <button key={cat.id} onClick={()=>setActiveCat(String(cat.id))} style={{
            flexShrink:0, padding:'4px 10px', borderRadius:20, whiteSpace:'nowrap',
            background:activeCat===String(cat.id)?'var(--brand-lt)':'none',
            border:`1.5px solid ${activeCat===String(cat.id)?'rgba(232,68,10,0.3)':'var(--border)'}`,
            color:activeCat===String(cat.id)?'var(--brand)':'var(--text2)',
            fontSize:11, fontWeight:600, cursor:'pointer' }}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Menu — wider */}
        <div style={{ flex:1, overflowY:'auto', padding:10 }}>
          {products.length===0&&(
            <div style={{ textAlign:'center',padding:40,color:'var(--text2)' }}>
              <div style={{ fontSize:32,marginBottom:8 }}>🍽</div>
              <div>No products yet.</div>
            </div>
          )}
          {groups.map((group,gi)=>(
            <div key={gi}>
              {group.name&&(
                <div style={{ fontSize:10,fontWeight:700,color:'var(--text3)',
                  textTransform:'uppercase',letterSpacing:'0.5px',padding:'8px 0 5px' }}>
                  {group.icon} {group.name}
                </div>
              )}
              <div style={{ display:'grid',
                gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',
                gap:7, marginBottom:10 }}>
                {group.items.map(p=>{
                  const qty=cart[p.id]?.qty
                  return (
                    <button key={p.id} onClick={()=>!p.out_of_stock&&addToCart(p)}
                      disabled={p.out_of_stock}
                      style={{
                        background:qty?'var(--brand-lt2)':'var(--card)',
                        border:`1.5px solid ${qty?'rgba(232,68,10,0.25)':'var(--border)'}`,
                        borderRadius:'var(--r)', padding:'10px 8px',
                        cursor:p.out_of_stock?'not-allowed':'pointer',
                        opacity:p.out_of_stock?0.45:1,
                        display:'flex', flexDirection:'column', gap:3,
                        textAlign:'left', position:'relative' }}>
                      <span style={{ fontSize:22 }}>{p.icon||'🍽'}</span>
                      <span style={{ fontSize:12,fontWeight:500,color:'var(--text2)',lineHeight:1.3 }}>
                        {p.name}</span>
                      <span style={{ fontSize:12,color:'var(--brand)',fontWeight:700 }}>
                        ₹{Number(p.price).toFixed(2)}</span>
                      {qty&&<span style={{ position:'absolute',top:5,right:5,
                        background:'var(--brand)',color:'#fff',fontSize:9,fontWeight:800,
                        borderRadius:'50%',width:16,height:16,display:'flex',
                        alignItems:'center',justifyContent:'center' }}>{qty}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {isMobile&&<div style={{ height:84 }}/>}
        </div>

        {/* Desktop panels */}
        {!isMobile&&isDine&&(
          <>
            <div style={{ width:280,flexShrink:0,borderLeft:'1px solid var(--border)',
              display:'flex',flexDirection:'column',overflow:'hidden' }}>
              <RunningOrder tableNum={tableNum} tableName={tableName}
                onCheckout={openTableCheckout} pendingItems={pendingItems}
                newKOTItems={items.length>0?items:null} />
            </div>
            <div style={{ width:230,flexShrink:0,borderLeft:'1px solid var(--border)',
              display:'flex',flexDirection:'column',overflow:'hidden' }}>
              <NewItemsPanel items={items} isDine onAdd={addToCart}
                onRemove={removeFromCart} tableNum={tableNum} tableName={tableName}
                onSendToKitchen={handleSendToKitchen}
                onCheckout={openCheckout}
                sendingKOT={sendingKOT} settings={settings} />
            </div>
          </>
        )}

        {!isMobile&&!isDine&&(
          <div style={{ width:280,flexShrink:0,borderLeft:'1px solid var(--border)',
            display:'flex',flexDirection:'column',overflow:'hidden' }}>
            <NewItemsPanel items={items} isDine={false} onAdd={addToCart}
              onRemove={removeFromCart} tableNum={null} tableName={null}
              onSendToKitchen={null} onCheckout={openCheckout}
              sendingKOT={false} settings={settings} />
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'10px 12px 14px',
          background:'var(--bg)',
          borderTop:'1px solid var(--border)',
          display:'flex', gap:8,
        }}>
          {isDine ? (
            <>
              {/* Send to Kitchen — prominent left button */}
              <button
                onClick={cartCount > 0 ? handleSendToKitchen : undefined}
                disabled={sendingKOT}
                style={{
                  flex: 1.8,
                  background: (!tableNum || cartCount === 0) ? 'var(--card2)' : '#E8440A',
                  color:      (!tableNum || cartCount === 0) ? 'var(--text3)' : '#fff',
                  border: `1.5px solid ${(!tableNum || cartCount === 0) ? 'var(--border)' : '#E8440A'}`,
                  borderRadius: 14, padding: '13px 8px',
                  fontWeight: 800, fontSize: 14,
                  cursor: (!tableNum || cartCount === 0) ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  transition: 'all 0.15s',
                }}>
                {sendingKOT
                  ? <span style={{ width:16, height:16,
                      border:'2px solid rgba(255,255,255,0.4)',
                      borderTopColor:'#fff', borderRadius:'50%',
                      animation:'spin 0.6s linear infinite',
                      display:'inline-block' }} />
                  : <span style={{ fontSize:17 }}>🍳</span>}
                {sendingKOT ? 'Sending…'
                  : !tableNum ? 'Select table'
                  : cartCount > 0 ? `Send ${cartCount} to Kitchen`
                  : 'Send to Kitchen'}
              </button>

              {/* Cart / Running order — icon button right */}
              <button
                onClick={() => setSheetOpen(true)}
                style={{
                  flex: 1,
                  background: 'var(--card)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 14, padding: '13px 8px',
                  fontWeight: 700, fontSize: 13,
                  color: 'var(--text)', cursor: 'pointer',
                  display:'flex', alignItems:'center',
                  justifyContent:'center', gap:6,
                  position:'relative',
                }}>
                <span style={{ fontSize:18 }}>🛒</span>
                <span style={{ fontSize:12 }}>Order</span>
                {cartCount > 0 && (
                  <span style={{
                    position:'absolute', top:6, right:6,
                    background:'var(--brand)', color:'#fff',
                    fontSize:10, fontWeight:800,
                    borderRadius:'50%', width:18, height:18,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    border:'2px solid var(--bg)',
                  }}>{cartCount}</span>
                )}
              </button>
            </>
          ) : cartCount > 0 ? (
            /* Takeaway / Delivery — single full-width cart button */
            <button onClick={() => setSheetOpen(true)} style={{
              flex:1, background:'var(--brand)', color:'#fff',
              border:'none', borderRadius:14, padding:'13px 20px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              fontWeight:700, fontSize:14, cursor:'pointer',
            }}>
              <span style={{
                background:'rgba(255,255,255,0.25)', borderRadius:8,
                padding:'2px 8px', fontSize:13,
              }}>{cartCount}</span>
              <span>View Cart · ₹{total.toFixed(2)}</span>
              <span>→</span>
            </button>
          ) : (
            /* Empty state — invisible spacer so content doesn't hide behind FAB */
            <div style={{ height:46 }} />
          )}
        </div>
      )}

      <MobileSheet open={sheetOpen} onClose={()=>setSheetOpen(false)}
        isDine={isDine} tableNum={tableNum} tableName={tableName}
        items={items} onAdd={addToCart} onRemove={removeFromCart}
        onSendToKitchen={handleSendToKitchen}
        onCheckout={openCheckout} onTableCheckout={openTableCheckout}
        sendingKOT={sendingKOT} settings={settings}
        pendingItems={pendingItems} />

      <CheckoutModal open={!!checkoutData} onClose={()=>setCheckoutData(null)}
        checkoutData={checkoutData}
        onSuccess={o=>{ setSuccessOrder(o); setCheckoutData(null) }} />
      <SuccessModal order={successOrder} onClose={()=>setSuccessOrder(null)} />
    </div>
  )
}