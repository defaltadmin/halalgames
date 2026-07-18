// GET /api/reports — returns all reports (admin-only)
// POST /api/reports — submit a new report (public)
export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    // Admin check
    const authHeader = request.headers.get('X-Admin-Token');
    if (authHeader !== env.ADMIN_TOKEN) {
      return new Response('Unauthorized', { status: 403 });
    }
    const reports = await env.REPORTS_KV.get('reports', { type: 'json' }) || [];
    return Response.json(reports);
  }
  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (!body.gameId || !body.reason) {
      return Response.json({ error: 'Missing gameId or reason' }, { status: 400 });
    }
    const reports = await env.REPORTS_KV.get('reports', { type: 'json' }) || [];
    reports.push({ gameId: body.gameId, reason: body.reason, ts: Date.now(), status: 'pending' });
    await env.REPORTS_KV.put('reports', JSON.stringify(reports));
    return Response.json({ ok: true });
  }
  return new Response('Method not allowed', { status: 405 });
}
