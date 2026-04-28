import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

function fmt(iso) {
  const d = new Date(iso), now = new Date()
  const diff = (now - d) / 60000
  if (diff < 1)   return 'just now'
  if (diff < 60)  return `${Math.floor(diff)}m ago`
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const STATUS_STYLE = {
  paid:      { bg: 'rgba(34,197,94,0.1)',   color: '#22C55E' },
  pending:   { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B' },
  refunded:  { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
  preparing: { bg: 'rgba(59,130,246,0.1)',  color: '#3B82F6' },
  ready:     { bg: 'rgba(34,197,94,0.1)',   color: '#22C55E' },
}

export default function HistoryPage() {
  const { tenantId, showToast } = useStore()
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [dateRange, setDateRange] = useState('today')

  const dateOptions = [
    { id: 'today',   label: 'Today'      },
    { id: 'week',    label: 'This week'  },
    { id: 'month',   label: 'This month' },
    { id: 'all',     label: 'All time'   },
  ]

  useEffect(() => { if (tenantId) loadOrders() }, [tenantId, dateRange])

  async function loadOrders() {
    setLoading(true)
    let q = supabase
      .from('orders')
      .select('*, order_items(id,product_name,product_icon,qty,unit_price,line_total)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    const now = new Date()
    if (dateRange === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      q = q.gte('created_at', start.toISOString())
    } else if (dateRange === 'week') {
      const start = new Date(now); start.setDate(start.getDate() - 7)
      q = q.gte('created_at', start.toISOString())
    } else if (dateRange === 'month') {
      const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0)
      q = q.gte('created_at', start.toISOString())
    }

    const { data } = await q
    setOrders(data || [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    const paid = orders.filter(o => o.status === 'paid')
    return {
      count:   paid.length,
      revenue: paid.reduce((s, o) => s + Number(o.total), 0),
      avg:     paid.length ? paid.reduce((s, o) => s + Number(o.total), 0) / paid.length : 0,
    }
  }, [orders])

  async function refund(orderId) {
    if (!confirm('Mark this order as refunded?')) return
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId)
    await loadOrders()
    setSelected(null)
    showToast('Order refunded', 'success')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 16, flex: 1 }}>History</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {dateOptions.map(d => (
              <button key={d.id} onClick={() => setDateRange(d.id)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: dateRange === d.id ? 'var(--brand-lt)' : 'none',
                  border: `1.5px solid ${dateRange === d.id ? 'rgba(232,68,10,0.3)' : 'var(--border)'}`,
                  color: dateRange === d.id ? 'var(--brand)' : 'var(--text2)',
                  cursor: 'pointer',
                }}>{d.label}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Orders', val: stats.count },
            { label: 'Revenue', val: `₹${stats.revenue.toFixed(0)}` },
            { label: 'Avg order', val: `₹${stats.avg.toFixed(0)}` },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--card2)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders list + detail side by side */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div>No orders in this period.</div>
            </div>
          ) : orders.map(o => {
            const st = STATUS_STYLE[o.status] || STATUS_STYLE.pending
            const typeLabel = o.order_type === 'dine' ? `T${o.table_number || '?'}` : o.order_type === 'takeaway' ? 'T/A' : 'Stall'
            return (
              <div key={o.id} onClick={() => setSelected(selected?.id === o.id ? null : o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', cursor: 'pointer',
                  background: selected?.id === o.id ? 'var(--card2)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>#{o.order_number}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: st.bg, color: st.color,
                    }}>{o.status}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--card)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 4 }}>{typeLabel}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {o.customer_name || o.customer_phone || 'Guest'} · {fmt(o.created_at)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 14, flexShrink: 0 }}>
                  ₹{Number(o.total).toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{
            width: 280, borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Order #{selected.order_number}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              {/* Items */}
              {(selected.order_items || []).map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                  <span>{i.product_icon} {i.product_name} ×{i.qty}</span>
                  <span style={{ color: 'var(--brand)', fontWeight: 600 }}>₹{Number(i.line_total).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontWeight: 800, fontSize: 14 }}>
                <span>Total</span>
                <span style={{ color: 'var(--brand)' }}>₹{Number(selected.total).toFixed(2)}</span>
              </div>
              {/* Meta */}
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selected.customer_name  && <span>👤 {selected.customer_name}</span>}
                {selected.customer_phone && <span>📞 {selected.customer_phone}</span>}
                {selected.customer_email && <span>✉️ {selected.customer_email}</span>}
                <span>💳 {selected.payment_method || 'unknown'}</span>
                <span>🕐 {new Date(selected.created_at).toLocaleString('en-IN')}</span>
              </div>
            </div>
            {selected.status === 'paid' && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <button onClick={() => refund(selected.id)} style={{
                  width: '100%', background: 'var(--red-bg)', color: 'var(--red)',
                  border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
                  padding: '8px', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}>Refund this order</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
