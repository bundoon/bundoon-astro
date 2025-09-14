export const onRequestGet = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) throw new Error('Missing code');

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

    const html = `<!doctype html>
<html><body>
<script>
  (function () {
    var msg = 'authorization:github:success:' + JSON.stringify({ token: '${data.access_token}' });
    // Tell the window that opened this popup
    if (window.opener) {
      window.opener.postMessage(msg, '*');
      window.close();
    } else {
      // Fallback: show token so you can copy it (shouldn't happen in normal flow)
      document.write('<pre>' + msg + '</pre>');
    }
  })();
</script>
</body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (err) {
    const html = `<!doctype html>
<html><body>
<script>
  (function () {
    var msg = 'authorization:github:error:' + JSON.stringify({ error: ${JSON.stringify(
      { message: 'OAuth failed' }
    )}.message });
    if (window.opener) {
      window.opener.postMessage(msg, '*');
      window.close();
    } else {
      document.write('<pre>' + msg + '</pre>');
    }
  })();
</script>
</body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
