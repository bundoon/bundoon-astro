// functions/api/callback.ts
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      throw new Error("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET");
    }

    const redirectUri = `${new URL("/", request.url).origin}/api/callback`;

    // Exchange code -> access_token
    const ghResp = await fetch("https://github.com/login/oauth/access_token", {
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
        redirect_uri: redirectUri,
      }),
    });

    const ghText = await ghResp.text();
    console.log("GitHub token exchange status:", ghResp.status, ghResp.statusText);
    console.log("GitHub token exchange body (first 400):", ghText.slice(0, 400));

    let data: any;
    try {
      data = JSON.parse(ghText);
    } catch {
      throw new Error("GitHub did not return JSON: " + ghText.slice(0, 500));
    }

    if (!ghResp.ok) {
      throw new Error(
        `GitHub returned ${ghResp.status}: ${data.error || data.error_description || ghText}`
      );
    }
    if (!data.access_token) {
      throw new Error("No access_token in response: " + JSON.stringify(data));
    }

    const token = data.access_token;
    const msg = "authorization:github:success:" + JSON.stringify({ token });

    const html = `<!doctype html>
<html>
  <meta charset="utf-8" />
  <body style="font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div>Completing login… (you can close this window if it doesn’t close automatically)</div>
    <pre style="white-space:pre-wrap;word-break:break-word">${msg.replace(/</g,"&lt;")}</pre>
    <script>
      (function () {
        var msg = ${JSON.stringify(msg)};
        try { if (window.opener && !window.opener.closed) { window.opener.postMessage(msg, "*"); } } catch (e) {}
        try { if (window.parent && window.parent !== window) { window.parent.postMessage(msg, "*"); } } catch (e) {}
        try { localStorage.setItem("decap-cms-oauth", msg); } catch (e) {}
        try { localStorage.setItem("netlify-cms-auth", msg); } catch (e) {}
        try { window.location.replace("/admin/#/"); } catch (e) {}
      })();
    </script>
    <noscript>JavaScript is required to finish logging in.</noscript>
  </body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error("OAuth callback failed:", message);

    const line = "authorization:github:error:" + JSON.stringify({ error: message });
    const html = `<!doctype html><meta charset="utf-8" />
<pre style="font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;white-space:pre-wrap;word-break:break-word">
${line.replace(/</g,"&lt;")}
</pre>`;

    // 200 so the browser shows the text; logs still capture the error.
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
};
