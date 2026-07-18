export async function onRequestPost({ request, env }) {
  const { password } = await request.json().catch(() => ({}));
  if (password === env.ADMIN_PASSWORD) {
    return new Response('ok', { status: 200 });
  }
  return new Response('deny', { status: 403 });
}
