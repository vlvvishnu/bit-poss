import React, { useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'

const CAT_ICONS = ['🍔','🍗','🌯','🍕','🥗','🍜','🍰','🍵','☕','🥤','🧋','🍺','🥩','🐟','🥬','🥐','🍱']

function CatEditor({ cat, onSave }) {
  const { tenantId } = useStore()
  const [name, setName]   = useState(cat?.name || '')
  const [icon, setIcon]   = useState(cat?.icon || '🍽')
  const [loading, setLoading] = useState(false)

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    const row = { tenant_id: tenantId, name, icon }
    cat?.id
      ? await supabase.from('categories').update(row).eq('id', cat.id)
      : await supabase.from('categories').insert(row)
    setLoading(false)
    onSave()
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
          Icon — selected: <span style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {CAT_ICONS.map(ic => (
            <button key={ic} type="button" onClick={() => setIcon(ic)}
              style={{
                fontSize: 20, padding: '6px 8px',
                border: `2px solid ${icon === ic ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 8, background: icon === ic ? 'var(--brand-lt)' : 'transparent', cursor: 'pointer',
              }}>{ic}</button>
          ))}
        </div>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Name *</span>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Burgers" required
          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1.5px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: "'DM Sans'" }} />
      </label>
      <button type="submit" disabled={loading || !name}
        style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontWeight: 700, fontSize: 14 }}>
        {loading ? 'Saving…' : cat?.id ? 'Save Changes' : 'Add Category'}
      </button>
    </form>
  )
}

export default function CategoriesPage() {
  const { categories, tenantId, setCategories, showToast } = useStore()
  const [editing, setEditing] = useState(null)

  async function reload() {
    const { data } = await supabase.from('categories').select('*').eq('tenant_id', tenantId).order('sort_order')
    setCategories(data || [])
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category? Products in it will be uncategorised.')) return
    await supabase.from('categories').delete().eq('id', id)
    await reload()
    showToast('Category deleted', 'success')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 16, flex: 1 }}>Categories</h2>
        <button onClick={() => setEditing('new')} style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: 13 }}>+ Add</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏷</div>
            <div>No categories yet.</div>
          </div>
        ) : categories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
            <span style={{ fontSize: 24 }}>{cat.icon}</span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
            <button onClick={() => setEditing(cat)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text2)', cursor: 'pointer' }}>✏️</button>
            <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--red)', cursor: 'pointer' }}>🗑</button>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add Category' : 'Edit Category'}>
        <CatEditor
          cat={editing === 'new' ? null : editing}
          onSave={async () => { await reload(); setEditing(null); showToast('Saved!', 'success') }}
        />
      </Modal>
    </div>
  )
}
