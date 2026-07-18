# HalalGames Guide — Fixes for Mimo
Maps to `HALALGAMES-AUDIT.md`. Screening-engine logic and helpers below were unit-tested with Node before inclusion (false-positive cases, real-gambling cases, XSS-string cases all verified).

---

## C1 — Stop shipping the RAWG key client-side

**New file:** `functions/api/games.js` (Cloudflare Pages Function — same pattern as mscarabia.com)
```js
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
```
Set `RAWG_API_KEY` as a Pages **secret** (dashboard → Settings → Environment variables), not in code. Optional: add a Cloudflare rate-limiting rule on `/api/games` (dashboard-only, no code) to cap requests/IP.

**index.html — replace `CONFIG`:**
```js
const CONFIG = {
  API_BASE: '/api/games', // proxied — see functions/api/games.js, key lives server-side only
};
```

---

## C2 + H4 — escapeHtml / placeholderImage helpers
Add right after `CONFIG`. `placeholderImage` also fixes H4 (via.placeholder.com is dead in 2026 — this drops the third-party dependency entirely).
```js
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function placeholderImage(name, w, h) {
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#12192a"/><text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(h*0.28)}" fill="#818cf8" text-anchor="middle" dominant-baseline="central">${escapeHtml(initials)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
```

---

## M4 + M5 + M10 + M11 + L1 + L2 + L3 — Screening engine rewrite
Replace `HARAM_KEYWORDS` / `CAUTION_KEYWORDS` / `HALAL_KEYWORDS` / `faithBad` / `finBad` / `modestyBad` / `violBad` (old lines 390–392, 414–435) **and** `screenGame()` (old lines 394–444) with this. Single source of truth per category (fixes M4 + the M5 cross-contamination bug as a side effect), word-boundary/phrase matching on the specific terms proven to false-positive (fixes L3 — `'war'` no longer matches hardware/software/award-winning, `'guts'` no longer matches gutsy, `'slots'` is replaced by the phrase `'slot machine'` since word-boundary alone doesn't disambiguate "inventory slots" from "slot machine" — both are genuine standalone words), drops the dead/unreachable `'idol worship'`, `'occult ritual'` phrases and the hardcoded `'dead or alive'` franchise hack (fixes L1 + L2 — verified via testing that Dead or Alive 6 still correctly scores haram without it, via `sexual`/`ecchi`/`revealing`), adds `revealing`/`skimpy`/`risqué`/`fanservice` to modesty (fixes M10), and adds an always-present `audioContent` info category (fixes M11):

```js
const CONTENT_RULES = {
  faithImpact: {
    label: 'Faith Impact (Shirk/Magic)',
    terms: [
      { term: 'witchcraft', severity: 'caution' },
      { term: 'necromancy', severity: 'caution' },
      { term: 'polytheism', severity: 'caution' },
      { term: 'sorcery', severity: 'caution' },
      { term: 'spells', severity: 'caution' },
      { term: 'magic', severity: 'caution' },
      { term: 'mythology', severity: 'caution' },
      { term: /\bdemons?\b/, severity: 'caution' },
      // ambiguous: religious idolatry vs. pop-idol/rhythm games (e.g. "The Idolmaster").
      // word-boundaried so it no longer fires on compounds; kept caution-only pending
      // your call on whether to drop it — see audit's Islamic Content Accuracy section.
      { term: /\bidol\b/, severity: 'caution' },
    ],
  },
  financialEthics: {
    label: 'Financial Ethics (Gambling/Lootboxes)',
    terms: [
      { term: 'casino', severity: 'haram' },
      { term: 'gambling', severity: 'haram' },
      { term: 'betting', severity: 'haram' },
      { term: 'poker', severity: 'haram' },
      { term: 'slot machine', severity: 'haram' }, // fix L3 (see note above)
      { term: 'lootbox', severity: 'caution' },
      { term: 'gacha', severity: 'caution' },
      { term: 'microtransaction', severity: 'caution' },
    ],
  },
  modesty: {
    label: 'Modesty (Nudity/Sensuality)',
    terms: [
      { term: 'nudity', severity: 'haram' },
      { term: 'nude', severity: 'haram' },
      { term: 'sexual', severity: 'haram' },
      { term: 'erotic', severity: 'haram' },
      { term: 'nsfw', severity: 'haram' },
      { term: 'ecchi', severity: 'haram' },
      { term: 'suggestive', severity: 'haram' },
      { term: 'revealing', severity: 'haram' },   // fix M10
      { term: 'skimpy', severity: 'haram' },      // fix M10
      { term: 'risque', severity: 'haram' },      // fix M10
      { term: 'fanservice', severity: 'haram' },  // fix M10
    ],
  },
  violenceLevel: {
    label: 'Violence Level',
    terms: [
      { term: /\bgore\b/, severity: 'haram' },
      { term: /\bguts\b/, severity: 'haram' },   // fix L3
      { term: 'fatality', severity: 'haram' },
      { term: 'gory', severity: 'haram' },
      { term: /\bblood\b/, severity: 'caution' },
      { term: 'violence', severity: 'caution' },
      { term: 'realistic', severity: 'caution' },
    ],
  },
};
const GENERAL_CAUTION_KEYWORDS = ['alcohol', 'drugs', 'dark-fantasy', /\bwar\b/]; // fix L3: word-boundary on 'war'
const HALAL_KEYWORDS = ['puzzle','racing','sports','simulator','educational','clean','family','kids','platformer','strategy','building','crafting','farm','cooking','relaxing','creative','soccer','tennis','golf','casual','party','deduction','co-op','sandbox'];

function labelOf(x) { return x instanceof RegExp ? x.source.replace(/\\b/g, '') : x; }

function screenGame(game) {
  const text = [game.name, game.description_raw || '', ...(game.genres||[]).map(g=>g.name), ...(game.tags||[]).map(t=>t.name)].join(' ').toLowerCase();
  const esrb = (game.esrb_rating?.name || '').toLowerCase();
  let score = 70;
  const tags = [];
  const flags = {};

  for (const [key, rule] of Object.entries(CONTENT_RULES)) {
    const hitRules = rule.terms.filter(({ term }) => term instanceof RegExp ? term.test(text) : text.includes(term));
    for (const h of hitRules) {
      tags.push(`${h.severity}:${labelOf(h.term)}`);
      score += h.severity === 'haram' ? -20 : -8;
    }
    // fix M5: severity now derives only from this category's own hits, never the global tag list
    const status = hitRules.some(h => h.severity === 'haram') ? 'haram' : hitRules.length ? 'caution' : 'safe';
    flags[key] = {
      status,
      detail: status === 'safe' ? `No detected ${rule.label.toLowerCase()} concerns` : 'Contains: ' + hitRules.slice(0, 3).map(h => labelOf(h.term)).join(', '),
    };
  }

  for (const kw of GENERAL_CAUTION_KEYWORDS) {
    const matched = kw instanceof RegExp ? kw.test(text) : text.includes(kw);
    if (matched) { tags.push('caution:' + labelOf(kw)); score -= 8; }
  }
  for (const kw of HALAL_KEYWORDS) { if (text.includes(kw)) { tags.push('halal:' + kw); score += 4; } }

  if (esrb.includes('mature')) { score -= 25; tags.push('esrb:mature'); }
  else if (esrb.includes('teen')) { score -= 8; tags.push('esrb:teen'); }
  else if (esrb.includes('everyone')) { score += 5; tags.push('esrb:everyone'); }

  flags.audioContent = { status: 'info', detail: 'Most games include background music/audio — check settings to mute if this matters to you.' }; // fix M11

  score = Math.max(0, Math.min(100, score));
  let verdict = 'halal';
  if (score < 35) verdict = 'haram';
  else if (score < 65) verdict = 'caution';
  if (tags.some(t => t.startsWith('haram:'))) { if (verdict !== 'haram') { verdict = 'caution'; score = Math.min(score, 40); } }

  return { verdict, score, flags, tags };
}
```

**generateTips** — drop the now-redundant genre-gated music line (M11 makes it unconditional via `audioContent`):
```
- if (genres.includes('rpg') || genres.includes('action') || genres.includes('adventure')) tips.push('If in-game music is a concern, most games allow you to mute it in the audio settings.');
```
(delete that line; nothing else in `generateTips` needs to change)

---

## H3 + H5 + M12 + L4 — fetchGames: cancel stale requests, log failures, normalize + bound the cache
Replace `searchCache`/`debounceTimer` declarations and the whole `fetchGames()` block:
```js
const searchCache = new Map(); // fix L4: bounded, replaces plain unbounded object
const SEARCH_CACHE_MAX = 50;
function cacheGet(key) {
  if (!searchCache.has(key)) return undefined;
  const val = searchCache.get(key);
  searchCache.delete(key); searchCache.set(key, val); // refresh recency
  return val;
}
function cacheSet(key, val) {
  searchCache.delete(key);
  searchCache.set(key, val);
  if (searchCache.size > SEARCH_CACHE_MAX) searchCache.delete(searchCache.keys().next().value);
}

let debounceTimer = null;
let activeController = null;
let usingFallback = false; // read by renderResults to show the offline-picks notice

async function fetchGames(query) {
  const cacheKey = query.trim().toLowerCase(); // fix M12: normalized cache key
  const cached = cacheGet(cacheKey);
  if (cached) { usingFallback = false; return cached; }

  activeController?.abort(); // fix H3
  activeController = new AbortController();
  const { signal } = activeController;

  try {
    const res = await fetch(`${CONFIG.API_BASE}?search=${encodeURIComponent(query)}&page_size=20`, { signal });
    if (!res.ok) throw new Error(`proxy returned ${res.status}`);
    const data = await res.json();
    const games = (data.results || []).map(g => ({
      ...g,
      description_raw: g.description_raw || g.description || '',
      esrb_rating: g.esrb_rating || { name: g.rating_top <= 2 ? 'Everyone' : 'Teen' },
      stores: g.stores || [],
    }));
    cacheSet(cacheKey, games);
    usingFallback = false;
    return games;
  } catch (err) {
    if (err.name === 'AbortError') return null; // fix H3: a newer search superseded this one — discard
    console.error('[HalalGames] live search failed, showing offline picks:', err); // fix H5
    usingFallback = true;
    return MOCK_GAMES.filter(g =>
      g.name.toLowerCase().includes(cacheKey) ||
      (g.description_raw||'').toLowerCase().includes(cacheKey) ||
      (g.genres||[]).some(gen => gen.name.toLowerCase().includes(cacheKey)) ||
      (g.tags||[]).some(t => t.name.toLowerCase().includes(cacheKey))
    );
  }
}
```

**handleSearch** — discard aborted requests instead of rendering stale results:
```js
async function handleSearch() {
  const query = $searchInput.value.trim();
  if (!query) { usingFallback = false; renderResults(MOCK_GAMES); return; }
  showSkeletons();
  const games = await fetchGames(query);
  if (games === null) return; // fix H3
  hideSkeletons();
  renderResults(games);
}
```

**renderResults** — surface H5's silent-fallback to the user instead of just the developer console:
```js
function renderResults(games) {
  const screened = screenAll(games);
  currentGames = screened;
  const filtered = getFilteredSorted(screened);
  $resultCount.textContent = `${filtered.length} game${filtered.length !== 1 ? 's' : ''} found` + (usingFallback ? ' (offline picks — live search unavailable)' : '');
  if (filtered.length === 0) { $results.innerHTML = ''; $emptyState.style.display = 'block'; }
  else { $emptyState.style.display = 'none'; $results.innerHTML = filtered.map(renderCard).join(''); }
}
```

---

## C2 + H1 + H4 — renderCard
Replace the whole function (drops the inline `onclick`, adds `data-game-id` for the delegated listener below):
```js
function renderCard(game) {
  const s = game.screen;
  const vClass = `verdict-${s.verdict}`;
  const vLabel = s.verdict === 'halal' ? 'Halal Friendly' : s.verdict === 'caution' ? 'Caution' : 'Avoid';
  const sColor = s.verdict === 'halal' ? 'var(--accent-halal)' : s.verdict === 'caution' ? 'var(--accent-caution)' : 'var(--accent-haram)';
  const img = game.background_image || placeholderImage(game.name, 460, 215); // fix H4
  const year = game.released ? game.released.split('-')[0] : '';
  const genres = escapeHtml((game.genres||[]).map(g=>g.name).join(', ')); // fix C2
  const safeName = escapeHtml(game.name); // fix C2

  return `
    <article class="game-card" data-game-id="${game.id}" tabindex="0" role="button" aria-label="View details for ${safeName}">
      <div style="aspect-ratio:16/9; overflow:hidden; background:var(--bg-card);">
        <img src="${escapeHtml(img)}" alt="${safeName} cover art" loading="lazy" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
      </div>
      <div style="padding:0.875rem;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
          <span class="verdict-badge ${vClass}">${vLabel}</span>
          <span style="color:var(--muted); font-size:0.6875rem;">${year}</span>
        </div>
        <h3 style="color:var(--heading); font-size:0.9375rem; font-weight:600; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</h3>
        <p style="color:var(--muted); font-size:0.75rem; margin-bottom:8px;">${genres}</p>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="score-bar" style="flex:1;">
            <div class="score-fill" style="width:${s.score}%; background:${sColor};"></div>
          </div>
          <span style="color:${sColor}; font-size:0.6875rem; font-weight:600;">${s.score}/100</span>
        </div>
      </div>
    </article>`;
}
```

---

## C2 + H2 + H4 + M11 — openDetail
Replace `icon()` and `openDetail()`:
```js
function icon(status) {
  if (status === 'safe') return '<div class="breakdown-icon icon-safe">✓</div>';
  if (status === 'caution') return '<div class="breakdown-icon icon-caution">!</div>';
  if (status === 'info') return '<div class="breakdown-icon icon-safe">♪</div>'; // fix M11
  return '<div class="breakdown-icon icon-haram">✗</div>';
}

let lastFocusedEl = null; // fix H2

function openDetail(gameId) {
  const game = MOCK_GAMES.find(g => g.id === gameId) || currentGames.find(g => g.id === gameId);
  if (!game) return;
  const s = game.screen || screenGame(game);
  const tips = generateTips(s, game);
  const vLabel = s.verdict === 'halal' ? 'Halal Friendly' : s.verdict === 'caution' ? 'Caution' : 'Avoid';
  const sColor = s.verdict === 'halal' ? 'var(--accent-halal)' : s.verdict === 'caution' ? 'var(--accent-caution)' : 'var(--accent-haram)';
  const img = game.background_image || placeholderImage(game.name, 640, 360); // fix H4
  const year = game.released ? game.released.split('-')[0] : '';
  const genres = escapeHtml((game.genres||[]).map(g=>g.name).join(', ')); // fix C2
  const esrb = escapeHtml(game.esrb_rating?.name || 'Not rated'); // fix C2
  const safeName = escapeHtml(game.name); // fix C2
  const safeDesc = escapeHtml(game.description_raw || 'No description available.'); // fix C2
  const storeLinks = getStoreLinks(game);

  $detailContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    <div style="aspect-ratio:16/9; border-radius:12px; overflow:hidden; margin-bottom:1.25rem; background:var(--bg-deep);">
      <img src="${escapeHtml(img)}" alt="${safeName}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; flex-wrap:wrap; gap:8px;">
      <h2 id="detail-title" style="color:var(--heading); font-size:1.5rem; font-weight:700;">${safeName}</h2>
      <span style="color:var(--muted); font-size:0.875rem;">${year}</span>
    </div>
    <p style="color:var(--muted); font-size:0.8125rem; margin-bottom:0.75rem;">${genres} · ESRB: ${esrb}</p>
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:1rem;">
      <span class="verdict-badge verdict-${s.verdict}" style="font-size:0.9375rem; padding:6px 16px;">${vLabel}</span>
      <div style="flex:1;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
          <span style="font-size:0.75rem; color:var(--muted);">Halal Score</span>
          <span style="font-size:0.8125rem; font-weight:600; color:${sColor};">${s.score}/100</span>
        </div>
        <div class="score-bar" style="height:8px;"><div class="score-fill" style="width:${s.score}%; background:${sColor};"></div></div>
      </div>
    </div>
    <p style="color:var(--text); font-size:0.9375rem; line-height:1.6; margin-bottom:1.25rem;">${safeDesc}</p>

    <h3 style="color:var(--heading); font-size:1rem; font-weight:600; margin-bottom:0.75rem;">Content Breakdown</h3>
    <div style="margin-bottom:1.25rem;">
      <div class="breakdown-row">${icon(s.flags.faithImpact.status)}<div style="flex:1;"><div style="color:var(--heading); font-size:0.875rem; font-weight:500;">Faith Impact (Shirk/Magic)</div><div style="color:var(--muted); font-size:0.8125rem;">${escapeHtml(s.flags.faithImpact.detail)}</div></div></div>
      <div class="breakdown-row">${icon(s.flags.financialEthics.status)}<div style="flex:1;"><div style="color:var(--heading); font-size:0.875rem; font-weight:500;">Financial Ethics (Gambling/Lootboxes)</div><div style="color:var(--muted); font-size:0.8125rem;">${escapeHtml(s.flags.financialEthics.detail)}</div></div></div>
      <div class="breakdown-row">${icon(s.flags.modesty.status)}<div style="flex:1;"><div style="color:var(--heading); font-size:0.875rem; font-weight:500;">Modesty (Nudity/Sensuality)</div><div style="color:var(--muted); font-size:0.8125rem;">${escapeHtml(s.flags.modesty.detail)}</div></div></div>
      <div class="breakdown-row">${icon(s.flags.violenceLevel.status)}<div style="flex:1;"><div style="color:var(--heading); font-size:0.875rem; font-weight:500;">Violence Level</div><div style="color:var(--muted); font-size:0.8125rem;">${escapeHtml(s.flags.violenceLevel.detail)}</div></div></div>
      <div class="breakdown-row">${icon(s.flags.audioContent.status)}<div style="flex:1;"><div style="color:var(--heading); font-size:0.875rem; font-weight:500;">Audio Content</div><div style="color:var(--muted); font-size:0.8125rem;">${escapeHtml(s.flags.audioContent.detail)}</div></div></div>
    </div>

    <h3 style="color:var(--heading); font-size:1rem; font-weight:600; margin-bottom:0.5rem;">How to Play Safely</h3>
    <div class="tip-box" style="margin-bottom:1.25rem;">
      ${tips.map(t => `<p style="color:var(--text); font-size:0.875rem; line-height:1.6; margin-bottom:0.5rem;">💡 ${escapeHtml(t)}</p>`).join('')}
    </div>

    <h3 style="color:var(--heading); font-size:1rem; font-weight:600; margin-bottom:0.5rem;">Where to Buy</h3>
    <div class="affiliate-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:8px; margin-bottom:1rem;">
      ${storeLinks.map(l => `<a href="${l.url}" target="_blank" rel="noopener sponsored" class="affiliate-btn ${l.cls}">${l.label}</a>`).join('')}
    </div>

    ${s.tags.length > 0 ? `<details style="margin-top:0.5rem;"><summary style="color:var(--muted); font-size:0.8125rem; cursor:pointer; padding:4px 0;">Show detected tags (${s.tags.length})</summary><div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">${s.tags.map(t => `<span style="background:var(--border); color:var(--muted); padding:2px 8px; border-radius:4px; font-size:0.6875rem;">${escapeHtml(t)}</span>`).join('')}</div></details>` : ''}
  `;

  lastFocusedEl = document.activeElement; // fix H2
  $modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  $detailContent.querySelector('.modal-close')?.focus(); // fix H2
  document.addEventListener('keydown', trapFocus); // fix H2
}
```

---

## H1 + H2 + M8 — event listeners
Replace `closeModal()` + the two lines right after it, and the `.chip` listener block:
```js
function trapFocus(e) { // fix H2
  if (e.key !== 'Tab') return;
  const focusable = $detailContent.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function closeModal() {
  $modal.classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', trapFocus); // fix H2
  lastFocusedEl?.focus(); // fix H2
}
$modal.addEventListener('click', (e) => { if (e.target === $modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $modal.classList.contains('open')) closeModal(); });

// fix H1: delegated click + keyboard activation — works for every re-render, no re-attaching needed
$results.addEventListener('click', (e) => {
  const card = e.target.closest('.game-card');
  if (card) openDetail(Number(card.dataset.gameId));
});
$results.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.game-card');
  if (card) { e.preventDefault(); openDetail(Number(card.dataset.gameId)); }
});
```

```js
document.querySelectorAll('.chip').forEach(chip => {
  chip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false'); // fix M8
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed', 'true'); // fix M8
    currentFilter = chip.dataset.filter;
    if (currentGames.length > 0) {
      const filtered = getFilteredSorted(currentGames);
      $resultCount.textContent = `${filtered.length} game${filtered.length !== 1 ? 's' : ''} found`;
      if (filtered.length === 0) { $results.innerHTML = ''; $emptyState.style.display = 'block'; }
      else { $emptyState.style.display = 'none'; $results.innerHTML = filtered.map(renderCard).join(''); }
    }
  });
});
```

---

## H7 + M8 + H2 — HTML attribute patches
```
Line 222  find:    <input type="text" id="search-input" placeholder="Search for a game (e.g. Minecraft, GTA, FIFA...)" autocomplete="off" autofocus>
          replace:  <input type="text" id="search-input" placeholder="Search for a game (e.g. Minecraft, GTA, FIFA...)" aria-label="Search for a game" autocomplete="off" autofocus>

Line 247  find:    <div id="result-count" style="color:var(--muted); font-size:0.875rem;"></div>
          replace:  <div id="result-count" style="color:var(--muted); font-size:0.875rem;" aria-live="polite"></div>

Line 248  find:     <select id="sort-select" style="...">
          replace:  <select id="sort-select" aria-label="Sort results" style="...">

Line 302  find:    <div class="modal-content" id="detail-content"></div>
          replace:  <div class="modal-content" id="detail-content" role="dialog" aria-modal="true" aria-labelledby="detail-title"></div>
```

---

## H6 + M9 — CSS patches
```
Line 105  find:    --accent-halal: #10B981; --accent-caution: #F59E0B; --accent-haram: #EF4444; --accent-brand: #818cf8;
          replace:  --accent-halal: #10B981; --accent-caution: #F59E0B; --accent-haram: #f87171; --accent-brand: #818cf8;
```
(fix H6 — computed: old `#EF4444` on the 15%-tint badge background is 4.04:1, fails AA. `#f87171` computes to 5.13:1 on the same badge and 6.34:1 used directly, both pass AA. Same variable also fixes `icon-haram`, which uses the identical low-contrast pattern.)

Add near `.game-card:hover` / `.chip:hover` (fix M9):
```css
.game-card:focus-visible { outline: 2px solid var(--accent-brand); outline-offset: 2px; }
.chip:focus-visible { outline: 2px solid var(--accent-brand); outline-offset: 2px; }
```

---

## M6 — CSP
Insert after the viewport meta tag (line 5):
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self';">
```
`'unsafe-inline'` stays on both directives for now — the page relies on inline `style=""` everywhere and inline `<script>` blocks (JSON-LD, Tailwind config, app logic), so removing it needs a bigger structural pass, not this one. Once C1 is live, `connect-src 'self'` is enough (RAWG is now called server-side, not from the browser). Once M7 (Tailwind CDN removal) ships, drop `https://cdn.tailwindcss.com` from `script-src`.

---

## M2 — Title / meta description length
```
Line 6  find:    <title>HalalGames Guide — Search Any Game for Islamic Content Rating | Free Halal Game Screener</title>
        replace:  <title>HalalGames Guide — Islamic Content Ratings for Games</title>

Line 7  find:    <meta name="description" content="Search any video game and instantly get an Islamic content rating. Free halal game screener checking faith impact, gambling mechanics, modesty, and violence levels. Know before you play.">
        replace:  <meta name="description" content="Search any video game for an instant Islamic content rating — faith, gambling, modesty and violence, checked in seconds. Free, no signup.">
```
(52 chars / 137 chars — both verified under the ~60/~155 display limits)

---

## L6 — dead hreflang
```
Line 34  delete:  <link rel="alternate" hreflang="en" href="https://halalgames.mscarabia.com">
```

---

## M7 — Tailwind CDN → build step (not an index.html edit)
```bash
npm install -D tailwindcss
npx tailwindcss init
# point content: ["./index.html"] at your file, then:
npx tailwindcss -i ./src/input.css -o ./dist/tailwind.css --minify
```
Replace `<script src="https://cdn.tailwindcss.com">` + the inline `tailwind.config` block with `<link rel="stylesheet" href="/tailwind.css">`, keeping the same `theme.extend` values in `tailwind.config.js` instead of inline JS.
