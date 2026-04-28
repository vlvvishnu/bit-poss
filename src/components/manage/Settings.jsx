import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

const inputStyle = {
  background: 'var(--card2)', border: '1.5px solid var(--border2)',
  borderRadius: 8, color: 'var(--text)', fontSize: 13,
  padding: '7px 10px', outline: 'none', fontFamily: "'DM Sans'",
  width: 180, textAlign: 'right',
}

export default function SettingsPage() {
  const { tenantId, settings, setSettings, showToast, user } = useStore()
  const [saving, setSaving]     = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  const [bizName, setBizName]   = useState('')
  const [upiId, setUpiId]       = useState('')
  const [taxRate, setTaxRate]   = useState('')
  const [tableCount, setTableCount] = useState('')
  const [kioskId, setKioskId]   = useState('')
  const [newPw, setNewPw]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => {
    if (settings) {
      setBizName(settings.biz_name || settings.name || '')
      setUpiId(settings.upi_id || '')
      setTaxRate(settings.tax_rate ?? '')
      setTableCount(settings.table_count ?? 10)
      setKioskId(settings.kiosk_id || '')
    }
  }, [settings])

  async function saveSettings(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('tenants').update({
      biz_name:    bizName,
      upi_id:      upiId || null,
      tax_rate:    Number(taxRate) || 0,
      table_count: Number(tableCount) || 10,
      kiosk_id:    kioskId || null,
    }).eq('id', tenantId)
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    // Refresh settings in store
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) setSettings(data)
    showToast('Settings saved ✓', 'success')
  }

  async function changePassword(e) {
    e.preventDefault()
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return }
    if (newPw.length < 8)   { showToast('Password must be at least 8 characters', 'error'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    setNewPw(''); setConfirmPw('')
    showToast('Password updated ✓', 'success')
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Settings</h2>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>
          {user?.email}
        </p>

        {/* Business */}
        <Section title="🏪 Business">
          <form onSubmit={saveSettings}>
            <Field label="Restaurant name" hint="Shown on receipts and in the app">
              <input value={bizName} onChange={e => setBizName(e.target.value)}
                placeholder="Boba Baba" style={inputStyle} />
            </Field>
            <Field label="Kiosk / Station ID" hint="e.g. Main Counter, Kiosk #1">
              <input value={kioskId} onChange={e => setKioskId(e.target.value)}
                placeholder="Main Counter" style={inputStyle} />
            </Field>
            <Field label="Tax rate (%)" hint="Applied to all orders. Set 0 if tax-inclusive.">
              <input value={taxRate} onChange={e => setTaxRate(e.target.value)}
                type="number" min="0" max="50" step="0.5" placeholder="8" style={inputStyle} />
            </Field>
            <Field label="Number of tables" hint="For Dine In table selection">
              <input value={tableCount} onChange={e => setTableCount(e.target.value)}
                type="number" min="1" max="100" placeholder="10" style={inputStyle} />
            </Field>
            <div style={{ paddingTop: 16 }}>
              <button type="submit" disabled={saving} style={{
                background: 'var(--brand)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14,
              }}>
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        </Section>

        {/* UPI */}
        <Section title="📱 UPI Payment">
          <form onSubmit={saveSettings}>
            <Field label="UPI ID" hint="e.g. yourname@upi — shown as QR to customers">
              <input value={upiId} onChange={e => setUpiId(e.target.value)}
                placeholder="yourname@upi" style={inputStyle} />
            </Field>
            <div style={{ paddingTop: 16 }}>
              <button type="submit" disabled={saving} style={{
                background: 'var(--brand)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14,
              }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Section>

        {/* Change password */}
        <Section title="🔒 Change Password">
          <form onSubmit={changePassword} autoComplete="off">
            <Field label="New password" hint="Minimum 8 characters">
              <input value={newPw} onChange={e => setNewPw(e.target.value)}
                type="password" placeholder="••••••••"
                autoComplete="new-password" minLength={8} style={inputStyle} />
            </Field>
            <Field label="Confirm password" hint="">
              <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                type="password" placeholder="••••••••"
                autoComplete="new-password" style={inputStyle} />
            </Field>
            <div style={{ paddingTop: 16 }}>
              <button type="submit" disabled={pwSaving || !newPw} style={{
                background: 'var(--bg)', color: 'var(--text)', border: '1.5px solid var(--border2)',
                borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14,
              }}>
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 4, padding: '8px 0', borderBottom: '2px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}
