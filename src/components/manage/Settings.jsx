import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { loadAddons, saveAddons } from '../../utils/addons'
import { createQrStandBlob, createZipBlob, downloadBlob, downloadQrStand, publicAppUrl, qrImageUrl, tenantSlug } from '../../utils/invoice'

function Field({ label, hint, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
      gap:16, padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize: 'var(--fs-13)', fontWeight:600, color:'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 'var(--fs-11)', color:'var(--text3)', marginTop:2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  )
}

const inputStyle = {
  background:'var(--card2)', border:'1.5px solid var(--border2)',
  borderRadius:8, color:'var(--text)', fontSize: 'var(--fs-13)',
  padding:'7px 10px', outline:'none', fontFamily:"'DM Sans'",
  width:180, textAlign:'right',
}


// ── single save button used everywhere in this file ───────────────
function SaveBtn({ saving, onClick, label = 'Save' }) {
  return (
    <button onClick={onClick} disabled={saving} style={{
      background: saving ? 'var(--card2)' : 'var(--brand)',
      color: saving ? 'var(--text2)' : '#fff',
      border: 'none', borderRadius:8, padding:'9px 20px',
      fontWeight:700, fontSize: 'var(--fs-13)', cursor: saving ? 'default' : 'pointer',
      display:'flex', alignItems:'center', gap:6, transition:'all 0.15s',
    }}>
      {saving && (
        <span style={{ width:12, height:12, border:'2px solid currentColor',
          borderTopColor:'transparent', borderRadius:'50%', display:'inline-block',
          animation:'spin 0.6s linear infinite' }} />
      )}
      {saving ? 'Saving…' : label}
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize: 'var(--fs-13)', fontWeight:700, color:'var(--text2)',
        padding:'8px 0', borderBottom:'2px solid var(--border)', marginBottom:4 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function qrTableStorageKey(tenantId) {
  return `bite-table-qr-names-${tenantId || 'local'}`
}

function defaultTables(count) {
  return Array.from({ length: Math.max(0, Number(count) || 0) }, (_, idx) => ({
    id: idx + 1,
    name: `Table ${idx + 1}`,
  }))
}

function sanitizeDownloadName(value) {
  return String(value || 'qr').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qr'
}

function QrModal({ row, onClose }) {
  if (!row) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.62)', display:'grid', placeItems:'center', padding:20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:18, width:'100%', maxWidth:360, textAlign:'center', boxShadow:'0 22px 70px rgba(0,0,0,0.32)' }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:900, color:'var(--text)', fontSize:'var(--fs-18)', marginBottom:4 }}>{row.name}</div>
        <div style={{ color:'var(--text3)', fontSize:'var(--fs-11)', marginBottom:12, wordBreak:'break-all' }}>{row.url}</div>
        <div style={{ background:'#fff', borderRadius:18, padding:14, display:'inline-block' }}>
          <img alt={`${row.name} QR`} src={qrImageUrl(row.url, 720)} style={{ width:220, height:220, display:'block' }}/>
        </div>
        <button onClick={onClose} style={{ marginTop:14, width:'100%', background:'var(--card2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:10, padding:10, fontWeight:800 }}>Close</button>
      </div>
    </div>
  )
}

function InlineTableName({ table, editing, onEdit, onCommit }) {
  const [draft, setDraft] = useState(table.name)

  useEffect(() => { setDraft(table.name) }, [table.name, editing])

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => onCommit(table.id, draft)}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { setDraft(table.name); onCommit(table.id, table.name) }
        }}
        style={{ width:'100%', minWidth:120, background:'var(--bg)', color:'var(--text)', border:'1.5px solid var(--brand)', borderRadius:8, padding:'7px 9px', outline:'none', fontSize:'var(--fs-13)', fontWeight:700 }}
      />
    )
  }

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:8, minWidth:0 }}>
      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:800, color:'var(--text)' }}>{table.name}</span>
      <button title="Rename table" onClick={() => onEdit(table.id)} style={{ border:'none', background:'transparent', color:'var(--text3)', cursor:'pointer', padding:2, fontSize:'var(--fs-13)' }}>✎</button>
    </span>
  )
}

