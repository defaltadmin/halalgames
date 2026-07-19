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

// Rate limiting: max 5 admin logins per IP per 10 minutes
const LOGIN_WINDOW = 600; // seconds
const LOGIN_MAX = 5;
const SAVE_WINDOW = 60;
const SAVE_MAX = 10;

async function checkRateLimit(env, key, max, windowSec) {
  if (!env.CATALOG_KV) return true; // no KV, skip rate limiting
  const count = Number(await env.CATALOG_KV.get(`ratelimit:${key}`) || 0);
  if (count >= max) return false;
  await env.CATALOG_KV.put(`ratelimit:${key}`, String(count + 1), { expirationTtl: windowSec });
  return true;
}

function cleanText(value, max = 1200) {
  return String(value || '').trim().slice(0, max);
}

function cleanSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function cleanSource(src) {
  if (!src || typeof src !== 'object') return null;
  const type = String(src.type || '').trim();
  if (!['official', 'store', 'review', 'manual'].includes(type)) return null;
  const url = String(src.url || '').trim();
  if (!url || url.length > 500) return null;
  try { new URL(url); } catch { return null; }
  return {
    type,
    url,
    checkedAt: String(src.checkedAt || '').slice(0, 10)
  };
}

function cleanFilter(value, type) {
  if (type === 'string') {
    return ['unknown', 'present', 'absent', 'mixed'].includes(value) ? value : 'unknown';
  }
  return value === true || value === false ? value : null;
}

function cleanGame(input) {
  const slug = cleanSlug(input.slug);
  const verdict = ['halal', 'caution', 'haram', 'unreviewed'].includes(input.verdict)
    ? input.verdict : 'unreviewed';
  const reviewConfidence = ['high', 'medium', 'low', 'none'].includes(input.reviewConfidence)
    ? input.reviewConfidence : 'none';
  const scoreVal = Number(input.score);
  const score = Number.isFinite(scoreVal) ? Math.max(0, Math.min(100, Math.round(scoreVal))) : null;

  const game = {
    id: input.id,
    name: cleanText(input.name, 160),
    slug,
    genres: Array.isArray(input.genres) ? input.genres.map(x => cleanText(x, 60)).slice(0, 8) : [],
    platforms: Array.isArray(input.platforms) ? input.platforms.map(x => cleanText(x, 60)).slice(0, 8) : [],
    description: cleanText(input.description, 2000),
    steamAppId: Number.isFinite(Number(input.steamAppId)) ? Number(input.steamAppId) : undefined,
    verdict,
    screeningStatus: verdict === 'unreviewed' ? 'unreviewed' : 'community-reviewed',
    reviewConfidence: verdict === 'unreviewed' ? 'none' : reviewConfidence,
    score: verdict === 'unreviewed' ? null : score,
    reasons: Array.isArray(input.reasons) ? input.reasons.map(x => cleanText(x, 1000)).slice(0, 8) : [],
    warnings: Array.isArray(input.warnings) ? input.warnings.map(x => cleanText(x, 1000)).slice(0, 8) : [],
    alternatives: Array.isArray(input.alternatives) ? input.alternatives.map(x => cleanSlug(x)).slice(0, 6) : [],
    sources: Array.isArray(input.sources) ? input.sources.map(cleanSource).filter(Boolean).slice(0, 12) : [],
    filters: {
      noCombat: cleanFilter(input.filters?.noCombat, 'bool'),
      noGambling: cleanFilter(input.filters?.noGambling, 'bool'),
      noNudity: cleanFilter(input.filters?.noNudity, 'bool'),
      noMagic: cleanFilter(input.filters?.noMagic, 'bool'),
      music: cleanFilter(input.filters?.music, 'string'),
      singleplayer: cleanFilter(input.filters?.singleplayer, 'bool'),
      coOp: cleanFilter(input.filters?.coOp, 'bool'),
    },
    lastReviewedAt: verdict === 'unreviewed' ? null : (input.lastReviewedAt || new Date().toISOString().slice(0, 10)),
    stores: verdict === 'halal' && Array.isArray(input.stores) ? input.stores.map(x => cleanText(x, 60)).slice(0, 8) : [],
    adminNote: cleanText(input.adminNote, 2000)
  };

  // Remove undefined fields
  if (game.steamAppId === undefined) delete game.steamAppId;

  return game;
}

export async function onRequest({ request, env }) {
  if (!isAdmin(request, env)) {
    return json({ error: 'Unauthorized' }, 403);
  }

  if (!env.CATALOG_KV) {
    return json({ error: 'Catalog KV is not configured.' }, 503);
  }

  // Rate limit: 5 logins per 10 min
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!(await checkRateLimit(env, `admin:${ip}`, LOGIN_MAX, LOGIN_WINDOW))) {
    return json({ error: 'Too many requests. Try again in 10 minutes.' }, 429);
  }

  if (request.method === 'GET') {
    const catalog = await env.CATALOG_KV.get('catalog', { type: 'json' });
    return json({ games: Array.isArray(catalog) ? catalog : [] });
  }

  if (request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Rate limit: 10 saves per minute
  if (!(await checkRateLimit(env, `save:${ip}`, SAVE_MAX, SAVE_WINDOW))) {
    return json({ error: 'Too many saves. Try again in 1 minute.' }, 429);
  }

  // Content-length safety — use streaming read, not header
  let body;
  try {
    const cloned = request.clone();
    const text = await cloned.text();
    if (text.length > 750000) {
      return json({ error: 'Catalog payload is too large.' }, 413);
    }
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  if (!body || !Array.isArray(body.games)) {
    return json({ error: 'Expected a games array.' }, 400);
  }

  if (body.games.length > 5000) {
    return json({ error: 'Catalog limit exceeded (max 5000).' }, 413);
  }

  // Concurrency: read current version, reject if stale
  const currentVersion = await env.CATALOG_KV.get('catalog:version');
  if (body._version && currentVersion && body._version !== currentVersion) {
    return json({ error: 'Catalog was modified since you loaded it. Reload and try again.' }, 409);
  }

  const seen = new Set();
  const catalog = [];

  for (const rawGame of body.games) {
    const game = cleanGame(rawGame);
    if (!game.name || !game.slug || seen.has(game.slug)) continue;
    seen.add(game.slug);
    catalog.push(game);
  }

  const newVersion = Date.now().toString(36);
  await env.CATALOG_KV.put('catalog', JSON.stringify(catalog));
  await env.CATALOG_KV.put('catalog:version', newVersion);

  return json({
    ok: true,
    count: catalog.length,
    _version: newVersion,
    savedAt: new Date().toISOString()
  });
}
