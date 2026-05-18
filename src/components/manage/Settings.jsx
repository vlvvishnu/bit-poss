import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

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

const wideInputStyle = {
  ...inputStyle,
  width: '100%',
  textAlign: 'left',
  boxSizing: 'border-box',
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

export default function SettingsPage() {
  const { tenantId, settings, setSettings, showToast, user } = useStore()

  const [bizName,     setBizName]     = useState('')
  const [upiId,       setUpiId]       = useState('')
  const [taxRate,     setTaxRate]     = useState('')
  const [tableCount,  setTableCount]  = useState('')
  const [kioskId,     setKioskId]     = useState('')
  const [waWebhook,   setWaWebhook]   = useState('')
  const [newPw,       setNewPw]       = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')

  const [savingBiz, setSavingBiz] = useState(false)
  const [savingUpi, setSavingUpi] = useState(false)
  const [savingWa,  setSavingWa]  = useState(false)
  const [savingPw,  setSavingPw]  = useState(false)

  // Populate fields when settings load
  useEffect(() => {
    if (settings) {
      setBizName(settings.biz_name || settings.name || '')
      setUpiId(settings.upi_id || '')
      setTaxRate(settings.tax_rate ?? '')
      setTableCount(settings.table_count ?? 10)
      setKioskId(settings.kiosk_id || '')
      setWaWebhook(settings.wa_webhook_url || '')
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

  async function saveWhatsApp() {
    setSavingWa(true)
    const { error } = await supabase.from('tenants').update({
      wa_webhook_url: waWebhook.trim() || null,
    }).eq('id', tenantId)
    setSavingWa(false)
    if (error) { showToast(error.message, 'error'); return }
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) setSettings(data)
    showToast('WhatsApp settings saved ✓', 'success')
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

        {/* ── WhatsApp Invoice ─────────────────────────────────── */}
        <Section title="📲 WhatsApp Invoice">
          <div style={{ fontSize: 'var(--fs-12)', color:'var(--text3)', marginBottom:10, lineHeight:1.65 }}>
            After getting your template <strong>order_invoice1</strong> approved in Emovur, go to<br/>
            <strong>Dashboard → Templates → View/Edit Webhook</strong> and paste the URL below.<br/>
            <span style={{ color:'var(--text2)' }}>
              Template sends: <em>"Your invoice from [Restaurant] is ready 🧾 [link]"</em>
            </span>
          </div>
          <Field
            label="Emovur Webhook URL"
            hint="Per-template webhook from your Emovur dashboard"
          >
            <div style={{ width:180 }}>
              <input
                value={waWebhook}
                onChange={e => setWaWebhook(e.target.value)}
                placeholder="https://adminapis.backendprod.com/…"
                style={{ ...inputStyle, width:'100%', fontSize: 'var(--fs-11)', textAlign:'left' }}
              />
            </div>
          </Field>
          <div style={{ paddingTop:14 }}>
            <SaveBtn saving={savingWa} onClick={saveWhatsApp} label="Save WhatsApp"/>
          </div>
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