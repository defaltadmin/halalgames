const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function isAdmin(request, env) {
  const supplied = request.headers.get('X-Admin-Password') || '';
  return Boolean(env.ADMIN_PASSWORD && supplied === env.ADMIN_PASSWORD);
}

function cleanText(value, max = 1200) {
  return String(value || '').trim().slice(0, max);
}

function cleanGame(input) {
  const game = {
    ...input,
    name: cleanText(input.name, 160),
    slug: cleanText(input.slug, 120).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
    genres: Array.isArray(input.genres) ? input.genres.map(x => cleanText(x, 60)).slice(0, 8) : [],
    platforms: Array.isArray(input.platforms) ? input.platforms.map(x => cleanText(x, 60)).slice(0, 8) : [],
    reasons: Array.isArray(input.reasons) ? input.reasons.map(x => cleanText(x, 1000)).slice(0, 8) : [],
    warnings: Array.isArray(input.warnings) ? input.warnings.map(x => cleanText(x, 1000)).slice(0, 8) : [],
    sources: Array.isArray(input.sources) ? input.sources.slice(0, 12) : [],
    verdict: ['halal', 'caution', 'haram', 'unreviewed'].includes(input.verdict) ? input.verdict : 'unreviewed',
    screeningStatus: input.screeningStatus === 'community-reviewed' ? 'community-reviewed' : 'unreviewed',
    reviewConfidence: ['high', 'medium', 'low', 'none'].includes(input.reviewConfidence) ? input.reviewConfidence : 'none',
    score: Number.isFinite(input.score) ? Math.max(0, Math.min(100, input.score)) : null,
    lastReviewedAt: input.lastReviewedAt || null,
    adminNote: cleanText(input.adminNote, 2000)
  };

  if (game.verdict === 'unreviewed') {
    game.screeningStatus = 'unreviewed';
    game.score = null;
    game.reviewConfidence = 'none';
    game.lastReviewedAt = null;
    game.stores = [];
  }

  return game;
}

export async function onRequest({ request, env }) {
  if (!isAdmin(request, env)) {
    return json({ error: 'Unauthorized' }, 403);
  }

  if (!env.CATALOG_KV) {
    return json({ error: 'Catalog KV is not configured.' }, 503);
  }

  if (request.method === 'GET') {
    const catalog = await env.CATALOG_KV.get('catalog', { type: 'json' });
    return json({ games: Array.isArray(catalog) ? catalog : [] });
  }

  if (request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 750000) return json({ error: 'Catalog payload is too large.' }, 413);

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.games)) return json({ error: 'Expected a games array.' }, 400);
  if (body.games.length > 5000) return json({ error: 'Catalog limit exceeded.' }, 413);

  const seen = new Set();
  const catalog = [];

  for (const rawGame of body.games) {
    const game = cleanGame(rawGame);
    if (!game.name || !game.slug || seen.has(game.slug)) continue;
    seen.add(game.slug);
    catalog.push(game);
  }

  await env.CATALOG_KV.put('catalog', JSON.stringify(catalog));

  return json({ ok: true, count: catalog.length, savedAt: new Date().toISOString() });
}
