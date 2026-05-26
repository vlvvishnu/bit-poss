import React, { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { loadAddons, saveAddons } from '../../utils/addons'

export default function AddonsPage() {
  const { tenantId, showToast } = useStore()
  const [addons, setAddons] = useState([])
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState('')

  useEffect(() => { setAddons(loadAddons(tenantId)) }, [tenantId])

  function addAddon() {
    const name = addonName.trim()
    const price = Number(addonPrice)
    if (!name || Number.isNaN(price) || price < 0) return showToast('Enter valid add-on name and price', 'warning')
    const next = [...addons, { id: `addon-${Date.now()}`, name, price }]
    setAddons(next); saveAddons(tenantId, next); setAddonName(''); setAddonPrice('')
    showToast('Add-on saved', 'success')
  }

  function removeAddon(id) {
    const next = addons.filter(a => a.id !== id)
    setAddons(next); saveAddons(tenantId, next)
  }

  return <div style={{ flex:1, overflowY:'auto' }}><div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>
    <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize:'var(--fs-18)', marginBottom:14 }}>Add-ons</h2>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 120px auto', gap:8, marginBottom:12 }}>
      <input value={addonName} onChange={e=>setAddonName(e.target.value)} placeholder='Cheese slice' style={{ background:'var(--card2)', border:'1.5px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:'var(--fs-13)', padding:'7px 10px' }}/>
      <input value={addonPrice} onChange={e=>setAddonPrice(e.target.value)} type='number' min='0' step='0.01' placeholder='20' style={{ background:'var(--card2)', border:'1.5px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:'var(--fs-13)', padding:'7px 10px' }}/>
      <button onClick={addAddon} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:700 }}>Add</button>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {addons.length===0 ? <div style={{ color:'var(--text3)', fontSize:'var(--fs-12)' }}>No add-ons created yet.</div> : addons.map(a => <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px' }}><span style={{ color:'var(--text)' }}>{a.name} · ₹{Number(a.price).toFixed(2)}</span><button onClick={()=>removeAddon(a.id)} style={{ border:'none', background:'none', color:'var(--red)', cursor:'pointer' }}>Remove</button></div>)}
    </div>
  </div></div>
}
