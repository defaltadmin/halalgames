import { timingSafeEqual, allowAttempt } from './_utils.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return new Response('Admin not configured', { status: 503 });

  // F2 FIX: Rate limit EVERY attempt — brute force now bounded to 5/hr
  if (!(await allowAttempt(request, env, 'admin-check', 5, 3600))) {
    return new Response('Too many attempts. Try again later.', { status: 429 });
  }

  const { password } = await request.json().catch(() => ({}));
  return timingSafeEqual(password, env.ADMIN_PASSWORD)
    ? new Response('ok', { status: 200 })
    : new Response('deny', { status: 403 });
}
