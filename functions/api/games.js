export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const pageSize = searchParams.get('page_size') || '20';
  const url = `https://api.rawg.io/api/games?key=${env.RAWG_API_KEY}&search=${encodeURIComponent(search)}&page_size=${pageSize}`;
  const res = await fetch(url);
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
