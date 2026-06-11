import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { loadAddons, saveAddons } from '../../utils/addons'
import { publicAppUrl, qrImageUrl, tenantSlug } from '../../utils/invoice'

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

function QRPreviewCard({ title, subtitle, value, sizeLabel, fileName, children }) {
  const png = qrImageUrl(value, 900)
  const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1080" viewBox="0 0 900 1080"><rect width="900" height="1080" fill="white"/><text x="450" y="70" text-anchor="middle" font-family="Inter, Arial" font-size="42" font-weight="800" fill="#0F6E56">${title}</text><image href="${png}" x="105" y="120" width="690" height="690"/><text x="450" y="865" text-anchor="middle" font-family="Inter, Arial" font-size="34" font-weight="800" fill="#10231D">${subtitle}</text><text x="450" y="930" text-anchor="middle" font-family="Inter, Arial" font-size="22" fill="#61746D">${sizeLabel}</text></svg>`)}`
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:14, padding:14, background:'var(--card2)', marginTop:12 }}>
      <div style={{ fontWeight:800, color:'var(--text)', marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:'var(--fs-11)', color:'var(--text3)', wordBreak:'break-all', marginBottom:10 }}>{value}</div>
      <div style={{ background:'#fff', borderRadius:12, padding:10, display:'inline-block' }}>
        <img alt={`${title} QR`} src={png} style={{ width:150, height:150, display:'block' }}/>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
        <a href={png} download={fileName} target="_blank" rel="noreferrer" style={{ background:'var(--brand)', color:'#fff', textDecoration:'none', borderRadius:8, padding:'9px 12px', fontWeight:800, fontSize:'var(--fs-12)' }}>Download PNG</a>
        <a href={svg} download={fileName.replace(/\.png$/, '.svg')} style={{ background:'var(--card)', color:'var(--text)', textDecoration:'none', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', fontWeight:800, fontSize:'var(--fs-12)' }}>Download SVG</a>
        {children}
      </div>
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
  const [qrVersion, setQrVersion] = useState(() => localStorage.getItem(`bite-qr-version-${tenantId}`) || '1')

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
          {(() => {
            const slug = tenantSlug(settings || { biz_name: bizName })
            const versionSuffix = qrVersion === '1' ? '' : `?v=${qrVersion}`
            const takeawayUrl = publicAppUrl(`/t/${slug}/takeaway${versionSuffix}`)
            const tableCountNum = Math.max(1, Number(tableCount) || 1)
            return (
              <>
                <Field label="Takeaway QR" hint="Permanent customer lookup QR for paid takeaway invoices">
                  <span style={{ fontSize:'var(--fs-11)', color:'var(--text3)' }}>10cm × 12cm @ 300dpi</span>
                </Field>
                <QRPreviewCard title={bizName || 'Restaurant'} subtitle="Scan to view your invoices" value={takeawayUrl} sizeLabel="Print size: 10cm × 12cm" fileName="takeaway_invoices_qr.png">
                  <button onClick={() => { const v = String(Date.now()); localStorage.setItem(`bite-qr-version-${tenantId}`, v); setQrVersion(v); showToast('QR URL regenerated on this device ✓', 'success') }} style={{ background:'var(--amber)', color:'#1A1208', border:'none', borderRadius:8, padding:'9px 12px', fontWeight:800, fontSize:'var(--fs-12)' }}>Regenerate</button>
                </QRPreviewCard>

                <Field label="Tables QR" hint="One permanent QR per table for live order tracking and invoice history">
                  <span style={{ fontSize:'var(--fs-11)', color:'var(--text3)' }}>7cm × 9cm @ 300dpi</span>
                </Field>
                <button onClick={() => {
                  Array.from({ length: tableCountNum }, (_, i) => i + 1).forEach((n, idx) => setTimeout(() => {
                    const a = document.createElement('a')
                    a.href = qrImageUrl(publicAppUrl(`/t/${slug}/table/${n}${versionSuffix}`), 900)
                    a.download = `table_${n}.png`
                    a.target = '_blank'
                    a.click()
                  }, idx * 120))
                }} style={{ marginTop:10, background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, padding:'10px 12px', fontWeight:800 }}>Download All Tables QR</button>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10, marginTop:10 }}>
                  {Array.from({ length: tableCountNum }, (_, i) => i + 1).map(n => (
                    <QRPreviewCard key={n} title="Scan to track your order" subtitle={`Table ${n}`} value={publicAppUrl(`/t/${slug}/table/${n}${versionSuffix}`)} sizeLabel="Print size: 7cm × 9cm" fileName={`table_${n}.png`} />
                  ))}
                </div>
              </>
            )
          })()}
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
