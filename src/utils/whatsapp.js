// Emovur WhatsApp API — send invoice link via template message
// Docs: https://support.emovur.com/developers/api-documentation/send-template-message-api

export function formatPhone(phone) {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10) digits = '91' + digits
  return '+' + digits
}

export function formatItemsList(orderItems) {
  return (orderItems||[])
    .filter(i => i.status !== 'rejected')
    .map(i => `• ${i.product_name} ×${i.qty}  ₹${(Number(i.unit_price)*i.qty).toFixed(2)}`)
    .join('\n')
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day:'numeric', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
  })
}

// Main send function — posts to the per-template webhook URL from Emovur dashboard
export async function sendInvoiceWhatsApp({ webhookUrl, receiver, bizName,
  orderNumber, date, items, total, payMethod, invoiceUrl }) {

  if (!webhookUrl) throw new Error('Emovur webhook URL not set in Settings → WhatsApp')
  if (!receiver)   throw new Error('No phone number for this order')

  const phone = formatPhone(receiver)
  if (!phone) throw new Error('Invalid phone number format')

  // Emovur payload: receiver + numbered variable values matching template
  const payload = {
    receiver: phone,
    values: {
      '1': String(bizName),
      '2': String(orderNumber),
      '3': String(date),
      '4': String(items),
      '5': String(total),
      '6': String(payMethod),
      '7': String(invoiceUrl),
    },
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText)
    throw new Error(`Emovur API error (${res.status}): ${txt}`)
  }
  return res.json().catch(()=>({ success:true }))
}
