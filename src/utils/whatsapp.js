// ─────────────────────────────────────────────────────────────
// BITE. — Emvour WhatsApp Utility
// Template: order_invoice1
// Body: "Your invoice from *{{1}}* is ready. 🧾 View & download here 👇 {{2}} Thank you for dining with us! 🙏"
// {{1}} = restaurant/business name   |   {{2}} = invoice link
// ─────────────────────────────────────────────────────────────

const RECEIPT_BASE = `${window.location.origin}/receipt`

/**
 * Send invoice WhatsApp via Emvour template order_invoice1
 * @param {object} order        - order row from Supabase (needs .id, .customer_phone)
 * @param {string} bizName      - tenant/restaurant name e.g. "Boba Baba"
 * @param {string} webhookUrl   - from tenants.wa_webhook_url
 */
export async function sendInvoiceWhatsApp(order, bizName, webhookUrl) {
  if (!webhookUrl) {
    console.warn('[BITE] WhatsApp webhook URL not configured')
    return { success: false, message: 'WhatsApp not configured in Settings' }
  }

  const phone = order.customer_phone
  if (!phone) return { success: false, message: 'No phone number on order' }

  // Normalize → 91XXXXXXXXXX (strip spaces, dashes, +)
  const digits   = phone.replace(/[\s\-\+\(\)]/g, '')
  const receiver = digits.startsWith('91') ? digits : '91' + digits

  const invoiceUrl = `${RECEIPT_BASE}?id=${order.id}`

  const payload = {
    receiver,
    values: {
      '1': bizName || 'Restaurant',  // {{1}} = business name
      '2': invoiceUrl,               // {{2}} = invoice link
    },
    media_url: invoiceUrl,           // WhatsApp link preview
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      console.log('[BITE] ✅ WhatsApp invoice sent to', receiver)
      return { success: true, message: 'Invoice sent on WhatsApp!' }
    } else {
      console.error('[BITE] ❌ Emvour error:', data)
      return { success: false, message: data?.message || 'WhatsApp send failed' }
    }
  } catch (err) {
    console.error('[BITE] ❌ WhatsApp network error:', err)
    return { success: false, message: 'Network error — WhatsApp not sent' }
  }
}