import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// Public invoice page — no auth needed
// URL: /invoice/:orderId

const L = {
  page: {
    minHeight:'100vh', background:'#F9F7F4',
    fontFamily:"'DM Sans',sans-serif", color:'#1A1208',
    display:'flex', flexDirection:'column', alignItems:'center',
    padding:'0 0 40px',
  },
  header: {
    width:'100%', background:'#fff', borderBottom:'1px solid #e8e4df',
    padding:'14px 5%', display:'flex', alignItems:'center',
    justifyContent:'space-between', position:'sticky', top:0, zIndex:10,
  },
  logo: { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800,
    fontSize: 'var(--fs-20)', color:'#1A1208', letterSpacing:'-0.5px' },
  card: {
    background:'#fff', border:'1px solid #e8e4df', borderRadius:16,
    width:'100%', maxWidth:480, margin:'24px auto 0',
    overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)',
    padding:'0 0 4px',
  },
  cardHead: {
    background:'#1A1208', padding:'24px',
    display:'flex', flexDirection:'column', gap:4,
  },
  row: { display:'flex', justifyContent:'space-between',
    padding:'9px 0', borderBottom:'1px solid #f0ebe6', fontSize: 'var(--fs-14)' },
  totalRow: { display:'flex', justifyContent:'space-between',
    padding:'12px 0 0', fontSize: 'var(--fs-16)', fontWeight:800 },
  metaRow: { display:'flex', justifyContent:'space-between',
    padding:'5px 0', fontSize: 'var(--fs-13)', color:'#7A6E65' },
  dlBtn: {
    background:'#E8440A', color:'#fff', border:'none',
    borderRadius:12, padding:'14px', fontWeight:700,
    fontSize: 'var(--fs-15)', cursor:'pointer', width:'100%',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  },
}

function fmtFull(iso) {
  return new Date(iso).toLocaleString('en-IN',{
    day:'numeric',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',hour12:true,
  })
}

