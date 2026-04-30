import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

// ── Status config ─────────────────────────────────────────────────
const STATUS = {
  pending:   { label:'⏳ Waiting',   bg:'rgba(245,158,11,0.12)', color:'#F59E0B' },
  preparing: { label:'🔥 Preparing', bg:'rgba(59,130,246,0.12)', color:'#3B82F6' },
  ready:     { label:'✅ Ready',      bg:'rgba(34,197,94,0.12)',  color:'#22C55E' },
  active:    { label:'⏳ Waiting',   bg:'rgba(245,158,11,0.12)', color:'#F59E0B' },
  rejected:  { label:'✕ Removed',   bg:'rgba(239,68,68,0.1)',   color:'#EF4444' },
}
const StatusPill = ({ status }) => {
  const s = STATUS[status] || STATUS.pending
  return <span style={{ fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:5,
    background:s.bg,color:s.color,whiteSpace:'nowrap' }}>{s.label}</span>
}
const Spinner = ({ size=14 }) => (
  <span style={{ width:size,height:size,border:'2px solid rgba(255,255,255,0.35)',
    borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.6s linear infinite',
    display:'inline-block',flexShrink:0 }}/>
)

// ── Table picker ───────────────────────────────────────────────────
function TablePicker({ count, selected, onSelect, tenantId }) {
  const [activeTables, setActiveTables] = useState(new Set())

  useEffect(() => {
    if (!tenantId) return
    load()
    const ch = supabase.channel('tp')
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},load)
      .subscribe()
    return () => ch.unsubscribe()
  }, [tenantId])

  async function load() {
    const { data } = await supabase.from('orders').select('table_number')
      .eq('tenant_id',tenantId).eq('order_type','dine')
      .in('status',['pending','preparing','ready'])
    setActiveTables(new Set((data||[]).map(o=>Number(o.table_number))))
  }

  return (
    <div style={{ display:'flex',flexWrap:'wrap',gap:6,padding:'10px 14px',
      borderBottom:'1px solid var(--border)',flexShrink:0,alignItems:'center' }}>
      <span style={{ fontSize:10,fontWeight:700,color:'var(--text3)',
        textTransform:'uppercase',letterSpacing:'0.5px',flexShrink:0 }}>Table:</span>
      <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
        {Array.from({length:count},(_,i)=>i+1).map(n => {
          const isActive   = activeTables.has(n)
          const isSelected = selected === n
          return (
            <button key={n} onClick={() => onSelect(isSelected?null:n)}
              style={{
                position:'relative', minWidth:44, height:36, borderRadius:8,
                fontSize:12, fontWeight:700, cursor:'pointer',
                background: isSelected?'var(--brand)':isActive?'var(--brand-lt)':'var(--card)',
                border:`2px solid ${isSelected?'var(--brand)':isActive?'rgba(232,68,10,0.35)':'var(--border)'}`,
                color: isSelected?'#fff':isActive?'var(--brand)':'var(--text2)',
                transition:'all 0.1s',
              }}>
              T{n}
              {isActive && !isSelected && (
                <span style={{ position:'absolute',top:3,right:3,width:6,height:6,
                  borderRadius:'50%',background:'var(--brand)' }}/>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Single round accordion ────────────────────────────────────────
// isNew   = unsent cart items (no send button on mobile, has it on desktop)
// isMobile = controls whether to show Send to Kitchen inside accordion
function RoundAccordion({
  order, defaultOpen, isNew, isMobile,
  onSendToKitchen, sendingKOT, tableNum,
  onRemoveItem, onAddItem, onChangeNote,
  notes, // { [itemId]: string } — only for isNew
}) {
  const [open, setOpen] = useState(defaultOpen)

  const active   = (order.order_items||[]).filter(i=>i.status!=='rejected')
  const rejected = (order.order_items||[]).filter(i=>i.status==='rejected')
  const subtotal = active.reduce((s,i)=>s+Number(i.unit_price||i.price)*i.qty, 0)
  const statusColor = STATUS[order.status]?.color || '#F59E0B'

  return (
    <div style={{
      border:`1px solid ${isNew?'rgba(232,68,10,0.3)':'var(--border)'}`,
      borderRadius:10, marginBottom:6, overflow:'hidden',
      background: isNew?'var(--brand-lt2)':'var(--card)',
    }}>
      {/* Accordion header */}
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:'100%',display:'flex',alignItems:'center',gap:8,
        padding:'10px 12px',background:'none',border:'none',
        cursor:'pointer',textAlign:'left',
      }}>
        <span style={{ fontSize:11,color:'var(--text3)',flexShrink:0 }}>{open?'▾':'▸'}</span>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
            <span style={{ fontSize:12,fontWeight:700,color:'var(--text)' }}>
              {isNew ? '🆕 New round' : `Round #${order.order_number||'—'}`}
            </span>
            <span style={{ fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:5,
              background:STATUS[order.status]?.bg||'rgba(245,158,11,0.12)',
              color:statusColor }}>
              {STATUS[order.status]?.label||'⏳ Waiting'}
            </span>
            {rejected.length>0 && (
              <span style={{ fontSize:10,color:'var(--red)' }}>{rejected.length} removed</span>
            )}
          </div>
          {!open && (
            <div style={{ fontSize:11,color:'var(--text3)',marginTop:1 }}>
              {active.length} item{active.length!==1?'s':''} · ₹{subtotal.toFixed(2)}
            </div>
          )}
        </div>
        <span style={{ fontSize:12,fontWeight:700,color:'var(--brand)',flexShrink:0 }}>
          ₹{subtotal.toFixed(2)}
        </span>
      </button>

      {open && (
        <div style={{ borderTop:'1px solid var(--border)' }}>

          {/* Active items */}
          {active.map(item => {
            const itemNote = isNew ? (notes?.[item.id]||'') : (item.notes||'')
            return (
              <div key={item.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px' }}>
                  <span style={{ fontSize:15,flexShrink:0 }}>
                    {item.product_icon||item.icon||'🍽'}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:500,color:'var(--text)',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {item.product_name||item.name}
                    </div>
                    {!isNew && item.notes && (
                      <div style={{ fontSize:10,color:'var(--amber)',marginTop:1 }}>
                        📝 {item.notes}</div>
                    )}
                    {!isNew && (
                      <div style={{ marginTop:2 }}>
                        <StatusPill status={order.status||'pending'}/>
                      </div>
                    )}
                  </div>
                  {/* Qty controls for new round */}
                  {isNew ? (
                    <div style={{ display:'flex',alignItems:'center',gap:5,flexShrink:0 }}>
                      <button onClick={()=>onRemoveItem&&onRemoveItem(item.id)}
                        style={{ width:22,height:22,borderRadius:'50%',
                          background:'var(--card)',border:'1px solid var(--border)',
                          color:'var(--text)',fontSize:13,display:'flex',
                          alignItems:'center',justifyContent:'center',cursor:'pointer' }}>−</button>
                      <span style={{ fontSize:12,fontWeight:700,minWidth:16,
                        textAlign:'center',color:'var(--text)' }}>{item.qty}</span>
                      <button onClick={()=>onAddItem&&onAddItem(item)}
                        style={{ width:22,height:22,borderRadius:'50%',
                          background:'var(--brand)',border:'none',color:'#fff',
                          fontSize:13,display:'flex',alignItems:'center',
                          justifyContent:'center',cursor:'pointer' }}>+</button>
                    </div>
                  ) : (
                    <div style={{ flexShrink:0,textAlign:'right' }}>
                      <div style={{ fontSize:11,fontWeight:600,color:'var(--brand)' }}>
                        ×{item.qty}</div>
                      {/* Remove button for pending kitchen items */}
                      {order.status==='pending' && onRemoveItem && (
                        <button onClick={()=>onRemoveItem(item,order.id)}
                          style={{ fontSize:10,color:'var(--red)',background:'none',
                            border:'none',cursor:'pointer',padding:0,marginTop:2 }}>
                          reject</button>
                      )}
                    </div>
                  )}
                </div>
                {/* Per-item note input (new round only) */}
                {isNew && (
                  <div style={{ padding:'0 12px 8px' }}>
                    <input
                      value={itemNote}
                      onChange={e => onChangeNote&&onChangeNote(item.id, e.target.value)}
                      placeholder="Note for kitchen (e.g. no onions)…"
                      style={{ width:'100%',padding:'5px 9px',fontSize:11,
                        background:'var(--bg)',border:'1px solid var(--border)',
                        borderRadius:6,color:'var(--text)',outline:'none' }}/>
                  </div>
                )}
              </div>
            )
          })}

          {/* Rejected items */}
          {rejected.map(item => (
            <div key={item.id} style={{ display:'flex',gap:8,padding:'5px 12px',
              opacity:0.4,textDecoration:'line-through',fontSize:11,
              color:'var(--text3)',borderBottom:'1px solid var(--border)' }}>
              <span>{item.product_icon||item.icon||'🍽'}</span>
              <span style={{ flex:1 }}>{item.product_name||item.name} ×{item.qty}</span>
              <span style={{ color:'var(--red)' }}>removed</span>
            </div>
          ))}

          {/* Send to Kitchen — inside accordion, desktop new round only */}
          {isNew && !isMobile && (
            <div style={{ padding:'10px 12px',background:'var(--brand-lt2)' }}>
              <button onClick={onSendToKitchen}
                disabled={sendingKOT||!tableNum}
                style={{
                  width:'100%',border:'none',borderRadius:8,
                  padding:'11px',fontWeight:800,fontSize:14,
                  background:!tableNum?'var(--card2)':' #E8440A',
                  color:!tableNum?'var(--text3)':'#fff',
                  cursor:!tableNum?'default':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                }}>
                {sendingKOT?<Spinner/>:'🍳'}
                {sendingKOT?'Sending…':!tableNum?'Select table first':'Send to Kitchen'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function TableOrderPanel({
  tableNum, tableName,
  cartItems,
  onAddToCart, onRemoveFromCart,
  onSendToKitchen, sendingKOT,
  onCheckout,
  settings, isMobile,
  notes, onChangeNote,
  optimisticRounds,
  onRealDataLoaded,
}) {
  const { tenantId, showToast } = useStore()
  const [rounds, setRounds]     = useState([])

  const taxRate = (settings?.tax_rate||0)/100

  useEffect(() => {
    if (!tenantId||!tableNum) { setRounds([]); return }
    loadRounds()
    const ch = supabase.channel(`to-${tableNum}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'order_items'},loadRounds)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},loadRounds)
      .subscribe()
    return () => ch.unsubscribe()
  }, [tenantId,tableNum])

  async function loadRounds() {
    if (!tenantId||!tableNum) return
    const { data } = await supabase.from('orders')
      .select('id,order_number,status,created_at,order_items(id,product_name,product_icon,qty,unit_price,status,notes,rejected_at)')
      .eq('tenant_id',tenantId).eq('order_type','dine')
      .eq('table_number',String(tableNum))
      .in('status',['pending','preparing','ready'])
      .order('created_at',{ascending:false})   // newest first
    const newRounds = data||[]
    setRounds(newRounds)
    // If we got real rounds, clear any optimistic ones
    if (newRounds.length > 0 && onRealDataLoaded) {
      onRealDataLoaded()
    }
  }

  async function removeItem(item, orderId) {
    await supabase.from('order_items')
      .update({status:'rejected',rejected_at:new Date().toISOString()})
      .eq('id',item.id)
    showToast(`"${item.product_name}" removed`,'info')
    loadRounds()
  }

  // All active items across all rounds for billing
  const allActive = rounds.flatMap(o =>
    (o.order_items||[]).filter(i=>i.status!=='rejected')
  )
  const sub     = allActive.reduce((s,i)=>s+Number(i.unit_price)*i.qty,0)
  const tax     = sub*taxRate
  const total   = sub+tax

  // Cart sub-total for the "new round" pending row
  const cartSub    = cartItems.reduce((s,i)=>s+i.price*i.qty,0)
  const cartTotal  = cartSub + cartSub*taxRate
  const cartCount  = cartItems.reduce((s,i)=>s+i.qty,0)
  const primaryId  = rounds[rounds.length-1]?.id  // oldest open order

  // Build new-round order object for the accordion
  const newRoundOrder = {
    id:'new', order_number:null, status:'pending',
    order_items: cartItems.map(i=>({
      id:`c-${i.id}`, product_name:i.name, product_icon:i.icon||'',
      qty:i.qty, unit_price:i.price, status:'active',
    })),
  }

  if (!tableNum) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',
      flex:1,color:'var(--text3)',textAlign:'center',padding:24 }}>
      <div>
        <div style={{ fontSize:28,marginBottom:8 }}>🍽</div>
        <div style={{ fontSize:12 }}>Select a table to start</div>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      {/* Panel header */}
      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize:13,color:'var(--text)' }}>
          📋 Table Order — {tableName}
        </div>
        <div style={{ fontSize:10,color:'var(--text3)',marginTop:1 }}>
          {rounds.length} sent round{rounds.length!==1?'s':''} · {allActive.length} active items
        </div>
      </div>

      {/* Rounds list */}
      <div style={{ flex:1,overflowY:'auto',padding:'8px 10px' }}>

        {/* New round (cart) — always shown if there are cart items */}
        {cartItems.length>0 && (
          <RoundAccordion
            order={newRoundOrder}
            defaultOpen={true}
            isNew={true}
            isMobile={isMobile}
            onSendToKitchen={onSendToKitchen}
            sendingKOT={sendingKOT}
            tableNum={tableNum}
            onRemoveItem={(id) => onRemoveFromCart(id)}
            onAddItem={(item) => onAddToCart(item)}
            onChangeNote={onChangeNote}
            notes={notes}
          />
        )}

        {/* Existing sent rounds */}
        {rounds.length===0 && (optimisticRounds||[]).length===0 && cartItems.length===0 && (
          <div style={{ textAlign:'center',padding:'20px',color:'var(--text3)' }}>
            <div style={{ fontSize:22,marginBottom:6 }}>🍳</div>
            <div style={{ fontSize:11 }}>No rounds sent yet.<br/>Add items and send to kitchen.</div>
          </div>
        )}

        {/* Optimistic rounds — shown immediately after send, before DB confirms */}
        {(optimisticRounds||[]).map((order,idx) => (
          <RoundAccordion
            key={order.id}
            order={order}
            defaultOpen={true}
            isNew={false}
            isMobile={isMobile}
            onSendToKitchen={null}
            sendingKOT={false}
            tableNum={tableNum}
            onRemoveItem={null}
          />
        ))}

        {rounds.map((order,idx) => (
          <RoundAccordion
            key={order.id}
            order={order}
            defaultOpen={idx===0 && cartItems.length===0 && (optimisticRounds||[]).length===0}
            isNew={false}
            isMobile={isMobile}
            onSendToKitchen={null}
            sendingKOT={false}
            tableNum={tableNum}
            onRemoveItem={removeItem}
          />
        ))}
      </div>

      {/* Bill total + checkout */}
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
            onClick={() => onCheckout({
              orderId:primaryId, total, sub, tax,
              activeItems:allActive, tableNum, tableName
            })}
            style={{ width:'100%',background:'#16A34A',color:'#fff',border:'none',
              borderRadius:'var(--r)',padding:'11px',fontWeight:700,fontSize:13,cursor:'pointer' }}>
            💳 Checkout & Pay
          </button>
        </div>
      )}
    </div>
  )
}

// ── Non-dine cart panel ────────────────────────────────────────────
function CartPanel({ items, orderType, onAdd, onRemove, onCheckout, settings }) {
  const sub    = items.reduce((s,i)=>s+i.price*i.qty,0)
  const taxRate= (settings?.tax_rate||0)/100
  const total  = sub+sub*taxRate
  const count  = items.reduce((s,i)=>s+i.qty,0)
  const typeLabel = orderType==='delivery'?'🚚 Delivery':'🛍 Takeaway'

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize:13,color:'var(--text)' }}>
          🛒 Cart
        </div>
        <div style={{ fontSize:10,color:'var(--brand)',fontWeight:600,marginTop:1 }}>{typeLabel}</div>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'4px 0' }}>
        {items.length===0 ? (
          <div style={{ textAlign:'center',padding:'24px 16px',color:'var(--text3)' }}>
            <div style={{ fontSize:22,marginBottom:6 }}>🛒</div>
            <div style={{ fontSize:11 }}>Tap menu to add</div>
          </div>
        ) : items.map(item=>(
          <div key={item.id} style={{ display:'flex',alignItems:'center',
            gap:8,padding:'7px 14px',borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:15,flexShrink:0 }}>{item.icon||'🍽'}</span>
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
              <span style={{ fontSize:12,fontWeight:700,minWidth:16,textAlign:'center' }}>{item.qty}</span>
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
            fontSize:14,fontWeight:800,marginBottom:10 }}>
            <span>Total</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout}
            style={{ width:'100%',background:'var(--brand)',color:'#fff',border:'none',
              borderRadius:'var(--r)',padding:'11px',fontWeight:700,fontSize:14,cursor:'pointer' }}>
            Checkout · ₹{total.toFixed(2)} →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Mobile bottom sheet ────────────────────────────────────────────
// Single sheet, no tabs. Shows TableOrderPanel or CartPanel accordingly.
function MobileSheet({ open, onClose, isDine, tableNum, tableName,
  cartItems, onAdd, onRemove, onSendToKitchen, onCheckout, onTableCheckout,
  sendingKOT, settings, notes, onChangeNote, optimisticRounds, onRealDataLoaded }) {

  if (!open) return null

  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,
      display:'flex',flexDirection:'column',justifyContent:'flex-end',
      background:'rgba(0,0,0,0.55)',backdropFilter:'blur(2px)' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--card)',borderRadius:'18px 18px 0 0',
        height:'90vh',display:'flex',flexDirection:'column',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.45)' }}>
        {/* Drag handle */}
        <div style={{ display:'flex',justifyContent:'center',padding:'10px 0 0',flexShrink:0 }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'var(--border2)' }}/>
        </div>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'8px 16px 0',flexShrink:0 }}>
          <span style={{ fontWeight:800,fontSize:15,color:'var(--text)' }}>
            {isDine ? `📋 Table Order — ${tableName||'?'}` : '🛒 Cart'}
          </span>
          <button onClick={onClose} style={{ background:'none',border:'none',
            color:'var(--text2)',fontSize:20,cursor:'pointer',padding:'0 4px',lineHeight:1 }}>✕</button>
        </div>
        {/* Scrollable content — no send to kitchen inside accordions on mobile */}
        <div style={{ flex:1,overflowY:'auto',padding:'8px 12px' }}>
          {isDine ? (
            <TableOrderPanel
              tableNum={tableNum}
              tableName={tableName}
              cartItems={cartItems}
              onAddToCart={onAdd}
              onRemoveFromCart={onRemove}
              onSendToKitchen={onSendToKitchen}
              sendingKOT={sendingKOT}
              onCheckout={data => { onTableCheckout(data); onClose() }}
              settings={settings}
              isMobile={true}
              notes={notes}
              onChangeNote={onChangeNote}
              optimisticRounds={optimisticRounds}
              onRealDataLoaded={onRealDataLoaded}
            />
          ) : (
            <CartPanel
              items={cartItems}
              orderType="takeaway"
              onAdd={onAdd}
              onRemove={onRemove}
              onCheckout={() => { onCheckout(); onClose() }}
              settings={settings}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Checkout modal ─────────────────────────────────────────────────
function CheckoutModal({ open, onClose, checkoutData, onSuccess }) {
  const { clearCart,tenantId,settings,showToast } = useStore()
  const [step,setStep]           = useState(1)
  const [phone,setPhone]         = useState('')
  const [name,setName]           = useState('')
  const [payMethod,setPayMethod] = useState('cash')
  const [loading,setLoading]     = useState(false)
  const [error,setError]         = useState('')

  if (!checkoutData) return null
  const { items,orderType,tableNum,tableName,total,sub,tax,existingOrderId } = checkoutData
  const isDine = orderType==='dine'
  const upiId  = settings?.upi_id||''
  const PAY = [
    {id:'cash',icon:'💵',label:'Cash'  },
    {id:'upi', icon:'📱',label:'UPI'   },
    {id:'card',icon:'💳',label:'Card'  },
    {id:'other',icon:'🔖',label:'Other'},
  ]

  function reset(){ setStep(1);setPhone('');setName('');setPayMethod('cash');setError('') }
  function handleClose(){ reset();onClose() }

  async function confirm() {
    if (!tenantId){ setError('Not connected — refresh');return }
    setLoading(true);setError('')
    try {
      if (isDine && existingOrderId) {
        const {error} = await supabase.from('orders')
          .update({status:'paid',payment_method:payMethod,paid_at:new Date().toISOString()})
          .eq('id',existingOrderId)
        if (error) throw error
        showToast('Table checked out ✓','success')
        onSuccess({order_number:'—',total,payMethod,isDine:true})
        handleClose()
      } else {
        const txRate=(settings?.tax_rate||0)/100
        const s=sub||(items||[]).reduce((a,i)=>a+Number(i.unit_price||i.price)*i.qty,0)
        const t=tax||s*txRate
        const {data:order,error:oErr}=await supabase.from('orders').insert({
          tenant_id:tenantId,status:'paid',order_type:orderType,
          payment_method:payMethod,
          subtotal:Number(s.toFixed(2)),tax:Number(t.toFixed(2)),total:Number(total.toFixed(2)),
          customer_name:name||null,customer_phone:phone||null,
          paid_at:new Date().toISOString(),
        }).select('id,order_number').single()
        if (oErr) throw oErr
        const {error:iErr}=await supabase.from('order_items').insert(
          (items||[]).map(i=>({
            tenant_id:tenantId,order_id:order.id,
            product_id:i.id||i.product_id,
            product_name:i.name||i.product_name,
            product_icon:i.icon||i.product_icon||'',
            unit_price:Number(i.price||i.unit_price),
            qty:Number(i.qty),status:'active',
          }))
        )
        if (iErr) throw iErr
        clearCart()
        showToast(`Order #${order.order_number} placed ✓`,'success')
        onSuccess({...order,total,payMethod,isDine:false})
        handleClose()
      }
    } catch(e){ setError(e.message||'Error — try again') }
    setLoading(false)
  }

  const BtnRow = () => (
    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
      {error&&<div style={{ fontSize:12,color:'var(--red)',background:'rgba(239,68,68,0.08)',
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
      ):step===1?(
        <button onClick={()=>{setError('');setStep(2)}}
          style={{ width:'100%',background:'var(--brand)',color:'#fff',border:'none',
            borderRadius:8,padding:13,fontWeight:700,fontSize:14,cursor:'pointer' }}>
          Next: Payment →
        </button>
      ):(
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={()=>{setStep(1);setError('')}}
            style={{ flex:'0 0 72px',background:'var(--card2)',color:'var(--text)',
              border:'1px solid var(--border)',borderRadius:8,padding:12,fontWeight:600,cursor:'pointer' }}>
            ← Back</button>
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
  )

  return (
    <Modal open={open} onClose={handleClose}
      title={isDine?`Checkout — ${tableName}`:'Checkout'}
      footer={<BtnRow/>}>
      {!isDine&&(
        <div style={{ display:'flex',marginBottom:14,background:'var(--bg)',
          borderRadius:8,padding:3 }}>
          {[['1 · Customer',1],['2 · Payment',2]].map(([l,s])=>(
            <div key={s} style={{ flex:1,textAlign:'center',padding:7,borderRadius:6,
              fontSize:12,fontWeight:600,
              background:step===s?'var(--card2)':'transparent',
              color:step>=s?'var(--text)':'var(--text3)' }}>{l}</div>
          ))}
        </div>
      )}
      {/* Bill */}
      <div style={{ background:'var(--bg)',borderRadius:8,padding:'10px 12px',marginBottom:14 }}>
        <div style={{ color:'var(--brand)',fontWeight:700,fontSize:12,marginBottom:5 }}>
          {isDine?`🍽 ${tableName}`:orderType==='delivery'?'🚚 Delivery':'🛍 Takeaway'}</div>
        {(items||[]).map((i,idx)=>(
          <div key={idx} style={{ display:'flex',justifyContent:'space-between',
            padding:'2px 0',color:'var(--text2)',fontSize:12,borderBottom:'1px solid var(--border)' }}>
            <span>{i.product_icon||i.icon||'🍽'} {i.product_name||i.name} ×{i.qty}</span>
            <span>₹{(Number(i.unit_price||i.price)*i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:14,
          fontWeight:800,marginTop:5 }}>
          <span>Total</span><span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
        </div>
      </div>
      {!isDine&&step===1&&(
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {[
            {label:'Phone',value:phone,set:setPhone,type:'tel',placeholder:'+91 98765'},
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
                {m.id==='upi'&&!upiId&&<div style={{ fontSize:10,color:'var(--amber)',marginTop:2 }}>
                  Set in Settings</div>}
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
      footer={<button onClick={onClose} style={{ width:'100%',background:'var(--brand)',
        color:'#fff',border:'none',borderRadius:8,padding:13,fontWeight:700,cursor:'pointer' }}>Done</button>}>
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

// ── Main OrderPage ─────────────────────────────────────────────────
export default function OrderPage({ defaultType='takeaway' }) {
  const { categories, products, addToCart, removeFromCart, cart, cartItems,
          cartSubtotal, clearCart, settings, tenantId, showToast } = useStore()

  const [orderType]                     = useState(defaultType)
  const [tableNum, setTableNum]         = useState(null)
  const [activeCat, setActiveCat]       = useState('all')
  const [sendingKOT, setSendingKOT]     = useState(false)
  const [checkoutData, setCheckoutData] = useState(null)
  const [successOrder, setSuccessOrder] = useState(null)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 860)
  const [itemNotes, setItemNotes]       = useState({})    // { productId: note }
  const [optimisticRounds, setOptimisticRounds] = useState([])

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 860)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    clearCart()
    setItemNotes({})
    setOptimisticRounds([])
  }, [tableNum])

  const isDine     = orderType === 'dine'
  const items      = cartItems()
  const sub        = cartSubtotal()
  const taxRate    = (settings?.tax_rate||0)/100
  const total      = sub + sub * taxRate
  const cartCount  = items.reduce((s,i) => s+i.qty, 0)
  const tableCount = settings?.table_count || 10
  const tableName  = tableNum ? `T${tableNum}` : null

  async function handleSendToKitchen() {
    if (!tableNum)    { showToast('Select a table first','warning'); return }
    if (!items.length){ showToast('No items to send','warning'); return }
    if (!tenantId)    { showToast('Not connected — refresh','error'); return }
    setSendingKOT(true)
    // Safety: always stop loading after 8s
    const safetyTimer = setTimeout(() => setSendingKOT(false), 8000)

    // Immediately show optimistic round in Table Order
    const optimisticOrder = {
      id: `opt-${Date.now()}`,
      order_number: null,
      status: 'pending',
      order_items: items.map(i => ({
        id: `oi-${i.id}`,
        product_name: i.name,
        product_icon: i.icon||'',
        qty: i.qty,
        unit_price: i.price,
        status: 'active',
        notes: itemNotes[i.id]||null,
      })),
    }
    setOptimisticRounds(prev => [optimisticOrder, ...prev])
    clearCart()
    setItemNotes({})
    setSheetOpen(false)

    try {
      const s=sub, t=s*taxRate, tot=s+t
      const {data:existing} = await supabase.from('orders')
        .select('id')
        .eq('tenant_id',tenantId).eq('order_type','dine')
        .eq('table_number',String(tableNum))
        .in('status',['pending','preparing','ready'])
        .maybeSingle()

      let orderId = existing?.id
      if (!orderId) {
        const {data:o,error} = await supabase.from('orders').insert({
          tenant_id:tenantId, status:'pending', order_type:'dine',
          table_number:String(tableNum), payment_method:'cash',
          subtotal:Number(s.toFixed(2)), tax:Number(t.toFixed(2)),
          total:Number(tot.toFixed(2)),
        }).select('id').single()
        if (error) throw error
        orderId = o.id
      } else {
        try {
          await supabase.rpc('increment_order_total',
            {order_id:orderId,add_subtotal:s,add_tax:t,add_total:tot})
        } catch(e){ console.warn('[BITE] rpc:',e?.message) }
      }
      const {error} = await supabase.from('order_items').insert(
        items.map(i=>({
          tenant_id:tenantId, order_id:orderId,
          product_id:i.id, product_name:i.name,
          product_icon:i.icon||'', unit_price:Number(i.price),
          qty:Number(i.qty), status:'active',
          notes:itemNotes[i.id]||null,
        }))
      )
      if (error) throw error
      // Optimistic round stays until TableOrderPanel's realtime loads real data
      // TableOrderPanel calls clearOptimistic when it gets DB rounds
      showToast(`🍳 ${cartCount} item${cartCount!==1?'s':''} sent to kitchen!`,'success')
    } catch(e) {
      // Revert optimistic on failure
      setOptimisticRounds(prev => prev.filter(o => o.id !== optimisticOrder.id))
      showToast(e.message||'Error','error')
    }
    setSendingKOT(false)
  }

  function handleNoteChange(productId, val) {
    setItemNotes(prev => ({ ...prev, [productId]: val }))
  }

  function openCheckout() {
    if (!items.length){ showToast('Cart is empty','warning'); return }
    setCheckoutData({items,orderType,tableNum,tableName,total,sub,tax:sub*taxRate,existingOrderId:null})
    setSheetOpen(false)
  }

  function openTableCheckout(data) {
    setCheckoutData({
      items:data.activeItems, orderType:'dine',
      tableNum:data.tableNum, tableName:data.tableName,
      total:data.total, sub:data.sub, tax:data.tax,
      existingOrderId:data.orderId,
    })
    setSheetOpen(false)
  }

  const groups = useMemo(() => {
    const filtered = activeCat==='all'
      ? products : products.filter(p=>String(p.category_id)===activeCat)
    if (activeCat!=='all') return [{name:'',icon:'',items:filtered}]
    const map = {}
    filtered.forEach(p=>{
      const key=p.category_id||'other'
      if (!map[key]) map[key]={name:p.catName||'Other',icon:p.catIcon||'',items:[]}
      map[key].items.push(p)
    })
    return Object.values(map)
  }, [products,activeCat])

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',
      overflow:'hidden',position:'relative' }}>

      {/* Table picker */}
      {isDine && (
        <TablePicker count={tableCount} selected={tableNum}
          onSelect={setTableNum} tenantId={tenantId} />
      )}

      {/* Category strip */}
      <div style={{ display:'flex',gap:5,padding:'6px 12px',overflowX:'auto',
        borderBottom:'1px solid var(--border)',flexShrink:0,scrollbarWidth:'none' }}>
        {[{id:'all',name:'All',icon:''},...categories].map(cat=>(
          <button key={cat.id} onClick={()=>setActiveCat(String(cat.id))} style={{
            flexShrink:0,padding:'4px 10px',borderRadius:20,whiteSpace:'nowrap',
            background:activeCat===String(cat.id)?'var(--brand-lt)':'none',
            border:`1.5px solid ${activeCat===String(cat.id)?'rgba(232,68,10,0.3)':'var(--border)'}`,
            color:activeCat===String(cat.id)?'var(--brand)':'var(--text2)',
            fontSize:11,fontWeight:600,cursor:'pointer' }}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex:1,display:'flex',overflow:'hidden' }}>

        {/* Menu */}
        <div style={{ flex:1,overflowY:'auto',padding:10 }}>
          {products.length===0&&(
            <div style={{ textAlign:'center',padding:40,color:'var(--text2)' }}>
              <div style={{ fontSize:32,marginBottom:8 }}>🍽</div>
              <div>No products yet. Add them in Products.</div>
            </div>
          )}
          {groups.map((group,gi)=>(
            <div key={gi}>
              {group.name&&(
                <div style={{ fontSize:10,fontWeight:700,color:'var(--text3)',
                  textTransform:'uppercase',letterSpacing:'0.5px',padding:'8px 0 5px' }}>
                  {group.icon} {group.name}</div>
              )}
              <div style={{ display:'grid',
                gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',
                gap:7,marginBottom:10 }}>
                {group.items.map(p=>{
                  const qty=cart[p.id]?.qty
                  return (
                    <button key={p.id} onClick={()=>!p.out_of_stock&&addToCart(p)}
                      disabled={p.out_of_stock}
                      style={{
                        background:qty?'var(--brand-lt2)':'var(--card)',
                        border:`1.5px solid ${qty?'rgba(232,68,10,0.25)':'var(--border)'}`,
                        borderRadius:'var(--r)',padding:'10px 8px',
                        cursor:p.out_of_stock?'not-allowed':'pointer',
                        opacity:p.out_of_stock?0.45:1,
                        display:'flex',flexDirection:'column',gap:3,
                        textAlign:'left',position:'relative' }}>
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

        {/* Desktop right panel — ONE column */}
        {!isMobile && (
          <div style={{ width:320,flexShrink:0,borderLeft:'1px solid var(--border)',
            display:'flex',flexDirection:'column',overflow:'hidden' }}>
            {isDine ? (
              <TableOrderPanel
                tableNum={tableNum} tableName={tableName}
                cartItems={items}
                onAddToCart={addToCart} onRemoveFromCart={removeFromCart}
                onSendToKitchen={handleSendToKitchen}
                sendingKOT={sendingKOT}
                onCheckout={openTableCheckout}
                settings={settings}
                isMobile={false}
                notes={itemNotes}
                onChangeNote={handleNoteChange}
                optimisticRounds={optimisticRounds}
                onRealDataLoaded={() => setOptimisticRounds([])}
              />
            ) : (
              <CartPanel
                items={items} orderType={orderType}
                onAdd={addToCart} onRemove={removeFromCart}
                onCheckout={openCheckout}
                settings={settings}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {isMobile&&(
        <div style={{ position:'absolute',bottom:0,left:0,right:0,
          padding:'10px 12px 14px',background:'var(--bg)',
          borderTop:'1px solid var(--border)',display:'flex',gap:8 }}>
          {isDine ? (
            <>
              {/* Send to kitchen — direct action */}
              <button
                onClick={cartCount>0?handleSendToKitchen:undefined}
                disabled={sendingKOT}
                style={{
                  flex:1.8,
                  background:(!tableNum||cartCount===0)?'var(--card2)':'#E8440A',
                  color:(!tableNum||cartCount===0)?'var(--text3)':'#fff',
                  border:`1.5px solid ${(!tableNum||cartCount===0)?'var(--border)':'#E8440A'}`,
                  borderRadius:14,padding:'13px 8px',
                  fontWeight:800,fontSize:14,
                  cursor:(!tableNum||cartCount===0)?'default':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  transition:'all 0.15s',
                }}>
                {sendingKOT?<Spinner size={16}/>:<span style={{ fontSize:17 }}>🍳</span>}
                {sendingKOT?'Sending…':!tableNum?'Select table':
                 cartCount>0?`Send ${cartCount} to Kitchen`:'Send to Kitchen'}
              </button>
              {/* Cart icon — opens sheet with Table Order accordion */}
              <button onClick={()=>setSheetOpen(true)}
                style={{ flex:1,background:'var(--card)',
                  border:'1.5px solid var(--border)',borderRadius:14,
                  padding:'13px 8px',fontWeight:700,fontSize:13,
                  color:'var(--text)',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  position:'relative' }}>
                <span style={{ fontSize:18 }}>🛒</span>
                <span>Order</span>
                {cartCount>0&&(
                  <span style={{ position:'absolute',top:6,right:6,
                    background:'var(--brand)',color:'#fff',
                    fontSize:10,fontWeight:800,borderRadius:'50%',
                    width:18,height:18,display:'flex',
                    alignItems:'center',justifyContent:'center',
                    border:'2px solid var(--bg)' }}>{cartCount}</span>
                )}
              </button>
            </>
          ) : cartCount>0 ? (
            <button onClick={()=>setSheetOpen(true)}
              style={{ flex:1,background:'var(--brand)',color:'#fff',border:'none',
                borderRadius:14,padding:'13px 20px',
                display:'flex',alignItems:'center',justifyContent:'space-between',
                fontWeight:700,fontSize:14,cursor:'pointer' }}>
              <span style={{ background:'rgba(255,255,255,0.25)',borderRadius:8,
                padding:'2px 8px',fontSize:13 }}>{cartCount}</span>
              <span>View Cart · ₹{total.toFixed(2)}</span>
              <span>→</span>
            </button>
          ) : <div style={{ height:46 }}/>}
        </div>
      )}

      <MobileSheet open={sheetOpen} onClose={()=>setSheetOpen(false)}
        isDine={isDine} tableNum={tableNum} tableName={tableName}
        cartItems={items} onAdd={addToCart} onRemove={removeFromCart}
        onSendToKitchen={handleSendToKitchen}
        onCheckout={openCheckout} onTableCheckout={openTableCheckout}
        sendingKOT={sendingKOT} settings={settings}
        notes={itemNotes} onChangeNote={handleNoteChange}
        optimisticRounds={optimisticRounds}
        onRealDataLoaded={() => setOptimisticRounds([])} />

      <CheckoutModal open={!!checkoutData} onClose={()=>setCheckoutData(null)}
        checkoutData={checkoutData}
        onSuccess={o=>{ setSuccessOrder(o); setCheckoutData(null) }} />
      <SuccessModal order={successOrder} onClose={()=>setSuccessOrder(null)} />
    </div>
  )
}
