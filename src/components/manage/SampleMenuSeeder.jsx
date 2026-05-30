import React, { useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import Modal from '../ui/Modal'
import { SAMPLE_MENU, sampleMenuItemCount } from '../../data/sampleMenu'

function initialSelection() {
  const selected = {}
  SAMPLE_MENU.forEach(category => {
    selected[category.name] = {
      category: true,
      items: Object.fromEntries(category.items.map(item => [item.name, true])),
    }
  })
  return selected
}

export default function SampleMenuSeeder({ open, onClose, onSeeded }) {
  const { tenantId, setCategories, setProducts, showToast } = useStore()
  const [selected, setSelected] = useState(initialSelection)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const summary = useMemo(() => {
    let categories = 0
    let products = 0
    SAMPLE_MENU.forEach(category => {
      const catSelection = selected[category.name]
      const itemCount = category.items.filter(item => catSelection?.items?.[item.name]).length
      if (catSelection?.category && itemCount > 0) categories += 1
      products += itemCount
    })
    return { categories, products }
  }, [selected])

  function toggleCategory(categoryName) {
    setSelected(prev => {
      const current = prev[categoryName]
      const nextValue = !current.category
      return {
        ...prev,
        [categoryName]: {
          category: nextValue,
          items: Object.fromEntries(Object.keys(current.items).map(name => [name, nextValue])),
        },
      }
    })
  }

  function toggleItem(categoryName, itemName) {
    setSelected(prev => {
      const current = prev[categoryName]
      const items = { ...current.items, [itemName]: !current.items[itemName] }
      return {
        ...prev,
        [categoryName]: {
          category: Object.values(items).some(Boolean),
          items,
        },
      }
    })
  }

  async function reloadMenu() {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('products')
        .select('*, categories(name,icon)')
        .eq('tenant_id', tenantId)
        .order('sort_order'),
    ])
    setCategories(cats || [])
    setProducts((prods || []).map(p => ({
      ...p,
      catName: p.categories?.name || '',
      catIcon: p.categories?.icon || '',
    })))
  }

  async function addSampleMenu() {
    if (!tenantId || loading || summary.products === 0) return
    setLoading(true)
    setError('')

    try {
      const categoryRows = SAMPLE_MENU
        .filter(category => selected[category.name]?.category)
        .filter(category => category.items.some(item => selected[category.name]?.items?.[item.name]))
        .map((category, index) => ({
          tenant_id: tenantId,
          name: category.name,
          icon: category.icon,
          sort_order: index,
        }))

      const { data: createdCategories, error: categoryError } = await supabase
        .from('categories')
        .insert(categoryRows)
        .select('id,name,icon')
      if (categoryError) throw categoryError

      const categoryIdByName = Object.fromEntries((createdCategories || []).map(category => [category.name, category.id]))
      const productRows = []
      SAMPLE_MENU.forEach((category, categoryIndex) => {
        category.items.forEach((item, itemIndex) => {
          if (!selected[category.name]?.items?.[item.name]) return
          productRows.push({
            tenant_id: tenantId,
            category_id: categoryIdByName[category.name] || null,
            name: item.name,
            icon: item.icon,
            price: item.price,
            ingredients: item.ingredients || [],
            out_of_stock: false,
            sort_order: categoryIndex * 100 + itemIndex,
          })
        })
      })

      const { error: productError } = await supabase.from('products').insert(productRows)
      if (productError) throw productError

      await reloadMenu()
      showToast(`Added ${summary.products} sample products`, 'success')
      onSeeded?.()
      onClose?.()
    } catch (err) {
      console.error('[BITE] sample menu seed error:', err)
      setError(err.message || 'Could not add sample menu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add sample menu"
      maxWidth={680}
      footer={(
        <div style={{ display:'flex', gap:10, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
          <span style={{ fontSize: 'var(--fs-12)', color:'var(--text2)' }}>
            {summary.categories} categories · {summary.products} products selected
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} disabled={loading} style={{
              background:'var(--card2)', color:'var(--text)', border:'1px solid var(--border)',
              borderRadius:8, padding:'10px 14px', fontWeight:700,
            }}>Cancel</button>
            <button onClick={addSampleMenu} disabled={loading || summary.products === 0} style={{
              background:loading || summary.products === 0 ? 'var(--card2)' : 'var(--brand)',
              color:loading || summary.products === 0 ? 'var(--text3)' : '#fff', border:'none',
              borderRadius:8, padding:'10px 16px', fontWeight:800,
            }}>{loading ? 'Adding…' : 'Add selected'}</button>
          </div>
        </div>
      )}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background:'var(--brand-lt2)', border:'1px solid rgba(168,217,200,0.35)', borderRadius:12, padding:12 }}>
          <div style={{ fontWeight:800, color:'var(--text)', marginBottom:4 }}>Start with a ready-made restaurant menu</div>
          <div style={{ fontSize: 'var(--fs-13)', color:'var(--text2)' }}>
            We will add categories and products to your database. You can uncheck anything you do not want and edit prices later.
          </div>
        </div>

        {error && <div style={{ color:'var(--red)', background:'var(--red-bg)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:10, fontSize: 'var(--fs-12)' }}>{error}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {SAMPLE_MENU.map(category => {
            const catSelection = selected[category.name]
            const checkedCount = category.items.filter(item => catSelection?.items?.[item.name]).length
            return (
              <div key={category.name} style={{ border:'1px solid var(--border)', borderRadius:12, background:'var(--card2)', overflow:'hidden' }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
                  <input type="checkbox" checked={!!catSelection?.category} onChange={() => toggleCategory(category.name)} />
                  <span style={{ fontSize: 'var(--fs-20)' }}>{category.icon}</span>
                  <span style={{ flex:1, fontWeight:800, color:'var(--text)' }}>{category.name}</span>
                  <span style={{ fontSize: 'var(--fs-11)', color:'var(--text3)' }}>{checkedCount}/{category.items.length}</span>
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:0 }}>
                  {category.items.map(item => (
                    <label key={item.name} style={{ display:'flex', gap:9, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
                      <input type="checkbox" checked={!!catSelection?.items?.[item.name]} onChange={() => toggleItem(category.name, item.name)} />
                      <span>{item.icon}</span>
                      <span style={{ flex:1, minWidth:0 }}>
                        <span style={{ display:'block', fontSize: 'var(--fs-13)', fontWeight:700, color:'var(--text)' }}>{item.name}</span>
                        <span style={{ display:'block', fontSize: 'var(--fs-12)', color:'var(--brand)', fontWeight:800 }}>₹{Number(item.price).toFixed(2)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ fontSize: 'var(--fs-11)', color:'var(--text3)' }}>
          Default sample includes {SAMPLE_MENU.length} categories and {sampleMenuItemCount()} products.
        </div>
      </div>
    </Modal>
  )
}
