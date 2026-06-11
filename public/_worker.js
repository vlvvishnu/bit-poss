// Cloudflare Pages Worker
// Handles server-only signup email and injects public env vars into HTML.

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function firstConfiguredEnv(env, names) {
  const name = names.find(key => Boolean(env[key]))
  return name ? { name, value: env[name] } : { name: null, value: '' }
}

function serviceRoleKey(env) {
  return firstConfiguredEnv(env, [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_ROLE',
    'SERVICE_ROLE_KEY',
  ]).value
}

function brevoKey(env) {
  return firstConfiguredEnv(env, [
    'BREVO_API_KEY',
    'BREVO_KEY',
    'VITE_BREVO_KEY',
  ]).value
}

function signupConfigStatus(env) {
  const service = firstConfiguredEnv(env, [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_ROLE',
    'SERVICE_ROLE_KEY',
  ])
  const brevo = firstConfiguredEnv(env, [
    'BREVO_API_KEY',
    'BREVO_KEY',
    'VITE_BREVO_KEY',
  ])

  return {
    supabaseUrlConfigured: Boolean(env.SUPABASE_URL),
    supabaseAnonConfigured: Boolean(env.SUPABASE_ANON_KEY),
    supabaseServiceConfigured: Boolean(service.value),
    supabaseServiceEnvName: service.name,
    brevoConfigured: Boolean(brevo.value),
    brevoEnvName: brevo.name,
    brevoSenderEmail: env.BREVO_FROM_EMAIL || env.BREVO_SENDER_EMAIL || env.FROM_EMAIL || 'noreply@pay4.space',
    brevoSenderName: env.BREVO_FROM_NAME || env.BREVO_SENDER_NAME || 'Pay4 Team',
  }
}

function supabaseConfig(env) {
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceRole = serviceRoleKey(env)
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Signup is not configured. Missing SUPABASE_SERVICE_ROLE_KEY in Cloudflare.')
  }
  return { supabaseUrl, serviceRole }
}

async function supabaseAdminFetch(env, path, init = {}) {
  const { supabaseUrl, serviceRole } = supabaseConfig(env)
  return fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}

