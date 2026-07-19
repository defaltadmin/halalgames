export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').slice(0, 100);
  let pageSize = parseInt(searchParams.get('page_size') || '20', 10);
  pageSize = Math.min(Math.max(pageSize, 1), 40);
  const apiKey = env.RAWG_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'not_configured', results: [] }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=${pageSize}`;
  try {
    const res = await fetch(url);
    return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } });
  } catch {
    return new Response(JSON.stringify({ error: 'upstream_failed', results: [] }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
