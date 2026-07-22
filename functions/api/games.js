import { allowAttempt } from './_utils.js';

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').slice(0, 100);
  let pageSize = parseInt(searchParams.get('page_size') || '20', 10);
  pageSize = Math.min(Math.max(pageSize, 1), 40);

  const apiKey = env.RAWG_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured', results: [] }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // F5 FIX: Rate limit per-IP to protect RAWG quota
  if (!(await allowAttempt(request, env, 'rawg-search', 60, 60))) {
    return new Response(JSON.stringify({ error: 'rate_limited', results: [] }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=${pageSize}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    // F8 FIX: Map upstream errors to controlled shape
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'upstream_error', results: [], upstream_status: res.status }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'upstream_failed', results: [] }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }
}
