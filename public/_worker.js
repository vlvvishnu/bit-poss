// Cloudflare Pages Worker
// Injects environment variables into the HTML before serving

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

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
  BREVO_KEY:         "${(env.BREVO_API_KEY      || '').replace(/"/g, '')}",
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
