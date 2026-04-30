import React, { useState } from 'react'
import { supabase } from '../supabase'

// Landing page is ALWAYS light mode — completely isolated from theme system
const L = {
  page:    { minHeight:'100vh', background:'#F9F7F4', color:'#1A1208',
             display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif" },
  nav:     { display:'flex', alignItems:'center', justifyContent:'space-between',
             padding:'0 6%', height:60, flexShrink:0,
             background:'#ffffff', borderBottom:'1px solid #e8e4df',
             position:'sticky', top:0, zIndex:100 },
  logo:    { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:20,
             color:'#1A1208', letterSpacing:'-0.5px' },
  logoDot: { color:'#E8440A' },
  btnPri:  { background:'#E8440A', color:'#fff', border:'none',
             borderRadius:10, padding:'10px 22px', fontWeight:700,
             fontSize:13, cursor:'pointer' },
  btnSec:  { background:'transparent', color:'#1A1208',
             border:'1.5px solid #d0cbc5', borderRadius:10,
             padding:'9px 22px', fontWeight:600, fontSize:13, cursor:'pointer' },
  hero:    { flex:1, display:'flex', flexDirection:'column', alignItems:'center',
             justifyContent:'center', padding:'72px 5% 56px', textAlign:'center', gap:20 },
  tag:     { display:'inline-block', background:'rgba(232,68,10,0.1)',
             color:'#E8440A', border:'1px solid rgba(232,68,10,0.2)',
             borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:600 },
  h1:      { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800,
             fontSize:'clamp(34px,5.5vw,62px)', lineHeight:1.1,
             letterSpacing:'-1.5px', color:'#1A1208', maxWidth:680 },
  sub:     { fontSize:'clamp(15px,1.8vw,18px)', color:'#7A6E65',
             maxWidth:500, lineHeight:1.65 },
  heroBtns:{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' },
  grid:    { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',
             gap:16, padding:'0 6% 72px', maxWidth:1080, margin:'0 auto', width:'100%' },
  card:    { background:'#ffffff', border:'1px solid #e8e4df',
             borderRadius:14, padding:'22px 20px',
             display:'flex', flexDirection:'column', gap:9 },
  cIcon:   { fontSize:22 },
  cTitle:  { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
             fontSize:14, color:'#1A1208' },
  cSub:    { fontSize:13, color:'#7A6E65', lineHeight:1.55 },
  footer:  { borderTop:'1px solid #e8e4df', padding:'18px 6%',
             textAlign:'center', fontSize:12, color:'#b0a89e' },
  // Auth overlay
  overlay: { position:'fixed', inset:0, zIndex:200,
             background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)',
             display:'flex', alignItems:'center', justifyContent:'center',
             padding:16 },
  card2:   { background:'#ffffff', borderRadius:20, width:'100%',
             maxWidth:400, overflow:'hidden',
             boxShadow:'0 24px 64px rgba(0,0,0,0.35)' },
  aHead:   { background:'#1A1208', padding:'22px 26px 18px' },
  aTitle:  { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800,
             fontSize:19, color:'#F5F0E8', letterSpacing:'-0.3px' },
  aSub:    { fontSize:12, color:'rgba(245,240,232,0.5)', marginTop:3 },
  tabs:    { display:'flex', borderBottom:'1px solid #e8e4df',
             background:'#fff' },
  aBody:   { padding:'22px 26px', background:'#fff',
             display:'flex', flexDirection:'column', gap:13 },
  lbl:     { display:'flex', flexDirection:'column', gap:5 },
  lblTxt:  { fontSize:11, fontWeight:700, color:'#9A9290',
             textTransform:'uppercase', letterSpacing:'0.4px' },
  inp:     { width:'100%', padding:'10px 13px',
             border:'1.5px solid #e0dbd6', borderRadius:8,
             fontSize:14, background:'#f9f7f5', color:'#1A1208',
             outline:'none', fontFamily:"'DM Sans',sans-serif" },
  aBtn:    { width:'100%', background:'#E8440A', color:'#fff', border:'none',
             borderRadius:10, padding:'13px', fontWeight:700, fontSize:14,
             cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
             display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  err:     { background:'#FEF2F2', border:'1px solid #FECACA',
             borderRadius:8, padding:'9px 12px', fontSize:12, color:'#DC2626' },
  ok:      { background:'#F0FDF4', border:'1px solid #BBF7D0',
             borderRadius:8, padding:'9px 12px', fontSize:12, color:'#166534' },
}

const FEATURES = [
  { icon:'🛒', title:'Fast order taking',     sub:'Browse menu, add to cart, checkout in seconds.' },
  { icon:'📱', title:'UPI & cash payments',   sub:'Auto-generate UPI QR. Accept cash, card, or other.' },
  { icon:'🍽', title:'Dine in & takeaway',    sub:'Table management. Multiple order types in one view.' },
  { icon:'📋', title:'Order history',         sub:'Full history with search, refunds and revenue stats.' },
  { icon:'🏷', title:'Product management',    sub:'Add products, categories, icons and prices easily.' },
  { icon:'📲', title:'WhatsApp bills',        sub:'Customers scan a QR and get their bill on WhatsApp.' },
]

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [bizName, setBizName]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  function openAuth(t='login') { setTab(t); setError(''); setSuccess(''); setAuthOpen(true) }
  function closeAuth()          { setAuthOpen(false); setError(''); setSuccess('') }
  function switchTab(t)         { setTab(t); setError(''); setSuccess('') }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (!name || !bizName) { setError('Name and restaurant name are required'); return }
    setLoading(true); setError('')
    const slug = bizName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name:name, biz_name:bizName } }
    })
    if (error) { setLoading(false); setError(error.message); return }
    const { data:tenant } = await supabase.from('tenants')
      .insert({ slug, name:bizName, biz_name:bizName, owner_email:email })
      .select('id').single()
    if (tenant?.id && data?.user) {
      await supabase.from('profiles').upsert({
        id:data.user.id, tenant_id:tenant.id, role:'owner', full_name:name
      })
    }
    setLoading(false)
    setSuccess('Account created! Check your email to confirm, then sign in.')
    setTab('login')
  }

  const Spinner = () => (
    <span style={{ width:15,height:15,border:'2px solid rgba(255,255,255,0.35)',
      borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',
      animation:'lspin 0.65s linear infinite' }}/>
  )

  return (
    <div style={L.page}>
      <style>{`@keyframes lspin{to{transform:rotate(360deg)}}`}</style>

      {/* Nav */}
      <nav style={L.nav}>
        <span style={L.logo}>BITE<span style={L.logoDot}>.</span></span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href="/install" style={{ fontSize:12, color:'#7A6E65', textDecoration:'none',
            fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
            📲 Install app
          </a>
          <button style={L.btnSec} onClick={() => openAuth('login')}>Sign in</button>
          <button style={L.btnPri} onClick={() => openAuth('signup')}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={L.hero}>
        <span style={L.tag}>by Pay4 · Free forever</span>
        <h1 style={L.h1}>The POS built for<br/>modern restaurants</h1>
        <p style={L.sub}>
          Take orders, accept UPI payments, manage your menu and track every sale — all in one place.
        </p>
        <div style={L.heroBtns}>
          <button style={{ ...L.btnPri, padding:'13px 28px', fontSize:15 }}
            onClick={() => openAuth('signup')}>Start free →</button>
          <button style={{ ...L.btnSec, padding:'12px 28px', fontSize:15 }}
            onClick={() => openAuth('login')}>Sign in</button>
        </div>
      </div>

      {/* Feature cards */}
      <div style={L.grid}>
        {FEATURES.map(f => (
          <div key={f.title} style={L.card}>
            <span style={L.cIcon}>{f.icon}</span>
            <span style={L.cTitle}>{f.title}</span>
            <span style={L.cSub}>{f.sub}</span>
          </div>
        ))}
      </div>

      <footer style={L.footer}>© {new Date().getFullYear()} Pay4. All rights reserved.</footer>

      {/* Auth modal */}
      {authOpen && (
        <div style={L.overlay} onClick={e => e.target===e.currentTarget && closeAuth()}>
          <div style={L.card2}>
            {/* Dark header */}
            <div style={L.aHead}>
              <div style={L.aTitle}>
                {tab==='login' ? 'Sign in to BITE.' : 'Create your account'}
              </div>
              <div style={L.aSub}>
                {tab==='login' ? 'Enter your credentials to continue.'
                  : 'Set up your restaurant POS in minutes.'}
              </div>
            </div>

            {/* Tabs */}
            <div style={L.tabs}>
              {['login','signup'].map(t => (
                <button key={t} onClick={() => switchTab(t)} style={{
                  flex:1, padding:'12px', background:'none', border:'none',
                  borderBottom: tab===t ? '2px solid #E8440A' : '2px solid transparent',
                  color: tab===t ? '#1A1208' : '#9A9290',
                  fontWeight: tab===t ? 700 : 500, fontSize:13, cursor:'pointer',
                  fontFamily:"'DM Sans',sans-serif",
                }}>{t==='login' ? 'Sign In' : 'Create Account'}</button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={tab==='login' ? handleLogin : handleSignup} style={L.aBody}>
              {tab==='signup' && (
                <>
                  <label style={L.lbl}>
                    <span style={L.lblTxt}>Your Name</span>
                    <input style={L.inp} value={name} onChange={e=>setName(e.target.value)}
                      placeholder="Jane Smith" autoComplete="name" required />
                  </label>
                  <label style={L.lbl}>
                    <span style={L.lblTxt}>Restaurant Name</span>
                    <input style={L.inp} value={bizName} onChange={e=>setBizName(e.target.value)}
                      placeholder="Boba Baba" autoComplete="organization" required />
                  </label>
                </>
              )}
              <label style={L.lbl}>
                <span style={L.lblTxt}>Email</span>
                <input style={L.inp} type="email" value={email}
                  onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label style={L.lbl}>
                <span style={L.lblTxt}>Password</span>
                <input style={L.inp} type="password" value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" minLength={8} required
                  autoComplete={tab==='login'?'current-password':'new-password'} />
              </label>

              {error   && <div style={L.err}>{error}</div>}
              {success && <div style={L.ok}>{success}</div>}

              <button type="submit" style={L.aBtn} disabled={loading}>
                {loading && <Spinner />}
                {loading ? 'Please wait…'
                  : tab==='login' ? 'Sign In →'
                  : 'Create Account →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
