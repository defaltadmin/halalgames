import { timingSafeEqual, allowAttempt, cleanText, cleanSlug, cleanSource, cleanFilter } from './_utils.js';

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function isAdmin(request, env) {
  const supplied = request.headers.get('X-Admin-Password') || '';
  return Boolean(env.ADMIN_PASSWORD && timingSafeEqual(supplied, env.ADMIN_PASSWORD));
}

function cleanGame(input) {
  const slug = cleanSlug(input.slug);
  const verdict = ['halal', 'caution', 'haram', 'unreviewed'].includes(input.verdict) ? input.verdict : 'unreviewed';
  const reviewConfidence = ['high', 'medium', 'low', 'none'].includes(input.reviewConfidence) ? input.reviewConfidence : 'none';
  const scoreVal = Number(input.score);
  const score = Number.isFinite(scoreVal) ? Math.max(0, Math.min(100, Math.round(scoreVal))) : null;

  return {
    id: input.id,
    name: cleanText(input.name, 160),
    slug,
    genres: Array.isArray(input.genres) ? input.genres.map(x => cleanText(x, 60)).slice(0, 8) : [],
    platforms: Array.isArray(input.platforms) ? input.platforms.map(x => cleanText(x, 60)).slice(0, 8) : [],
    description: cleanText(input.description, 2000),
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
}

export async function onRequest({ request, env }) {
  if (!env.CATALOG_KV) {
    return json({ error: 'Catalog KV is not configured.' }, 503);
  }

  // F1 FIX: Rate limit EVERY attempt BEFORE auth check — brute force now bounded to 5/hr
  if (!(await allowAttempt(request, env, 'admin-login', 5, 3600))) {
    return json({ error: 'Too many attempts. Try again later.' }, 429);
  }

  if (!isAdmin(request, env)) {
    return json({ error: 'Unauthorized' }, 403);
  }

  if (request.method === 'GET') {
    const stored = await env.CATALOG_KV.get('catalog', { type: 'json' });
    const version = Number(await env.CATALOG_KV.get('catalog_version') || 0);
    return json({ games: Array.isArray(stored) ? stored : [], version });
  }

  if (request.method !== 'PUT') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Rate limit: 10 saves per minute
  if (!(await allowAttempt(request, env, 'admin-save', 10, 60))) {
    return json({ error: 'Too many saves. Try again in a minute.' }, 429);
  }

  let body;
  try {
    const text = await request.clone().text();
    if (text.length > 750000) return json({ error: 'Payload too large.' }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  if (!body || !Array.isArray(body.games)) return json({ error: 'Expected a games array.' }, 400);
  if (body.games.length > 5000) return json({ error: 'Catalog limit exceeded (max 5000).' }, 413);

  const incomingVersion = Number(body.version);
  if (!Number.isInteger(incomingVersion)) return json({ error: 'Missing catalog version.' }, 400);

  const currentVersion = Number(await env.CATALOG_KV.get('catalog_version') || 0);
  if (incomingVersion !== currentVersion) {
    return json({ error: 'Catalog changed in another session. Reload before saving.', version: currentVersion }, 409);
  }

  const seen = new Set();
  const catalog = [];
  for (const rawGame of body.games) {
    const game = cleanGame(rawGame);
    if (!game.name || !game.slug || seen.has(game.slug)) continue;
    seen.add(game.slug);
    catalog.push(game);
  }

  const nextVersion = currentVersion + 1;
  await env.CATALOG_KV.put('catalog', JSON.stringify(catalog));
  await env.CATALOG_KV.put('catalog_version', String(nextVersion));

  return json({ ok: true, count: catalog.length, version: nextVersion, savedAt: new Date().toISOString() });
}
