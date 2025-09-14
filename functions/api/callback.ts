export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");

    // 1) Exchange code for token
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

    // 2) Message format Decap/Netlify CMS expects
    const msg =
      "authorization:github:success:" +
      JSON.stringify({ token: data.access_token });

    // 3) Minimal HTML that hands the token back to the admin app
    const html = `<!doctype html>
<html>
  <body style="font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div>Completing login… (you can close this window if it doesn’t close automatically)</div>
    <pre style="white-space:pre-wrap;word-break:break-word">${msg.replaceAll("<","&lt;")}</pre>
    <script>
      (function () {
        var msg = ${JSON.stringify(msg)};
        var tries = 0, max = 30; // ~6s total

        function tryPost() {
          // Preferred: postMessage to the window that opened this popup
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(msg, "*");
            }
          } catch (e) {}

          // Keep pinging a few seconds to be safe
          tries++;
          if (tries < max) {
            setTimeout(tryPost, 200);
          } else {
            // Fallbacks: save where Decap actually looks, then return to /admin
            try { localStorage.setItem("netlify-cms-oauth", msg); } catch (e) {}
            try { sessionStorage.setItem("netlify-cms-oauth", msg); } catch (e) {}
            try { window.location.replace("/admin/#/"); } catch (e) {}
          }
        }

        tryPost();
        // Best effort close shortly after sending
        setTimeout(function(){ try { window.close(); } catch (e) {} }, 7000);
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

