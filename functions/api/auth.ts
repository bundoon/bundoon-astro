export const onRequestGet: PagesFunction = async ({ env }) => {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.OAUTH_REDIRECT_URI,
    scope: "repo,user:email"
  });
  return Response.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
    302
  );
};
