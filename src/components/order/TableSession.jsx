import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

// Add items panel — shows menu to add more to the table
function AddItemsPanel({ tableNum, orderId, tenantId, onAdded, onClose }) {
  const { categories, products, settings } = useStore()
  const [activeCat, setActiveCat] = useState('all')
  const [selected, setSelected] = useState({})   // { productId: { ...product, qty, note } }
  const [note, setNote] = useState('')            // global note for this round
  const [saving, setSaving] = useState(false)
  const { showToast } = useStore()

  const filtered = activeCat === 'all' ? products
    : products.filter(p => String(p.category_id) === activeCat)

  function toggle(p) {
    setSelected(prev => {
      const s = { ...prev }
      if (s[p.id]) {
        if (s[p.id].qty === 1) delete s[p.id]
        else s[p.id] = { ...s[p.id], qty: s[p.id].qty - 1 }
      } else {
        s[p.id] = { ...p, qty: 1, note: '' }
      }
      return s
    })
  }

  function inc(p) {
    setSelected(prev => ({
      ...prev,
      [p.id]: { ...(prev[p.id] || { ...p, qty: 0 }), qty: (prev[p.id]?.qty || 0) + 1, note: prev[p.id]?.note || '' }
    }))
  }

  async function sendToKitchen() {
    const items = Object.values(selected)
    if (!items.length) return
    setSaving(true)
    try {
      let targetOrderId = orderId

      // If no existing order, create one
      if (!targetOrderId) {
        const sub = items.reduce((s, i) => s + i.price * i.qty, 0)
        const tax = sub * ((settings?.tax_rate || 0) / 100)
        const { data: order, error } = await supabase.from('orders').insert({
          tenant_id:    tenantId,
          status:       'pending',
          order_type:   'dine',
          table_number: String(tableNum),
          subtotal:     sub.toFixed(2),
          tax:          tax.toFixed(2),
          total:        (sub + tax).toFixed(2),
        }).select('id').single()
        if (error) throw error
        targetOrderId = order.id
      }

      // Insert items
      const { error: iErr } = await supabase.from('order_items').insert(
        items.map(i => ({
          tenant_id:    tenantId,
          order_id:     targetOrderId,
          product_id:   i.id,
          product_name: i.name,
          product_icon: i.icon || '',
          unit_price:   Number(i.price),
          qty:          i.qty,
          status:       'active',
          notes:        i.note || note || null,
        }))
      )
      if (iErr) throw iErr

      // Update order total if existing
      if (orderId) {
        const addedTotal = items.reduce((s, i) => s + i.price * i.qty, 0)
        const taxAmt = addedTotal * ((settings?.tax_rate || 0) / 100)
        await supabase.rpc('increment_order_total', {
          order_id: orderId,
          add_subtotal: addedTotal,
          add_tax: taxAmt,
          add_total: addedTotal + taxAmt,
        }).catch(() => {}) // best effort — totals recalculated at checkout
      }

      showToast('Items sent to kitchen! 🍳', 'success')
      onAdded(targetOrderId)
    } catch (e) {
      showToast(e.message || 'Error', 'error')
    }
    setSaving(false)
  }

  const totalSelected = Object.values(selected).reduce((s, i) => s + i.qty, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
      {/* Cat strip */}
      <div style={{ display: 'flex', gap: 6, padding: '0 0 10px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {[{ id: 'all', name: 'All', icon: '' }, ...categories].map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(String(cat.id))} style={{
            flexShrink: 0, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
            background: activeCat === String(cat.id) ? 'var(--brand-lt)' : 'none',
            border: `1.5px solid ${activeCat === String(cat.id) ? 'rgba(168,217,200,0.7)' : 'var(--border)'}`,
            color: activeCat === String(cat.id) ? 'var(--brand)' : 'var(--text2)',
            fontSize: 'var(--fs-12)', fontWeight: 600, cursor: 'pointer',
          }}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      {/* Products */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(p => {
          const sel = selected[p.id]
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: sel ? 'var(--brand-lt2)' : 'var(--card2)',
              border: `1.5px solid ${sel ? 'rgba(168,217,200,0.5)' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 10px',
            }}>
              <span style={{ fontSize: 'var(--fs-18)' }}>{p.icon || '🍽'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-13)', fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 'var(--fs-11)', color: 'var(--brand)', fontWeight: 600 }}>₹{Number(p.price).toFixed(2)}</div>
              </div>
              {sel && (
                <input
                  value={sel.note || ''}
                  onChange={e => setSelected(prev => ({ ...prev, [p.id]: { ...prev[p.id], note: e.target.value } }))}
                  placeholder="Note for kitchen..."
                  style={{ fontSize: 'var(--fs-11)', padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', width: 130 }}
                  onClick={e => e.stopPropagation()}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {sel && (
                  <>
                    <button onClick={() => toggle(p)} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 'var(--fs-13)', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{sel.qty}</span>
                  </>
                )}
                <button onClick={() => inc(p)} disabled={p.out_of_stock} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: sel ? 'var(--brand)' : 'var(--card)',
                  border: sel ? 'none' : '1px solid var(--border)',
                  color: sel ? '#fff' : 'var(--text)', cursor: p.out_of_stock ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-14)',
                }}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Global note */}
      <div style={{ paddingTop: 10, flexShrink: 0 }}>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="Note for entire round (e.g. no onions)..."
          style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1.5px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 'var(--fs-13)', outline: 'none' }} />
      </div>

      {/* Send button */}
      <button onClick={sendToKitchen} disabled={saving || !totalSelected} style={{
        marginTop: 10, background: totalSelected ? 'var(--brand)' : 'var(--card2)',
        color: totalSelected ? '#fff' : 'var(--text3)',
        border: 'none', borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: 'var(--fs-14)',
        cursor: totalSelected ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        {saving && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />}
        {totalSelected ? `🍳 Send ${totalSelected} item${totalSelected !== 1 ? 's' : ''} to Kitchen` : 'Select items to add'}
      </button>
    </div>
  )
}

// Main table session view
export default function TableSession({ table, onClose, onCheckout }) {
  const { tenantId, settings, showToast } = useStore()
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [addOpen, setAddOpen]   = useState(false)
  const [rejecting, setRejecting] = useState(null)  // item being rejected

  const tableLabel = table.table_name || `Table ${table.table_number}`

  useEffect(() => {
    if (!tenantId || !table.table_number) return
    loadOrders()
    const sub = supabase.channel(`table-${table.table_number}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, loadOrders)
      .subscribe()
    return () => sub.unsubscribe()
  }, [tenantId, table.table_number])

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(id, product_name, product_icon, qty, unit_price, status, notes)')
      .eq('tenant_id', tenantId)
      .eq('order_type', 'dine')
      .eq('table_number', String(table.table_number))
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true })
    setOrders(data || [])
    setLoading(false)
  }

  async function rejectItem(item, orderId) {
    await supabase.from('order_items').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('kot_rejections').insert({
      tenant_id: tenantId, order_id: orderId,
      item_id: item.id, item_name: item.product_name,
      reason: 'unavailable',
    })
    setRejecting(null)
    showToast(`"${item.product_name}" removed`, 'info')
    loadOrders()
  }

  async function handleCheckout() {
    // Calculate final bill excluding rejected items
    const activeItems = orders.flatMap(o =>
      (o.order_items || []).filter(i => i.status !== 'rejected')
        .map(i => ({ ...i, order_id: o.id }))
    )
    const taxRate = (settings?.tax_rate || 0) / 100
    const sub = activeItems.reduce((s, i) => s + Number(i.unit_price) * i.qty, 0)
    const tax = sub * taxRate
    const total = sub + tax
    onCheckout({ orders, activeItems, sub, tax, total, tableLabel, tableNumber: table.table_number })
  }

  const allItems = orders.flatMap(o =>
    (o.order_items || []).map(i => ({ ...i, order_id: o.id, orderStatus: o.status }))
  )
  const activeItems  = allItems.filter(i => i.status !== 'rejected')
  const rejectedItems = allItems.filter(i => i.status === 'rejected')
  const taxRate = (settings?.tax_rate || 0) / 100
  const sub = activeItems.reduce((s, i) => s + Number(i.unit_price) * i.qty, 0)
  const total = sub + sub * taxRate
  const primaryOrderId = orders[0]?.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 'var(--fs-18)' }}>{tableLabel}</div>
          <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text2)' }}>{activeItems.length} active items · ₹{total.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setAddOpen(true)} style={{
            background: 'var(--brand)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 'var(--fs-13)', cursor: 'pointer',
          }}>+ Add Items</button>
          {activeItems.length > 0 && (
            <button onClick={handleCheckout} style={{
              background: 'var(--green)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 'var(--fs-13)', cursor: 'pointer',
            }}>Checkout →</button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', padding: '8px 12px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : allItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text2)' }}>
            <div style={{ fontSize: 'var(--fs-32)', marginBottom: 8 }}>🍽</div>
            <div>No items yet. Tap + Add Items to start.</div>
          </div>
        ) : (
          <>
            {/* Active items */}
            {activeItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 'var(--fs-11)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Active Items
                </div>
                {activeItems.map(item => {
                  const statusColor = { pending: '#F59E0B', preparing: '#3B82F6', ready: '#22C55E' }[item.orderStatus] || '#F59E0B'
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', marginBottom: 5,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 8, borderLeft: `3px solid ${statusColor}`,
                    }}>
                      <span style={{ fontSize: 'var(--fs-18)' }}>{item.product_icon || '🍽'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--fs-13)', fontWeight: 500 }}>
                          {item.product_name}
                          <span style={{ marginLeft: 6, fontSize: 'var(--fs-12)', color: 'var(--text3)' }}>×{item.qty}</span>
                        </div>
                        {item.notes && <div style={{ fontSize: 'var(--fs-11)', color: 'var(--amber)', marginTop: 2 }}>📝 {item.notes}</div>}
                        <div style={{ fontSize: 'var(--fs-10)', color: statusColor, fontWeight: 600, marginTop: 2 }}>{item.orderStatus}</div>
                      </div>
                      <div style={{ fontSize: 'var(--fs-13)', fontWeight: 600, color: 'var(--brand)', flexShrink: 0 }}>
                        ₹{(Number(item.unit_price) * item.qty).toFixed(2)}
                      </div>
                      <button onClick={() => setRejecting({ item, orderId: item.order_id })}
                        title="Remove item"
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--red)', padding: '3px 7px', fontSize: 'var(--fs-11)', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Rejected items */}
            {rejectedItems.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--fs-11)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Removed / Unavailable
                </div>
                {rejectedItems.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', marginBottom: 5, opacity: 0.45,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 8, textDecoration: 'line-through',
                  }}>
                    <span style={{ fontSize: 'var(--fs-16)' }}>{item.product_icon || '🍽'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--fs-12)' }}>{item.product_name} ×{item.qty}</div>
                    </div>
                    <div style={{ fontSize: 'var(--fs-11)', color: 'var(--red)' }}>removed</div>
                  </div>
                ))}
              </div>
            )}

            {/* Bill summary */}
            {activeItems.length > 0 && (
              <div style={{ marginTop: 12, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-12)', color: 'var(--text2)', marginBottom: 3 }}>
                  <span>Subtotal</span><span>₹{sub.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-12)', color: 'var(--text2)', marginBottom: 3 }}>
                    <span>Tax ({settings?.tax_rate}%)</span><span>₹{(sub * taxRate).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-15)', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 3 }}>
                  <span>Total</span><span style={{ color: 'var(--brand)' }}>₹{total.toFixed(2)}</span>
                </div>
                {rejectedItems.length > 0 && (
                  <div style={{ fontSize: 'var(--fs-11)', color: 'var(--text3)', marginTop: 4 }}>
                    * Excludes {rejectedItems.length} removed item{rejectedItems.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm reject modal */}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Remove Item"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setRejecting(null)} style={{ flex: 1, background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => rejectItem(rejecting.item, rejecting.orderId)} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
          </div>
        }>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 'var(--fs-32)', marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Remove "{rejecting?.item?.product_name}"?</div>
          <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text2)', lineHeight: 1.6 }}>
            This will mark the item as unavailable and remove it from the final bill. The kitchen will be notified.
          </div>
        </div>
      </Modal>

      {/* Add items modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Add to ${tableLabel}`} maxWidth={520}>
        <AddItemsPanel
          tableNum={table.table_number}
          orderId={primaryOrderId}
          tenantId={tenantId}
          onAdded={(newOrderId) => { setAddOpen(false); loadOrders() }}
          onClose={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  )
}
