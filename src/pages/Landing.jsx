import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const L = {
  page: { minHeight:'100vh', background:'#0D0B08', color:'#F5F0E8', display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif", overflowX:'hidden' },
  nav: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'0 clamp(16px,5vw,72px)', minHeight:68, flexShrink:0, background:'rgba(13,11,8,0.82)', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(18px)' },
  logo: { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'clamp(18px,4.5vw,22px)', color:'#F5F0E8', letterSpacing:'-0.6px', whiteSpace:'nowrap' },
  logoDot: { color:'#1D9E75' },
  btnPri: { background:'#1D9E75', color:'#fff', border:'none', borderRadius:12, padding:'clamp(9px,2.6vw,12px) clamp(14px,4vw,24px)', fontWeight:800, fontSize:'clamp(12px,3.4vw,14px)', cursor:'pointer', boxShadow:'0 12px 28px rgba(29,158,117,0.28)' },
  btnSec: { background:'rgba(255,255,255,0.06)', color:'#F5F0E8', border:'1px solid rgba(255,255,255,0.13)', borderRadius:12, padding:'clamp(8px,2.4vw,11px) clamp(13px,3.7vw,22px)', fontWeight:700, fontSize:'clamp(12px,3.4vw,14px)', cursor:'pointer' },
  hero: { position:'relative', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap:'clamp(24px,5vw,56px)', alignItems:'center', padding:'clamp(56px,10vw,112px) clamp(16px,5vw,72px) clamp(42px,8vw,82px)', maxWidth:1220, width:'100%', margin:'0 auto' },
  tag: { display:'inline-flex', width:'fit-content', background:'rgba(15,61,46,0.95)', color:'#5DCAA5', border:'1px solid rgba(29,158,117,0.28)', borderRadius:999, padding:'6px 14px', fontSize:'clamp(11px,3vw,13px)', fontWeight:800 },
  h1: { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'clamp(34px,9.5vw,76px)', lineHeight:0.96, letterSpacing:'clamp(-2.4px,-0.5vw,-1px)', color:'#F5F0E8', margin:'18px 0 0' },
  sub: { fontSize:'clamp(14px,3.5vw,19px)', color:'rgba(245,240,232,0.68)', maxWidth:560, lineHeight:1.7, margin:'18px 0 0' },
  heroBtns: { display:'flex', gap:12, flexWrap:'wrap', marginTop:26 },
  section: { padding:'clamp(28px,7vw,72px) clamp(16px,5vw,72px)', maxWidth:1220, width:'100%', margin:'0 auto' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap:16, width:'100%' },
  card: { background:'linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))', border:'1px solid rgba(255,255,255,0.10)', borderRadius:18, padding:'clamp(18px,5vw,24px)', display:'flex', flexDirection:'column', gap:10, boxShadow:'0 18px 42px rgba(0,0,0,0.18)' },
  cIcon: { fontSize:'clamp(22px,5.6vw,30px)' },
  cTitle: { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'clamp(14px,3.4vw,16px)', color:'#F5F0E8' },
  cSub: { fontSize:'clamp(12px,3.1vw,14px)', color:'rgba(245,240,232,0.58)', lineHeight:1.6 },
  footer: { borderTop:'1px solid rgba(255,255,255,0.08)', padding:'20px clamp(16px,5vw,72px)', textAlign:'center', fontSize:'clamp(11px,3vw,12px)', color:'rgba(245,240,232,0.4)' },
  overlay: { position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  card2: { background:'#12100D', borderRadius:22, width:'100%', maxWidth:420, overflow:'hidden', boxShadow:'0 28px 80px rgba(0,0,0,0.55)', border:'1px solid rgba(255,255,255,0.10)' },
  aHead: { background:'linear-gradient(135deg,#1A1208,#24140D)', padding:'22px 26px 18px', position:'relative' },
  aTitle: { fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'clamp(18px,5vw,21px)', color:'#F5F0E8', letterSpacing:'-0.3px', paddingRight:38 },
  aSub: { fontSize:'clamp(12px,3.5vw,13px)', color:'rgba(245,240,232,0.55)', marginTop:4, paddingRight:38 },
  tabs: { display:'flex', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'#100E0B' },
  aBody: { padding:'22px 26px', background:'#12100D', display:'flex', flexDirection:'column', gap:13 },
  lbl: { display:'flex', flexDirection:'column', gap:6 },
  lblTxt: { fontSize:'clamp(10px,3vw,11px)', fontWeight:800, color:'rgba(245,240,232,0.52)', textTransform:'uppercase', letterSpacing:'0.4px' },
  inp: { width:'100%', padding:'clamp(10px,3vw,12px) 13px', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:10, fontSize:'clamp(13px,3.4vw,16px)', background:'#0D0B08', color:'#F5F0E8', outline:'none', fontFamily:"'DM Sans',sans-serif" },
  aBtn: { width:'100%', background:'#1D9E75', color:'#fff', border:'none', borderRadius:12, padding:'clamp(12px,3.6vw,14px)', fontWeight:800, fontSize:'clamp(14px,4vw,15px)', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  err: { background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.28)', borderRadius:10, padding:'9px 12px', fontSize:'clamp(12px,3.5vw,13px)', color:'#FCA5A5' },
  ok: { background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.28)', borderRadius:10, padding:'9px 12px', fontSize:'clamp(12px,3.5vw,13px)', color:'#86EFAC' },
}

const FEATURES = [
  { icon:'⚡', title:'Fast order taking', sub:'Tap menu cards, edit quantities and checkout in seconds.' },
  { icon:'🍽', title:'Dine-in, takeaway, delivery', sub:'Switch order modes, manage tables and keep rounds moving.' },
  { icon:'🍳', title:'Kitchen display', sub:'Send KOTs instantly and track waiting, preparing and ready orders.' },
  { icon:'📲', title:'WhatsApp bills', sub:'Send polished bills and invoices to customers from the POS.' },
  { icon:'🏷', title:'Menu management', sub:'Create categories, products, prices, icons and stock status.' },
  { icon:'📊', title:'History & insights', sub:'Review orders, payments, refunds and revenue from one screen.' },
]

const STEPS = [
  { n:'01', title:'Create your restaurant', sub:'Sign up, confirm your email and your POS workspace is ready.' },
  { n:'02', title:'Add menu or samples', sub:'Start from your own products or seed a sample menu in one click.' },
  { n:'03', title:'Take orders live', sub:'Use the app on mobile, tablet or desktop — install it as a PWA.' },
]

const FAQS = [
  { q:'Can I install BITE. like an app?', a:'Yes. Use Install app from the top bar. On supported browsers it opens the native PWA install prompt.' },
  { q:'Does it support dine-in tables?', a:'Yes. Dine-in mode supports tables, multiple rounds and checkout for active table orders.' },
  { q:'Can I start without building a full menu?', a:'Yes. New accounts can add a selectable sample menu and edit it later.' },
  { q:'What payment methods are supported?', a:'Cash, UPI, card and other payment labels are available during checkout.' },
]

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [bizName, setBizName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(window.__biteDeferredPrompt || null)
  const [installed, setInstalled] = useState(
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  )

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      window.__biteDeferredPrompt = event
      setDeferredPrompt(event)
    }
    const handleInstalled = () => {
      setInstalled(true)
      window.__biteDeferredPrompt = null
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function handleInstallApp() {
    if (installed) return
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      window.__biteDeferredPrompt = null
      setDeferredPrompt(null)
      return
    }
    window.history.pushState({}, '', '/install')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  function openAuth(t='login') { setTab(t); setError(''); setSuccess(''); setAuthOpen(true) }
  function closeAuth() { setAuthOpen(false); setError(''); setSuccess('') }
  function switchTab(t) { setTab(t); setError(''); setSuccess('') }

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
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, bizName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not create account'); return }
      setSuccess('Account created! We sent a BITE. verification email with a secure button to confirm your account.')
      setTab('login')
    } catch (err) {
      setError('Could not reach signup service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Spinner = () => (
    <span style={{ width:15,height:15,border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'lspin 0.65s linear infinite' }}/>
  )

  return (
    <div style={L.page}>
      <style>{`@keyframes lspin{to{transform:rotate(360deg)}} @media(max-width:560px){.landing-actions{gap:6px!important}.hide-mobile{display:none!important}}`}</style>

      <nav style={L.nav}>
        <span style={L.logo}>BITE<span style={L.logoDot}>.</span></span>
        <div className="landing-actions" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
          <button onClick={handleInstallApp} style={{ fontSize:'clamp(11px,3.2vw,12px)', color:'rgba(245,240,232,0.7)', background:'transparent', border:'none', fontWeight:700, display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
            {installed ? '✅ Installed' : '📲 Install app'}
          </button>
          <button style={L.btnSec} onClick={() => openAuth('login')}>Sign in</button>
          <button style={L.btnPri} onClick={() => openAuth('signup')}>Get started</button>
        </div>
      </nav>

      <section style={L.hero}>
        <div>
          <span style={L.tag}>by Pay4 · built for modern restaurants</span>
          <h1 style={L.h1}>POS that feels fast, native and effortless.</h1>
          <p style={L.sub}>Take orders, send kitchen tickets, accept payments, manage menus and install BITE. as an app on any device.</p>
          <div style={L.heroBtns}>
            <button style={{ ...L.btnPri, padding:'clamp(13px,4vw,16px) clamp(22px,6vw,32px)' }} onClick={() => openAuth('signup')}>Start free →</button>
            <button style={{ ...L.btnSec, padding:'clamp(12px,3.8vw,15px) clamp(22px,6vw,32px)' }} onClick={() => openAuth('login')}>Sign in</button>
          </div>
        </div>
        <div style={{ background:'radial-gradient(circle at top right,rgba(29,158,117,0.28),transparent 45%),linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))', border:'1px solid rgba(255,255,255,0.12)', borderRadius:28, padding:'clamp(18px,5vw,28px)', boxShadow:'0 28px 80px rgba(0,0,0,0.35)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ fontFamily:"'Plus Jakarta Sans'", fontWeight:800, fontSize:'clamp(17px,4.2vw,24px)' }}>Live counter</div>
            <span style={{ background:'rgba(34,197,94,0.14)', color:'#86EFAC', border:'1px solid rgba(34,197,94,0.24)', borderRadius:999, padding:'5px 10px', fontSize: 'var(--fs-12)', fontWeight:800 }}>Open</span>
          </div>
          {['Dine-in table T4 · ₹1,246', 'Takeaway order · ₹498', 'Kitchen: 3 items preparing'].map((row, idx) => (
            <div key={row} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderTop: idx ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <span style={{ width:36, height:36, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(15,61,46,0.8)' }}>{idx===0?'🍽':idx===1?'🛍':'🍳'}</span>
              <span style={{ flex:1, color:'rgba(245,240,232,0.78)', fontSize:'clamp(12px,3.1vw,15px)' }}>{row}</span>
              <span style={{ color:'#1D9E75', fontWeight:800 }}>→</span>
            </div>
          ))}
        </div>
      </section>

      <section style={L.section}>
        <div style={{ marginBottom:20 }}>
          <span style={L.tag}>Faster order taking</span>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontSize:'clamp(24px,5.8vw,42px)', letterSpacing:'-1px', marginTop:12 }}>Everything your counter needs.</h2>
        </div>
        <div style={L.grid}>{FEATURES.map(f => <div key={f.title} style={L.card}><span style={L.cIcon}>{f.icon}</span><span style={L.cTitle}>{f.title}</span><span style={L.cSub}>{f.sub}</span></div>)}</div>
      </section>

      <section style={L.section}>
        <div style={{ marginBottom:20 }}>
          <span style={L.tag}>Start in minutes</span>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontSize:'clamp(24px,5.8vw,42px)', letterSpacing:'-1px', marginTop:12 }}>From signup to first order.</h2>
        </div>
        <div style={{ ...L.grid, gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))' }}>{STEPS.map(s => <div key={s.n} style={L.card}><span style={{ color:'#1D9E75', fontWeight:900, fontSize: 'var(--fs-13)' }}>{s.n}</span><span style={L.cTitle}>{s.title}</span><span style={L.cSub}>{s.sub}</span></div>)}</div>
      </section>

      <section style={L.section}>
        <h2 style={{ fontFamily:"'Plus Jakarta Sans'", fontSize:'clamp(24px,5.8vw,42px)', letterSpacing:'-1px', marginBottom:18 }}>FAQs</h2>
        <div style={{ display:'grid', gap:12 }}>{FAQS.map(f => <details key={f.q} style={{ ...L.card, padding:'16px 18px' }}><summary style={{ cursor:'pointer', fontWeight:800, fontSize:'clamp(13px,3.4vw,16px)' }}>{f.q}</summary><p style={{ margin:'10px 0 0', color:'rgba(245,240,232,0.6)', lineHeight:1.6, fontSize:'clamp(12px,3.2vw,15px)' }}>{f.a}</p></details>)}</div>
      </section>

      <footer style={L.footer}>© {new Date().getFullYear()} Pay4. All rights reserved.</footer>

      {authOpen && (
        <div style={L.overlay}>
          <div style={L.card2}>
            <div style={L.aHead}>
              <button aria-label="Close" onClick={closeAuth} style={{ position:'absolute', top:16, right:16, width:32, height:32, borderRadius:10, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'#F5F0E8', fontSize: 'var(--fs-18)', cursor:'pointer' }}>×</button>
              <div style={L.aTitle}>{tab==='login' ? 'Sign in to BITE.' : 'Create your account'}</div>
              <div style={L.aSub}>{tab==='login' ? 'Enter your credentials to continue.' : 'Set up your restaurant POS in minutes.'}</div>
            </div>

            <div style={L.tabs}>{['login','signup'].map(t => <button key={t} onClick={() => switchTab(t)} style={{ flex:1, padding:'13px', background:'none', border:'none', borderBottom: tab===t ? '2px solid #1D9E75' : '2px solid transparent', color: tab===t ? '#F5F0E8' : 'rgba(245,240,232,0.42)', fontWeight: tab===t ? 800 : 600, fontSize:'clamp(12px,3.5vw,14px)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{t==='login' ? 'Sign In' : 'Create Account'}</button>)}</div>

            <form onSubmit={tab==='login' ? handleLogin : handleSignup} style={L.aBody}>
              {tab==='signup' && <><label style={L.lbl}><span style={L.lblTxt}>Your Name</span><input style={L.inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Smith" autoComplete="name" required /></label><label style={L.lbl}><span style={L.lblTxt}>Restaurant Name</span><input style={L.inp} value={bizName} onChange={e=>setBizName(e.target.value)} placeholder="Restaurant name" autoComplete="organization" required /></label></>}
              <label style={L.lbl}><span style={L.lblTxt}>Email</span><input style={L.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
              <label style={L.lbl}><span style={L.lblTxt}>Password</span><input style={L.inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" minLength={8} required autoComplete={tab==='login'?'current-password':'new-password'} /></label>
              {error && <div style={L.err}>{error}</div>}
              {success && <div style={L.ok}>{success}</div>}
              <button type="submit" style={L.aBtn} disabled={loading}>{loading && <Spinner />}{loading ? 'Please wait…' : tab==='login' ? 'Sign In →' : 'Create Account →'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
