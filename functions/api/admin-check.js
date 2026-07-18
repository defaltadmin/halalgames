export async function onRequestPost({ request, env }) {
  const { password } = await request.json().catch(() => ({}));
  // Check ADMIN_TOKEN env var first, fall back to ADMIN_PASSWORD
  const validPassword = env.ADMIN_TOKEN || env.ADMIN_PASSWORD;
  if (!validPassword) {
    return new Response('Admin not configured', { status: 503 });
  }
  if (password === validPassword) {
    return new Response('ok', { status: 200 });
  }
  return new Response('deny', { status: 403 });
}