function QrListRow({ row, index, editable, editing, onEdit, onCommit, onDelete, onPreview, onDownload }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'40px minmax(150px, 1fr) 74px minmax(180px, 2fr) 132px', gap:12, alignItems:'center', padding:'11px 12px', borderBottom:'1px solid var(--border)' }}>
      <div style={{ color:'var(--text3)', fontWeight:800, fontSize:'var(--fs-12)' }}>{index}</div>
      <div style={{ minWidth:0 }}>
        {editable ? (
          <InlineTableName table={row} editing={editing} onEdit={onEdit} onCommit={onCommit}/>
        ) : (
          <span style={{ fontWeight:900, color:'var(--text)' }}>{row.name}</span>
        )}
      </div>
      <button title="Expand QR preview" onClick={() => onPreview(row)} style={{ width:48, height:48, background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:5, cursor:'pointer' }}>
        <img alt={`${row.name} QR preview`} src={qrImageUrl(row.url, 96)} style={{ width:36, height:36, display:'block' }}/>
      </button>
      <div title={row.url} style={{ color:'var(--text3)', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:'var(--fs-11)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.url}</div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
        <button onClick={() => onDownload(row)} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:9, padding:'8px 10px', fontWeight:900, fontSize:'var(--fs-11)', cursor:'pointer', whiteSpace:'nowrap' }}>↓ Stand</button>
        {editable && (
          <button title="Delete table" onClick={() => onDelete(row)} style={{ background:'var(--card2)', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:9, padding:'8px 9px', fontWeight:900, cursor:'pointer' }}>⋯</button>
        )}
      </div>
    </div>
  )
}

