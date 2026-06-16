import React, { useState, useMemo, useEffect, useRef } from 'react'
import { loadAddons, loadProductAddonTags, loadProductVariants } from '../../utils/addons'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { useTheme } from '../../store/useTheme'
import Modal from '../ui/Modal'
import { sendInvoiceWhatsApp } from '../../utils/whatsapp'
import ShareInvoiceButton from '../invoice/ShareInvoiceButton'
import { generateInvoiceToken, invoiceUrl, isMissingInvoiceTokenColumn, isValidCustomerPhone, normalizeIndianPhone, qrImageUrl } from '../../utils/invoice'

const AddonGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 10.5h16v1.8H4z" fill="currentColor"/>
    <path d="M7 12.5h10l1.2 5.8H5.8z" fill="currentColor"/>
    <circle cx="8.2" cy="9.1" r="2.2" fill="currentColor"/>
    <circle cx="12" cy="7.5" r="2" fill="currentColor"/>
    <circle cx="15.8" cy="9.1" r="2.2" fill="currentColor"/>
    <path d="M18 4l3-1.2L19.8 0 16.8 1.2z" fill="currentColor"/>
  </svg>
)

const NoteGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="2.8" width="14.2" height="18.4" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M7 8h7M7 11.5h7M7 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M17.8 14.6v6.2M14.7 17.7h6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)
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
  return <span style={{ fontSize: 'var(--fs-10)',fontWeight:700,padding:'2px 6px',borderRadius:5,
    background:s.bg,color:s.color,whiteSpace:'nowrap' }}>{s.label}</span>
}

async function insertOrderWithInvoiceToken(row, selectColumns) {
  const tokenizedRow = { ...row, invoice_token: generateInvoiceToken() }
  let result = await supabase.from('orders').insert(tokenizedRow).select(selectColumns).single()
  if (isMissingInvoiceTokenColumn(result.error)) {
    const { invoice_token: _invoiceToken, ...fallbackRow } = tokenizedRow
    const fallbackSelect = selectColumns.split(',').filter(col => col.trim() !== 'invoice_token').join(',')
    result = await supabase.from('orders').insert(fallbackRow).select(fallbackSelect).single()
    if (!result.error && result.data) result.data.invoice_token = null
  }
  return result
}

