// functions/api/auth.ts
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);

  // Where GitHub should send the browser back to after login:
  const redirectUri = `${url.origin}/api/callback`;

  // Decap may pass scope (e.g. "repo"); default to repo + email
  const scope = url.searchParams.get('scope') || 'repo,user:email';

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', scope);

  // If Decap gave you state/site_id/etc., you can pass it through (optional)
  const state = url.searchParams.get('state');
  if (state) authorize.searchParams.set('state', state);

  // Kick the browser to GitHub
  return Response.redirect(authorize.toString(), 302);
};