function QrRowsTable(props) {
  const { rows, editable, editingId, onEdit, onCommit, onDelete, onPreview, onDownload } = props
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:14, overflow:'auto', background:'var(--card)' }}>
      <div style={{ minWidth:760 }}>
        <div style={{ display:'grid', gridTemplateColumns:'40px minmax(150px, 1fr) 74px minmax(180px, 2fr) 132px', gap:12, alignItems:'center', padding:'9px 12px', background:'var(--card2)', borderBottom:'1px solid var(--border)', color:'var(--text3)', fontSize:'var(--fs-10)', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.5px' }}>
          <span>#</span><span>Table name</span><span>QR preview</span><span>URL</span><span style={{ textAlign:'right' }}>Actions</span>
        </div>
        {rows.map((row, idx) => (
          <QrListRow
            key={row.id}
            row={row}
            index={editable ? idx + 1 : ''}
            editable={editable}
            editing={editingId === row.id}
            onEdit={onEdit}
            onCommit={onCommit}
            onDelete={onDelete}
            onPreview={onPreview}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  )
}

function TablesQrManager({ tenantId, settings, bizName, tableCount, setTableCount, setSettings, showToast }) {
  const [standTheme, setStandTheme] = useState('dark')
  const [tables, setTables] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [previewRow, setPreviewRow] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const restaurantName = bizName || settings?.biz_name || settings?.name || ''
  const slug = tenantSlug(settings || { biz_name: restaurantName })
  const baseTablesUrl = n => publicAppUrl(`/t/${slug}/table/${n}`)
  const takeawayUrl = publicAppUrl(`/t/${slug}/takeaway`)

  useEffect(() => {
    if (!tenantId) return
    const stored = localStorage.getItem(qrTableStorageKey(tenantId))
    const count = Math.max(0, Number(tableCount) || 0)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const desiredCount = Number.isFinite(count) ? count : parsed.length
          const adjusted = [...parsed]
          while (adjusted.length < desiredCount) {
            const nextId = adjusted.reduce((max, table) => Math.max(max, Number(table.id) || 0), 0) + 1
            adjusted.push({ id: nextId, name: `Table ${nextId}` })
          }
          const next = desiredCount >= 0 ? adjusted.slice(0, desiredCount) : adjusted
          setTables(next)
          if (next.length !== parsed.length) localStorage.setItem(qrTableStorageKey(tenantId), JSON.stringify(next))
          return
        }
      } catch (_) {}
    }
    setTables(defaultTables(count))
  }, [tenantId, tableCount])

  function persist(next) {
    setTables(next)
    localStorage.setItem(qrTableStorageKey(tenantId), JSON.stringify(next))
  }

  async function persistTableCount(count) {
    setTableCount(String(count))
    if (!tenantId) return
    const { data, error } = await supabase.from('tenants').update({ table_count: count }).eq('id', tenantId).select('*').single()
    if (error) {
      showToast?.('Table list updated here, but could not sync restaurant settings.', 'warning')
      return
    }
    if (data) setSettings(data)
  }

  function addTable() {
    const nextId = tables.reduce((max, table) => Math.max(max, Number(table.id) || 0), 0) + 1
    const next = [...tables, { id: nextId, name: `Table ${nextId}` }]
    persist(next)
    setEditingId(nextId)
    persistTableCount(next.length)
  }

  function commitName(id, value) {
    const name = String(value || '').trim() || `Table ${id}`
    persist(tables.map(table => table.id === id ? { ...table, name } : table))
    setEditingId(null)
  }

  function deleteTable(row) {
    if (!confirm(`Orders linked to Table ${row.id} will lose their table reference. Continue?`)) return
    const next = tables.filter(table => table.id !== row.id)
    persist(next)
    persistTableCount(next.length)
    showToast?.(`${row.name} deleted from QR list`, 'success')
  }

  const dineRows = tables.map(table => ({ ...table, url: baseTablesUrl(table.id) }))
  const takeawayRow = { id:'takeaway', name:'Takeaway', url:takeawayUrl }

  async function downloadStand(row) {
    setDownloading(true)
    try {
      await downloadQrStand({ url: row.url, label: row.name, restaurantName, theme: standTheme })
    } catch (error) {
      showToast?.('Could not generate QR stand. Please try again.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  async function downloadAll() {
    const rows = [...dineRows, takeawayRow]
    if (!rows.length) return
    setDownloading(true)
    try {
      const files = []
      for (const row of rows) {
        const blob = await createQrStandBlob({ url: row.url, label: row.name, restaurantName, theme: standTheme })
        files.push({ name: `bite-${sanitizeDownloadName(row.name)}-qr-stand.png`, blob })
      }
      const zip = await createZipBlob(files)
      downloadBlob(zip, 'bite-qr-stands.zip')
    } catch (error) {
      showToast?.('Could not generate QR stands ZIP. Please try again.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <h3 style={{ margin:'0 0 6px', color:'var(--text)', fontFamily:"'Plus Jakarta Sans'", fontSize:'var(--fs-18)' }}>Tables QR</h3>
          <p style={{ margin:0, color:'var(--text2)', fontSize:'var(--fs-12)', lineHeight:1.45 }}>One permanent QR per table for<br/>live order tracking and invoice history</p>
        </div>
        <button onClick={addTable} style={{ background:'transparent', color:'var(--brand)', border:'1.5px solid var(--brand)', borderRadius:10, padding:'9px 12px', fontWeight:900, cursor:'pointer', whiteSpace:'nowrap' }}>+ Add Table</button>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:16 }}>
        <button onClick={downloadAll} disabled={downloading} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:10, padding:'10px 14px', fontWeight:900, cursor:downloading ? 'default' : 'pointer', opacity:downloading ? 0.65 : 1 }}>{downloading ? 'Generating…' : 'Download All QR Stands'}</button>
        <span style={{ color:'var(--text3)', fontSize:'var(--fs-11)', fontWeight:800 }}>7cm × 9cm @ 300dpi</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <span style={{ color:'var(--text2)', fontSize:'var(--fs-12)', fontWeight:800 }}>Stand theme:</span>
        {['dark', 'light'].map(theme => (
          <button key={theme} onClick={() => setStandTheme(theme)} style={{ border:`1px solid ${standTheme === theme ? 'var(--brand)' : 'var(--border)'}`, background:standTheme === theme ? 'var(--brand-lt)' : 'var(--card2)', color:standTheme === theme ? 'var(--brand)' : 'var(--text2)', borderRadius:999, padding:'6px 11px', fontWeight:900, cursor:'pointer', fontSize:'var(--fs-11)' }}>{standTheme === theme ? '●' : '○'} {theme === 'dark' ? 'Dark' : 'Light'}</button>
        ))}
      </div>

      <div style={{ color:'var(--brand)', fontSize:'var(--fs-11)', fontWeight:900, letterSpacing:'0.8px', textTransform:'uppercase', margin:'18px 0 8px' }}>● Dine In Tables</div>
      {dineRows.length ? (
        <QrRowsTable rows={dineRows} editable editingId={editingId} onEdit={setEditingId} onCommit={commitName} onDelete={deleteTable} onPreview={setPreviewRow} onDownload={downloadStand}/>
      ) : (
        <div style={{ textAlign:'center', padding:'34px 16px', border:'1px dashed var(--border2)', borderRadius:16, background:'var(--card2)' }}>
          <div style={{ fontSize:'var(--fs-15)', fontWeight:900, color:'var(--text)', marginBottom:5 }}>No tables added yet</div>
          <div style={{ fontSize:'var(--fs-12)', color:'var(--text3)', marginBottom:14 }}>Add your first table to generate a QR stand</div>
          <button onClick={addTable} style={{ background:'var(--brand)', color:'#fff', border:'none', borderRadius:10, padding:'10px 14px', fontWeight:900 }}>+ Add Table</button>
        </div>
      )}

      <div style={{ color:'var(--brand)', fontSize:'var(--fs-11)', fontWeight:900, letterSpacing:'0.8px', textTransform:'uppercase', margin:'22px 0 8px' }}>● Takeaway</div>
      <QrRowsTable rows={[takeawayRow]} editable={false} editingId={null} onEdit={() => {}} onCommit={() => {}} onDelete={() => {}} onPreview={setPreviewRow} onDownload={downloadStand}/>

      <QrModal row={previewRow} onClose={() => setPreviewRow(null)}/>
    </div>
  )
}


