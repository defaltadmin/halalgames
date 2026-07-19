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
    sources: Array.isArray(game.sources) ? game.sources : [],
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

export async function onRequestGet({ env }) {
  if (!env.CATALOG_KV) {
    return json({ error: 'Catalog KV is not configured.' }, 503);
  }

  const catalog = await env.CATALOG_KV.get('catalog', { type: 'json' });

  if (!Array.isArray(catalog)) {
    return json({ version: 1, games: [], source: 'empty' });
  }

  return json({
    version: 1,
    games: catalog.map(normalizeGame),
    source: 'catalog-kv'
  });
}
