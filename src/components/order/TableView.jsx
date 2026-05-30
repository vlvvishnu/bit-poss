import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

// Active table card
function TableCard({ table, onClick }) {
  const age = table.created_at
    ? Math.floor((Date.now() - new Date(table.created_at)) / 60000)
    : 0

  const statusColor = {
    pending:   '#F59E0B',
    preparing: '#3B82F6',
    ready:     '#22C55E',
    paid:      '#6B7280',
  }[table.status] || '#F59E0B'

  return (
    <button onClick={onClick} style={{
      background: 'var(--card)', border: `2px solid ${statusColor}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
      textAlign: 'left', transition: 'all 0.15s', display: 'flex',
      flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 'var(--fs-16)' }}>
          {table.table_name}
        </span>
        <span style={{ fontSize: 'var(--fs-10)', fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background: `${statusColor}20`, color: statusColor }}>
          {table.status}
        </span>
      </div>
      <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text2)' }}>
        {table.item_count} item{table.item_count !== 1 ? 's' : ''} · {age}m ago
      </div>
      <div style={{ fontSize: 'var(--fs-14)', fontWeight: 700, color: 'var(--brand)' }}>
        ₹{Number(table.total).toFixed(2)}
      </div>
    </button>
  )
}

export default function TableView({ onOpenTable }) {
  const { tenantId, settings } = useStore()
  const [activeTables, setActiveTables] = useState([])
  const [loading, setLoading] = useState(true)

  const tableCount = settings?.table_count || 10
  const allTables = Array.from({ length: tableCount }, (_, i) => ({
    num: i + 1, name: `T${i + 1}`
  }))

  useEffect(() => {
    if (!tenantId) return
    loadActiveTables()
    // Subscribe to realtime updates
    const sub = supabase.channel('active-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders',
        filter: `tenant_id=eq.${tenantId}` }, loadActiveTables)
      .subscribe()
    return () => sub.unsubscribe()
  }, [tenantId])

  async function loadActiveTables() {
    const { data } = await supabase
      .from('orders')
      .select('id, table_number, status, total, created_at, order_items(id)')
      .eq('tenant_id', tenantId)
      .eq('order_type', 'dine')
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true })

    const tableMap = {}
    ;(data || []).forEach(o => {
      const tn = o.table_number
      if (!tableMap[tn]) {
        tableMap[tn] = {
          table_number: tn,
          table_name: `Table ${tn}`,
          order_id: o.id,
          status: o.status,
          total: Number(o.total),
          item_count: (o.order_items || []).length,
          created_at: o.created_at,
        }
      } else {
        // Multiple orders for same table — add up
        tableMap[tn].total += Number(o.total)
        tableMap[tn].item_count += (o.order_items || []).length
      }
    })

    setActiveTables(Object.values(tableMap))
    setLoading(false)
  }

  const activeNums = new Set(activeTables.map(t => t.table_number))

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 700, fontSize: 'var(--fs-14)' }}>
          🍽 Active Tables
        </h3>
        <span style={{ fontSize: 'var(--fs-11)', color: 'var(--text3)' }}>
          {activeTables.length} of {tableCount} occupied
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {allTables.map(t => {
            const active = activeTables.find(a => String(a.table_number) === String(t.num))
            if (active) {
              return (
                <TableCard
                  key={t.num}
                  table={active}
                  onClick={() => onOpenTable(active)}
                />
              )
            }
            return (
              <button key={t.num} onClick={() => onOpenTable({ table_number: String(t.num), table_name: `Table ${t.num}`, isNew: true })}
                style={{
                  background: 'var(--card)', border: '1.5px dashed var(--border)',
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  textAlign: 'left', opacity: 0.6,
                }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 700, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>Table {t.num}</div>
                <div style={{ fontSize: 'var(--fs-11)', color: 'var(--text2)', marginTop: 4 }}>Available</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
