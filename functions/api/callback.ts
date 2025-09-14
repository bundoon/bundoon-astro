// functions/api/callback.ts
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");

    // Exchange auth code for token
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
        // keep this EXACTLY the same value your /api/auth sends to GitHub
        redirect_uri: `${new URL("/", request.url).origin}/api/callback`,
      }),
    });

    const data = await resp.json();
    if (!data.access_token) {
      throw new Error(data.error_description || "No access_token from GitHub");
    }

    const msg =
      "authorization:github:success:" + JSON.stringify({ token: data.access_token });

    // Small HTML finisher page
    const html = `<!doctype html>
<html>
  <meta charset="utf-8" />
  <title>Completing login…</title>
  <body style="font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div>Completing login… (you can close this window if it doesn’t close automatically)</div>
    <pre style="white-space:pre-wrap;word-break:break-word">${msg.replaceAll("<","&lt;")}</pre>

    <script>
      (function () {
        var msg = ${JSON.stringify(msg)};
        var done = false;

        function stash() {
          try { localStorage.setItem("decap-cms-oauth", msg); } catch (e) {}
          try { localStorage.setItem("netlify-cms-auth", msg); } catch (e) {}
          // A few extra belts & suspenders:
          try { sessionStorage.setItem("decap-cms-oauth", msg); } catch (e) {}
        }

        function ping(win) {
          try { win && win.postMessage(msg, "*"); } catch (e) {}
        }

        // 1) Primary path: popup -> opener
        try {
          if (window.opener && !window.opener.closed) {
            ping(window.opener);
            stash();
            done = true;
            // give the opener a tick to handle it
            setTimeout(function(){ try{ window.close(); }catch(e){} }, 60);
          }
        } catch (e) {}

        // 2) Also try parent (if framed)
        try {
          if (!done && window.parent && window.parent !== window) {
            ping(window.parent);
            stash();
            done = true;
          }
        } catch (e) {}

        // 3) Try BroadcastChannel (some builds listen here)
        try {
          var ch = new BroadcastChannel("netlify-cms");
          ch.postMessage(msg);
        } catch (e) {}

        // 4) Always stash in storage for the admin app to read on load
        stash();

        // 5) If we didn't have an opener to close, bounce back to /admin
        //    The admin app will read localStorage and finish the login.
        if (!done) {
          try {
            var u = new URL("/admin/#/", window.location.origin);
            // cache-bust so SPA re-initializes cleanly
            u.hash = "/?t=" + Date.now();
            window.location.replace(u.toString());
          } catch (e) {}
        }
      })();
    </script>

    <noscript>JavaScript is required to finish logging in.</noscript>
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