function base64UrlEncode(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value)
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function hmac(env, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serviceRoleKey(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return base64UrlEncode(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
}

async function signConfirmationToken(env, payload) {
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = await hmac(env, body)
  return `${body}.${signature}`
}

async function verifyConfirmationToken(env, token) {
  const [body, signature] = String(token || '').split('.')
  if (!body || !signature) throw new Error('Invalid confirmation link.')
  const expected = await hmac(env, body)
  if (signature !== expected) throw new Error('Invalid confirmation link.')

  const payload = JSON.parse(base64UrlDecode(body))
  if (!payload.uid || !payload.email || !payload.exp) throw new Error('Invalid confirmation link.')
  if (Date.now() > payload.exp) throw new Error('Confirmation link expired. Please create your account again.')
  return payload
}

function verificationEmailHtml({ origin, verifyUrl, name, bizName }) {
  const safeName = escapeHtml(name || 'there')
  const safeBizName = escapeHtml(bizName || 'your restaurant')
  const safeVerifyUrl = escapeHtml(verifyUrl)
  const logoUrl = `${origin}/email-logo.svg?v=2`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirm your BITE. account</title>
  </head>
  <body style="margin:0;padding:0;background:#F9F7F4;font-family:'DM Sans',Arial,sans-serif;color:#1A1208;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F4;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E8E4DF;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(26,18,8,0.10);">
            <tr>
              <td style="background:#1A1208;padding:30px 28px;text-align:center;">
                <img src="${logoUrl}" width="72" height="72" alt="BITE." style="display:block;margin:0 auto 14px;border-radius:18px;">
                <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.8px;color:#F5F0E8;">BITE<span style="color:#1D9E75;">.</span></div>
                <div style="margin-top:6px;color:rgba(245,240,232,0.62);font-size:13px;">Restaurant POS by Pay4</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 12px;text-align:center;">
                <div style="display:inline-block;background:rgba(225,245,238,0.9);color:#1D9E75;border:1px solid rgba(168,217,200,0.35);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:0.2px;">Confirm your account</div>
                <h1 style="font-family:'Plus Jakarta Sans',Arial,sans-serif;margin:18px 0 10px;font-size:28px;line-height:1.16;letter-spacing:-0.7px;color:#1A1208;">Welcome to BITE., ${safeName}</h1>
                <p style="margin:0 auto;color:#7A6E65;font-size:15px;line-height:1.65;max-width:420px;">Tap the button below to confirm your email and activate <strong style="color:#1A1208;">${safeBizName}</strong>.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 30px 34px;">
                <a href="${safeVerifyUrl}" style="display:inline-block;background:#1D9E75;color:#ffffff;text-decoration:none;border-radius:14px;padding:15px 34px;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:15px;font-weight:800;box-shadow:0 10px 22px rgba(29,158,117,0.24);">Confirm my email</a>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #E8E4DF;padding:18px 30px;text-align:center;color:#B0A89E;font-size:11px;">
                BITE. POS by Pay4 · This confirmation link may expire for your security.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendConfirmationEmail(env, payload) {
  const apiKey = brevoKey(env)
  if (!apiKey) throw new Error('Signup email is not configured. Missing Brevo API key.')

  const senderEmail = env.BREVO_FROM_EMAIL || env.BREVO_SENDER_EMAIL || env.FROM_EMAIL || 'noreply@pay4.space'
  const senderName = env.BREVO_FROM_NAME || env.BREVO_SENDER_NAME || 'Pay4 Team'
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: payload.email, name: payload.name }],
      subject: 'Confirm your BITE. POS account',
      htmlContent: verificationEmailHtml(payload),
      textContent: `Welcome to BITE. POS. Confirm your account: ${payload.verifyUrl}`,
    }),
  })

  if (!response.ok) {
    const detailText = await response.text().catch(() => '')
    let detail = null
    try { detail = JSON.parse(detailText) } catch {}
    console.error('[BITE] Brevo send failed:', response.status, detailText)
    const brevoMessage = detail?.message || detailText || 'Check Brevo API key, sender email, and domain verification settings.'
    const brevoCode = detail?.code ? ` ${detail.code}` : ''
    throw new Error(`Brevo email failed (${response.status}${brevoCode}): ${brevoMessage}`)
  }
}

async function createAuthUser(env, { email, password, name, bizName }) {
  const response = await supabaseAdminFetch(env, '/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: name, biz_name: bizName },
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.msg || data.error_description || data.error || 'Could not create account.'
    throw new Error(message)
  }
  return data
}

async function confirmAuthUser(env, userId) {
  const response = await supabaseAdminFetch(env, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ email_confirm: true }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = data.msg || data.error_description || data.error || 'Could not confirm account.'
    throw new Error(message)
  }
}

async function deleteAuthUser(env, userId) {
  if (!userId) return
  const response = await supabaseAdminFetch(env, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    console.error('[BITE] Auth user cleanup failed:', response.status, await response.text().catch(() => ''))
  }
}

