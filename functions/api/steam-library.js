const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

function parseProfile(value) {
  const input = String(value || '').trim();
  if (/^\d{17}$/.test(input)) return { steamid: input };
  try {
    const url = new URL(input);
    if (url.hostname !== 'steamcommunity.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'profiles' && /^\d{17}$/.test(parts[1] || '')) return { steamid: parts[1] };
    if (parts[0] === 'id' && /^[a-zA-Z0-9_-]{1,64}$/.test(parts[1] || '')) return { vanity: parts[1] };
  } catch {}
  return null;
}

async function steamGet(path, params, key) {
  const url = new URL(`https://api.steampowered.com/${path}`);
  url.searchParams.set('key', key);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const response = await fetch(url);
  if (!response.ok) throw new Error('Steam request failed');
  return response.json();
}

export async function onRequestGet({ request, env }) {
  const profile = new URL(request.url).searchParams.get('profile');
  if (!profile || profile.length > 240) return json({ error: 'Enter a valid Steam profile URL.' }, 400);
  if (!env.STEAM_API_KEY) return json({ error: 'Steam integration is not configured.' }, 503);

  const parsed = parseProfile(profile);
  if (!parsed) return json({ error: 'Invalid Steam profile URL. Use steamcommunity.com/id/yourname or /profiles/12345678901234567.' }, 422);

  try {
    let steamid = parsed.steamid;
    if (!steamid) {
      const resolved = await steamGet('ISteamUser/ResolveVanityURL/v0001/', { vanityurl: parsed.vanity }, env.STEAM_API_KEY);
      if (resolved?.response?.success !== 1) return json({ error: 'Steam profile not found. Make sure the profile is public.' }, 404);
      steamid = resolved.response.steamid;
    }
    const owned = await steamGet('IPlayerService/GetOwnedGames/v0001/', { steamid, include_appinfo: 1, include_played_free_games: 1 }, env.STEAM_API_KEY);
    return json({
      gameCount: owned?.response?.game_count || 0,
      games: (owned?.response?.games || []).map(g => ({ appid: g.appid, name: g.name, playtimeMinutes: g.playtime_forever || 0 }))
    });
  } catch {
    return json({ error: 'Steam could not return this library. Make sure the profile and game details are public.' }, 502);
  }
}
