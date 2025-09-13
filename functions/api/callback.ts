export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  // Exchange code -> access token
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.OAUTH_REDIRECT_URI
    })
  });
  const data = await res.json();
  if (!data.access_token) {
    return new Response(JSON.stringify(data), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  // Decap expects { token: <github_access_token> }
  return new Response(JSON.stringify({ token: data.access_token }), {
    headers: { "content-type": "application/json" }
  });
};
