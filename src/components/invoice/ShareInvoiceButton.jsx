import React from 'react'
import { shareInvoiceLink } from '../../utils/invoice'
import { useStore } from '../../store/useStore'

export default function ShareInvoiceButton({ restaurantName, total, url, compact = false }) {
  const showToast = useStore(s => s.showToast)
  return (
    <button
      type="button"
      onClick={() => shareInvoiceLink({
        restaurantName,
        total,
        url,
        onDismissed: () => showToast?.('Link copied!', 'success'),
      })}
      style={{
        background:'var(--card2)',
        color:'var(--text)',
        border:'1.5px solid var(--border2)',
        borderRadius: compact ? 10 : 12,
        padding: compact ? '9px 12px' : '13px 14px',
        fontWeight:900,
        fontSize: compact ? 'var(--fs-12)' : 'var(--fs-14)',
        cursor:'pointer',
        display:'inline-flex',
        alignItems:'center',
        justifyContent:'center',
        gap:8,
        width: compact ? 'auto' : '100%',
        boxShadow:'0 10px 22px rgba(0,0,0,0.08)',
      }}
    >
      <span aria-hidden="true" style={{ color:'var(--brand)', fontWeight:900 }}>↗</span>
      Share Invoice
    </button>
  )
}
