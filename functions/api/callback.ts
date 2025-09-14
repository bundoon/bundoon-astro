// /functions/api/callback.js
export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const html = (script) => `<!doctype html><html><body>
  <p style="font:14px system-ui">Completing login…</p>
  <script>${script}</script>
  </body></html>`;

  try {
    if (!code) throw new Error('Missing code');

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(data.error_description || 'No token');

    const script = `
      (function () {
        var msg = 'authorization:github:success:' + JSON.stringify({ token: '${data.access_token}' });
        try { if (window.opener) window.opener.postMessage(msg, '*'); } catch (e) {}
        setTimeout(function(){ window.close(); }, 500);
        document.body.insertAdjacentHTML('beforeend','<pre>'+msg+'</pre>');
      })();
    `;
    return new Response(html(script), { headers: { 'Content-Type': 'text/html' } });
  } catch (e) {
    const script = `
      (function () {
        var msg = 'authorization:github:error:' + JSON.stringify({ error: '${(e && e.message) || 'OAuth failed'}' });
        try { if (window.opener) window.opener.postMessage(msg, '*'); } catch (e) {}
        document.body.insertAdjacentHTML('beforeend','<pre>'+msg+'</pre>');
        setTimeout(function(){ window.close(); }, 1500);
      })();
    `;
    return new Response(html(script), { headers: { 'Content-Type': 'text/html' } });
  }
};