export default function SettingsPage() {
  const { tenantId, settings, setSettings, showToast, user } = useStore()

  const [bizName,     setBizName]     = useState('')
  const [upiId,       setUpiId]       = useState('')
  const [taxRate,     setTaxRate]     = useState('')
  const [tableCount,  setTableCount]  = useState('')
  const [kioskId,     setKioskId]     = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')

  const [savingBiz, setSavingBiz] = useState(false)
  const [savingUpi, setSavingUpi] = useState(false)
  const [savingPw,  setSavingPw]  = useState(false)
  const [addons, setAddons] = useState([])
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState('')
  useEffect(() => {
    setAddons(loadAddons(tenantId))
    setQrVersion(localStorage.getItem(`bite-qr-version-${tenantId}`) || '1')
  }, [tenantId])

  useEffect(() => {
    if (settings) {
      setBizName(settings.biz_name || settings.name || '')
      setUpiId(settings.upi_id || '')
      setTaxRate(settings.tax_rate ?? '')
      setTableCount(settings.table_count ?? 10)
      setKioskId(settings.kiosk_id || '')
    }
  }, [settings])

  async function saveBusiness() {
    setSavingBiz(true)
    const { error } = await supabase.from('tenants').update({
      biz_name:    bizName,
      kiosk_id:    kioskId || null,
      tax_rate:    Number(taxRate) || 0,
      table_count: Number(tableCount) || 10,
    }).eq('id', tenantId)
    setSavingBiz(false)
    if (error) { showToast(error.message, 'error'); return }
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) setSettings(data)
    showToast('Business settings saved ✓', 'success')
  }

  async function saveUpi() {
    setSavingUpi(true)
    const { error } = await supabase.from('tenants').update({
      upi_id: upiId || null,
    }).eq('id', tenantId)
    setSavingUpi(false)
    if (error) { showToast(error.message, 'error'); return }
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) setSettings(data)
    showToast('UPI settings saved ✓', 'success')
  }

  async function changePassword() {
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return }
    if (newPw.length < 8)    { showToast('Password must be at least 8 characters', 'error'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) { showToast(error.message, 'error'); return }
    setNewPw(''); setConfirmPw('')
    showToast('Password updated ✓', 'success')
  }

  return (
    <div style={{ flex:1, overflowY:'auto' }}>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>
        <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize: 'var(--fs-18)', marginBottom:4 }}>
          Settings
        </h2>
        <p style={{ fontSize: 'var(--fs-12)', color:'var(--text2)', marginBottom:24 }}>{user?.email}</p>

        {/* ── Business ─────────────────────────────────────────── */}
        <Section title="🏪 Business">
          <Field label="Restaurant name" hint="Shown on receipts and in the app">
            <input value={bizName} onChange={e=>setBizName(e.target.value)}
              placeholder="Boba Baba" style={inputStyle}/>
          </Field>
          <Field label="Kiosk / Station ID" hint="e.g. Main Counter, Kiosk #1">
            <input value={kioskId} onChange={e=>setKioskId(e.target.value)}
              placeholder="Main Counter" style={inputStyle}/>
          </Field>
          <Field label="Tax rate (%)" hint="Set 0 if prices are tax-inclusive">
            <input value={taxRate} onChange={e=>setTaxRate(e.target.value)}
              type="number" min="0" max="50" step="0.5" placeholder="8" style={inputStyle}/>
          </Field>
          <Field label="Number of tables" hint="For Dine In table selection">
            <input value={tableCount} onChange={e=>setTableCount(e.target.value)}
              type="number" min="1" max="100" placeholder="10" style={inputStyle}/>
          </Field>
          <div style={{ paddingTop:14 }}>
            <SaveBtn saving={savingBiz} onClick={saveBusiness} label="Save Business Settings"/>
          </div>
        </Section>

        {/* ── UPI ──────────────────────────────────────────────── */}
        <Section title="📱 UPI Payment">
          <Field label="UPI ID" hint="e.g. yourname@upi — shown as QR to customers">
            <input value={upiId} onChange={e=>setUpiId(e.target.value)}
              placeholder="yourname@upi" style={inputStyle}/>
          </Field>
          <div style={{ paddingTop:14 }}>
            <SaveBtn saving={savingUpi} onClick={saveUpi} label="Save UPI"/>
          </div>
        </Section>


        {/* ── QR Codes ─────────────────────────────────────────── */}
        <Section title="🔳 QR Codes">
          <TablesQrManager
            tenantId={tenantId}
            settings={settings}
            bizName={bizName}
            tableCount={tableCount}
            setTableCount={setTableCount}
            setSettings={setSettings}
            showToast={showToast}
          />
        </Section>

        {/* ── Change Password ───────────────────────────────────── */}
        <Section title="🔒 Change Password">
          <Field label="New password" hint="Minimum 8 characters">
            <input value={newPw} onChange={e=>setNewPw(e.target.value)} type="password"
              placeholder="••••••••" autoComplete="new-password" style={inputStyle}/>
          </Field>
          <Field label="Confirm password" hint="">
            <input value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} type="password"
              placeholder="••••••••" autoComplete="new-password" style={inputStyle}/>
          </Field>
          <div style={{ paddingTop:14 }}>
            <SaveBtn saving={savingPw} onClick={changePassword} label="Update Password"/>
          </div>
        </Section>

      </div>
    </div>
  )
}
