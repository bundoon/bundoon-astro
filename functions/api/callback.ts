export const onRequestGet: PagesFunction<{
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) throw new Error('Missing code');

    // Exchange code for an access token
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

    // Exact message format Decap expects
    const msg =
      'authorization:github:success:' +
      JSON.stringify({ token: data.access_token });

    const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body{font:14px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:20px;color:#111}
  .muted{color:#666}
</style></head>
<body>
  <div>Completing login… <span class="muted">(you can close this window if it doesn’t close automatically)</span></div>
  <script>
    (function () {
      var msg = ${JSON.stringify(msg)};

      function tryPost(target) {
        try { window.opener && window.opener.postMessage(msg, target); } catch(e){}
      }

      // Be permissive to avoid target origin mismatches
      tryPost('*');

      // Best-effort clipboard fallback
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(msg);
      } catch (e) {}

      // As a last resort, write the line so it can be copied manually
      try {
        var pre = document.createElement('pre');
        pre.textContent = msg;
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.marginTop = '12px';
        pre.style.color = '#666';
        pre.title = 'If the CMS did not log you in, copy this entire line and paste it into the admin console using window.postMessage(...)';
        document.body.appendChild(pre);
      } catch (e) {}

      // Close soon (give the browser a moment)
      setTimeout(function(){ try { window.close(); } catch(e) {} }, 400);
    })();
  </script>
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
