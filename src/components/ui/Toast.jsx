import React from 'react'
import { useStore } from '../../store/useStore'

const COLORS = {
  info:    { bg: '#1C1916', border: 'rgba(255,255,255,0.1)',  icon: 'ℹ️' },
  success: { bg: '#0F2318',  border: 'rgba(34,197,94,0.3)',   icon: '✅' },
  error:   { bg: '#1F0F0F',  border: 'rgba(239,68,68,0.3)',   icon: '❌' },
  warning: { bg: '#1F1A0F',  border: 'rgba(245,158,11,0.3)',  icon: '⚠️' },
}

export default function Toast() {
  const toast = useStore(s => s.toast)
  if (!toast) return null
  const c = COLORS[toast.type] || COLORS.info
  return (
    <div key={toast.id} style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, animation: 'slideUp 0.25s ease',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 8,
      color: '#F5F0E8', fontSize: 'var(--fs-13)', fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      maxWidth: 'min(400px, 90vw)', whiteSpace: 'pre-wrap',
    }}>
      <span>{c.icon}</span>
      <span>{toast.msg}</span>
    </div>
  )
}
