const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateInvoiceToken(length = 12) {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : null
  let token = ''
  for (let i = 0; i < length; i += 1) {
    let idx
    if (cryptoObj?.getRandomValues) {
      const buf = new Uint8Array(1)
      cryptoObj.getRandomValues(buf)
      idx = buf[0] % TOKEN_CHARS.length
    } else {
      idx = Math.floor(Math.random() * TOKEN_CHARS.length)
    }
    token += TOKEN_CHARS[idx]
  }
  return token
}

export function normalizeIndianPhone(input = '') {
  let digits = String(input || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

export function isValidCustomerPhone(input = '') {
  return /^\d{10}$/.test(normalizeIndianPhone(input))
}

export function invoiceUrl(tokenOrId, origin = window.location.origin) {
  return `${origin}/invoice/${tokenOrId}`
}

export function tenantSlug(settings = {}) {
  const raw = settings.slug || settings.tenant_slug || settings.biz_name || settings.name || 'restaurant'
  return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant'
}

export function publicAppUrl(path = '') {
  const base = (window.__ENV__?.PUBLIC_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL || 'https://app.bite.com').replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export async function shareInvoiceLink({ restaurantName, total, url, onDismissed }) {
  const shareData = {
    title: `${restaurantName} Invoice`,
    text: `Your invoice for ₹${Number(total || 0).toFixed(2)}`,
    url,
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
      return 'native'
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      try { await navigator.clipboard?.writeText(url) } catch (_) {}
      onDismissed?.()
      return 'dismissed'
    }
    if (error?.name !== 'NotAllowedError') {
      try { await navigator.clipboard?.writeText(url) } catch (_) {}
    }
  }

  const waText = `Your invoice from ${restaurantName} ₹${Number(total || 0).toFixed(2)} ${url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer')
  return 'whatsapp'
}

export function qrImageUrl(value, size = 840) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=18&data=${encodeURIComponent(value)}`
}
