import React, { useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

const ICONS = ['🍔','🍗','🌯','🍟','🥗','🍕','🌮','🥩','🌭','🥪','🍜','🍝','🍛','🥘','🍲',
               '🧆','🥙','🫔','🧅','🧀','🍳','🥚','🥓','🥞','🧇','🥐','🍞','🥖','🥨',
               '🧁','🍩','🍪','🎂','🍰','🍫','🍬','🍭','🍮','🍯','🍵','☕','🍺','🥤',
               '🧃','🥛','🍶','🍷','🍸','🧋','🧉','🍹']

function ProductEditor({ product, onSave, onClose }) {
  const { categories, tenantId } = useStore()
  const [name, setName]         = useState(product?.name || '')
  const [price, setPrice]       = useState(product?.price || '')
  const [catId, setCatId]       = useState(product?.category_id || '')
  const [icon, setIcon]         = useState(product?.icon || '🍽')
  const [oos, setOos]           = useState(product?.out_of_stock || false)
  const [ingredients, setIngr]  = useState((product?.ingredients || []).join(', '))
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  async function save(e) {
    e.preventDefault()
    if (!name || !price) { setErr('Name and price are required'); return }
    setLoading(true); setErr('')
    const row = {
      tenant_id:    tenantId,
      name, price: Number(price),
      category_id:  catId || null,
      icon, out_of_stock: oos,
      ingredients:  ingredients.split(',').map(s => s.trim()).filter(Boolean),
    }
    const { error } = product?.id
      ? await supabase.from('products').update(row).eq('id', product.id)
      : await supabase.from('products').insert(row)
    setLoading(false)
    if (error) { setErr(error.message); return }
    onSave()
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Icon picker */}
      <div>
        <div style={{ fontSize: 'var(--fs-11)', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
          Icon — selected: <span style={{ fontSize: 'var(--fs-20)' }}>{icon}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 100, overflowY: 'auto' }}>
          {ICONS.map(ic => (
            <button key={ic} type="button" onClick={() => setIcon(ic)}
              style={{
                fontSize: 'var(--fs-18)', padding: '4px 6px', border: `2px solid ${icon === ic ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 6, background: icon === ic ? 'var(--brand-lt)' : 'transparent', cursor: 'pointer',
              }}>{ic}</button>
          ))}
        </div>
      </div>

      <Field label="Name *">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Classic Smash Burger" required style={iS} />
      </Field>
      <Field label="Price (₹) *">
        <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="249" required style={iS} />
      </Field>
      <Field label="Category">
        <select value={catId} onChange={e => setCatId(e.target.value)} style={iS}>
          <option value="">— None —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </Field>
      <Field label="Ingredients (comma separated, optional)">
        <input value={ingredients} onChange={e => setIngr(e.target.value)} placeholder="Beef patty, Cheese, Lettuce" style={iS} />
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-13)', cursor: 'pointer' }}>
        <input type="checkbox" checked={oos} onChange={e => setOos(e.target.checked)} />
        Mark as out of stock
      </label>

      {err && <div style={{ color: 'var(--red)', fontSize: 'var(--fs-12)' }}>{err}</div>}

      <button type="submit" disabled={loading} style={{
        background: 'var(--brand)', color: '#fff', border: 'none',
        borderRadius: 8, padding: '11px', fontWeight: 700, fontSize: 'var(--fs-14)',
        cursor: 'pointer',
      }}>
        {loading ? 'Saving…' : product?.id ? 'Save Changes' : 'Add Product'}
      </button>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 'var(--fs-11)', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
      {children}
    </label>
  )
}

const iS = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg)', border: '1.5px solid var(--border2)',
  borderRadius: 8, color: 'var(--text)', fontSize: 'var(--fs-13)',
  outline: 'none', fontFamily: "'DM Sans'",
}

export default function ProductsPage() {
  const { products, categories, tenantId, setProducts, showToast } = useStore()
  const [catFilter, setCatFilter]   = useState('all')
  const [selected, setSelected]     = useState(new Set())
  const [editing, setEditing]       = useState(null)   // null | 'new' | product obj
  const [loading, setLoading]       = useState(false)

  const filtered = useMemo(() =>
    catFilter === 'all' ? products : products.filter(p => String(p.category_id) === catFilter),
    [products, catFilter]
  )

  async function reload() {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name,icon)')
      .eq('tenant_id', tenantId)
      .order('sort_order')
    setProducts((data || []).map(p => ({ ...p, catName: p.categories?.name || '', catIcon: p.categories?.icon || '' })))
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    await reload()
    showToast('Product deleted', 'success')
  }

  async function deleteSelected() {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} product(s)?`)) return
    setLoading(true)
    await supabase.from('products').delete().in('id', Array.from(selected)).eq('tenant_id', tenantId)
    setSelected(new Set())
    await reload()
    setLoading(false)
    showToast(`${selected.size} products deleted`, 'success')
  }

  async function toggleOOS(product) {
    await supabase.from('products').update({ out_of_stock: !product.out_of_stock }).eq('id', product.id)
    await reload()
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 'var(--fs-16)', flex: 1 }}>Products</h2>
        {selected.size > 0 && (
          <button onClick={deleteSelected} disabled={loading} style={{
            background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '6px 14px', fontWeight: 600, fontSize: 'var(--fs-12)',
          }}>
            🗑 Delete {selected.size} selected
          </button>
        )}
        <button onClick={() => setEditing('new')} style={{
          background: 'var(--brand)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: 'var(--fs-13)',
        }}>+ Add Product</button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {[{ id: 'all', name: 'All', icon: '' }, ...categories].map(cat => (
          <button key={cat.id} onClick={() => setCatFilter(String(cat.id))}
            style={{
              flexShrink: 0, padding: '4px 12px', borderRadius: 20,
              background: catFilter === String(cat.id) ? 'var(--brand-lt)' : 'none',
              border: `1.5px solid ${catFilter === String(cat.id) ? 'rgba(232,68,10,0.3)' : 'var(--border)'}`,
              color: catFilter === String(cat.id) ? 'var(--brand)' : 'var(--text2)',
              fontSize: 'var(--fs-12)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Products list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
            <div style={{ fontSize: 'var(--fs-36)', marginBottom: 8 }}>🍽</div>
            <div>No products yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: selected.has(p.id) ? 'var(--brand-lt2)' : 'var(--card)',
                border: `1px solid ${selected.has(p.id) ? 'rgba(232,68,10,0.2)' : 'var(--border)'}`,
                borderRadius: 'var(--r)', padding: '10px 12px',
                opacity: p.out_of_stock ? 0.55 : 1,
              }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                  style={{ accentColor: 'var(--brand)', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--fs-22)', flexShrink: 0 }}>{p.icon || '🍽'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--fs-13)' }}>
                    {p.name}
                    {p.out_of_stock && <span style={{ marginLeft: 6, fontSize: 'var(--fs-10)', color: 'var(--red)', fontWeight: 700, background: 'var(--red-bg)', padding: '1px 6px', borderRadius: 4 }}>OOS</span>}
                  </div>
                  <div style={{ fontSize: 'var(--fs-11)', color: 'var(--text3)' }}>
                    {p.catIcon} {p.catName || 'Uncategorised'}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--brand)', fontSize: 'var(--fs-14)', flexShrink: 0 }}>
                  ₹{Number(p.price).toFixed(2)}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleOOS(p)} title={p.out_of_stock ? 'Mark available' : 'Mark out of stock'}
                    style={{ ...iconBtn, color: p.out_of_stock ? 'var(--green)' : 'var(--text2)' }}>
                    {p.out_of_stock ? '✓' : '⊘'}
                  </button>
                  <button onClick={() => setEditing(p)} style={iconBtn}>✏️</button>
                  <button onClick={() => deleteProduct(p.id)} style={{ ...iconBtn, color: 'var(--red)' }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add Product' : 'Edit Product'}
      >
        <ProductEditor
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async () => { await reload(); setEditing(null); showToast('Saved!', 'success') }}
        />
      </Modal>
    </div>
  )
}

const iconBtn = {
  background: 'none', border: '1px solid var(--border)',
  borderRadius: 6, padding: '4px 8px', color: 'var(--text2)',
  fontSize: 'var(--fs-13)', cursor: 'pointer',
}
