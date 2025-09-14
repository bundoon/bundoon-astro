export const onRequestGet: PagesFunction<{
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) throw new Error('Missing code');

    // Exchange code for access token
    const resp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await resp.json();
    if (!data.access_token) {
      throw new Error(data.error_description || 'No access_token from GitHub');
    }

    // The format Decap listens for:
    // 'authorization:github:success:{"token":"..."}'
    const msg =
      'authorization:github:success:' +
      JSON.stringify({ token: data.access_token });

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body>
<script>
(function () {
  var msg = ${JSON.stringify(msg)};

  // Try postMessage to the opener (Decap listens for this)
  try {
    if (window.opener && !window.opener.closed) {
      // Use opener's origin when possible; fall back to *
      var target = (function(){
        try { return window.opener.location.origin || '*'; }
        catch (e) { return '*'; }
      })();
      window.opener.postMessage(msg, target);
    }
  } catch (e) { /* ignore */ }

  // Minimal UI + clipboard fallback so the user can paste if needed
  try {
    navigator.clipboard && navigator.clipboard.writeText(msg);
  } catch (e) {}

  // Close fast, but give the browser a moment
  setTimeout(function(){ window.close(); }, 300);
})();
</script>

<noscript>
  Completing login…<br/>
  Copy this line and paste it into the CMS if needed:<br/>
  <pre>${msg.replace(/</g,'&lt;')}</pre>
</noscript>
</body></html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    const errorMsg =
      'authorization:github:error:' +
      JSON.stringify({ error: err?.message || 'OAuth failed' });
    const html = `<!doctype html><meta charset="utf-8">
<pre>${errorMsg.replace(/</g,'&lt;')}</pre>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
