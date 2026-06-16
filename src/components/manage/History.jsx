import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import ShareInvoiceButton from '../invoice/ShareInvoiceButton'
import { invoiceUrl, qrImageUrl } from '../../utils/invoice'

// ── helpers ───────────────────────────────────────────────────────
function fmt(iso) {
  const d = new Date(iso), now = new Date(), diff = (now - d) / 60000
  if (diff < 1)    return 'just now'
  if (diff < 60)   return `${Math.floor(diff)}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}

function fmtFull(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day:'numeric', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
  })
}

const STATUS = {
  paid:      { bg:'rgba(34,197,94,0.1)',   color:'#22C55E', label:'Paid'      },
  completed: { bg:'rgba(34,197,94,0.1)',   color:'#22C55E', label:'Completed'  },
  pending:   { bg:'rgba(245,158,11,0.1)',  color:'#F59E0B', label:'Pending'   },
  refunded:  { bg:'rgba(239,68,68,0.1)',   color:'#EF4444', label:'Refunded'  },
  preparing: { bg:'rgba(59,130,246,0.1)',  color:'#3B82F6', label:'Preparing' },
  ready:     { bg:'rgba(34,197,94,0.1)',   color:'#22C55E', label:'Ready'     },
  cancelled: { bg:'rgba(107,114,128,0.1)', color:'#9CA3AF', label:'Cancelled' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{ fontSize: 'var(--fs-10)', fontWeight:700, padding:'2px 7px', borderRadius:5,
      background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{s.label}</span>
  )
}

const TYPE_LABEL = {
  dine:     (o) => `🍽 T${o.table_number||'?'}`,
  takeaway: ()  => '🛍 Takeaway',
  delivery: ()  => '🚚 Delivery',
  stall:    ()  => '🏪 Stall',
}

// ── Order Detail panel / sheet ────────────────────────────────────
function OrderDetail({ order, onClose, onRefund, isMobile }) {
  const { settings } = useStore()
  const [qrOpen, setQrOpen] = useState(false)
  if (!order) return null
  const items    = order.order_items || []
  const active   = items.filter(i => i.status !== 'rejected')
  const rejected = items.filter(i => i.status === 'rejected')

  const content = (
    <>
      {/* Items */}
      {active.map(i => (
        <div key={i.id} style={{ display:'flex', alignItems:'center', gap:8,
          padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--fs-16)', flexShrink:0 }}>{i.product_icon||'🍽'}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize: 'var(--fs-13)', fontWeight:500, color:'var(--text)' }}>
              {i.product_name}
            </div>
            {i.notes && (
              <div style={{ fontSize: 'var(--fs-11)', color:'var(--amber)' }}>📝 {i.notes}</div>
            )}
          </div>
          <span style={{ fontSize: 'var(--fs-12)', color:'var(--text2)', marginRight:8 }}>×{i.qty}</span>
          <span style={{ fontSize: 'var(--fs-13)', fontWeight:600, color:'var(--brand)', flexShrink:0 }}>
            ₹{(Number(i.unit_price)*i.qty).toFixed(2)}
          </span>
        </div>
      ))}

      {rejected.length > 0 && (
        <div style={{ marginTop:8 }}>
          <div style={{ fontSize: 'var(--fs-10)', fontWeight:700, color:'var(--text3)',
            textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>
            Removed items
          </div>
          {rejected.map(i => (
            <div key={i.id} style={{ display:'flex', gap:8, padding:'4px 0',
              opacity:0.45, textDecoration:'line-through', fontSize: 'var(--fs-12)', color:'var(--text3)' }}>
              <span>{i.product_icon||'🍽'}</span>
              <span style={{ flex:1 }}>{i.product_name} ×{i.qty}</span>
              <span style={{ color:'var(--red)' }}>removed</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div style={{ display:'flex', justifyContent:'space-between',
        padding:'10px 0 0', fontWeight:800, fontSize: 'var(--fs-15)',
        borderTop:'1px solid var(--border)', marginTop:4 }}>
        <span>Total</span>
        <span style={{ color:'var(--brand)' }}>₹{Number(order.total).toFixed(2)}</span>
      </div>

      {/* Meta */}
      <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:5,
        background:'var(--bg)', borderRadius:8, padding:'10px 12px',
        fontSize: 'var(--fs-12)', color:'var(--text2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Order #</span>
          <span style={{ fontWeight:700, color:'var(--text)' }}>#{order.order_number}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Type</span>
          <span>{TYPE_LABEL[order.order_type]?.(order) || order.order_type}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Payment</span>
          <span>
            {order.payment_method==='upi' ? '📱 UPI'
            :order.payment_method==='cash'? '💵 Cash'
            :order.payment_method==='card'? '💳 Card'
            :'🔖 Other'}
          </span>
        </div>
        {order.customer_name && (
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span>Customer</span><span>👤 {order.customer_name}</span>
          </div>
        )}
        {order.customer_phone && (
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span>Phone</span><span>📞 {order.customer_phone}</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Time</span><span>🕐 {fmtFull(order.created_at)}</span>
        </div>
      </div>

      {(order.status === 'paid' || order.status === 'completed') && (order.invoice_token || order.id) && (
        <button onClick={() => setQrOpen(true)}
          style={{ width:'100%', marginTop:12, background:'var(--brand)', color:'#fff', border:'none',
            borderRadius:8, padding:'10px', fontWeight:700, fontSize:'var(--fs-13)', cursor:'pointer' }}>
          Show Invoice QR
        </button>
      )}
      {qrOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:420, background:'rgba(0,0,0,0.72)', display:'grid', placeItems:'center', padding:18 }}>
          <div style={{ width:'100%', maxWidth:390, background:'var(--card)', borderRadius:18, padding:18, textAlign:'center', border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:900, fontSize:'var(--fs-16)', marginBottom:4 }}>Show this to customer</div>
            <div style={{ color:'var(--text2)', fontSize:'var(--fs-12)', marginBottom:12 }}>Scan to get your invoice</div>
            <div style={{ background:'#fff', borderRadius:18, padding:14, display:'inline-block' }}>
              <img alt="Invoice QR" src={qrImageUrl(invoiceUrl(order.invoice_token || order.id), 840)} style={{ width:280, height:280, display:'block', background:'#fff' }}/>
            </div>
            <div style={{ display:'grid', gap:8, marginTop:12 }}>
              <ShareInvoiceButton restaurantName={settings?.biz_name || settings?.name || 'Restaurant'} total={order.total} url={invoiceUrl(order.invoice_token || order.id)}/>
              <button onClick={() => setQrOpen(false)} style={{ width:'100%', background:'var(--card2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8, padding:10, fontWeight:700 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund */}
      {order.status === 'paid' && (
        <button onClick={() => onRefund(order.id)}
          style={{ width:'100%', marginTop:8, background:'rgba(239,68,68,0.08)',
            color:'var(--red)', border:'1px solid rgba(239,68,68,0.2)',
            borderRadius:8, padding:'10px', fontWeight:600, fontSize: 'var(--fs-13)', cursor:'pointer' }}>
          ↩ Refund this order
        </button>
      )}
    </>
  )

  if (isMobile) {
    return (
      <div style={{ position:'fixed', inset:0, zIndex:300,
        display:'flex', flexDirection:'column', justifyContent:'flex-end',
        background:'rgba(0,0,0,0.55)', backdropFilter:'blur(2px)' }}
        onClick={e => e.target===e.currentTarget && onClose()}>
        <div style={{ background:'var(--card)', borderRadius:'18px 18px 0 0',
          maxHeight:'85vh', display:'flex', flexDirection:'column',
          boxShadow:'0 -8px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0', flexShrink:0 }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'var(--border2)' }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'8px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div>
              <span style={{ fontWeight:800, fontSize: 'var(--fs-15)', color:'var(--text)' }}>
                Order #{order.order_number}
              </span>
              <div style={{ marginTop:2, display:'flex', gap:6, alignItems:'center' }}>
                <StatusBadge status={order.status}/>
                <span style={{ fontSize: 'var(--fs-11)', color:'var(--text3)' }}>{fmt(order.created_at)}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none',
              color:'var(--text2)', fontSize: 'var(--fs-20)', cursor:'pointer', lineHeight:1 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 20px' }}>
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300,
      background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--card)', borderRadius:16, width:'100%', maxWidth:440,
        maxHeight:'85vh', display:'flex', flexDirection:'column',
        border:'1px solid var(--border2)', boxShadow:'0 16px 48px rgba(0,0,0,0.3)',
        animation:'popIn 0.2s ease', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize: 'var(--fs-16)',
              color:'var(--text)' }}>
              Order #{order.order_number}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:3 }}>
              <StatusBadge status={order.status}/>
              <span style={{ fontSize: 'var(--fs-11)', color:'var(--text3)' }}>{fmtFull(order.created_at)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none',
            color:'var(--text2)', fontSize: 'var(--fs-18)', cursor:'pointer', padding:4 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 18px' }}>
          {content}
        </div>
      </div>
    </div>
  )
}

// ── Main History Page ─────────────────────────────────────────────
export default function HistoryPage() {
  const { tenantId, showToast } = useStore()
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)

  const [dateRange,    setDateRange]    = useState('today')
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [showFilters,  setShowFilters]  = useState(false)

  const DATE_OPTS = [
    { id:'today',  label:'Today'      },
    { id:'week',   label:'7 days'     },
    { id:'month',  label:'This month' },
    { id:'custom', label:'Custom'     },
    { id:'all',    label:'All time'   },
  ]

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    if (tenantId) load()
  }, [tenantId, dateRange, statusFilter, typeFilter, customFrom, customTo])

  async function load() {
    setLoading(true)
    let q = supabase.from('orders')
      .select('*, order_items(id,product_name,product_icon,qty,unit_price,status,notes)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending:false })

    const now = new Date()
    if (dateRange === 'today') {
      const s = new Date(now); s.setHours(0,0,0,0)
      q = q.gte('created_at', s.toISOString())
    } else if (dateRange === 'week') {
      const s = new Date(now); s.setDate(s.getDate()-7)
      q = q.gte('created_at', s.toISOString())
    } else if (dateRange === 'month') {
      const s = new Date(now); s.setDate(1); s.setHours(0,0,0,0)
      q = q.gte('created_at', s.toISOString())
    } else if (dateRange === 'custom' && customFrom) {
      q = q.gte('created_at', new Date(customFrom).toISOString())
      if (customTo) {
        const to = new Date(customTo); to.setHours(23,59,59,999)
        q = q.lte('created_at', to.toISOString())
      }
    }

    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    if (typeFilter   !== 'all') q = q.eq('order_type', typeFilter)

    const { data } = await q
    setOrders(data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase().trim()
    return orders.filter(o =>
      String(o.order_number).includes(q) ||
      (o.customer_name||'').toLowerCase().includes(q) ||
      (o.customer_phone||'').includes(q) ||
      (o.order_items||[]).some(i => (i.product_name||'').toLowerCase().includes(q))
    )
  }, [orders, search])

  const stats = useMemo(() => {
    const paid = filtered.filter(o => o.status === 'paid')
    const rev  = paid.reduce((s,o) => s + Number(o.total), 0)
    return {
      count:    filtered.length,
      paid:     paid.length,
      revenue:  rev,
      avg:      paid.length ? rev / paid.length : 0,
      refunded: filtered.filter(o => o.status==='refunded').length,
    }
  }, [filtered])

  async function refund(orderId) {
    if (!confirm('Mark this order as refunded?')) return
    await supabase.from('orders').update({ status:'refunded' }).eq('id', orderId)
    await load()
    setSelected(null)
    showToast('Order refunded', 'success')
  }

  function openOrder(o) {
    setSelected(s => s?.id === o.id ? null : o)
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize: 'var(--fs-16)',
            flex:1, color:'var(--text)' }}>Order History</h2>
          <button onClick={() => setShowFilters(f=>!f)}
            style={{ display:'flex', alignItems:'center', gap:5,
              background:showFilters?'var(--brand-lt)':'var(--card)',
              border:`1.5px solid ${showFilters?'rgba(168,217,200,0.7)':'var(--border)'}`,
              borderRadius:8, padding:'5px 10px', fontSize: 'var(--fs-12)', fontWeight:600,
              color:showFilters?'var(--brand)':'var(--text2)', cursor:'pointer' }}>
            ⚙ Filters {showFilters ? '▴' : '▾'}
          </button>
        </div>

        <div style={{ position:'relative', marginBottom:10 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
            fontSize: 'var(--fs-14)', color:'var(--text3)', pointerEvents:'none' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by order #, customer name, phone, or item…"
            style={{ width:'100%', padding:'8px 10px 8px 32px',
              background:'var(--card)', border:'1.5px solid var(--border)',
              borderRadius:8, color:'var(--text)', fontSize: 'var(--fs-13)', outline:'none',
              fontFamily:"'DM Sans'" }}/>
          {search && (
            <button onClick={()=>setSearch('')}
              style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', color:'var(--text3)',
                fontSize: 'var(--fs-16)', cursor:'pointer', lineHeight:1 }}>✕</button>
          )}
        </div>

        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom: showFilters ? 10 : 0 }}>
          {DATE_OPTS.map(d => (
            <button key={d.id} onClick={()=>setDateRange(d.id)}
              style={{ padding:'4px 10px', borderRadius:20, fontSize: 'var(--fs-11)', fontWeight:600,
                background:dateRange===d.id?'var(--brand-lt)':'none',
                border:`1.5px solid ${dateRange===d.id?'rgba(168,217,200,0.7)':'var(--border)'}`,
                color:dateRange===d.id?'var(--brand)':'var(--text2)', cursor:'pointer' }}>
              {d.label}
            </button>
          ))}
        </div>

        {dateRange==='custom' && (
          <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center', flexWrap:'wrap' }}>
            <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
              style={{ padding:'6px 10px', background:'var(--card)',
                border:'1.5px solid var(--border)', borderRadius:8,
                color:'var(--text)', fontSize: 'var(--fs-12)', outline:'none' }}/>
            <span style={{ fontSize: 'var(--fs-12)', color:'var(--text3)' }}>to</span>
            <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}
              style={{ padding:'6px 10px', background:'var(--card)',
                border:'1.5px solid var(--border)', borderRadius:8,
                color:'var(--text)', fontSize: 'var(--fs-12)', outline:'none' }}/>
          </div>
        )}

        {showFilters && (
          <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-10)', fontWeight:700, color:'var(--text3)',
                textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5 }}>Status</div>
              <div style={{ display:'flex', gap:4 }}>
                {['all','paid','completed','pending','refunded'].map(s => (
                  <button key={s} onClick={()=>setStatusFilter(s)}
                    style={{ padding:'3px 9px', borderRadius:20, fontSize: 'var(--fs-11)', fontWeight:600,
                      background:statusFilter===s?'var(--brand-lt)':'none',
                      border:`1.5px solid ${statusFilter===s?'rgba(168,217,200,0.7)':'var(--border)'}`,
                      color:statusFilter===s?'var(--brand)':'var(--text2)', cursor:'pointer' }}>
                    {s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-10)', fontWeight:700, color:'var(--text3)',
                textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5 }}>Type</div>
              <div style={{ display:'flex', gap:4 }}>
                {[['all','All'],['dine','Dine In'],['takeaway','Takeaway'],['delivery','Delivery']].map(([v,l]) => (
                  <button key={v} onClick={()=>setTypeFilter(v)}
                    style={{ padding:'3px 9px', borderRadius:20, fontSize: 'var(--fs-11)', fontWeight:600,
                      background:typeFilter===v?'var(--brand-lt)':'none',
                      border:`1.5px solid ${typeFilter===v?'rgba(168,217,200,0.7)':'var(--border)'}`,
                      color:typeFilter===v?'var(--brand)':'var(--text2)', cursor:'pointer' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          {[
            { label:'Orders',  val: filtered.length },
            { label:'Paid',    val: stats.paid },
            { label:'Revenue', val: `₹${stats.revenue.toFixed(0)}` },
            { label:'Avg',     val: `₹${stats.avg.toFixed(0)}` },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:'var(--card2)',
              borderRadius:8, padding:'7px 10px', border:'1px solid var(--border)',
              textAlign:'center' }}>
              <div style={{ fontSize: 'var(--fs-15)', fontWeight:800, color:'var(--text)',
                fontFamily:"'Plus Jakarta Sans'" }}>{s.val}</div>
              <div style={{ fontSize: 'var(--fs-10)', color:'var(--text3)', marginTop:1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Orders list ─────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:32 }}>
            <span className="spinner"/>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text2)' }}>
            <div style={{ fontSize: 'var(--fs-36)', marginBottom:8 }}>📋</div>
            <div style={{ fontSize: 'var(--fs-14)', fontWeight:600 }}>No orders found</div>
            <div style={{ fontSize: 'var(--fs-12)', color:'var(--text3)', marginTop:4 }}>
              Try adjusting your filters or search
            </div>
          </div>
        ) : filtered.map(o => {
          const st        = STATUS[o.status] || STATUS.pending
          const typeLabel = TYPE_LABEL[o.order_type]?.(o) || o.order_type
          const isSel     = selected?.id === o.id
          const itemCount = (o.order_items||[]).filter(i=>i.status!=='rejected').length
          return (
            <div key={o.id} onClick={() => openOrder(o)}
              style={{ display:'flex', alignItems:'center', gap:10,
                padding:'11px 14px', cursor:'pointer',
                background: isSel ? 'var(--brand-lt2)' : 'transparent',
                borderBottom:'1px solid var(--border)',
                borderLeft: isSel ? '3px solid var(--brand)' : '3px solid transparent',
                transition:'background 0.1s' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize: 'var(--fs-13)', color:'var(--text)' }}>
                    #{o.order_number}
                  </span>
                  <StatusBadge status={o.status}/>
                  <span style={{ fontSize: 'var(--fs-10)', color:'var(--text3)',
                    background:'var(--card)', border:'1px solid var(--border)',
                    padding:'1px 6px', borderRadius:5 }}>{typeLabel}</span>
                </div>
                <div style={{ fontSize: 'var(--fs-11)', color:'var(--text3)', marginTop:3,
                  display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span>{itemCount} item{itemCount!==1?'s':''}</span>
                  {o.customer_name  && <span>· {o.customer_name}</span>}
                  {o.customer_phone && !o.customer_name && <span>· {o.customer_phone}</span>}
                  <span>· {fmt(o.created_at)}</span>
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontWeight:700, color:'var(--brand)', fontSize: 'var(--fs-14)' }}>
                  ₹{Number(o.total).toFixed(2)}
                </div>
                <div style={{ fontSize: 'var(--fs-10)', color:'var(--text3)', marginTop:1 }}>
                  {o.payment_method==='upi'?'📱':o.payment_method==='cash'?'💵':'💳'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <OrderDetail
        order={selected}
        onClose={() => setSelected(null)}
        onRefund={refund}
        isMobile={isMobile}
      />
    </div>
  )
}