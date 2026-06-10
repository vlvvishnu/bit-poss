// ─────────────────────────────────────────────────────────────
// BITE. — Emvour WhatsApp Utility
// Template: order invoice1
// API payload contract: { receiver, values: { "1": business name, "2": invoice URL }, media_url }
// {{1}} = restaurant/business name   |   {{2}} = invoice link
// NOTE: media_url must be a real media file URL (png/jpg/pdf/etc.), not the invoice page.
// ─────────────────────────────────────────────────────────────

const WHATSAPP_TEMPLATE_API_URL = 'https://adminapis.backendprod.com/lms_campaign/api/whatsapp/template/k51iz3b7dy/process'
const FALLBACK_PUBLIC_ORIGIN = 'https://bite.pay4.space'

function publicOrigin() {
  const origin = window.location.origin
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ? FALLBACK_PUBLIC_ORIGIN : origin
}

/**
 * Send invoice WhatsApp via fixed Emvour template API.
 * @param {object} order        - order row from Supabase (needs .id, .customer_phone)
 * @param {string} bizName      - tenant/restaurant name e.g. "Boba Baba"
 */
export async function sendInvoiceWhatsApp(order, bizName) {

  const phone = order.customer_phone
  if (!phone) return { success: false, message: 'No phone number on order' }

  // Normalize → 91XXXXXXXXXX (strip spaces, dashes, +)
  const digits   = phone.replace(/[\s\-\+\(\)]/g, '')
  const receiver = digits.startsWith('91') ? digits : '91' + digits
  const origin = publicOrigin()

  const invoiceUrl = `${origin}/invoice/${order.id}`

  const payload = {
    receiver,
    values: {
      '1': bizName || 'Restaurant',
      '2': invoiceUrl,
    },
    // Emvour maps this to the WhatsApp header media parameter. It must be a direct media URL.
    media_url: `${origin}/icon-512.png`,
  }

  try {
    const res = await fetch(WHATSAPP_TEMPLATE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      console.log('[BITE] ✅ WhatsApp invoice sent to', receiver)
      return { success: true, message: 'Invoice sent on WhatsApp!' }
    } else {
      console.error('[BITE] ❌ Emvour error:', data, payload)
      return { success: false, message: data?.message || data?.error || 'WhatsApp send failed' }
    }
  } catch (err) {
    console.error('[BITE] ❌ WhatsApp network error:', err)
    return { success: false, message: 'Network error — WhatsApp not sent' }
  }
}
