// public/_worker.js
// Cloudflare Pages Worker — injects secrets at edge so they never sit in source

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only process HTML responses — let assets (JS/CSS) pass through untouched
    if (!url.pathname.endsWith('.html') && url.pathname !== '/') {
      return env.ASSETS.fetch(request);
    }

    const response = await env.ASSETS.fetch(request);
    const html = await response.text();

    // Inject secrets as a <script> at the top of <head>
    const injected = html.replace(
      '<head>',
      `<head>
<script>
  window.__ENV__ = {
    SUPABASE_URL:      "${env.SUPABASE_URL || ''}",
    SUPABASE_ANON_KEY: "${env.SUPABASE_ANON_KEY || ''}",
    BREVO_KEY:         "${env.BREVO_API_KEY || ''}",
  };
</script>`
    );

    return new Response(injected, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  },
};
