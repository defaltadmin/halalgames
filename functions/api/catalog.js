const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizeGame(game) {
  return {
    ...game,
    verdict: game.verdict || 'unreviewed',
    screeningStatus: game.screeningStatus || 'unreviewed',
    score: Number.isFinite(game.score) ? game.score : null,
    reasons: Array.isArray(game.reasons) ? game.reasons : [],
    warnings: Array.isArray(game.warnings) ? game.warnings : [],
    alternatives: Array.isArray(game.alternatives) ? game.alternatives : [],
    sources: Array.isArray(game.sources) ? game.sources.slice(0, 12) : [],
    stores: Array.isArray(game.stores) ? game.stores : [],
    reviewConfidence: game.reviewConfidence || 'none',
    lastReviewedAt: game.lastReviewedAt || null,
    filters: {
      noCombat: null, noGambling: null, noNudity: null, noMagic: null,
      music: 'unknown', singleplayer: null, coOp: null,
      ...(game.filters || {})
    }
  };
}

// F6 FIX: Use request origin instead of hardcoded URL
export async function onRequestGet({ request, env }) {
  let catalog = null;
  if (env.CATALOG_KV) {
    try { catalog = await env.CATALOG_KV.get('catalog', { type: 'json' }); } catch {}
  }

  if (Array.isArray(catalog) && catalog.length > 0) {
    return json({ version: 1, games: catalog.map(normalizeGame), source: 'catalog-kv' });
  }

  // F9 FIX: Use origin-relative URL instead of hardcoded production URL
  const origin = new URL(request.url).origin;
  try {
    const fallback = await fetch(`${origin}/games.json`);
    if (fallback.ok) {
      const games = await fallback.json();
      return json({ version: 1, games: Array.isArray(games) ? games.map(normalizeGame) : [], source: 'games-json' });
    }
  } catch {}

  return json({ version: 1, games: [], source: 'empty' }, 200);
}
