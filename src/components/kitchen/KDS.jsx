import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

function tableColor(status) {
  return { pending: '#F59E0B', preparing: '#3B82F6', ready: '#22C55E' }[status] || '#F59E0B'
}

function OrderCard({ order, onStatusChange, rejectItemInOrder }) {
  const age = Math.floor((Date.now() - new Date(order.created_at)) / 60000)
  const ageColor = age > 20 ? '#EF4444' : age > 10 ? '#F59E0B' : 'var(--text3)'
  const activeItems = (order.order_items || []).filter(i => i.status !== 'rejected')
  const rejectedItems = (order.order_items || []).filter(i => i.status === 'rejected')
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:8 }}>
      <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between',
        background: order.status==='pending' ? 'rgba(245,158,11,0.06)' : order.status==='preparing' ? 'rgba(59,130,246,0.06)' : 'rgba(34,197,94,0.06)' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:13 }}>#{order.order_number} · Table {order.table_number}</div>
          <div style={{ fontSize:10, color:ageColor, fontWeight:600 }}>{age}m ago</div>
        </div>
        {order.status==='pending' && <button onClick={() => onStatusChange(order.id,'preparing')} style={{ background:'#3B82F6', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>🔥 Start</button>}
        {order.status==='preparing' && <button onClick={() => onStatusChange(order.id,'ready')} style={{ background:'#22C55E', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>✅ Ready</button>}
        {order.status==='ready' && <span style={{ fontSize:11, color:'#22C55E', fontWeight:700 }}>Waiting for waiter</span>}
      </div>
      <div style={{ padding:'6px 10px' }}>
        {activeItems.map(item => (
          <div key={item.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', fontSize:12, borderBottom:'1px solid var(--border)' }}>
            <span>{item.product_icon}</span>
            <span style={{ flex:1 }}>{item.product_name}</span>
            <span style={{ fontWeight:700, color:'var(--brand)', marginRight:4 }}>×{item.qty}</span>
            <button onClick={() => rejectItemInOrder(item, order.id)}
              style={{ fontSize:10, padding:'1px 7px', background:'rgba(239,68,68,0.08)',
                color:'var(--red)', border:'1px solid rgba(239,68,68,0.2)',
                borderRadius:5, cursor:'pointer', flexShrink:0 }}>
              reject
            </button>
          </div>
        ))}
        {activeItems.filter(i => i.notes).map(i => (
          <div key={i.id+'n'} style={{ fontSize:11, color:'var(--amber)', padding:'2px 0' }}>📝 {i.product_name}: {i.notes}</div>
        ))}
        {rejectedItems.length > 0 && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>⚠ {rejectedItems.length} unavailable</div>}
      </div>
    </div>
  )
}

function ItemSummaryCard({ itemName, icon, entries, onReject, onRestore }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:8 }}>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, background:'var(--card2)' }}>
        <span style={{ fontSize:20 }}>{icon||'🍽'}</span>
        <span style={{ fontWeight:700, fontSize:14 }}>{itemName}</span>
        <span style={{ marginLeft:'auto', background:'var(--brand)', color:'#fff', fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:10 }}>
          ×{entries.reduce((s,e) => s+e.qty, 0)}
        </span>
      </div>
      {entries.map(e => (
        <div key={e.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderBottom:'1px solid var(--border)',
          opacity: e.status==='rejected' ? 0.4 : 1, textDecoration: e.status==='rejected' ? 'line-through' : 'none',
          background: e.status==='rejected' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:6, background:`${tableColor(e.orderStatus)}20`, color:tableColor(e.orderStatus) }}>
            T{e.tableLabel}
          </span>
          <span style={{ fontSize:12, color:'var(--text2)' }}>×{e.qty}</span>
          {e.notes && <span style={{ fontSize:11, color:'var(--amber)', flex:1 }}>📝 {e.notes}</span>}
          {e.status==='rejected'
            ? <button onClick={() => onRestore(e)} style={{ fontSize:10, padding:'2px 8px', background:'var(--green-bg)', color:'var(--green)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, cursor:'pointer' }}>Restore</button>
            : <button onClick={() => onReject(e)} style={{ fontSize:10, padding:'2px 8px', background:'rgba(239,68,68,0.08)', color:'var(--red)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:6, cursor:'pointer', marginLeft:'auto' }}>Unavail</button>
          }
        </div>
      ))}
    </div>
  )
}

export default function KDS() {
  const { tenantId, showToast } = useStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')

  useEffect(() => {
    if (!tenantId) return
    load()
    const sub = supabase.channel('kds-ch')
      .on('postgres_changes', { event:'*', schema:'public', table:'orders', filter:`tenant_id=eq.${tenantId}` }, load)
      .on('postgres_changes', { event:'*', schema:'public', table:'order_items' }, load)
      .subscribe()
    return () => sub.unsubscribe()
  }, [tenantId])

  async function load() {
    const { data } = await supabase.from('orders')
      .select('*, order_items(id,product_name,product_icon,qty,unit_price,status,notes)')
      .eq('tenant_id', tenantId)
      .in('status', ['pending','preparing','ready'])
      .order('created_at', { ascending:true })
    setOrders(data||[])
    setLoading(false)
  }

  async function updateStatus(orderId, status) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    showToast(status==='preparing' ? '🔥 Order started' : '✅ Order ready!', 'success')
    load()
  }

  async function rejectItem(item) {
    await supabase.from('order_items').update({ status:'rejected', rejected_at:new Date().toISOString() }).eq('id', item.id)
    showToast(`"${item.product_name}" unavailable`, 'info')
    load()
  }

  async function restoreItem(item) {
    await supabase.from('order_items').update({ status:'active', rejected_at:null }).eq('id', item.id)
    load()
  }

  async function rejectItemInOrder(item, orderId) {
    await supabase.from('order_items')
      .update({ status:'rejected', rejected_at:new Date().toISOString() })
      .eq('id', item.id)
    showToast(`"${item.product_name}" rejected`, 'info')
    load()
  }

  const pending   = orders.filter(o => o.status==='pending')
  const preparing = orders.filter(o => o.status==='preparing')
  const ready     = orders.filter(o => o.status==='ready')

  const itemGroups = {}
  orders.forEach(o => (o.order_items||[]).forEach(i => {
    if (!itemGroups[i.product_name]) itemGroups[i.product_name] = { itemName:i.product_name, icon:i.product_icon||'🍽', entries:[] }
    itemGroups[i.product_name].entries.push({ ...i, tableLabel:o.table_number, orderStatus:o.status })
  }))

  const cols = [
    { label:'⏳ Pending',   color:'#F59E0B', bg:'rgba(245,158,11,0.06)',  items:pending },
    { label:'🔥 Preparing', color:'#3B82F6', bg:'rgba(59,130,246,0.06)',  items:preparing },
    { label:'✅ Ready',      color:'#22C55E', bg:'rgba(34,197,94,0.06)',   items:ready },
  ]

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize:16, flex:1 }}>🍳 Kitchen Display</h2>
        <button onClick={load} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:12, color:'var(--text2)', cursor:'pointer' }}>↻</button>
        <div style={{ display:'flex', background:'var(--card2)', borderRadius:8, padding:2, gap:2 }}>
          {[['kanban','By Order'],['items','By Item']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{ background:view===v?'var(--card)':'transparent', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:view===v?600:400, color:view===v?'var(--text)':'var(--text2)', cursor:'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:32 }}><span className="spinner" /></div>
      : view==='kanban' ? (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, padding:12, overflow:'auto' }}>
          {cols.map(col => (
            <div key={col.label}>
              <div style={{ padding:'6px 10px', borderRadius:8, background:col.bg, border:`1px solid ${col.color}30`, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, fontWeight:700, color:col.color }}>{col.label}</span>
                <span style={{ fontSize:11, color:col.color, fontWeight:600 }}>{col.items.length}</span>
              </div>
              {col.items.length===0
                ? <div style={{ textAlign:'center', padding:20, color:'var(--text3)', fontSize:12 }}>Empty</div>
                : col.items.map(o => <OrderCard key={o.id} order={o} onStatusChange={updateStatus} rejectItemInOrder={rejectItemInOrder} />)
              }
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex:1, overflowY:'auto', padding:12 }}>
          {Object.keys(itemGroups).length===0
            ? <div style={{ textAlign:'center', padding:40, color:'var(--text2)' }}><div style={{ fontSize:32, marginBottom:8 }}>✅</div><div>All clear</div></div>
            : Object.values(itemGroups).map(g => <ItemSummaryCard key={g.itemName} {...g} onReject={rejectItem} onRestore={restoreItem} />)
          }
        </div>
      )}
    </div>
  )
}
