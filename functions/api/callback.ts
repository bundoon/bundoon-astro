export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");

    // Exchange code for GitHub access token
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
        // exact redirect is harmless but keeps GitHub happy
        redirect_uri: `${new URL("/", request.url).origin}/api/callback`,
      }),
    });

    const data = await resp.json();
    if (!data.access_token) {
      throw new Error(data.error_description || "No access_token from GitHub");
    }

    const payload = { token: data.access_token };
    const msg = "authorization:github:success:" + JSON.stringify(payload);

    const html = `<!doctype html>
<html>
  <meta charset="utf-8" />
  <meta name="robots" content="noindex" />
  <body style="font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div>Completing login… (you can close this window if it doesn’t close automatically)</div>
    <pre style="white-space:pre-wrap;word-break:break-word">${msg.replaceAll("<","&lt;")}</pre>

    <script>
      (function () {
        var msg = ${JSON.stringify(msg)};
        var parsed = ${JSON.stringify(payload)};
        var adminPath = "/admin/#/";
        var adminURL = new URL(adminPath, location.origin).href;
        var openerOrigin;
        try { openerOrigin = new URL(document.referrer || adminURL).origin; } catch (e) { openerOrigin = location.origin; }

        function writeStorage() {
          try { localStorage.setItem("decap-cms-oauth", msg); } catch (e) {}
          try { localStorage.setItem("netlify-cms.oauth", msg); } catch (e) {}           // legacy key
          try { sessionStorage.setItem("decap-cms-oauth", msg); } catch (e) {}
          try { sessionStorage.setItem("netlify-cms.oauth", msg); } catch (e) {}         // legacy key
        }

        function broadcast() {
          try {
            var ch = new BroadcastChannel("decap-cms");
            ch.postMessage(msg);
            // also a very old channel name:
            var ch2 = new BroadcastChannel("netlify-cms");
            ch2.postMessage(msg);
          } catch (e) {}
        }

        function tellOpener() {
          try {
            if (window.opener && !window.opener.closed) {
              // exact origin first
              try { window.opener.postMessage(msg, openerOrigin); } catch (e) {}
              // permissive fallback
              try { window.opener.postMessage(msg, "*"); } catch (e) {}
              return true;
            }
          } catch (e) {}
          return false;
        }

        function finish() {
          // Give the admin a moment to read storage/messages, then redirect/close.
          setTimeout(function () {
            try { window.location.replace(adminURL); } catch (e) {}
            setTimeout(function () { try { window.close(); } catch (e) {} }, 300);
          }, 150);
        }

        // Multi-path handoff
        writeStorage();
        broadcast();

        // Try a few times in case the opener is still initializing
        var tries = 0, max = 20;
        (function tick(){
          tries++;
          var sent = tellOpener();
          if (sent || tries >= max) { finish(); }
          else { setTimeout(tick, 150); }
        })();
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
