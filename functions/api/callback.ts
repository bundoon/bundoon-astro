export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const start = Date.now();
  const url = new URL(request.url);
  const ray = request.headers.get('cf-ray'); // useful to correlate with CF errors

  const log = (msg: string, extra: any = {}) =>
    console.log(JSON.stringify({ t: Date.now(), ray, msg, ...extra }));

  try {
    log("callback:start", { path: url.pathname, qs: url.search });
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      throw new Error("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET");
    }

    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");

    const redirectUri = `${url.origin}/api/callback`;
    log("token_exchange:request", { redirectUri });

    const ghResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "decap-cms-oauth",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET, // do NOT log this
        code,
        redirect_uri: redirectUri,
      }),
    });

    const ghText = await ghResp.text();
    log("token_exchange:response", {
      status: ghResp.status,
      statusText: ghResp.statusText,
      // body preview helps a ton when GitHub returns an error payload:
      bodyFirst400: ghText.slice(0, 400),
    });

    let data: any;
    try { data = JSON.parse(ghText); }
    catch { throw new Error("GitHub did not return JSON: " + ghText.slice(0, 500)); }

    if (!ghResp.ok) {
      throw new Error(`GitHub returned ${ghResp.status}: ${data.error || data.error_description || ghText}`);
    }
    if (!data.access_token) throw new Error("No access_token in response: " + JSON.stringify(data));

    const token = data.access_token as string;
    const tokenPreview = token.slice(0, 6) + "…" + token.slice(-4);
    log("token_exchange:success", { tokenPreview });

    const msg = "authorization:github:success:" + JSON.stringify({ token });

    // normal success HTML response (unchanged)
    const html = `<!doctype html><meta charset="utf-8"/>
    <body style="font:14px system-ui">
      <div>Completing login…</div>
      <pre>${msg.replace(/</g,"&lt;")}</pre>
      <script>(function(){
        var m=${JSON.stringify(msg)};
        try{ if(window.opener&&!window.opener.closed)window.opener.postMessage(m,"*"); }catch(e){}
        try{ if(window.parent&&window.parent!==window)window.parent.postMessage(m,"*"); }catch(e){}
        try{ localStorage.setItem("decap-cms-oauth",m);}catch(e){}
        try{ localStorage.setItem("netlify-cms-auth",m);}catch(e){}
        try{ window.location.replace("/admin/#/"); }catch(e){}
      })();</script>
    </body>`;

    log("callback:done", { ms: Date.now() - start });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "x-cf-ray": ray ?? "",
      },
    });

  } catch (err: any) {
    console.error(JSON.stringify({
      level: "error",
      ray,
      msg: "callback:error",
      error: err?.message || String(err),
      ms: Date.now() - start,
    }));

    // Keep returning 200 so the Decap popup shows the message.
    const line = "authorization:github:error:" + JSON.stringify({ error: err?.message || String(err) });
    const html = `<!doctype html><meta charset="utf-8"/><pre style="font:14px system-ui;white-space:pre-wrap">${line.replace(/</g,"&lt;")}</pre>`;
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "x-cf-ray": ray ?? "" } });
  }
};