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
        background:'#25D366', color:'#fff', border:'none', borderRadius: compact ? 10 : 12,
        padding: compact ? '9px 12px' : '13px 14px', fontWeight:800,
        fontSize: compact ? 'var(--fs-12)' : 'var(--fs-14)', cursor:'pointer',
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
        boxShadow:'0 10px 22px rgba(37,211,102,0.22)', width: compact ? 'auto' : '100%',
      }}
    >
      <span aria-hidden="true">↗</span>
      Share Invoice
    </button>
  )
}
