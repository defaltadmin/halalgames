// GET /api/reports — returns all reports (admin-only)
// POST /api/reports — submit a new report (public)
export async function onRequest({ request, env }) {
  // Check if KV is bound
  if (!env.REPORTS_KV) {
    return Response.json({ error: 'Reports KV not configured. Bind REPORTS_KV in Cloudflare dashboard.' }, { status: 503 });
  }

  if (request.method === 'GET') {
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
