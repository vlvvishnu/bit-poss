import React, { useState, useEffect } from 'react'

export default function Install() {
  const [platform, setPlatform] = useState('unknown')
  const [installed, setInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(window.__biteDeferredPrompt || null)

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase()
    const isIOS     = /iphone|ipad|ipod/.test(ua)
    const isMac     = /macintosh/.test(ua) && navigator.maxTouchPoints > 1 // iPad
    const isAndroid = /android/.test(ua)
    const isChrome  = /chrome/.test(ua) && !/edge/.test(ua)
    const isSafari  = /safari/.test(ua) && !/chrome/.test(ua)

    if (isIOS || isMac) setPlatform('ios')
    else if (isAndroid && isChrome) setPlatform('android')
    else if (isChrome) setPlatform('chrome')
    else setPlatform('other')

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    // Capture install prompt (Android/Chrome)
    const handler = (e) => {
      e.preventDefault()
      window.__biteDeferredPrompt = e
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function triggerInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    window.__biteDeferredPrompt = null
    setDeferredPrompt(null)
  }

  const STEPS = {
    ios: [
      { icon: '1', text: 'Open this page in Safari (not Chrome)' },
      { icon: '2', text: 'Tap the Share button at the bottom of the screen' },
      { icon: '3', text: 'Scroll down and tap "Add to Home Screen"' },
      { icon: '4', text: 'Tap "Add" in the top right corner' },
    ],
    android: [
      { icon: '1', text: 'Tap "Install App" button below' },
      { icon: '2', text: 'Tap "Install" in the prompt that appears' },
      { icon: '3', text: 'BITE. will appear on your home screen' },
    ],
    chrome: [
      { icon: '1', text: 'Click the install icon (⊕) in the address bar' },
      { icon: '2', text: 'Or open Chrome menu → "Install BITE. POS"' },
      { icon: '3', text: 'Click "Install" to confirm' },
    ],
    other: [
      { icon: '1', text: 'Open this page in Chrome or Safari' },
      { icon: '2', text: 'Use the browser menu to "Add to Home Screen" or "Install App"' },
    ],
  }

  const steps = STEPS[platform] || STEPS.other

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9F7F4',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>

      {/* App icon */}
      <div style={{
        width: 96, height: 96, borderRadius: 24,
        background: '#E8440A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        boxShadow: '0 8px 32px rgba(232,68,10,0.3)',
        animation: 'bounce 2s ease-in-out infinite',
      }}>
        <img src="/icon-512.png" alt="BITE."
          style={{ width: 60, height: 60, borderRadius: 12 }} />
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800, fontSize: 'var(--fs-28)', color: '#1A1208',
        letterSpacing: '-0.5px', marginBottom: 6, textAlign: 'center',
      }}>
        BITE<span style={{ color: '#E8440A' }}>.</span> POS
      </h1>
      <p style={{
        fontSize: 'var(--fs-15)', color: '#7A6E65', marginBottom: 32,
        textAlign: 'center', lineHeight: 1.5, maxWidth: 280,
      }}>
        Install the app for the best experience — works offline, feels native.
      </p>

      {/* Already installed */}
      {installed ? (
        <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 12, padding: '16px 24px',
          textAlign: 'center', marginBottom: 24,
        }}>
          <div style={{ fontSize: 'var(--fs-28)', marginBottom: 6 }}>✅</div>
          <div style={{ fontWeight: 700, color: '#166534', fontSize: 'var(--fs-15)' }}>
            Already installed!
          </div>
          <div style={{ fontSize: 'var(--fs-13)', color: '#166534', marginTop: 4 }}>
            Look for BITE. on your home screen.
          </div>
        </div>
      ) : (
        <>
          {/* Android install button */}
          {deferredPrompt && (
            <button onClick={triggerInstall} style={{
              background: '#E8440A', color: '#fff', border: 'none',
              borderRadius: 14, padding: '16px 40px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800, fontSize: 'var(--fs-17)', cursor: 'pointer',
              marginBottom: 32,
              boxShadow: '0 4px 16px rgba(232,68,10,0.35)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 'var(--fs-22)' }}>📲</span>
              Install App
            </button>
          )}

          {/* Step-by-step instructions */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #e8e4df',
            padding: '20px', width: '100%', maxWidth: 360,
            marginBottom: 24,
          }}>
            <div style={{
              fontSize: 'var(--fs-12)', fontWeight: 700, color: '#9A9290',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 'var(--fs-16)' }}>
                {platform === 'ios' ? '🍎' : platform === 'android' ? '🤖' : '💻'}
              </span>
              {platform === 'ios' ? 'iOS / iPhone / iPad'
                : platform === 'android' ? 'Android'
                : platform === 'chrome' ? 'Chrome on desktop'
                : 'Install instructions'}
            </div>
            {steps.map((s, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                marginBottom: i < steps.length - 1 ? 14 : 0,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#E8440A', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--fs-12)', fontWeight: 800, flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 'var(--fs-14)', color: '#1A1208', lineHeight: 1.5, paddingTop: 2 }}>
                  {s.text}
                </div>
              </div>
            ))}
          </div>

          {/* iOS share hint */}
          {platform === 'ios' && (
            <div style={{
              background: '#fff3cd', border: '1px solid #ffc107',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 'var(--fs-13)', color: '#856404', maxWidth: 360,
              textAlign: 'center', marginBottom: 16,
            }}>
              📌 Look for the share icon: <strong>⬆</strong> at the bottom of Safari
            </div>
          )}
        </>
      )}

      {/* Back to app */}
      <a href="/" style={{
        color: '#E8440A', fontSize: 'var(--fs-14)', fontWeight: 600,
        textDecoration: 'none', marginTop: 8,
      }}>
        ← Back to BITE.
      </a>

      {/* Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px', textAlign: 'center',
        fontSize: 'var(--fs-11)', color: '#b0a89e',
        background: '#F9F7F4',
      }}>
        BITE. POS by Pay4 · Free forever
      </div>
    </div>
  )
}