async function deleteTenantByOwner(env, email) {
  if (!email) return
  const response = await supabaseAdminFetch(env, `/rest/v1/tenants?owner_email=eq.${encodeURIComponent(email)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    console.error('[BITE] Tenant cleanup failed:', response.status, await response.text().catch(() => ''))
  }
}

async function createTenantAndProfile(env, { email, name, bizName, userId }) {
  const baseSlug = slugify(bizName) || `restaurant-${Date.now()}`
  let tenantData = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
    const tenantResponse = await supabaseAdminFetch(env, '/rest/v1/tenants?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ slug, name: bizName, biz_name: bizName, owner_email: email }),
    })
    tenantData = await tenantResponse.json().catch(() => [])
    if (tenantResponse.ok) break
    if (tenantResponse.status !== 409 || attempt === 2) {
      console.error('[BITE] Tenant create failed:', tenantResponse.status, tenantData)
      return null
    }
  }

  const tenantId = tenantData?.[0]?.id
  if (tenantId && userId) {
    const profileResponse = await supabaseAdminFetch(env, '/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: userId, tenant_id: tenantId, role: 'owner', full_name: name }),
    })
    if (!profileResponse.ok) {
      console.error('[BITE] Profile upsert failed:', profileResponse.status, await profileResponse.text().catch(() => ''))
    }
  }

  return tenantId
}

async function handleSignup(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid signup request.' }, 400)
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const name = String(body.name || '').trim()
  const bizName = String(body.bizName || '').trim()
  if (!email || !password || !name || !bizName) return json({ error: 'All signup fields are required.' }, 400)
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
  if (!brevoKey(env)) return json({ error: 'Signup email is not configured. Missing Brevo API key.' }, 500)

  const origin = new URL(request.url).origin
  const user = await createAuthUser(env, { email, password, name, bizName })
  const userId = user.id || user.user?.id
  if (!userId) return json({ error: 'Could not create account.' }, 500)

  await createTenantAndProfile(env, { email, name, bizName, userId })

  const token = await signConfirmationToken(env, {
    uid: userId,
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 2,
  })

  try {
    await sendConfirmationEmail(env, {
      origin,
      verifyUrl: `${origin}/api/confirm?token=${encodeURIComponent(token)}`,
      email,
      name,
      bizName,
    })
  } catch (error) {
    // If Brevo rejects the message, roll back the unconfirmed account so the
    // owner can correct email settings and retry signup cleanly.
    await deleteTenantByOwner(env, email)
    await deleteAuthUser(env, userId)
    throw error
  }

  return json({ ok: true })
}

async function handleConfirm(request, env) {
  const url = new URL(request.url)
  try {
    const payload = await verifyConfirmationToken(env, url.searchParams.get('token'))
    await confirmAuthUser(env, payload.uid)
    return Response.redirect(`${url.origin}/?verified=1`, 302)
  } catch (error) {
    console.error('[BITE] Confirm failed:', error)
    return Response.redirect(`${url.origin}/?verified=0`, 302)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/signup') {
      try {
        return await handleSignup(request, env)
      } catch (error) {
        console.error('[BITE] Signup failed:', error)
        return json({ error: error.message || 'Signup failed. Please try again.' }, 500)
      }
    }

    if (url.pathname === '/api/signup-config') {
      return json(signupConfigStatus(env))
    }

    if (url.pathname === '/api/confirm') {
      return handleConfirm(request, env)
    }

    // Only process HTML — let JS/CSS/assets pass through untouched
    const isHtml = url.pathname === '/'
      || url.pathname === '/index.html'
      || !url.pathname.includes('.')  // SPA routes like /dashboard

    if (!isHtml) {
      const assetResponse = await env.ASSETS.fetch(request)
      if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/sw.js') {
        const headers = new Headers(assetResponse.headers)
        headers.set('Cache-Control', 'no-store, must-revalidate')
        return new Response(assetResponse.body, {
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          headers,
        })
      }
      return assetResponse
    }

    const response = await env.ASSETS.fetch(request)
    if (!response.ok) return response

    const html = await response.text()

    // Inject as the VERY FIRST script in <head> so it runs before any module
    const envScript = `<script>
window.__ENV__ = {
  SUPABASE_URL:      "${(env.SUPABASE_URL      || '').replace(/"/g, '')}",
  SUPABASE_ANON_KEY: "${(env.SUPABASE_ANON_KEY || '').replace(/"/g, '')}",
};
// Compatibility shim for stale QR settings bundles that referenced removed
// qrVersion / setQrVersion symbols. Keep this before every app script.
var qrVersion = window.__biteQrVersion || '1';
var setQrVersion = window.setQrVersion || function(value) {
  qrVersion = String(value || '1');
  window.__biteQrVersion = qrVersion;
};
window.setQrVersion = setQrVersion;
</script>`

    const injected = html.replace('<head>', '<head>\n' + envScript)

    return new Response(injected, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'no-store',  // never cache the HTML with injected keys
      },
    })
  },
}
