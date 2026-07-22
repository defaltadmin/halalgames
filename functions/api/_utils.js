export function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const ba = enc.encode(String(a ?? ''));
  const bb = enc.encode(String(b ?? ''));
  if (ba.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ba, bb);
}

export async function allowAttempt(request, env, prefix, limit, ttl) {
  if (!env.REPORTS_KV) return true;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const hour = new Date().toISOString().slice(0, 13);
  const key = `${prefix}:${ip}:${hour}`;
  const count = Number(await env.REPORTS_KV.get(key) || 0);
  if (count >= limit) return false;
  await env.REPORTS_KV.put(key, String(count + 1), { expirationTtl: ttl });
  return true;
}

export function cleanText(value, max = 1200) {
  return String(value || '').trim().slice(0, max);
}

export function cleanSlug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

export function cleanSource(src) {
  if (!src || typeof src !== 'object') return null;
  const type = String(src.type || '').trim();
  if (!['official', 'store', 'review', 'manual'].includes(type)) return null;
  const url = String(src.url || '').trim();
  if (!url || url.length > 500) return null;
  try { new URL(url); } catch { return null; }
  return { type, url, checkedAt: String(src.checkedAt || '').slice(0, 10) };
}

export function cleanFilter(value, type) {
  if (type === 'string') return ['unknown', 'present', 'absent', 'mixed'].includes(value) ? value : 'unknown';
  return value === true || value === false ? value : null;
}
