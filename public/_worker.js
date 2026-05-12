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

async function supabaseAdminFetch(env, path, init = {}) {
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Signup is not configured. Missing Supabase admin credentials.')
  }

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

function verificationEmailHtml({ origin, verifyUrl, name, bizName }) {
  const safeName = escapeHtml(name || 'there')
  const safeBizName = escapeHtml(bizName || 'your restaurant')
  const safeVerifyUrl = escapeHtml(verifyUrl)
  const logoUrl = `${origin}/icon-192.png`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your BITE. account</title>
  </head>
  <body style="margin:0;padding:0;background:#F9F7F4;font-family:'DM Sans',Arial,sans-serif;color:#1A1208;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F4;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E8E4DF;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(26,18,8,0.10);">
            <tr>
              <td style="background:#1A1208;padding:30px 28px;text-align:center;">
                <img src="${logoUrl}" width="64" height="64" alt="BITE." style="display:block;margin:0 auto 14px;border-radius:16px;">
                <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.8px;color:#F5F0E8;">BITE<span style="color:#E8440A;">.</span></div>
                <div style="margin-top:6px;color:rgba(245,240,232,0.62);font-size:13px;">Restaurant POS by Pay4</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 12px;text-align:left;">
                <div style="display:inline-block;background:rgba(232,68,10,0.10);color:#E8440A;border:1px solid rgba(232,68,10,0.18);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:0.2px;">Verify your account</div>
                <h1 style="font-family:'Plus Jakarta Sans',Arial,sans-serif;margin:18px 0 10px;font-size:28px;line-height:1.16;letter-spacing:-0.7px;color:#1A1208;">Welcome to BITE., ${safeName}</h1>
                <p style="margin:0;color:#7A6E65;font-size:15px;line-height:1.65;">Confirm your email to activate <strong style="color:#1A1208;">${safeBizName}</strong> and start taking orders, managing tables, and accepting payments.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 30px 30px;">
                <a href="${safeVerifyUrl}" style="display:inline-block;background:#E8440A;color:#ffffff;text-decoration:none;border-radius:14px;padding:15px 30px;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:15px;font-weight:800;box-shadow:0 10px 22px rgba(232,68,10,0.24);">Verify email address</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 30px;">
                <div style="background:#F9F7F4;border:1px solid #E8E4DF;border-radius:14px;padding:14px 16px;color:#7A6E65;font-size:12px;line-height:1.55;">
                  If the button does not work, copy and paste this link into your browser:<br>
                  <a href="${safeVerifyUrl}" style="color:#E8440A;word-break:break-all;">${safeVerifyUrl}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #E8E4DF;padding:18px 30px;text-align:center;color:#B0A89E;font-size:11px;">
                BITE. POS by Pay4 · This verification link may expire for your security.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendVerificationEmail(env, payload) {
  if (!env.BREVO_API_KEY) {
    throw new Error('Signup email is not configured. Missing Brevo API key.')
  }

  const senderEmail = env.BREVO_FROM_EMAIL || 'hello@pay4.co.in'
  const senderName = env.BREVO_FROM_NAME || 'BITE. POS'
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: payload.email, name: payload.name }],
      subject: 'Verify your BITE. POS account',
      htmlContent: verificationEmailHtml(payload),
      textContent: `Welcome to BITE. POS. Verify your email: ${payload.verifyUrl}`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[BITE] Brevo send failed:', response.status, detail)
    throw new Error('Could not send verification email. Please try again.')
  }
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

  const origin = new URL(request.url).origin
  const generateResponse = await supabaseAdminFetch(env, '/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({
      type: 'signup',
      email,
      password,
      data: { full_name: name, biz_name: bizName },
      redirect_to: origin,
    }),
  })

  const linkData = await generateResponse.json().catch(() => ({}))
  if (!generateResponse.ok) {
    const message = linkData.msg || linkData.error_description || linkData.error || 'Could not create account.'
    return json({ error: message }, generateResponse.status)
  }

  const verifyUrl = linkData.action_link || linkData.properties?.action_link
  const userId = linkData.user?.id || linkData.id
  if (!verifyUrl || !userId) return json({ error: 'Could not create verification link.' }, 500)

  const slug = slugify(bizName) || `restaurant-${Date.now()}`
  const tenantResponse = await supabaseAdminFetch(env, '/rest/v1/tenants?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ slug, name: bizName, biz_name: bizName, owner_email: email }),
  })
  const tenantData = await tenantResponse.json().catch(() => [])
  if (!tenantResponse.ok) {
    console.error('[BITE] Tenant create failed:', tenantResponse.status, tenantData)
    return json({ error: 'Account created, but restaurant setup failed. Please contact support.' }, 500)
  }

  const tenantId = tenantData?.[0]?.id
  if (tenantId) {
    const profileResponse = await supabaseAdminFetch(env, '/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: userId, tenant_id: tenantId, role: 'owner', full_name: name }),
    })
    if (!profileResponse.ok) {
      console.error('[BITE] Profile upsert failed:', profileResponse.status, await profileResponse.text().catch(() => ''))
    }
  }

  await sendVerificationEmail(env, { origin, verifyUrl, email, name, bizName })
  return json({ ok: true })
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

    // Only process HTML — let JS/CSS/assets pass through untouched
    const isHtml = url.pathname === '/'
      || url.pathname === '/index.html'
      || !url.pathname.includes('.')  // SPA routes like /dashboard

    if (!isHtml) {
      return env.ASSETS.fetch(request)
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
