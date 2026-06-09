import React, { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, maxWidth = 480, footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null
  return (
    <div onClick={e => e.target === e.currentTarget && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--r-lg)',
        width: '100%', maxWidth, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border2)',
        animation: 'popIn 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 700, fontSize: 'var(--fs-15)', color: 'var(--text)' }}>
            {title}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text2)',
            fontSize: 'var(--fs-18)', lineHeight: 1, padding: 4, borderRadius: 6,
          }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
