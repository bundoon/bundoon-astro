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

    console.log("GitHub response status:", resp.status);

    const data = await resp.json();
    console.log("GitHub response body:", data);

    if (!data.access_token) {
      console.error("Failed to get access token from GitHub");
      throw new Error(data.error_description || "No access_token from GitHub");
    }

    // ...rest of your code...
  } catch (err: any) {
    console.error("OAuth error:", err);
    return new Response(
      "authorization:github:error:" +
        JSON.stringify({ error: err?.message || "OAuth failed" }),
      { headers: { "Content-Type": "text/plain; charset=utf-8" }, status: 400 }
    );
  }
};
