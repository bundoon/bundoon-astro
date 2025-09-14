export const onRequestGet = ({ request, env }) => {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/callback`;

  // You can add state/nonce if you want, but Decap doesn't require it.
  const auth = new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('scope', 'repo,user:email');

  return Response.redirect(auth.toString(), 302);
};
