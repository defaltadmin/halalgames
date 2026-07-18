// GET /api/reports — returns all reports (admin-only, reads ADMIN_PASSWORD from header)
// POST /api/reports — submit a new report (public)
// DELETE /api/reports?id=X — dismiss a report (admin-only)
export async function onRequest({ request, env }) {
  if (!env.REPORTS_KV) {
    return Response.json({ error: 'Reports KV not configured. Bind REPORTS_KV in Cloudflare dashboard.' }, { status: 503 });
  }

  if (request.method === 'GET') {
    const pw = request.headers.get('X-Admin-Password');
    if (pw !== env.ADMIN_PASSWORD) return new Response('Unauthorized', { status: 403 });
    const reports = await env.REPORTS_KV.get('reports', { type: 'json' }) || [];
    return Response.json(reports);
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (!body.gameId || !body.reason) return Response.json({ error: 'Missing gameId or reason' }, { status: 400 });
    const reports = await env.REPORTS_KV.get('reports', { type: 'json' }) || [];
    reports.push({ id: crypto.randomUUID(), gameId: body.gameId, reason: body.reason, ts: Date.now(), status: 'pending' });
    await env.REPORTS_KV.put('reports', JSON.stringify(reports));
    return Response.json({ ok: true });
  }

  if (request.method === 'DELETE') {
    const pw = request.headers.get('X-Admin-Password');
    if (pw !== env.ADMIN_PASSWORD) return new Response('Unauthorized', { status: 403 });
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
