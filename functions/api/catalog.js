const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS
  });
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
      noCombat: null,
      noGambling: null,
      noNudity: null,
      noMagic: null,
      music: 'unknown',
      singleplayer: null,
      coOp: null,
      ...(game.filters || {})
    }
  };
}

export async function onRequestGet({ env, request }) {
  let catalog = null;

  if (env.CATALOG_KV) {
    try {
      catalog = await env.CATALOG_KV.get('catalog', { type: 'json' });
    } catch {
      // KV read failed, fall through to games.json
    }
  }

  if (Array.isArray(catalog) && catalog.length > 0) {
    return json({
      version: 1,
      games: catalog.map(normalizeGame),
      source: 'catalog-kv'
    });
  }

  // KV is empty or unavailable — fall back to games.json
  try {
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/games.json`);
    if (res.ok) {
      const fallback = await res.json();
      if (Array.isArray(fallback) && fallback.length > 0) {
        return json({
          version: 1,
          games: fallback.map(normalizeGame),
          source: 'games-json-fallback'
        });
      }
    }
  } catch {
    // games.json fetch failed
  }

  return json({ version: 1, games: [], source: 'empty' });
}
