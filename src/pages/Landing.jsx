import React, { useState } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore'

const S = {
  page: {
    minHeight: '100vh', background: 'var(--bg)',
    color: 'var(--text)', display: 'flex', flexDirection: 'column',
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 5%', height: 60, flexShrink: 0,
    background: 'rgba(13,11,8,0.9)', backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 100,
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 20,
    color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.5px',
  },
  dot: { color: 'var(--brand)' },
  hero: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '80px 5% 60px', textAlign: 'center', gap: 24,
  },
  heroTag: {
    display: 'inline-block',
    background: 'var(--brand-lt)', color: 'var(--brand)',
    border: '1px solid rgba(232,68,10,0.2)',
    borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
    letterSpacing: '0.3px', marginBottom: 8,
  },
  heroTitle: {
    fontFamily: "'Plus Jakarta Sans'", fontWeight: 800,
    fontSize: 'clamp(36px, 6vw, 64px)', lineHeight: 1.1,
    letterSpacing: '-1.5px', color: 'var(--text)',
    maxWidth: 700,
  },
  heroSub: {
    fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text2)',
    maxWidth: 520, lineHeight: 1.6,
  },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  btnPrimary: {
    background: 'var(--brand)', color: '#fff', border: 'none',
    borderRadius: 'var(--r)', padding: '12px 28px',
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
    transition: 'background 0.15s',
  },
  btnSecondary: {
    background: 'transparent', color: 'var(--text)',
    border: '1.5px solid var(--border2)',
    borderRadius: 'var(--r)', padding: '12px 28px',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  features: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16, padding: '0 5% 80px', maxWidth: 1100, margin: '0 auto', width: '100%',
  },
  featureCard: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)', padding: '24px 20px', display: 'flex',
    flexDirection: 'column', gap: 10,
  },
  featureIcon: { fontSize: 24 },
  featureTitle: {
    fontFamily: "'Plus Jakarta Sans'", fontWeight: 700, fontSize: 14,
  },
  featureSub: { fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 },
  footer: {
    borderTop: '1px solid var(--border)', padding: '20px 5%',
    textAlign: 'center', fontSize: 12, color: 'var(--text3)',
  },
  // Auth overlay
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, animation: 'fadeIn 0.2s ease',
  },
  authCard: {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400,
    overflow: 'hidden', animation: 'popIn 0.2s ease',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  },
  authHead: {
    background: 'var(--bg)', padding: '24px 28px 20px',
  },
  authTitle: {
    fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 20,
    color: 'var(--text)', letterSpacing: '-0.5px',
  },
  authSub: { fontSize: 13, color: 'var(--text2)', marginTop: 4 },
  authTabs: {
    display: 'flex', borderBottom: '1px solid #e8e4e0', background: '#fff',
  },
  authBody: { padding: '24px 28px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6 },
  labelText: { fontSize: 11, fontWeight: 700, color: '#7A6E65', textTransform: 'uppercase', letterSpacing: '0.4px' },
  input: {
    width: '100%', padding: '10px 13px',
    border: '1.5px solid #e8e4e0', borderRadius: 8,
    fontSize: 14, background: '#f9f7f5', color: '#1A1208',
    outline: 'none', transition: 'border-color 0.15s',
    fontFamily: "'DM Sans'",
  },
  authBtn: {
    width: '100%', background: 'var(--brand)', color: '#fff',
    border: 'none', borderRadius: 10, padding: '13px',
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans'",
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'background 0.15s',
  },
  authErr: {
    background: '#FEF2F2', border: '1px solid #FECACA',
    borderRadius: 8, padding: '10px 12px',
    fontSize: 13, color: '#DC2626',
  },
  authOk: {
    background: '#F0FDF4', border: '1px solid #BBF7D0',
    borderRadius: 8, padding: '10px 12px',
    fontSize: 13, color: '#166534',
  },
}

const FEATURES = [
  { icon: '🛒', title: 'Fast order taking', sub: 'Browse menu, add to cart, checkout in seconds.' },
  { icon: '📱', title: 'UPI & cash payments', sub: 'Auto-generate UPI QR. Accept cash, card, or other.' },
  { icon: '🍽', title: 'Dine in & takeaway', sub: 'Table management. Multiple order types in one view.' },
  { icon: '📋', title: 'Order history', sub: 'Full history with search, refunds and revenue stats.' },
  { icon: '🏷', title: 'Product management', sub: 'Add products, categories, icons and prices easily.' },
  { icon: '📲', title: 'WhatsApp bills', sub: 'Customers scan a QR and get their bill on WhatsApp.' },
]

