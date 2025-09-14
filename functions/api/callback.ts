export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");

    const resp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "decap-cms-oauth",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${new URL("/", request.url).origin}/api/callback`,
      }),
    });

    const data = await resp.json();
    if (!data.access_token) {
      throw new Error(data.error_description || "No access_token from GitHub");
    }

    const msg =
      "authorization:github:success:" +
      JSON.stringify({ token: data.access_token });

    const html = `<!doctype html>
<html>
  <body style="font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div>Completing login… (you can close this window if it doesn’t close automatically)</div>
    <pre style="white-space:pre-wrap;word-break:break-word">${msg.replaceAll("<","&lt;")}</pre>
    <script>
      (function () {
        var msg = ${JSON.stringify(msg)};

        // Try to deliver to the opener quickly (Decap listens for postMessage)
        var tries = 0, max = 30; // ~6s
        function ping() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(msg, "*");
            }
          } catch (e) {}
          if (++tries < max) return setTimeout(ping, 200);

          // Fallback: write BOTH legacy and new storage keys
          try { localStorage.setItem("netlify-cms-oauth", msg); } catch (e) {}
          try { localStorage.setItem("decap-cms-oauth", msg); } catch (e) {}

          // Last resort: nudge the admin to reload and consume storage
          try { window.location.replace("/admin/#/"); } catch (e) {}
        }
        ping();
      })();
    </script>
  </body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err: any) {
    return new Response(
      "authorization:github:error:" + JSON.stringify({ error: err?.message || "OAuth failed" }),
      { headers: { "Content-Type": "text/plain; charset=utf-8" }, status: 400 }
    );
  }
};