export default function Invoice() {
  const [order, setOrder]     = useState(null)
  const [biz, setBiz]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const printRef = useRef()

  // Extract orderId from URL: /invoice/:id
  const orderId = window.location.pathname.split('/invoice/')[1]?.split('?')[0]

  useEffect(() => {
    if (!orderId) { setError('Invalid invoice link.'); setLoading(false); return }
    load()
  }, [orderId])

  async function load() {
    const { data:o, error:oErr } = await supabase
      .from('orders')
      .select('*, order_items(id,product_name,product_icon,qty,unit_price,status,notes)')
      .eq('id', orderId)
      .single()

    if (oErr || !o) { setError('Invoice not found.'); setLoading(false); return }
    setOrder(o)

    const { data:t } = await supabase
      .from('tenants')
      .select('biz_name,name,upi_id,address,phone')
      .eq('id', o.tenant_id)
      .single()
    setBiz(t)
    setLoading(false)
  }

  function downloadPDF() {
    window.print()
  }

  if (loading) return (
    <div style={{ ...L.page, alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ width:36,height:36,border:'3px solid rgba(232,68,10,0.2)',
        borderTopColor:'#E8440A',borderRadius:'50%',
        animation:'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ ...L.page, alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:32 }}>
        <div style={{ fontSize: 'var(--fs-40)', marginBottom:12 }}>🧾</div>
        <div style={{ fontSize: 'var(--fs-16)', fontWeight:700, color:'#1A1208', marginBottom:6 }}>
          {error}
        </div>
        <div style={{ fontSize: 'var(--fs-13)', color:'#7A6E65' }}>
          This link may have expired or the order doesn't exist.
        </div>
      </div>
    </div>
  )

  const activeItems = (order.order_items||[]).filter(i=>i.status!=='rejected')
  const bizName = biz?.biz_name || biz?.name || 'Restaurant'
  const typeLabel = order.order_type==='dine' ? `Dine In · Table ${order.table_number}`
    : order.order_type==='delivery' ? 'Delivery' : 'Takeaway'

  return (
    <div style={L.page}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media print {
          .no-print{display:none!important}
          body{background:#fff}
          .print-card{box-shadow:none!important;border:none!important;margin:0!important}
        }
      `}</style>

      {/* Nav */}
      <div style={L.header} className="no-print">
        <span style={L.logo}>BITE<span style={{ color:'#E8440A' }}>.</span></span>
        <span style={{ fontSize: 'var(--fs-12)', color:'#7A6E65' }}>Invoice</span>
      </div>

      {/* Invoice card */}
      <div style={{ padding:'0 16px', width:'100%', maxWidth:480 }}>
        <div style={L.card} ref={printRef} className="print-card">

          {/* Dark header */}
          <div style={L.cardHead}>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800,
              fontSize: 'var(--fs-22)', color:'#F5F0E8', letterSpacing:'-0.5px' }}>
              {bizName}
            </div>
            {biz?.address && (
              <div style={{ fontSize: 'var(--fs-12)', color:'rgba(245,240,232,0.5)' }}>{biz.address}</div>
            )}
            <div style={{ marginTop:10, display:'flex', justifyContent:'space-between',
              alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize: 'var(--fs-11)', color:'rgba(245,240,232,0.4)',
                  textTransform:'uppercase', letterSpacing:'0.5px' }}>Invoice</div>
                <div style={{ fontSize: 'var(--fs-24)', fontWeight:800, color:'#E8440A',
                  fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  #{order.order_number}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize: 'var(--fs-11)', color:'rgba(245,240,232,0.4)' }}>
                  {fmtFull(order.created_at)}
                </div>
                <div style={{ fontSize: 'var(--fs-11)', color:'rgba(245,240,232,0.5)', marginTop:2 }}>
                  {typeLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding:'16px 20px' }}>

            {/* Customer */}
            {(order.customer_name || order.customer_phone) && (
              <div style={{ marginBottom:12, padding:'10px 12px',
                background:'#f9f7f5', borderRadius:8,
                fontSize: 'var(--fs-13)', color:'#1A1208' }}>
                <div style={{ fontSize: 'var(--fs-10)', fontWeight:700, color:'#9A9290',
                  textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>
                  Bill To
                </div>
                {order.customer_name && <div style={{ fontWeight:600 }}>{order.customer_name}</div>}
                {order.customer_phone && <div style={{ color:'#7A6E65' }}>{order.customer_phone}</div>}
              </div>
            )}

            {/* Items */}
            <div style={{ fontSize: 'var(--fs-10)', fontWeight:700, color:'#9A9290',
              textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
              Items
            </div>
            {activeItems.map((item,i) => (
              <div key={item.id} style={{ ...L.row,
                borderBottom: i<activeItems.length-1 ? '1px solid #f0ebe6' : 'none' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500 }}>
                    {item.product_icon||'🍽'} {item.product_name}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: 'var(--fs-11)', color:'#E8440A', marginTop:2 }}>
                      📝 {item.notes}
                    </div>
                  )}
                  <div style={{ fontSize: 'var(--fs-12)', color:'#7A6E65' }}>
                    ₹{Number(item.unit_price).toFixed(2)} × {item.qty}
                  </div>
                </div>
                <div style={{ fontWeight:600, flexShrink:0, marginLeft:8 }}>
                  ₹{(Number(item.unit_price)*item.qty).toFixed(2)}
                </div>
              </div>
            ))}

            {/* Totals */}
            <div style={{ borderTop:'1px solid #e8e4df', marginTop:8, paddingTop:8 }}>
              <div style={L.metaRow}>
                <span>Subtotal</span>
                <span>₹{Number(order.subtotal||order.total).toFixed(2)}</span>
              </div>
              {Number(order.tax)>0 && (
                <div style={L.metaRow}>
                  <span>Tax</span>
                  <span>₹{Number(order.tax).toFixed(2)}</span>
                </div>
              )}
              <div style={L.totalRow}>
                <span>Total</span>
                <span style={{ color:'#E8440A' }}>₹{Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment */}
            <div style={{ marginTop:14, padding:'10px 12px',
              background:'#f9f7f5', borderRadius:8 }}>
              <div style={{ fontSize: 'var(--fs-10)', fontWeight:700, color:'#9A9290',
                textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>
                Payment
              </div>
              <div style={{ fontSize: 'var(--fs-13)', color:'#1A1208', fontWeight:600 }}>
                {order.payment_method==='cash' ? '💵 Cash'
                  : order.payment_method==='upi'  ? '📱 UPI'
                  : order.payment_method==='card' ? '💳 Card'
                  : '🔖 Other'}
                {' · '}
                <span style={{ color:'#22C55E', fontWeight:700 }}>Paid</span>
              </div>
            </div>

            {/* Thank you */}
            <div style={{ textAlign:'center', marginTop:16, padding:'12px 0 4px',
              borderTop:'1px solid #f0ebe6' }}>
              <div style={{ fontSize: 'var(--fs-18)', marginBottom:4 }}>🙏</div>
              <div style={{ fontSize: 'var(--fs-13)', fontWeight:600, color:'#1A1208' }}>
                Thank you for visiting us!
              </div>
              <div style={{ fontSize: 'var(--fs-11)', color:'#9A9290', marginTop:2 }}>
                Powered by BITE. POS
              </div>
            </div>
          </div>
        </div>

        {/* Download button */}
        <div style={{ marginTop:16 }} className="no-print">
          <button onClick={downloadPDF} style={L.dlBtn}>
            <span>⬇</span> Download PDF
          </button>
        </div>

        {/* UPI pay button */}
        {biz?.upi_id && order.payment_method==='upi' && (
          <div style={{ marginTop:10 }} className="no-print">
            <a href={`upi://pay?pa=${biz.upi_id}&pn=${encodeURIComponent(bizName)}&am=${order.total}&cu=INR&tn=Order${order.order_number}`}
              style={{ ...L.dlBtn, background:'#075E54', textDecoration:'none',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <span>📱</span> Pay via UPI
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