export default function Landing() {
  const [authOpen, setAuthOpen]   = useState(false)
  const [tab, setTab]             = useState('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [name, setName]           = useState('')
  const [bizName, setBizName]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const { showToast }             = useStore()

  function openAuth(t = 'login') { setTab(t); setError(''); setSuccess(''); setAuthOpen(true) }
  function closeAuth() { setAuthOpen(false); setError(''); setSuccess('') }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    // Auth state change in App.jsx handles the rest
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (!name || !bizName) { setError('Name and restaurant name are required'); return }
    setLoading(true); setError('')
    const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, biz_name: bizName } }
    })
    if (error) { setLoading(false); setError(error.message); return }

    // Create tenant
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert({ slug, name: bizName, biz_name: bizName, owner_email: email })
      .select('id')
      .single()

    if (tErr && !tErr.message.includes('duplicate')) {
      setLoading(false); setError('Account created but setup failed. Please sign in.')
      return
    }

    // Link profile
    if (tenant?.id) {
      await supabase.from('profiles').upsert({
        id: data.user.id, tenant_id: tenant.id, role: 'owner', full_name: name
      })
    }

    setLoading(false)
    setSuccess('Account created! Check your email to confirm, then sign in.')
    setTab('login')
  }

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <span style={S.logo}>BITE<span style={S.dot}>.</span></span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btnSecondary} onClick={() => openAuth('login')}>Sign in</button>
          <button style={S.btnPrimary}   onClick={() => openAuth('signup')}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroTag}>by Pay4 · Free forever</div>
        <h1 style={S.heroTitle}>The POS built for<br/>modern restaurants</h1>
        <p style={S.heroSub}>
          Take orders, accept UPI payments, manage your menu and track every sale — all in one place.
        </p>
        <div style={S.heroBtns}>
          <button style={S.btnPrimary} onClick={() => openAuth('signup')}>Start free →</button>
          <button style={S.btnSecondary} onClick={() => openAuth('login')}>Sign in</button>
        </div>
      </div>

      {/* Features */}
      <div style={S.features}>
        {FEATURES.map(f => (
          <div key={f.title} style={S.featureCard}>
            <div style={S.featureIcon}>{f.icon}</div>
            <div style={S.featureTitle}>{f.title}</div>
            <div style={S.featureSub}>{f.sub}</div>
          </div>
        ))}
      </div>

      <footer style={S.footer}>© {new Date().getFullYear()} Pay4. All rights reserved.</footer>

      {/* Auth overlay */}
      {authOpen && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && closeAuth()}>
          <div style={S.authCard}>
            <div style={S.authHead}>
              <div style={S.authTitle}>
                {tab === 'login' ? 'Sign in to BITE.' : 'Create your account'}
              </div>
              <div style={S.authSub}>
                {tab === 'login' ? 'Enter your credentials to continue.' : 'Set up your restaurant POS in minutes.'}
              </div>
            </div>

            {/* Tabs */}
            <div style={S.authTabs}>
              {['login', 'signup'].map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
                  style={{
                    flex: 1, padding: '12px', background: 'none',
                    border: 'none', borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent',
                    color: tab === t ? '#1A1208' : '#9A9290',
                    fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: 'pointer',
                    fontFamily: "'DM Sans'",
                  }}>
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={tab === 'login' ? handleLogin : handleSignup} style={S.authBody}>
              {tab === 'signup' && (
                <>
                  <label style={S.label}>
                    <span style={S.labelText}>Your Name</span>
                    <input style={S.input} value={name} onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith" autoComplete="name" required />
                  </label>
                  <label style={S.label}>
                    <span style={S.labelText}>Restaurant Name</span>
                    <input style={S.input} value={bizName} onChange={e => setBizName(e.target.value)}
                      placeholder="Boba Baba" autoComplete="organization" required />
                  </label>
                </>
              )}
              <label style={S.label}>
                <span style={S.labelText}>Email</span>
                <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label style={S.label}>
                <span style={S.labelText}>Password</span>
                <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  required minLength={8} />
              </label>

              {error   && <div style={S.authErr}>{error}</div>}
              {success && <div style={S.authOk}>{success}</div>}

              <button type="submit" style={S.authBtn} disabled={loading}>
                {loading ? <span className="spinner" style={{borderTopColor:'#fff'}} /> : null}
                {loading ? 'Please wait…' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
