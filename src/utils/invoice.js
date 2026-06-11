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


function safeFilePart(value = 'qr') {
  return String(value || 'qr').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qr'
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function canvasToBlob(canvas, type = 'image/png') {
  return new Promise(resolve => canvas.toBlob(resolve, type))
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

function writeUint16(bytes, offset, value) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
}

function crc32(bytes) {
  let crc = -1
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

export async function createZipBlob(files) {
  const encoder = new TextEncoder()
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const data = new Uint8Array(await file.blob.arrayBuffer())
    const crc = crc32(data)

    const local = new Uint8Array(30 + nameBytes.length)
    writeUint32(local, 0, 0x04034b50)
    writeUint16(local, 4, 20)
    writeUint16(local, 6, 0)
    writeUint16(local, 8, 0)
    writeUint32(local, 14, crc)
    writeUint32(local, 18, data.length)
    writeUint32(local, 22, data.length)
    writeUint16(local, 26, nameBytes.length)
    local.set(nameBytes, 30)
    localParts.push(local, data)

    const central = new Uint8Array(46 + nameBytes.length)
    writeUint32(central, 0, 0x02014b50)
    writeUint16(central, 4, 20)
    writeUint16(central, 6, 20)
    writeUint16(central, 8, 0)
    writeUint16(central, 10, 0)
    writeUint32(central, 16, crc)
    writeUint32(central, 20, data.length)
    writeUint32(central, 24, data.length)
    writeUint16(central, 28, nameBytes.length)
    writeUint32(central, 42, offset)
    central.set(nameBytes, 46)
    centralParts.push(central)

    offset += local.length + data.length
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  writeUint32(end, 0, 0x06054b50)
  writeUint16(end, 8, files.length)
  writeUint16(end, 10, files.length)
  writeUint32(end, 12, centralSize)
  writeUint32(end, 16, offset)

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' })
}

export function downloadBlob(blob, fileName) {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function fitText(ctx, text, maxWidth) {
  let fitted = String(text || '')
  while (fitted.length > 3 && ctx.measureText(fitted).width > maxWidth) fitted = `${fitted.slice(0, -2)}…`
  return fitted
}

export async function createQrStandBlob({ url, label, restaurantName, theme = 'dark' }) {
  const canvas = document.createElement('canvas')
  canvas.width = 827
  canvas.height = 1063
  const ctx = canvas.getContext('2d')
  const dark = theme === 'dark'
  const bg = dark ? '#111111' : '#ffffff'
  const primaryText = dark ? '#ffffff' : '#111111'
  const mutedText = dark ? '#9ca3af' : '#9ca3af'
  const line = dark ? '#303030' : '#e5e7eb'
  const green = dark ? '#1D9E75' : '#0F6E56'
  const qrBg = dark ? '#ffffff' : '#f7f7f7'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 827, 1063)

  ctx.textAlign = 'center'
  if (restaurantName) {
    ctx.fillStyle = dark ? '#d9c1ad' : '#8c6d5a'
    ctx.font = '500 32px Inter, Arial, sans-serif'
    ctx.fillText(fitText(ctx, restaurantName, 620), 413, 118)
  }

  ctx.fillStyle = primaryText
  ctx.font = '700 42px Inter, Arial, sans-serif'
  ctx.fillText('BITE', 395, restaurantName ? 166 : 132)
  ctx.fillStyle = green
  ctx.beginPath()
  ctx.arc(465, restaurantName ? 154 : 120, 6, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(145, 220)
  ctx.lineTo(682, 220)
  ctx.stroke()

  const qrImg = await loadImage(qrImageUrl(url, 400))
  ctx.fillStyle = qrBg
  roundRect(ctx, 213, 250, 400, 400, 24)
  ctx.fill()
  ctx.drawImage(qrImg, 233, 270, 360, 360)

  ctx.fillStyle = primaryText
  ctx.font = '700 28px Inter, Arial, sans-serif'
  ctx.fillText('Scan to view your', 413, 725)
  ctx.fillText('order & bill', 413, 760)

  ctx.font = '700 22px Inter, Arial, sans-serif'
  const pillText = fitText(ctx, label, 230)
  const pillWidth = Math.max(160, Math.min(280, ctx.measureText(pillText).width + 54))
  ctx.fillStyle = green
  roundRect(ctx, (827 - pillWidth) / 2, 800, pillWidth, 44, 22)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(pillText, 413, 829)

  ctx.fillStyle = mutedText
  ctx.font = '400 20px Inter, Arial, sans-serif'
  ctx.fillText('Point your camera to scan', 413, 900)
  ctx.fillText('No app needed', 413, 932)
  ctx.fillStyle = green
  ctx.fillText('app.bite.com', 413, 964)

  return canvasToBlob(canvas)
}

export async function downloadQrStand(options) {
  const blob = await createQrStandBlob(options)
  downloadBlob(blob, `bite-${safeFilePart(options.label)}-qr-stand.png`)
}