async function latestPaidDineOrderWithOptionalToken({ tenantId, tableNumber }) {
  let query = supabase.from('orders')
    .select('id,order_number,invoice_token,total,order_type')
    .eq('tenant_id', tenantId)
    .eq('order_type', 'dine')
    .eq('table_number', String(tableNumber || ''))
    .in('status', ['paid','completed'])
    .order('created_at', { ascending:false })
    .limit(1)
    .maybeSingle()

  let result = await query
  if (isMissingInvoiceTokenColumn(result.error)) {
    result = await supabase.from('orders')
      .select('id,order_number,total,order_type')
      .eq('tenant_id', tenantId)
      .eq('order_type', 'dine')
      .eq('table_number', String(tableNumber || ''))
      .in('status', ['paid','completed'])
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle()
    if (!result.error && result.data) result.data.invoice_token = null
  }
  return result
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
      <span style={{ fontSize: 'var(--fs-10)',fontWeight:700,color:'var(--text3)',
        textTransform:'uppercase',letterSpacing:'0.5px',flexShrink:0 }}>Table:</span>
      <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
        {Array.from({length:count},(_,i)=>i+1).map(n => {
          const isActive   = activeTables.has(n)
          const isSelected = selected === n
          return (
            <button key={n} onClick={() => onSelect(isSelected?null:n)}
              style={{
                position:'relative', minWidth:44, height:36, borderRadius:8,
                fontSize: 'var(--fs-12)', fontWeight:700, cursor:'pointer',
                background: isSelected?'var(--brand)':isActive?'var(--brand-lt)':'var(--card)',
                border:`2px solid ${isSelected?'var(--brand)':isActive?'rgba(168,217,200,0.7)':'var(--border)'}`,
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
function RoundAccordion({
  order, defaultOpen, isNew, isMobile,
  onSendToKitchen, sendingKOT, tableNum,
  onRemoveItem, onAddItem, onQtyChange, onChangeNote,
  notes,
}) {
  const [open, setOpen] = useState(defaultOpen)

  const active   = (order.order_items||[]).filter(i=>i.status!=='rejected')
  const rejected = (order.order_items||[]).filter(i=>i.status==='rejected')
  const subtotal = active.reduce((s,i)=>s+Number(i.unit_price||i.price)*i.qty, 0)
  const statusColor = STATUS[order.status]?.color || '#F59E0B'

  return (
    <div style={{
      border:`1px solid ${isNew?'rgba(168,217,200,0.7)':'var(--border)'}`,
      borderRadius:10, marginBottom:6, overflow:'hidden',
      background: isNew?'var(--brand-lt2)':'var(--card)',
    }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:'100%',display:'flex',alignItems:'center',gap:8,
        padding:'10px 12px',background:'none',border:'none',
        cursor:'pointer',textAlign:'left',
      }}>
        <span style={{ fontSize: 'var(--fs-11)',color:'var(--text3)',flexShrink:0 }}>{open?'▾':'▸'}</span>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
            <span style={{ fontSize: 'var(--fs-12)',fontWeight:700,color:'var(--text)' }}>
              {isNew ? '🆕 New round' : `Round #${order.order_number||'—'}`}
            </span>
            <span style={{ fontSize: 'var(--fs-10)',fontWeight:700,padding:'1px 6px',borderRadius:5,
              background:STATUS[order.status]?.bg||'rgba(245,158,11,0.12)',
              color:statusColor }}>
              {STATUS[order.status]?.label||'⏳ Waiting'}
            </span>
            {rejected.length>0 && (
              <span style={{ fontSize: 'var(--fs-10)',color:'var(--red)' }}>{rejected.length} removed</span>
            )}
          </div>
          {!open && (
            <div style={{ fontSize: 'var(--fs-11)',color:'var(--text3)',marginTop:1 }}>
              {active.length} item{active.length!==1?'s':''} · ₹{subtotal.toFixed(2)}
            </div>
          )}
        </div>
        <span style={{ fontSize: 'var(--fs-12)',fontWeight:700,color:'var(--brand)',flexShrink:0 }}>
          ₹{subtotal.toFixed(2)}
        </span>
      </button>

      {open && (
        <div style={{ borderTop:'1px solid var(--border)' }}>
          {active.map(item => {
            const itemNote = isNew ? (notes?.[item.id]||'') : (item.notes||'')
            return (
              <div key={item.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px' }}>
                  <span style={{ fontSize: 'var(--fs-15)',flexShrink:0 }}>
                    {item.product_icon||item.icon||'🍽'}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize: 'var(--fs-12)',fontWeight:500,color:'var(--text)',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {item.product_name||item.name}
                    </div>
                    {!isNew && item.notes && (
                      <div style={{ fontSize: 'var(--fs-10)',color:'var(--amber)',marginTop:1 }}>
                        📝 {item.notes}</div>
                    )}
                    {!isNew && (
                      <div style={{ marginTop:2 }}>
                        <StatusPill status={order.status||'pending'}/>
                      </div>
                    )}
                  </div>
                  {isNew ? (
                    <div style={{ display:'flex',alignItems:'center',gap:5,flexShrink:0 }}>
                      <button onClick={()=>onRemoveItem&&onRemoveItem(item.id)}
                        style={{ width:22,height:22,borderRadius:'50%',
                          background:'var(--card)',border:'1px solid var(--border)',
                          color:'var(--text)',fontSize: 'var(--fs-13)',display:'flex',
                          alignItems:'center',justifyContent:'center',cursor:'pointer' }}>−</button>
                      <span style={{ fontSize: 'var(--fs-12)',fontWeight:700,minWidth:16,
                        textAlign:'center',color:'var(--text)' }}>{item.qty}</span>
                      <button onClick={()=>onAddItem&&onAddItem(item)}
                        style={{ width:22,height:22,borderRadius:'50%',
                          background:'var(--brand)',border:'none',color:'#fff',
                          fontSize: 'var(--fs-13)',display:'flex',alignItems:'center',
                          justifyContent:'center',cursor:'pointer' }}>+</button>
                    </div>
                  ) : (
                    <div style={{ flexShrink:0,textAlign:'right' }}>
                      <div style={{ fontSize: 'var(--fs-11)',fontWeight:600,color:'var(--brand)' }}>
                        ×{item.qty}</div>
                      {order.status==='pending' && onRemoveItem && onAddItem ? (
                        <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                            <button onClick={e=>{e.stopPropagation();onQtyChange&&onQtyChange(item,-1,order.id)}}
                              style={{ width:20,height:20,borderRadius:'50%',background:'var(--card2)',
                                border:'1px solid var(--border)',color:'var(--text)',fontSize: 'var(--fs-12)',
                                display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>−</button>
                            <span style={{ fontSize: 'var(--fs-12)',fontWeight:700,minWidth:14,textAlign:'center',color:'var(--text)' }}>
                              {item.qty}</span>
                            <button onClick={e=>{e.stopPropagation();onQtyChange&&onQtyChange(item,1,order.id)}}
                              style={{ width:20,height:20,borderRadius:'50%',background:'var(--brand)',
                                border:'none',color:'#fff',fontSize: 'var(--fs-12)',
                                display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>+</button>
                          </div>
                          <button onClick={e=>{e.stopPropagation();onRemoveItem(item,order.id)}}
                            style={{ fontSize: 'var(--fs-10)',color:'var(--red)',background:'none',
                              border:'none',cursor:'pointer',padding:0 }}>reject</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--fs-11)',fontWeight:600,color:'var(--text2)' }}>×{item.qty}</div>
                      )}
                    </div>
                  )}
                </div>
                {isNew && (
                  <div style={{ padding:'0 12px 8px' }}>
                    <input
                      value={itemNote}
                      onChange={e => onChangeNote&&onChangeNote(item.id, e.target.value)}
                      placeholder="Note for kitchen (e.g. no onions)…"
                      style={{ width:'100%',padding:'5px 9px',fontSize: 'var(--fs-11)',
                        background:'var(--bg)',border:'1px solid var(--border)',
                        borderRadius:6,color:'var(--text)',outline:'none' }}/>
                  </div>
                )}
              </div>
            )
          })}

          {rejected.map(item => (
            <div key={item.id} style={{ display:'flex',gap:8,padding:'5px 12px',
              opacity:0.4,textDecoration:'line-through',fontSize: 'var(--fs-11)',
              color:'var(--text3)',borderBottom:'1px solid var(--border)' }}>
              <span>{item.product_icon||item.icon||'🍽'}</span>
              <span style={{ flex:1 }}>{item.product_name||item.name} ×{item.qty}</span>
              <span style={{ color:'var(--red)' }}>removed</span>
            </div>
          ))}

          {isNew && !isMobile && (
            <div style={{ padding:'10px 12px',background:'var(--brand-lt2)' }}>
              <button onClick={onSendToKitchen}
                disabled={sendingKOT||!tableNum}
                style={{
                  width:'100%',border:'none',borderRadius:8,
                  padding:'11px',fontWeight:800,fontSize: 'var(--fs-14)',
                  background:!tableNum?'var(--card2)':'#1D9E75',
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
  tableNum, tableName, cartItems,
  onAddToCart, onRemoveFromCart,
  onSendToKitchen, sendingKOT, onCheckout,
  settings, isMobile, notes, onChangeNote,
  optimisticRounds, onRealDataLoaded,
}) {
  const { tenantId, showToast } = useStore()
  const [rounds, setRounds] = useState([])
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
      .order('created_at',{ascending:false})
    const newRounds = data||[]
    setRounds(newRounds)
    if (newRounds.length > 0 && onRealDataLoaded) onRealDataLoaded()
  }

  async function removeItem(item, orderId) {
    await supabase.from('order_items')
      .update({status:'rejected',rejected_at:new Date().toISOString()})
      .eq('id',item.id)
    showToast(`"${item.product_name}" removed`,'info')
    loadRounds()
  }

  async function reduceItem(item, orderId) {
    if (item.qty <= 1) {
      await supabase.from('order_items')
        .update({status:'rejected',rejected_at:new Date().toISOString()})
        .eq('id',item.id)
      showToast(`"${item.product_name}" removed`,'info')
    } else {
      await supabase.from('order_items').update({qty: item.qty - 1}).eq('id',item.id)
    }
    loadRounds()
  }

  const allActive = rounds.flatMap(o => (o.order_items||[]).filter(i=>i.status!=='rejected'))
  const sub    = allActive.reduce((s,i)=>s+Number(i.unit_price)*i.qty,0)
  const tax    = sub*taxRate
  const total  = sub+tax
  const primaryId = rounds[rounds.length-1]?.id

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
        <div style={{ fontSize: 'var(--fs-28)',marginBottom:8 }}>🍽</div>
        <div style={{ fontSize: 'var(--fs-12)' }}>Select a table to start</div>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize: 'var(--fs-13)',color:'var(--text)' }}>
          📋 Table Order — {tableName}
        </div>
        <div style={{ fontSize: 'var(--fs-10)',color:'var(--text3)',marginTop:1 }}>
          {rounds.length} sent round{rounds.length!==1?'s':''} · {allActive.length} active items
        </div>
      </div>

      <div style={{ flex:1,overflowY:'auto',padding:'8px 10px' }}>
        {cartItems.length>0 && (
          <RoundAccordion
            order={newRoundOrder} defaultOpen={true} isNew={true} isMobile={isMobile}
            onSendToKitchen={onSendToKitchen} sendingKOT={sendingKOT} tableNum={tableNum}
            onRemoveItem={(id) => onRemoveFromCart(id)}
            onAddItem={(item) => onAddToCart(item)}
            onChangeNote={onChangeNote} notes={notes}
          />
        )}

        {rounds.length===0 && (optimisticRounds||[]).length===0 && cartItems.length===0 && (
          <div style={{ textAlign:'center',padding:'20px',color:'var(--text3)' }}>
            <div style={{ fontSize: 'var(--fs-22)',marginBottom:6 }}>🍳</div>
            <div style={{ fontSize: 'var(--fs-11)' }}>No rounds sent yet.<br/>Add items and send to kitchen.</div>
          </div>
        )}

        {(optimisticRounds||[]).map((order) => (
          <RoundAccordion key={order.id} order={order} defaultOpen={true}
            isNew={false} isMobile={isMobile} onSendToKitchen={null}
            sendingKOT={false} tableNum={tableNum} onRemoveItem={null}/>
        ))}

        {rounds.map((order,idx) => (
          <RoundAccordion
            key={order.id} order={order}
            defaultOpen={idx===0 && cartItems.length===0 && (optimisticRounds||[]).length===0}
            isNew={false} isMobile={isMobile}
            onSendToKitchen={null} sendingKOT={false} tableNum={tableNum}
            onRemoveItem={removeItem}
            onQtyChange={async (item, delta, orderId) => {
              if (delta < 0) await reduceItem(item, orderId)
              else {
                await supabase.from('order_items').update({ qty: item.qty + 1 }).eq('id', item.id)
                await loadRounds()
              }
            }}
            onAddItem={null}
          />
        ))}
      </div>

      {allActive.length>0 && (
        <div style={{ borderTop:'1px solid var(--border)',padding:12,flexShrink:0 }}>
          {taxRate>0 && (
            <div style={{ display:'flex',justifyContent:'space-between',
              fontSize: 'var(--fs-11)',color:'var(--text3)',marginBottom:2 }}>
              <span>Subtotal</span><span>₹{sub.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display:'flex',justifyContent:'space-between',
            fontSize: 'var(--fs-14)',fontWeight:800,marginBottom:10,
            borderTop:taxRate>0?'1px solid var(--border)':'none',
            paddingTop:taxRate>0?5:0 }}>
            <span>Bill Total</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => onCheckout({
              orderId:primaryId, total, sub, tax,
              activeItems:allActive, tableNum, tableName,
              tableNumber:tableNum,
            })}
            style={{ width:'100%',background:'#16A34A',color:'#fff',border:'none',
              borderRadius:'var(--r)',padding:'11px',fontWeight:700,fontSize: 'var(--fs-13)',cursor:'pointer' }}>
            💳 Checkout & Pay
          </button>
        </div>
      )}
    </div>
  )
}

// ── Non-dine cart panel ────────────────────────────────────────────
function CartPanel({ items, orderType, onAdd, onRemove, onCheckout, settings, notes, getSelectedAddons, getCustomLines, onUpdateAddonQty }) {
  const detailLines = item => [
    ...(item.details || []),
    ...(getCustomLines?.(item.id) || []),
    ...(getSelectedAddons?.(item.productId || item.id) || []),
  ]
  const extraTotal = item => {
    const itemDetailTotal = (item.details || []).reduce((a, line) => a + Number(line.price || line.unitPrice || 0) * Number(line.qty || 1), 0) * Number(item.qty || 1)
    const legacyTotal = [
      ...(getCustomLines?.(item.id) || []),
      ...(getSelectedAddons?.(item.productId || item.id) || []),
    ].reduce((a, line) => a + Number(line.price || line.unitPrice || 0) * Number(line.qty || 1), 0)
    return itemDetailTotal + legacyTotal
  }
  const sub    = items.reduce((s,i)=>s+i.price*i.qty + extraTotal(i),0)
  const taxRate= (settings?.tax_rate||0)/100
  const total  = sub+sub*taxRate
  const typeLabel = orderType==='delivery'?'🚚 Delivery':'🛍 Takeaway'

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'",fontWeight:800,fontSize: 'var(--fs-13)',color:'var(--text)' }}>
          🛒 Cart
        </div>
        <div style={{ fontSize: 'var(--fs-10)',color:'var(--brand)',fontWeight:600,marginTop:1 }}>{typeLabel}</div>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'4px 0' }}>
        {items.length===0 ? (
          <div style={{ textAlign:'center',padding:'24px 16px',color:'var(--text3)' }}>
            <div style={{ fontSize: 'var(--fs-22)',marginBottom:6 }}>🛒</div>
            <div style={{ fontSize: 'var(--fs-11)' }}>Tap menu to add</div>
          </div>
        ) : items.map(item=>(
          <div key={item.id} style={{ padding:'6px 14px',borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'grid',gridTemplateColumns:'minmax(0, 1fr) 80px 80px',alignItems:'center',columnGap:8,minHeight:48 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,minWidth:0 }}>
                <span style={{ fontSize: 'var(--fs-15)',flexShrink:0 }}>{item.icon||'🍽'}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize: 'var(--fs-14)',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)' }}>
                    {item.name}
                  </div>
                  {(notes?.[item.id] || '').trim() && (
                    <div style={{ marginTop:2,fontSize:'var(--fs-10)',color:'#B6FFD4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>📝 {notes[item.id]}</div>
                  )}
                </div>
              </div>
              <div style={{ width:80,display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}>
                <button onClick={()=>onRemove(item.id)}
                  style={{ width:24,height:24,borderRadius:'50%',background:'var(--card2)',
                    border:'1px solid var(--border)',color:'var(--text)',fontSize:'var(--fs-13)',
                    display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 }}>−</button>
                <span style={{ width:20,textAlign:'center',fontSize:'var(--fs-14)',fontWeight:700,color:'var(--text)',fontVariantNumeric:'tabular-nums' }}>{item.qty}</span>
                <button onClick={()=>onAdd(item)}
                  style={{ width:24,height:24,borderRadius:'50%',background:'var(--brand)',
                    border:'none',color:'#fff',fontSize:'var(--fs-13)',display:'flex',
                    alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 }}>+</button>
              </div>
              <span style={{ width:80,textAlign:'right',fontSize:'var(--fs-13)',fontWeight:700,color:'var(--brand)',fontVariantNumeric:'tabular-nums' }}>
                ₹{(item.price*item.qty).toFixed(2)}
              </span>
            </div>
            {detailLines(item).length > 0 && (
              <div style={{ display:'flex',flexDirection:'column',gap:4,marginTop:2 }}>
                {detailLines(item).map((line, idx) => {
                  const linePrice = Number(line.price || line.unitPrice || 0) * Number(line.qty || 1) * (item.details?.includes(line) ? Number(item.qty || 1) : 1)
                  const isAddon = line.type === 'addon'
                  return (
                    <div key={`${line.id || line.label}-${idx}`} style={{ display:'grid',gridTemplateColumns:'minmax(0, 1fr) 80px 80px',alignItems:'center',columnGap:8,minHeight:36,color:'var(--text2)',fontSize:'var(--fs-12)' }}>
                      <span style={{ minWidth:0,paddingLeft:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',opacity:0.75 }}>└ {line.label || line.name}</span>
                      <div style={{ width:80,display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}>
                        {isAddon && (
                          <>
                            <button onClick={() => onUpdateAddonQty?.(item.id, line.id, -1)} style={{ width:24,height:24,borderRadius:'50%',border:'1px solid var(--border)',background:'var(--card2)',color:'var(--text)',fontSize:'var(--fs-12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>−</button>
                            <span style={{ width:20,textAlign:'center',fontSize:'var(--fs-14)',fontWeight:700,fontVariantNumeric:'tabular-nums' }}>{line.qty || 1}</span>
                            <button onClick={() => onUpdateAddonQty?.(item.id, line.id, 1)} style={{ width:24,height:24,borderRadius:'50%',border:'none',background:'var(--brand)',color:'#fff',fontSize:'var(--fs-12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>+</button>
                          </>
                        )}
                      </div>
                      <span style={{ width:80,textAlign:'right',fontSize:'var(--fs-13)',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap' }}>+₹{linePrice.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      {items.length>0 && (
        <div style={{ borderTop:'1px solid var(--border)',padding:12,flexShrink:0 }}>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:'var(--fs-12)',color:'var(--text2)',marginBottom:6 }}>
            <span>Subtotal</span><span>₹{sub.toFixed(2)}</span>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:'var(--fs-12)',color:'var(--text2)',marginBottom:8 }}>
            <span>Taxes & charges</span><span>₹{(total-sub).toFixed(2)}</span>
          </div>
          <div style={{ height:1,background:'var(--border)',marginBottom:8 }} />
          <div style={{ display:'flex',justifyContent:'space-between',
            fontSize: 'var(--fs-14)',fontWeight:800,marginBottom:10 }}>
            <span>Total</span>
            <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout}
            style={{ width:'100%',background:'var(--brand)',color:'#fff',border:'none',
              borderRadius:'var(--r)',padding:'11px',fontWeight:700,fontSize: 'var(--fs-14)',cursor:'pointer' }}>
            Checkout · ₹{total.toFixed(2)} →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Mobile bottom sheet ────────────────────────────────────────────
function MobileSheet({ open, onClose, isDine, tableNum, tableName,
  cartItems, onAdd, onRemove, onSendToKitchen, onCheckout, onTableCheckout,
  sendingKOT, settings, notes, onChangeNote, optimisticRounds, onRealDataLoaded, getSelectedAddons, getCustomLines, onUpdateAddonQty }) {

  if (!open) return null
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,
      display:'flex',flexDirection:'column',justifyContent:'flex-end',
      background:'rgba(0,0,0,0.55)',backdropFilter:'blur(2px)',
      animation:'sheetBackdropIn 180ms ease-out' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--card)',borderRadius:'18px 18px 0 0',
        height:'90vh',display:'flex',flexDirection:'column',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.45)',
        animation:'sheetSlideUp 260ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        <div style={{ display:'flex',justifyContent:'center',padding:'10px 0 0',flexShrink:0 }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'var(--border2)' }}/>
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'8px 16px 0',flexShrink:0 }}>
          <span style={{ fontWeight:800,fontSize: 'var(--fs-15)',color:'var(--text)' }}>
            {isDine ? `📋 Table Order — ${tableName||'?'}` : '🛒 Cart'}
          </span>
          <button onClick={onClose} style={{ background:'none',border:'none',
            color:'var(--text2)',fontSize: 'var(--fs-20)',cursor:'pointer',padding:'0 4px',lineHeight:1 }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'8px 12px' }}>
          {isDine ? (
            <TableOrderPanel
              tableNum={tableNum} tableName={tableName} cartItems={cartItems}
              onAddToCart={onAdd} onRemoveFromCart={onRemove}
              onSendToKitchen={onSendToKitchen} sendingKOT={sendingKOT}
              onCheckout={data => { onTableCheckout(data); onClose() }}
              settings={settings} isMobile={true} notes={notes} onChangeNote={onChangeNote}
              optimisticRounds={optimisticRounds} onRealDataLoaded={onRealDataLoaded}
            />
          ) : (
            <CartPanel items={cartItems} orderType="takeaway"
              onAdd={onAdd} onRemove={onRemove}
              onCheckout={() => { onCheckout(); onClose() }}
              settings={settings} notes={notes} getSelectedAddons={getSelectedAddons} getCustomLines={getCustomLines} onUpdateAddonQty={onUpdateAddonQty}/>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Checkout modal ─────────────────────────────────────────────────
function CheckoutModal({ open, onClose, checkoutData, onSuccess }) {
  const { clearCart, tenantId, settings, showToast } = useStore()
  const [step,setStep]           = useState(1)
  const [phone,setPhone]         = useState('')
  const [name,setName]           = useState('')
  const [payMethod,setPayMethod] = useState('cash')
  const [loading,setLoading]     = useState(false)
  const [error,setError]         = useState('')

  // ── Guard: render nothing until we have data ──────────────────
  if (!checkoutData) return null

  // Destructure AFTER the null guard
  const { items, orderType, tableNum, tableName, total, sub, tax, existingOrderId } = checkoutData
  const isDine = orderType === 'dine'
  const upiId  = settings?.upi_id || ''
  const PAY = [
    {id:'cash', icon:'💵', label:'Cash'  },
    {id:'upi',  icon:'📱', label:'UPI'   },
    {id:'card', icon:'💳', label:'Card'  },
    {id:'other',icon:'🔖', label:'Other' },
  ]

  function reset() { setStep(1); setPhone(''); setName(''); setPayMethod('cash'); setError('') }
  function handleClose() { reset(); onClose() }

  async function confirm() {
    if (!tenantId) { setError('Not connected — refresh'); return }
    const normalizedPhone = normalizeIndianPhone(phone)
    if (!isDine && !isValidCustomerPhone(phone)) {
      setStep(1)
      setError('Takeaway orders require a valid 10 digit customer phone number before payment.')
      return
    }
    setLoading(true); setError('')
    try {
      if (isDine && existingOrderId) {
        const tNum = checkoutData?.tableNumber || tableNum
        const { error } = await supabase.from('orders')
          .update({ status:'paid', payment_method:payMethod, paid_at:new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('order_type', 'dine')
          .eq('table_number', String(tNum||''))
          .in('status', ['pending','preparing','ready'])
        if (error) throw error
        const { data:paidOrder, error:paidOrderError } = await latestPaidDineOrderWithOptionalToken({ tenantId, tableNumber:tNum })
        if (paidOrderError) console.warn('[BITE] paid order lookup failed:', paidOrderError.message)
        showToast('Table checked out ✓', 'success')
        onSuccess({ ...(paidOrder || {}), order_number: paidOrder?.order_number || '—', total, payMethod, isDine:true })
        handleClose()
      } else {
        const txRate = (settings?.tax_rate||0)/100
        const s = sub || (items||[]).reduce((a,i) => a+Number(i.unit_price||i.price)*i.qty, 0)
        const t = tax || s * txRate

        // ── Safe order_type: defined here, after orderType is available ──
        const safeOrderType = ['dine','takeaway','stall','delivery'].includes(orderType)
          ? orderType
          : 'takeaway'

        const { data:order, error:oErr } = await insertOrderWithInvoiceToken({
          tenant_id:      tenantId,
          status:         'paid',
          order_type:     safeOrderType,
          payment_method: payMethod,
          subtotal:       Number(s.toFixed(2)),
          tax:            Number(t.toFixed(2)),
          total:          Number(total.toFixed(2)),
          customer_name:  name  || null,
          customer_phone: normalizedPhone,
          paid_at:        new Date().toISOString(),
        }, 'id,order_number,invoice_token,customer_phone,order_type')
        if (oErr) throw oErr

        const { error:iErr } = await supabase.from('order_items').insert(
          (items||[]).map(i => ({
            tenant_id:    tenantId,
            order_id:     order.id,
            product_id:   i.productId || i.product_id || i.id,
            product_name: i.name || i.product_name,
            product_icon: i.icon || i.product_icon || '',
            unit_price:   Number(i.price || i.unit_price),
            qty:          Number(i.qty),
            status:       'active',
          }))
        )
        if (iErr) throw iErr

        clearCart()
        showToast(`Order #${order.order_number} placed ✓`, 'success')
        onSuccess({ ...order, total, payMethod, isDine:false })
        handleClose()

        // Auto-send WhatsApp invoice (non-blocking)
        if (normalizedPhone) {
          const bizName = settings?.biz_name || settings?.name || 'Restaurant'
          sendInvoiceWhatsApp(
            { id: order.invoice_token || order.id, customer_phone: normalizedPhone },
            bizName
          )
            .then(r => { if (r.success) showToast('📱 Invoice sent on WhatsApp', 'success') })
            .catch(e => console.warn('[BITE] WA send failed:', e?.message))
        }
      }
    } catch(e) { setError(e.message || 'Error — try again') }
    setLoading(false)
  }

  const BtnRow = () => (
    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
      {error && (
        <div style={{ fontSize: 'var(--fs-12)',color:'var(--red)',background:'rgba(239,68,68,0.08)',
          border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,padding:'8px 10px' }}>
          ⚠ {error}
        </div>
      )}
      {isDine ? (
        <button onClick={confirm} disabled={loading}
          style={{ width:'100%',background:loading?'var(--card2)':'#16A34A',
            color:loading?'var(--text3)':'#fff',border:'none',borderRadius:8,
            padding:13,fontWeight:700,fontSize: 'var(--fs-14)',cursor:loading?'default':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
          {loading&&<Spinner/>}
          {loading?'Processing…':`Collect ₹${total.toFixed(2)} →`}
        </button>
      ) : step===1 ? (
        <button onClick={()=>{
          if (!isValidCustomerPhone(phone)) { setError('Enter a valid 10 digit customer phone number to continue.'); return }
          setPhone(normalizeIndianPhone(phone)); setError(''); setStep(2)
        }}
          style={{ width:'100%',background:'var(--brand)',color:'#fff',border:'none',
            borderRadius:8,padding:13,fontWeight:700,fontSize: 'var(--fs-14)',cursor:'pointer' }}>
          Next: Payment →
        </button>
      ) : (
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={()=>{setStep(1);setError('')}}
            style={{ flex:'0 0 72px',background:'var(--card2)',color:'var(--text)',
              border:'1px solid var(--border)',borderRadius:8,padding:12,fontWeight:600,cursor:'pointer' }}>
            ← Back</button>
          <button onClick={confirm} disabled={loading}
            style={{ flex:1,background:loading?'var(--card2)':'var(--brand)',
              color:loading?'var(--text3)':'#fff',border:'none',borderRadius:8,
              padding:12,fontWeight:700,fontSize: 'var(--fs-14)',cursor:loading?'default':'pointer',
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
      {!isDine && (
        <div style={{ display:'flex',marginBottom:14,background:'var(--bg)',
          borderRadius:8,padding:3 }}>
          {[['1 · Customer',1],['2 · Payment',2]].map(([l,s])=>(
            <div key={s} style={{ flex:1,textAlign:'center',padding:7,borderRadius:6,
              fontSize: 'var(--fs-12)',fontWeight:600,
              background:step===s?'var(--card2)':'transparent',
              color:step>=s?'var(--text)':'var(--text3)' }}>{l}</div>
          ))}
        </div>
      )}
      {/* Bill summary */}
      <div style={{ background:'var(--bg)',borderRadius:8,padding:'10px 12px',marginBottom:14 }}>
        <div style={{ color:'var(--brand)',fontWeight:700,fontSize: 'var(--fs-12)',marginBottom:5 }}>
          {isDine?`🍽 ${tableName}`:orderType==='delivery'?'🚚 Delivery':'🛍 Takeaway'}
        </div>
        {(items||[]).map((i,idx)=>(
          <div key={idx} style={{ display:'flex',justifyContent:'space-between',
            padding:'2px 0',color:'var(--text2)',fontSize: 'var(--fs-12)',
            borderBottom:'1px solid var(--border)' }}>
            <span>{i.product_icon||i.icon||'🍽'} {i.product_name||i.name} ×{i.qty}</span>
            <span>₹{(Number(i.unit_price||i.price)*i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex',justifyContent:'space-between',fontSize: 'var(--fs-14)',
          fontWeight:800,marginTop:5 }}>
          <span>Total</span>
          <span style={{ color:'var(--brand)' }}>₹{total.toFixed(2)}</span>
        </div>
      </div>
      {/* Step 1 — Customer info */}
      {!isDine && step===1 && (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {[
            {label:'Phone (required)', value:phone, set:setPhone, type:'tel',  placeholder:'+91 98765 43210'},
            {label:'Name',  value:name,  set:setName,  type:'text', placeholder:'Optional'},
          ].map(f=>(
            <label key={f.label} style={{ display:'flex',flexDirection:'column',gap:4 }}>
              <span style={{ fontSize: 'var(--fs-11)',fontWeight:700,color:'var(--text2)',
                textTransform:'uppercase',letterSpacing:'0.4px' }}>{f.label}</span>
              <input value={f.value} onChange={e=>f.set(e.target.value)}
                type={f.type} placeholder={f.placeholder}
                style={{ width:'100%',padding:'9px 12px',background:'var(--bg)',
                  border:'1.5px solid var(--border2)',borderRadius:8,
                  color:'var(--text)',fontSize: 'var(--fs-14)',outline:'none' }}/>
            </label>
          ))}
          <div style={{ fontSize: 'var(--fs-11)',color:isValidCustomerPhone(phone)?'#25D366':'var(--amber)',display:'flex',alignItems:'center',gap:5,
            background:'rgba(37,211,102,0.06)',border:'1px solid rgba(37,211,102,0.2)',
            borderRadius:7,padding:'6px 10px' }}>
            📱 Takeaway phone is mandatory. +91 or 0 prefixes are stripped automatically.
          </div>
        </div>
      )}
      {/* Step 2 — Payment method */}
      {(isDine || step===2) && (
        <div>
          <div style={{ fontSize: 'var(--fs-11)',fontWeight:700,color:'var(--text2)',
            textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:10 }}>
            Payment Method
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            {PAY.map(m=>(
              <button key={m.id} onClick={()=>setPayMethod(m.id)} style={{
                background:payMethod===m.id?'var(--brand-lt)':'var(--card2)',
                border:`2px solid ${payMethod===m.id?'var(--brand)':'var(--border)'}`,
                borderRadius:10,padding:'12px 8px',cursor:'pointer',textAlign:'center' }}>
                <div style={{ fontSize: 'var(--fs-24)',marginBottom:4 }}>{m.icon}</div>
                <div style={{ fontSize: 'var(--fs-12)',fontWeight:700,color:'var(--text)' }}>{m.label}</div>
                {m.id==='upi'&&!upiId&&(
                  <div style={{ fontSize: 'var(--fs-10)',color:'var(--amber)',marginTop:2 }}>Set in Settings</div>
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
  const { settings, showToast } = useStore()
  if (!order) return null

  const restaurantName = settings?.biz_name || settings?.name || 'Restaurant'
  const token = order.invoice_token || order.id
  const url = token ? invoiceUrl(token) : ''

  async function done() {
    if (order.id) {
      const { error } = await supabase.from('orders').update({ status:'completed' }).eq('id', order.id).in('status', ['paid'])
      if (error) showToast?.('Order completed locally. Could not update status right now.', 'warning')
    }
    onClose()
  }

  return (
    <Modal open onClose={() => {}} title="Show this to customer" footer={
      <button onClick={done} style={{ width:'100%',background:'var(--brand)', color:'#fff',border:'none',borderRadius:8,padding:13,fontWeight:700,cursor:'pointer' }}>
        Done
      </button>
    }>
      <div style={{ textAlign:'center',padding:'8px 0' }}>
        <div style={{ fontSize:'var(--fs-13)', color:'var(--text2)', fontWeight:800, marginBottom:10 }}>Scan to get your invoice</div>
        {url ? (
          <div style={{ background:'#fff', borderRadius:18, padding:14, display:'inline-block', border:'1px solid var(--border)' }}>
            <img alt="Invoice QR" src={qrImageUrl(url, 840)} style={{ width:280, height:280, display:'block', background:'#fff' }}/>
          </div>
        ) : <div style={{ color:'var(--red)' }}>Invoice QR is unavailable.</div>}
        <div style={{ fontSize: 'var(--fs-28)',fontWeight:800,color:'var(--brand)',margin:'12px 0 8px' }}>
          ₹{Number(order.total).toFixed(2)}
        </div>
        <div style={{ fontSize: 'var(--fs-13)',color:'var(--text2)', marginBottom:14 }}>
          {order.payMethod==='cash'?'💵 Cash': order.payMethod==='upi' ?'📱 UPI' : order.payMethod==='card'?'💳 Card':'🔖 Other'}
        </div>
        {url && <ShareInvoiceButton restaurantName={restaurantName} total={order.total} url={url}/>}
      </div>
    </Modal>
  )
}

// ── Main OrderPage ─────────────────────────────────────────────────
export default function OrderPage({ defaultType='takeaway', onAddSampleMenu }) {
  const { categories, products, addToCart, removeFromCart, updateCartItem, cart, cartItems,
          cartSubtotal, clearCart, settings, tenantId, showToast } = useStore()
  const { dark } = useTheme()

  const [orderType]                     = useState(defaultType)
  const [tableNum, setTableNum]         = useState(null)
  const [activeCat, setActiveCat]       = useState('all')
  const [sendingKOT, setSendingKOT]     = useState(false)
  const [checkoutData, setCheckoutData] = useState(null)
  const [successOrder, setSuccessOrder] = useState(null)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [confirmKOT, setConfirmKOT]     = useState(false)
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 768)
  const [itemNotes, setItemNotes]       = useState({})
  const [customLines, setCustomLines]   = useState({})
  const [optimisticRounds, setOptimisticRounds] = useState([])
  const [addonCounts, setAddonCounts] = useState({})
  const [productCardNotes, setProductCardNotes] = useState({})
  const [overlayProductId, setOverlayProductId] = useState(null)
  const [overlayType, setOverlayType] = useState(null)
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState({})
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState({})
  const [customQty, setCustomQty] = useState(1)
  const [sameForAll, setSameForAll] = useState(false)
  const [openAccordion, setOpenAccordion] = useState(0)
  const [perItemConfig, setPerItemConfig] = useState([])
  const [catSheetOpen, setCatSheetOpen] = useState(false)
  const productScrollRef = useRef(null)
  const categorySectionRefs = useRef({})
  // Legacy compatibility shim: older compiled snippets may still reference these symbols.
  const quickQtyProductId = null
  const setQuickQtyProductId = () => {}
  const clearLongPressTimer = () => {}

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    clearCart(); setItemNotes({}); setCustomLines({}); setOptimisticRounds([])
  }, [tableNum])

  useEffect(() => () => clearLongPressTimer(), [])

  useEffect(() => {
    function clearQuickQtyOnOutsidePress(event) {
      if (!quickQtyProductId) return
      if (event.target.closest('[data-product-card="true"]')) return
      setQuickQtyProductId(null)
    }

    document.addEventListener('pointerdown', clearQuickQtyOnOutsidePress)
    return () => document.removeEventListener('pointerdown', clearQuickQtyOnOutsidePress)
  }, [quickQtyProductId])

  useEffect(() => {
    setQuickQtyProductId(null)
  }, [activeCat])

  const isDine     = orderType === 'dine'
  const items      = cartItems()
  const tableCount = settings?.table_count || 10
  const tableName  = tableNum ? `T${tableNum}` : null
  const addons = useMemo(() => loadAddons(tenantId), [tenantId])
  const addonTags = useMemo(() => loadProductAddonTags(tenantId), [tenantId, products.length])
  const variantMap = useMemo(() => loadProductVariants(tenantId), [tenantId, products.length])
  const itemExtraTotal = itemOrId => {
    const item = typeof itemOrId === 'object' ? itemOrId : cart[itemOrId]
    const productId = typeof itemOrId === 'object' ? (item.productId || item.id) : itemOrId
    const detailTotal = ((item?.details) || []).reduce((sum, line) => sum + Number(line.price || line.unitPrice || 0) * Number(line.qty || 1), 0) * Number(item?.qty || 1)
    const legacyTotal = [
      ...(customLines[productId] || []),
      ...selectedAddonsForProduct(productId),
    ].reduce((sum, line) => sum + Number(line.price || line.unitPrice || 0) * Number(line.qty || 1), 0)
    return detailTotal + legacyTotal
  }
  const sub        = cartSubtotal() + items.reduce((sum, item) => sum + itemExtraTotal(item), 0)
  const taxRate    = (settings?.tax_rate||0)/100
  const total      = sub + sub * taxRate
  const cartCount  = items.reduce((s,i) => s+i.qty, 0)

  async function handleSendToKitchen() {
    if (!tableNum)    { showToast('Select a table first','warning'); return }
    if (!items.length){ showToast('No items to send','warning'); return }
    if (!tenantId)    { showToast('Not connected — refresh','error'); return }
    setSendingKOT(true)
    const safetyTimer = setTimeout(() => setSendingKOT(false), 8000)

    const optimisticOrder = {
      id: `opt-${Date.now()}`, order_number: null, status: 'pending',
      order_items: items.map(i => ({
        id:`oi-${i.id}`, product_name:i.name, product_icon:i.icon||'',
        qty:i.qty, unit_price:Number(i.price) + (itemExtraTotal(i) / Math.max(Number(i.qty) || 1, 1)), status:'active', notes:itemNotes[i.id]||null,
      })),
    }
    setOptimisticRounds(prev => [optimisticOrder, ...prev])
    clearCart(); setItemNotes({}); setCustomLines({}); setSheetOpen(false)

    try {
      const s=sub, t=s*taxRate, tot=s+t
      const { data:o, error:oErr } = await insertOrderWithInvoiceToken({
        tenant_id:tenantId, status:'pending', order_type:'dine',
        table_number:String(tableNum), payment_method:'cash',
        subtotal:Number(s.toFixed(2)), tax:Number(t.toFixed(2)), total:Number(tot.toFixed(2)),
      }, 'id')
      if (oErr) throw oErr
      const { error } = await supabase.from('order_items').insert(
        items.map(i=>({
          tenant_id:tenantId, order_id:o.id,
          product_id:i.productId || i.product_id || i.id, product_name:i.name, product_icon:i.icon||'',
          unit_price:Number(i.price) + (itemExtraTotal(i) / Math.max(Number(i.qty) || 1, 1)), qty:Number(i.qty), status:'active',
          notes:itemNotes[i.id]||null,
        }))
      )
      if (error) throw error
      showToast(`🍳 ${cartCount} item${cartCount!==1?'s':''} sent to kitchen!`,'success')
    } catch(e) {
      setOptimisticRounds(prev => prev.filter(o => o.id !== optimisticOrder.id))
      showToast(e.message||'Error','error')
    }
    clearTimeout(safetyTimer)
    setSendingKOT(false)
  }

  function handleNoteChange(productId, val) {
    setItemNotes(prev => ({ ...prev, [productId]: val }))
  }

  function setProductNote(productId, val) {
    setProductCardNotes(prev => ({ ...prev, [productId]: val }))
  }

  function selectedAddonsForProduct(productId) {
    return taggedAddons(productId)
      .map(addon => ({ ...addon, qty: addonCounts[`${productId}:${addon.id}`] || 0 }))
      .filter(addon => addon.qty > 0)
  }
  function noteActionLabel(productId) {
    return (productCardNotes[productId] || '').trim() ? 'View Notes' : '+Notes'
  }
  const tempOptions = ['Cold', 'Ice Cold', 'Room Temp']
  const sugarOptions = ['0%', '25%', '50%', '75%', '100%']
  const defaultSize = 'Regular'
  const getSize = (productId) => selectedSizeByProduct[productId] || defaultSize
  const getVariant = (productId) => selectedVariantByProduct[productId] || 'Cold'
  const defaultConfig = productId => ({ size: getSize(productId), temp: getVariant(productId), sugar: '50%', addons: {} })

  function seedConfig(productId, qty = 1) {
    return Array.from({ length: qty }, () => defaultConfig(productId))
  }

  function sizeOptionsForProduct(productId) {
    const opts = variantMap[productId]?.size?.options || []
    const normalized = opts.map(o => ({ label: o.label, price: Number(o.price || 0) }))
    return normalized.some(o => o.label === defaultSize)
      ? normalized
      : [{ label: defaultSize, price: 0 }, ...normalized]
  }

  function updateItemConfig(idx, updater) {
    setPerItemConfig(prev => {
      const next = prev.map((cfg, i) => {
        if (sameForAll) return updater({ ...(prev[0] || defaultConfig(overlayProductId)), addons:{ ...((prev[0] || {}).addons || {}) } })
        if (i !== idx) return cfg
        return updater({ ...cfg, addons:{ ...(cfg.addons || {}) } })
      })
      return next
    })
  }

  function toggleSameForAll(checked) {
    setSameForAll(checked)
    if (checked) {
      setPerItemConfig(prev => prev.map(() => ({ ...(prev[0] || defaultConfig(overlayProductId)), addons:{ ...((prev[0] || {}).addons || {}) } })))
      showToast('Item 1 customisation applied to all items', 'success')
    }
  }

  function composeItemNote(productId) {
    const base = (productCardNotes[productId] || '').trim()
    const selected = selectedAddonsForProduct(productId)
    const addonLine = selected.length
      ? `Add-ons: ${selected.map(a => `${a.name} x${a.qty}`).join(', ')}`
      : ''
    return [base, addonLine].filter(Boolean).join(' | ')
  }

  function addProductWithConfiguredMeta(product) {
    const existingQty = cart[product.id]?.qty || 0
    addToCart(product)
    if (existingQty === 0) {
      const mergedNote = composeItemNote(product.id)
      if (mergedNote) handleNoteChange(product.id, mergedNote)
    }
  }


  function qtyForProduct(productId) {
    return items
      .filter(item => (item.productId || item.id) === productId)
      .reduce((sum, item) => sum + Number(item.qty || 0), 0)
  }

  function removeOneProductUnit(productId) {
    if (cart[productId]) { removeFromCart(productId); return }
    const firstVariant = items.find(i => (i.productId || i.id) === productId)
    if (firstVariant) removeFromCart(firstVariant.id)
  }

  function adjustQuickQty(e, product, delta) {
    e.stopPropagation()
    if (delta > 0) addToCart(product)
    else removeOneProductUnit(product.id)
  }

  function sizePriceFor(productId, sizeLabel) {
    if (!sizeLabel || sizeLabel === defaultSize) return 0
    const cfg = variantMap[productId]?.size
    const option = cfg?.options?.find(o => o.label === sizeLabel)
    if (!option) return 0
    const price = Number(option.price || 0)
    return cfg.priceMode === 'fixed' ? Math.max(0, price - Number(products.find(p => p.id === productId)?.price || 0)) : price
  }

  function buildCartVariant(product, cfg = defaultConfig(product.id)) {
    const addonDetails = Object.entries(cfg.addons || {})
      .map(([id, qty]) => {
        const addon = taggedAddons(product.id).find(a => a.id === id)
        return addon && qty > 0 ? { type:'addon', id, label:addon.name, qty:Number(qty), price:Number(addon.price || 0) } : null
      })
      .filter(Boolean)
    const sizeDelta = sizePriceFor(product.id, cfg.size)
    const details = [
      ...(sizeDelta > 0 ? [{ type:'size', label:cfg.size, qty:1, price:sizeDelta }] : []),
      ...addonDetails,
    ]
    const identity = {
      size: cfg.size || defaultSize,
      temp: cfg.temp || 'Cold',
      sugar: cfg.sugar || '50%',
      addons: addonDetails.map(a => [a.id, a.qty]).sort((a,b) => a[0].localeCompare(b[0])),
    }
    return {
      cartKey: `${product.id}::${JSON.stringify(identity)}`,
      productId: product.id,
      name: product.name,
      icon: product.icon || '',
      price: Number(product.price || 0),
      customization: identity,
      details,
    }
  }

  function applyCustomization(product) {
    const desiredQty = customQty
    const configs = perItemConfig.slice(0, desiredQty)
    while (configs.length < desiredQty) configs.push(defaultConfig(product.id))

    items
      .filter(item => (item.productId || item.id) === product.id)
      .forEach(item => {
        for (let count = 0; count < item.qty; count += 1) removeFromCart(item.id)
      })

    configs.forEach(cfg => addToCart(buildCartVariant(product, cfg)))
    setCustomLines(prev => ({ ...prev, [product.id]: [] }))
    if (configs[0]?.size) setSelectedSizeByProduct(prev => ({ ...prev, [product.id]: configs[0].size }))
    if (configs[0]?.temp) setSelectedVariantByProduct(prev => ({ ...prev, [product.id]: configs[0].temp }))
    setOverlayProductId(null); setOverlayType(null)
  }
  const overlayProduct = products.find(p => p.id === overlayProductId) || null



  function taggedAddons(productId) {
    const ids = Array.from(new Set([
      ...(addonTags[productId] || []),
      ...((variantMap[productId]?.addons?.linkedIds) || []),
    ]))
    return addons.filter(a => ids.includes(a.id))
  }

  function changeAddonQty(productId, addonId, delta) {
    const key = `${productId}:${addonId}`
    setAddonCounts(prev => {
      const next = { ...prev }
      const qty = Math.max(0, (next[key] || 0) + delta)
      if (qty === 0) delete next[key]
      else next[key] = qty
      return next
    })
  }

  function updateCartAddonQty(cartKey, addonId, delta) {
    updateCartItem(cartKey, item => {
      const details = (item.details || []).map(line => {
        if (line.id !== addonId) return line
        return { ...line, qty: Math.max(0, Number(line.qty || 0) + delta) }
      }).filter(line => line.type !== 'addon' || Number(line.qty || 0) > 0)
      return { ...item, details }
    })
  }

  function cartItemsWithExtras() {
    return items.map(item => ({
      ...item,
      price: Number(item.price || 0) + (itemExtraTotal(item) / Math.max(Number(item.qty) || 1, 1)),
    }))
  }

  function openCheckout() {
    if (!items.length){ showToast('Cart is empty','warning'); return }
    setCheckoutData({ items: cartItemsWithExtras(), orderType, tableNum, tableName, total, sub, tax:sub*taxRate, existingOrderId:null })
    setSheetOpen(false)
  }

  function openTableCheckout(data) {
    setCheckoutData({
      items:data.activeItems, orderType:'dine',
      tableNum:data.tableNum, tableName:data.tableName,
      total:data.total, sub:data.sub, tax:data.tax,
      existingOrderId:data.orderId, tableNumber:data.tableNum,
    })
    setSheetOpen(false); setConfirmKOT(false)
  }

  const groups = useMemo(() => {
    const map = {}
    products.forEach(p=>{
      const key = p.category_id||'other'
      if (!map[key]) map[key] = { id:String(key), name:p.catName||'Other', icon:p.catIcon||'', items:[] }
      map[key].items.push(p)
    })
    return Object.values(map)
  }, [products])

  const categoryOptions = useMemo(() => {
    const counts = products.reduce((map, product) => {
      const key = String(product.category_id || 'other')
      map[key] = (map[key] || 0) + 1
      return map
    }, {})
    return [
      { id:'all', name:'All', icon:'', count:products.length },
      ...categories.map(cat => ({ ...cat, id:String(cat.id), count:counts[String(cat.id)] || 0 })),
    ]
  }, [categories, products])

  function selectCategory(categoryId) {
    const id = String(categoryId)
    setActiveCat(id)
    setCatSheetOpen(false)
    requestAnimationFrame(() => {
      if (id === 'all') {
        productScrollRef.current?.scrollTo({ top:0, behavior:'smooth' })
        return
      }
      categorySectionRefs.current[id]?.scrollIntoView({ behavior:'smooth', block:'start' })
    })
  }

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative' }}>

      {isDine && (
        <TablePicker count={tableCount} selected={tableNum}
          onSelect={setTableNum} tenantId={tenantId}/>
      )}



      <div style={{ flex:1,display:'flex',overflow:'hidden' }}>
        <div ref={productScrollRef} style={{ flex:1,overflowY:'auto',padding:10,paddingBottom:isMobile ? ((cartCount>0 || isDine) ? 120 : 64) : 24 }}>
          {products.length===0&&(
            <div style={{ textAlign:'center',padding:40,color:'var(--text2)' }}>
              <div style={{ fontSize: 'var(--fs-32)',marginBottom:8 }}>🍽</div>
              <div style={{ fontWeight:800,color:'var(--text)',marginBottom:4 }}>No products added yet</div>
              <div style={{ fontSize: 'var(--fs-12)',marginBottom:14 }}>Add products manually, or start faster with sample categories and products.</div>
              {onAddSampleMenu && (
                <button onClick={onAddSampleMenu} style={{
                  background:'var(--brand)',color:'#fff',border:'none',borderRadius:10,
                  padding:'10px 14px',fontWeight:800,fontSize: 'var(--fs-12)',
                }}>Add sample menu</button>
              )}
            </div>
          )}
          {groups.map((group,gi)=>(
            <div key={gi} ref={el => { if (group.id) categorySectionRefs.current[group.id] = el }}>
              {group.name&&(
                <div style={{ fontSize: 'var(--fs-10)',fontWeight:700,color:'var(--text3)',
                  textTransform:'uppercase',letterSpacing:'0.5px',padding:'8px 0 5px' }}>
                  {group.icon} {group.name}
                </div>
              )}
              <div style={{
                display:'grid',
                gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr',
                gap:6, marginBottom:10
              }}>
                {group.items.map(p=>{
                  const qty=qtyForProduct(p.id)
                  const isVariantOpen = overlayProductId === p.id && overlayType === 'customize'
                  const vcfg = variantMap[p.id] || {}
                  const linkedAddonIds = (vcfg?.addons?.linkedIds?.length ? vcfg.addons.linkedIds : addonTags[p.id]) || []
                  const hasCustom = !!(vcfg?.size?.enabled || vcfg?.sugar?.enabled || vcfg?.temperature?.enabled || linkedAddonIds.length > 0)
                  return (
                    <div key={p.id} style={{
                      background: dark ? '#151515' : '#FFFFFF',
                      border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E5E7EB',
                      borderRadius:12,
                      boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.35)' : '0 1px 2px rgba(0,0,0,0.04)',
                      opacity:p.out_of_stock?0.45:1,
                      display:'flex',alignItems:'center',gap:10,
                      textAlign:'left',position:'relative',
                      minHeight:52,padding:'12px 10px',
                    }}>
                      <div
                        role="button"
                        tabIndex={p.out_of_stock ? -1 : 0}
                        aria-disabled={p.out_of_stock}
                        onClick={() => { if (!p.out_of_stock) addProductWithConfiguredMeta(p) }}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            if (!p.out_of_stock) addProductWithConfiguredMeta(p)
                          }
                        }}
                        style={{
                          cursor:p.out_of_stock?'not-allowed':'pointer',
                          display:'flex',alignItems:'center',gap:9,flex:1,minWidth:0,
                          touchAction:'manipulation'
                        }}
                      >
                      <span style={{ fontSize: 'var(--fs-18)', flexShrink:0 }}>{p.icon||'🍽'}</span>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize: 'var(--fs-13)',fontWeight:500,color:'var(--text)',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize:'var(--fs-11)', color:'var(--text2)' }}>{getSize(p.id)} • {getVariant(p.id)}</div>
                      </div>
                      </div>
                      <div
                        onClick={qty === 0 ? (e) => { e.stopPropagation(); if (!p.out_of_stock) addProductWithConfiguredMeta(p) } : undefined}
                        style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                        <span style={{ color:'#1D9E75', fontWeight:700, fontSize:'var(--fs-12)' }}>₹{Number(p.price).toFixed(0)}</span>
                        <span style={{ width:1, height:18, background:'var(--border2)' }} />
                        {qty > 0 ? (
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <button type="button" disabled={!qty} onClick={event => { event.stopPropagation(); adjustQuickQty(event, p, -1) }} style={{ width:32,height:24,borderRadius:8,border:'1px solid var(--border2)',background:'var(--card2)',color:'var(--text)',opacity:qty?1:0.35 }}>−</button>
                            <span style={{ minWidth:10, textAlign:'center', color:'var(--text)', fontWeight:700 }}>{qty}</span>
                            <button type="button" onClick={event => { event.stopPropagation(); adjustQuickQty(event, p, 1) }} style={{ width:32,height:24,borderRadius:8,border:'1px solid var(--border2)',background:'var(--card2)',color:'var(--text)' }}>+</button>
                            {hasCustom && <button type="button" onClick={(e)=>{e.stopPropagation();setOverlayProductId(p.id);setOverlayType('customize');setCustomQty(qty);setSameForAll(false);setOpenAccordion(0);setPerItemConfig(seedConfig(p.id, qty));}} style={{ border:'none', background:'none', color:'var(--text2)', transform:isVariantOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.15s ease', padding:0 }}>▼</button>}
                          </div>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <button type="button" onClick={e => { e.stopPropagation(); addProductWithConfiguredMeta(p) }} style={{ height:24, border:'none', background:'none', color: dark ? '#00D26A' : '#10B981', fontWeight:700, fontSize:'14px', lineHeight:1 }}>+ Add</button>
                            {hasCustom && <button type="button" onClick={(e)=>{e.stopPropagation();setOverlayProductId(p.id);setOverlayType('customize');setCustomQty(1);setSameForAll(false);setOpenAccordion(0);setPerItemConfig(seedConfig(p.id, 1));}} style={{ border:'none', background:'none', color:'var(--text2)', transform:isVariantOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.15s ease', padding:0 }}>▼</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {overlayProduct && (
            <div onClick={() => { setOverlayProductId(null); setOverlayType(null) }} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2500 }}>
              <div onClick={e => e.stopPropagation()} style={{ width: overlayType==='customize' ? (isMobile ? 'min(100vw,480px)' : '480px') : 'min(92vw,360px)', maxHeight: overlayType==='customize' ? (isMobile ? '88vh' : '80vh') : 'unset', overflowY:'auto', background:'var(--card)', border:'1px solid var(--border2)', borderRadius: overlayType==='customize' ? (isMobile ? '20px 20px 0 0' : 16) : 12, padding:12, alignSelf: overlayType==='customize' && isMobile ? 'flex-end' : 'center', transform: overlayType==='customize' && !isMobile ? 'translate(0,0)' : 'none' }}>
                <button onClick={() => { setOverlayProductId(null); setOverlayType(null) }} style={{ position:'absolute', top:10, right:10, border:'none', background:'none', color:'var(--text2)', fontSize:'var(--fs-18)' }}>✕</button>
                <div style={{ fontWeight:800, color:'var(--text)', marginBottom:8 }}>{overlayProduct.name}</div>
                {overlayType === 'note' ? (
                  <textarea value={productCardNotes[overlayProduct.id] || ''} onChange={e => setProductNote(overlayProduct.id, e.target.value)} placeholder="Type note..." style={{ width:'100%', minHeight:90, border:'1px solid var(--border)', borderRadius:8, background:'var(--bg)', color:'var(--text)', padding:8 }} />
                ) : overlayType === 'customize' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {isMobile && <div style={{ width:42,height:4,borderRadius:3,background:'var(--border2)',margin:'0 auto 2px' }}/>}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}><span>{overlayProduct.icon||'🍽'}</span><div><div style={{ fontWeight:700 }}>{overlayProduct.name}</div><div style={{ fontSize:'var(--fs-11)', color:'var(--text2)' }}>{getSize(overlayProduct.id)} · {getVariant(overlayProduct.id)}</div></div></div>
                      <span style={{ background:'var(--brand)', color:'#fff', borderRadius:999, padding:'2px 8px', fontSize:'var(--fs-11)', fontWeight:700 }}>{customQty}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:16 }}>
                      <button onClick={()=>{setCustomQty(q=>Math.max(1,q-1)); setPerItemConfig(prev=>prev.length>1?prev.slice(0,-1):prev); setOpenAccordion(0)}} style={{ width:44,height:44,borderRadius:999,border:'1px solid var(--brand)',background:'none',color:'var(--brand)' }}>−</button>
                      <span style={{ fontSize:'var(--fs-20)', fontWeight:700 }}>{customQty}</span>
                      <button onClick={()=>{setCustomQty(q=>q+1); setPerItemConfig(prev=>[...prev, sameForAll ? { ...(prev[0] || defaultConfig(overlayProduct.id)), addons:{...((prev[0] || {}).addons || {})} } : defaultConfig(overlayProduct.id)])}} style={{ width:44,height:44,borderRadius:999,border:'1px solid var(--brand)',background:'none',color:'var(--brand)' }}>+</button>
                    </div>
                    {customQty >= 2 && <label style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)' }}><span>Same customisation for all</span><input type="checkbox" checked={sameForAll} onChange={e=>toggleSameForAll(e.target.checked)} /></label>}
                    {perItemConfig.map((cfg, idx) => (
                      <div key={idx} style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                        <button onClick={()=>setOpenAccordion(openAccordion===idx?-1:idx)} style={{ width:'100%', textAlign:'left', background:'var(--card2)', border:'none', padding:'10px 12px', color:'var(--text)' }}>
                          <div style={{ fontWeight:700 }}>Item {idx+1}</div><div style={{ fontSize:'var(--fs-11)', color:'var(--text2)' }}>{cfg.size} · {cfg.temp} · Sugar {cfg.sugar}</div>
                        </button>
                        {openAccordion===idx && <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                          {(variantMap[overlayProduct.id]?.size?.enabled) && <div><div style={{ fontSize:'var(--fs-10)', color:'var(--text2)', marginBottom:4 }}>SIZE</div>{sizeOptionsForProduct(overlayProduct.id).map(s => <button key={s.label} onClick={()=>updateItemConfig(idx, cfg => ({...cfg,size:s.label}))} style={{ marginRight:6, marginBottom:6, border:'1px solid var(--border2)', background:cfg.size===s.label?'var(--brand-lt)':'var(--card2)', color:cfg.size===s.label?'var(--brand)':'var(--text)', borderRadius:999, padding:'5px 10px' }}>{s.label} {variantMap[overlayProduct.id]?.size?.priceMode==='delta'?`+₹${s.price}`:`₹${s.price}`}</button>)}</div>}
                          {(variantMap[overlayProduct.id]?.temperature?.enabled && (variantMap[overlayProduct.id]?.temperature?.options||[]).length>1) && <div><div style={{ fontSize:'var(--fs-10)', color:'var(--text2)', marginBottom:4 }}>TEMPERATURE</div>{(variantMap[overlayProduct.id]?.temperature?.options||[]).map(s => <button key={s} onClick={()=>updateItemConfig(idx, cfg => ({...cfg,temp:s}))} style={{ marginRight:6, marginBottom:6, border:'1px solid var(--border2)', background:cfg.temp===s?'var(--brand-lt)':'var(--card2)', color:cfg.temp===s?'var(--brand)':'var(--text)', borderRadius:999, padding:'5px 10px' }}>{s}</button>)}</div>}
                          {(variantMap[overlayProduct.id]?.sugar?.enabled) && <div><div style={{ fontSize:'var(--fs-10)', color:'var(--text2)', marginBottom:4 }}>SUGAR LEVEL</div>{(variantMap[overlayProduct.id]?.sugar?.options||[]).map(s => <button key={s} onClick={()=>updateItemConfig(idx, cfg => ({...cfg,sugar:s}))} style={{ marginRight:6, marginBottom:6, border:'1px solid var(--border2)', background:cfg.sugar===s?'var(--brand-lt)':'var(--card2)', color:cfg.sugar===s?'var(--brand)':'var(--text)', borderRadius:999, padding:'5px 10px' }}>{s}</button>)}</div>}
                          {((variantMap[overlayProduct.id]?.addons?.enabled) || taggedAddons(overlayProduct.id).length > 0) && <div><div style={{ fontSize:'var(--fs-10)', color:'var(--text2)', marginBottom:4 }}>ADD-ONS</div>{taggedAddons(overlayProduct.id).filter(a=>{ const linked=variantMap[overlayProduct.id]?.addons?.linkedIds||[]; return linked.length ? linked.includes(a.id) : true }).map(addon=>{ const c=(cfg.addons||{})[addon.id]||0; return <div key={addon.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}><span style={{ fontSize:'var(--fs-11)' }}>{addon.name} · ₹{Number(addon.price).toFixed(2)}</span><div style={{ display:'flex', alignItems:'center', gap:6 }}><button onClick={()=>updateItemConfig(idx, item => ({...item, addons:{...(item.addons||{}), [addon.id]:Math.max(0, ((item.addons||{})[addon.id]||0)-1)}}))} style={{ width:20,height:20,borderRadius:'50%',border:'1px solid var(--border)',background:'var(--card2)' }}>−</button><span>{c}</span><button onClick={()=>updateItemConfig(idx, item => ({...item, addons:{...(item.addons||{}), [addon.id]:((item.addons||{})[addon.id]||0)+1}}))} style={{ width:20,height:20,borderRadius:'50%',border:'none',background:'var(--brand)',color:'#fff' }}>+</button></div></div>})}</div>}
                        </div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>{taggedAddons(overlayProduct.id).length === 0 ? <div style={{ color:'var(--text3)', fontSize:'var(--fs-12)' }}>No add-ons tagged for this product.</div> : taggedAddons(overlayProduct.id).map(addon => { const key = `${overlayProduct.id}:${addon.id}`; const c = addonCounts[key] || 0; return <div key={addon.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}><span style={{ color:'var(--text)', fontSize:'var(--fs-12)' }}>{addon.name} · ₹{Number(addon.price).toFixed(2)}</span><div style={{ display:'flex', gap:6, alignItems:'center' }}><button onClick={() => changeAddonQty(overlayProduct.id, addon.id, -1)} style={{ width:24,height:24,borderRadius:'50%',border:'1px solid var(--border)',background:'var(--card2)',color:'var(--text)' }}>−</button><span style={{ minWidth:14, textAlign:'center' }}>{c}</span><button onClick={() => changeAddonQty(overlayProduct.id, addon.id, 1)} style={{ width:24,height:24,borderRadius:'50%',border:'none',background:'var(--brand)',color:'#fff' }}>+</button></div></div> })}</div>
                )}
                <button onClick={() => overlayType==='customize' ? applyCustomization(overlayProduct) : (setOverlayProductId(null), setOverlayType(null))} style={{ marginTop:10, width:'100%', background:'var(--brand)', color:'#fff', border:'none', borderRadius:10, padding:'12px 10px', fontWeight:700, position: overlayType==='customize'?'sticky':'static', bottom:0 }}>
                  {overlayType==='customize' ? `Confirm · ${customQty} item${customQty!==1?'s':''}` : 'Done'}
                </button>
              </div>
            </div>
          )}
          {isMobile&&<div style={{ height:100 }}/>}
        </div>

        {!isMobile && (
          <div style={{ width:300,flexShrink:0,borderLeft:'1px solid var(--border)',
            display:'flex',flexDirection:'column',overflow:'hidden' }}>
            {isDine ? (
              <TableOrderPanel
                tableNum={tableNum} tableName={tableName} cartItems={items}
                onAddToCart={addToCart} onRemoveFromCart={removeFromCart}
                onSendToKitchen={handleSendToKitchen} sendingKOT={sendingKOT}
                onCheckout={openTableCheckout} settings={settings} isMobile={false}
                notes={itemNotes} onChangeNote={handleNoteChange}
                optimisticRounds={optimisticRounds}
                onRealDataLoaded={() => setOptimisticRounds([])}
              />
            ) : (
              <CartPanel items={items} orderType={orderType}
                onAdd={addToCart} onRemove={removeFromCart}
                onCheckout={openCheckout} settings={settings}
                notes={itemNotes} getSelectedAddons={selectedAddonsForProduct} getCustomLines={(id)=>customLines[id]||[]} onUpdateAddonQty={updateCartAddonQty}/>
            )}
          </div>
        )}
      </div>

      {isMobile&&isDine&&(
        <div style={{ position:'fixed',bottom:0,left:0,right:0,
          padding:'10px 12px',paddingBottom:'calc(14px + env(safe-area-inset-bottom, 8px))',
          background:'var(--bg)',borderTop:'1px solid var(--border)',
          display:'flex',gap:8,zIndex:100 }}>
          {isDine ? (
            <>
              <button
                onClick={() => { if(!tableNum){showToast('Select a table first','warning');return} if(cartCount>0) setConfirmKOT(true) }}
                disabled={sendingKOT}
                style={{ flex:1.8,
                  background:(!tableNum||cartCount===0)?'var(--card2)':'#1D9E75',
                  color:(!tableNum||cartCount===0)?'var(--text3)':'#fff',
                  border:`1.5px solid ${(!tableNum||cartCount===0)?'var(--border)':'#1D9E75'}`,
                  borderRadius:14,padding:'13px 8px',fontWeight:800,fontSize: 'var(--fs-14)',
                  cursor:(!tableNum||cartCount===0)?'default':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  transition:'all 0.15s' }}>
                {sendingKOT?<Spinner size={16}/>:<span style={{ fontSize: 'var(--fs-17)' }}>🍳</span>}
                {sendingKOT?'Sending…':!tableNum?'Select table':
                 cartCount>0?`Send ${cartCount} to Kitchen`:'Send to Kitchen'}
              </button>
              <button onClick={()=>setSheetOpen(true)}
                style={{ flex:1,background:'var(--card)',
                  border:'1.5px solid var(--border)',borderRadius:14,
                  padding:'13px 8px',fontWeight:700,fontSize: 'var(--fs-13)',
                  color:'var(--text)',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  position:'relative' }}>
                <span style={{ fontSize: 'var(--fs-18)' }}>🛒</span>
                <span>Order</span>
                {cartCount>0&&(
                  <span style={{ position:'absolute',top:6,right:6,
                    background:'var(--brand)',color:'#fff',
                    fontSize: 'var(--fs-10)',fontWeight:800,borderRadius:'50%',
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
                fontWeight:700,fontSize: 'var(--fs-14)',cursor:'pointer' }}>
              <span style={{ background:'rgba(255,255,255,0.25)',borderRadius:8,
                padding:'2px 8px',fontSize: 'var(--fs-13)' }}>{cartCount}</span>
              <span>View Cart · ₹{total.toFixed(2)}</span>
              <span>→</span>
            </button>
          ) : <div style={{ height:46 }}/>}
        </div>
      )}

      {(
        <button
          type="button"
          onClick={() => setCatSheetOpen(true)}
          style={{
            position:'fixed',
            bottom:isMobile && (cartCount>0 || isDine) ? 72 : 16,
            left:isMobile ? '50%' : 'calc((100vw - 300px) / 2)',
            transform:'translateX(-50%)',
            zIndex:100,
            height:36,
            padding:'8px 20px',
            borderRadius:999,
            border:`0.5px solid ${dark ? '#3A3A3A' : '#DDDDDD'}`,
            background:dark ? '#1E1E1E' : '#F2F2F2',
            color:dark ? '#E0E0E0' : '#111111',
            display:'flex',alignItems:'center',gap:8,
            boxShadow:'none',
            fontSize:'13px',fontWeight:500,
            transition:'bottom 0.25s ease',
          }}
        >
          <span style={{ fontSize:16, color:'var(--text3)', lineHeight:1 }}>▦</span>
          <span>Categories</span>
          <span style={{ fontSize:12, color:'var(--text3)', transform:catSheetOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.15s' }}>⌃</span>
        </button>
      )}

      {!isDine && isMobile && cartCount>0 && (
        <button onClick={()=>setSheetOpen(true)} style={{
          position:'fixed',left:12,right:12,bottom:16,zIndex:99,
          height:48,padding:'0 16px',border:'none',borderRadius:14,
          background:'#1D9E75',color:'#fff',display:'flex',alignItems:'center',justifyContent:'space-between',
          transform:'translateY(0)',opacity:1,transition:'transform 0.25s ease, opacity 0.25s ease',
          fontSize:'13px',fontWeight:500,cursor:'pointer'
        }}>
          <span style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ background:'rgba(0,0,0,0.22)',borderRadius:10,padding:'2px 8px',fontSize:11 }}>{cartCount} item{cartCount!==1?'s':''}</span>
            <span>View Cart</span>
          </span>
          <span style={{ display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ fontSize:14,fontWeight:500 }}>₹{total.toFixed(2)}</span>
            <span style={{ fontSize:16,opacity:0.8 }}>→</span>
          </span>
        </button>
      )}

      {catSheetOpen && (
        <div onClick={()=>setCatSheetOpen(false)} style={{ position:'fixed',inset:0,zIndex:200,background:dark?'rgba(0,0,0,0.55)':'rgba(0,0,0,0.4)',display:'flex',alignItems:'flex-end',justifyContent:isMobile?'center':'flex-start' }}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:isMobile?'100%':'min(420px, calc(100vw - 320px))',
            marginLeft:isMobile?0:16,
            maxHeight:'60vh',overflowY:'auto',
            background:dark?'#1A1A1A':'#FFFFFF',
            borderRadius:'16px 16px 0 0',
            padding:'12px 16px 16px',
            boxShadow:'0 -8px 30px rgba(0,0,0,0.25)'
          }}>
            <div style={{ width:42,height:4,borderRadius:999,background:'var(--border2)',margin:'0 auto 12px' }} />
            <div style={{ fontSize:11,color:'var(--text3)',letterSpacing:'0.8px',fontWeight:800,marginBottom:10 }}>BROWSE CATEGORIES</div>
            {categoryOptions.map(cat => {
              const active = activeCat === String(cat.id)
              return <button key={cat.id} onClick={()=>selectCategory(cat.id)} style={{
                width:'100%',height:44,display:'flex',alignItems:'center',gap:10,
                border:'none',borderRadius:8,padding:'0 10px',background:active?(dark?'#252525':'#F0F0F0'):'transparent',
                color:'var(--text)',fontSize:'var(--fs-13)',cursor:'pointer',textAlign:'left'
              }}>
                <span style={{ color:active?(dark?'#1D9E75':'#0F6E56'):'#555',fontSize:13 }}>{active?'●':'○'}</span>
                <span style={{ flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</span>
                <span style={{ marginLeft:'auto',fontSize:12,color:'var(--text3)',fontVariantNumeric:'tabular-nums' }}>{cat.count}</span>
              </button>
            })}
          </div>
        </div>
      )}

      {/* Mobile KOT confirmation sheet */}
      {confirmKOT && isMobile && (
        <div style={{ position:'fixed',inset:0,zIndex:400,
          display:'flex',flexDirection:'column',justifyContent:'flex-end',
          background:'rgba(0,0,0,0.6)',backdropFilter:'blur(3px)',
          animation:'sheetBackdropIn 180ms ease-out' }}
          onClick={e=>e.target===e.currentTarget&&setConfirmKOT(false)}>
          <div style={{ background:'var(--card)',borderRadius:'18px 18px 0 0',
            display:'flex',flexDirection:'column',
            boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',
            animation:'sheetSlideUp 260ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            <div style={{ display:'flex',justifyContent:'center',padding:'10px 0 0',flexShrink:0 }}>
              <div style={{ width:40,height:4,borderRadius:2,background:'var(--border2)' }}/>
            </div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'10px 16px',borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight:800,fontSize: 'var(--fs-15)',color:'var(--text)' }}>🍳 Send to Kitchen</div>
                <div style={{ fontSize: 'var(--fs-11)',color:'var(--text3)',marginTop:1 }}>
                  Table {tableName||'?'} · {cartCount} item{cartCount!==1?'s':''}
                </div>
              </div>
              <button onClick={()=>setConfirmKOT(false)}
                style={{ background:'none',border:'none',color:'var(--text2)',
                  fontSize: 'var(--fs-20)',cursor:'pointer',lineHeight:1 }}>✕</button>
            </div>
            <div style={{ overflowY:'auto',maxHeight:'45vh',padding:'8px 14px' }}>
              <RoundAccordion
                order={{
                  id:'confirm-preview', order_number:null, status:'pending',
                  order_items:items.map(i=>({
                    id:`p-${i.id}`,product_name:i.name,
                    product_icon:i.icon||'',qty:i.qty,
                    unit_price:Number(i.price) + (itemExtraTotal(i) / Math.max(Number(i.qty) || 1, 1)),status:'active',
                    notes:itemNotes[i.id]||null,
                  })),
                }}
                defaultOpen={true} isNew={true} isMobile={true}
                onSendToKitchen={null} sendingKOT={false} tableNum={tableNum}
                onRemoveItem={id=>removeFromCart(id)}
                onAddItem={item=>addToCart(item)}
                onChangeNote={(id,v)=>setItemNotes(p=>({...p,[id]:v}))}
                notes={itemNotes}
              />
            </div>
            <div style={{ padding:'12px 16px',
              paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))',
              borderTop:'1px solid var(--border)' }}>
              <div style={{ display:'flex',justifyContent:'space-between',
                fontSize: 'var(--fs-14)',fontWeight:800,marginBottom:12 }}>
                <span>Total</span>
                <span style={{ color:'var(--brand)' }}>
                  ₹{(items.reduce((s,i)=>s+i.price*i.qty,0)*(1+(settings?.tax_rate||0)/100)).toFixed(2)}
                </span>
              </div>
              <button
                onClick={async()=>{ setConfirmKOT(false); await handleSendToKitchen() }}
                disabled={sendingKOT||!tableNum}
                style={{ width:'100%',background:!tableNum?'var(--card2)':'#1D9E75',
                  color:!tableNum?'var(--text3)':'#fff',border:'none',borderRadius:14,
                  padding:'15px',fontWeight:800,fontSize: 'var(--fs-16)',
                  cursor:!tableNum?'default':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                {sendingKOT?<Spinner size={16}/>:'🍳'}
                {!tableNum?'Select a table first':'Confirm — Send to Kitchen'}
              </button>
            </div>
          </div>
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
        onRealDataLoaded={() => setOptimisticRounds([])}
        getSelectedAddons={selectedAddonsForProduct} getCustomLines={(id)=>customLines[id]||[]} onUpdateAddonQty={updateCartAddonQty}/>

      <CheckoutModal open={!!checkoutData} onClose={()=>setCheckoutData(null)}
        checkoutData={checkoutData}
        onSuccess={o=>{ setSuccessOrder(o); setCheckoutData(null); setCustomLines({}); setAddonCounts({}) }}/>
      <SuccessModal order={successOrder} onClose={()=>setSuccessOrder(null)}/>
    </div>
  )
}
