import { timingSafeEqual, allowAttempt } from './_utils.js';

export async function onRequest({ request, env }) {
  if (!env.REPORTS_KV) {
    return Response.json({ error: 'Reports KV not configured.' }, { status: 503 });
  }

  if (request.method === 'GET') {
    const pw = request.headers.get('X-Admin-Password');
    if (!timingSafeEqual(pw, env.ADMIN_PASSWORD)) return new Response('Unauthorized', { status: 403 });
    const reports = await env.REPORTS_KV.get('reports', { type: 'json' }) || [];
    return Response.json(reports);
  }

  if (request.method === 'POST') {
    // F3 FIX: Rate limit public report submissions
    if (!(await allowAttempt(request, env, 'report-submit', 10, 3600))) {
      return Response.json({ error: 'Too many reports. Try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    // F3 FIX: Sanitize and length-cap inputs
    const gameId = String(body.gameId || '').trim().slice(0, 120);
    const reason = String(body.reason || '').trim().slice(0, 1200);
    if (!gameId || !reason) return Response.json({ error: 'Missing gameId or reason' }, { status: 400 });

    const reports = await env.REPORTS_KV.get('reports', { type: 'json' }) || [];
    reports.push({ id: crypto.randomUUID(), gameId, reason, ts: Date.now(), status: 'pending' });
    // F3 FIX: Bound array growth
    if (reports.length > 1000) reports.splice(0, reports.length - 1000);
    await env.REPORTS_KV.put('reports', JSON.stringify(reports));
    return Response.json({ ok: true });
  }

  if (request.method === 'DELETE') {
    const pw = request.headers.get('X-Admin-Password');
    if (!timingSafeEqual(pw, env.ADMIN_PASSWORD)) return new Response('Unauthorized', { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
    const reports = await env.REPORTS_KV.get('reports', { type: 'json' }) || [];
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) return Response.json({ error: 'Report not found' }, { status: 404 });
    reports.splice(idx, 1);
    await env.REPORTS_KV.put('reports', JSON.stringify(reports));
    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
}
