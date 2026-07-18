export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const pageSize = searchParams.get('page_size') || '20';
  const apiKey = env.RAWG_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RAWG_API_KEY not configured', results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=${pageSize}`;
  try {
    const res = await fetch(url);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'RAWG API fetch failed', results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
