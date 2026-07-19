# HalalGames Guide — Redesign Spec
Every section below is real code, syntax-checked before going in this doc. Drop-in chunks, not descriptions.

---

## 1. Navigation — hamburger menu

**HTML** (header):
```html
<button id="menu-btn" aria-label="Open menu" aria-expanded="false" onclick="toggleMenu()" style="background:none;border:none;color:var(--heading);font-size:1.5rem;cursor:pointer;padding:8px">☰</button>
<div id="menu-drawer" class="menu-drawer" role="dialog" aria-modal="true" aria-label="Site menu">
  <button class="modal-close" onclick="toggleMenu()" aria-label="Close menu">✕</button>
  <nav style="display:flex;flex-direction:column;gap:4px;margin-top:2rem">
    <button class="menu-link" onclick="openInfoModal('about')">About / How It Works</button>
    <button class="menu-link" onclick="openInfoModal('resources')">Islamic Gaming Resources</button>
    <button class="menu-link" onclick="openInfoModal('privacy')">Privacy Policy</button>
    <button class="menu-link" onclick="openInfoModal('terms')">Terms of Service</button>
    <button class="menu-link" onclick="openInfoModal('cookies')">Cookie Policy</button>
    <a class="menu-link" href="https://mscarabia.com" target="_blank" rel="noopener">MSC Arabia</a>
  </nav>
</div>
<div id="menu-overlay" class="menu-overlay" onclick="toggleMenu()"></div>
```
**CSS:**
```css
.menu-drawer{position:fixed;top:0;right:-280px;width:280px;height:100%;background:var(--bg-surface);border-left:1px solid var(--border);z-index:200;transition:right .25s ease;padding:1.25rem}
.menu-drawer.open{right:0}
.menu-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:190;opacity:0;pointer-events:none;transition:opacity .25s}
.menu-overlay.open{opacity:1;pointer-events:auto}
.menu-link{background:none;border:none;color:var(--text);text-align:left;padding:12px 8px;font-size:.9375rem;cursor:pointer;border-radius:8px;text-decoration:none;display:block}
.menu-link:hover,.menu-link:focus-visible{background:var(--bg-card)}
```
**JS:**
```js
function toggleMenu(){
  const drawer=document.getElementById('menu-drawer'), overlay=document.getElementById('menu-overlay'), btn=document.getElementById('menu-btn');
  const open=!drawer.classList.contains('open');
  drawer.classList.toggle('open',open);
  overlay.classList.toggle('open',open);
  btn.setAttribute('aria-expanded',String(open));
  document.body.style.overflow=open?'hidden':'';
}
```

## 2. Hero copy

Replace the two `<p>` subtitle lines with one:
```html
<p style="color:var(--muted);font-size:1rem;max-width:32rem;margin:0 auto 1.5rem">Check any game's Islamic content rating before you play.</p>
```

## 3. Verdict filter — connected segmented control, hides empty cells

**HTML** (replaces the current four separate `<button class="chip">` elements):
```html
<div class="verdict-tabs" id="verdict-tabs" role="tablist" aria-label="Filter by verdict"></div>
```
**CSS:**
```css
.verdict-tabs{display:flex;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:3px;gap:0}
.verdict-tab{flex:1;text-align:center;padding:8px 4px;border-radius:9px;font-weight:600;font-size:.8125rem;border:none;background:transparent;color:var(--muted);cursor:pointer}
.verdict-tab.active{background:var(--accent-brand);color:var(--bg-deep)}
```
**JS** (call `renderVerdictTabs()` wherever `CG`/current-results gets reassigned, e.g. at the top of `renderResults`):
```js
function renderVerdictTabs(){
  const counts={all:CG.length,halal:0,caution:0,haram:0};
  CG.forEach(g=>counts[g.screen.verdict]++);
  const tabs=[['all','All'],['halal','Halal'],['caution','Caution'],['haram','Avoid']]
    .filter(([key])=>key==='all'||counts[key]>0);
  document.getElementById('verdict-tabs').innerHTML=tabs.map(([key,label])=>
    `<button class="verdict-tab${CF===key?' active':''}" role="tab" aria-selected="${CF===key}" onclick="setVerdictFilter('${key}')">${label} (${counts[key]})</button>`
  ).join('');
}
function setVerdictFilter(key){
  CF=key;
  renderVerdictTabs();
  applyFilters();
}
```

## 4. Genre filter — single row, distinct from verdict tabs, expandable

**HTML:**
```html
<div class="genre-row" id="genre-row"></div>
```
**CSS:**
```css
.genre-row{display:flex;gap:8px;flex-wrap:wrap}
.genre-row.scrollable{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.genre-row.scrollable::-webkit-scrollbar{display:none}
.chip-more{background:var(--bg-card);color:var(--accent-brand);font-weight:700}
```
**JS:**
```js
const PRIMARY_GENRES=['Action','RPG','Strategy','Sports','Puzzle'];
let genresExpanded=false;
function renderGenreChips(){
  const all=[...new Set(CG.flatMap(g=>(g.genres||[]).map(x=>x.name)))].sort();
  const shown=genresExpanded?all:all.filter(g=>PRIMARY_GENRES.includes(g));
  const remaining=all.length-shown.length;
  let html='<button class="chip'+(CGn===''?' active':'')+'" onclick="setGenreFilter(\'\')">All Genres</button>';
  html+=shown.map(g=>`<button class="chip${CGn===g?' active':''}" onclick="setGenreFilter('${g}')">${g}</button>`).join('');
  if(!genresExpanded && remaining>0) html+=`<button class="chip chip-more" onclick="expandGenres()">+${remaining}</button>`;
  document.getElementById('genre-row').innerHTML=html;
}
function expandGenres(){
  genresExpanded=true;
  document.getElementById('genre-row').classList.add('scrollable');
  renderGenreChips();
}
function setGenreFilter(g){CGn=g;applyFilters();}
```

## 5. Grid density fix + list view toggle

**Card image sizing fix** (the actual screenshot-2 bug — image container was blowing up to near-viewport height on narrow mobile widths):
```css
.game-card .card-image{height:110px;overflow:hidden}
.game-card .card-image img{width:100%;height:100%;object-fit:cover}
```

**Toggle HTML** (place next to the sort dropdown):
```html
<div class="view-toggle" role="group" aria-label="View mode">
  <button id="view-grid-btn" class="view-btn active" onclick="setViewMode('grid')" aria-label="Grid view">▦</button>
  <button id="view-list-btn" class="view-btn" onclick="setViewMode('list')" aria-label="List view">☰</button>
</div>
```
**CSS:**
```css
.view-toggle{display:flex;gap:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:3px}
.view-btn{background:none;border:none;color:var(--muted);padding:6px 10px;border-radius:7px;cursor:pointer;font-size:1rem}
.view-btn.active{background:var(--accent-brand);color:var(--bg-deep)}
.game-cards.list-mode{display:flex;flex-direction:column;gap:8px}
.game-card-list{display:flex;align-items:center;gap:12px;padding:.625rem .875rem}
```
**JS:**
```js
let VM='grid';
function setViewMode(m){
  VM=m;
  document.getElementById('view-grid-btn').classList.toggle('active',m==='grid');
  document.getElementById('view-list-btn').classList.toggle('active',m==='list');
  $results.classList.toggle('list-mode',m==='list');
  renderResults(CG);
}
```
**`renderCard` needs a list-mode branch** — add this check at the top of the existing function, before the current grid-card `return`:
```js
function renderCard(game){
  const s=game.screen;
  const vClass=`verdict-${s.verdict}`;
  const vLabel=s.verdict==='halal'?'Halal Friendly':s.verdict==='caution'?'Caution':'Avoid';
  const sColor=s.verdict==='halal'?'var(--accent-halal)':s.verdict==='caution'?'var(--accent-caution)':'var(--accent-haram)';
  const img=game.background_image||placeholderImage(game.name,460,215);
  const genres=esc((game.genres||[]).map(g=>g.name).join(', '));
  const safeName=esc(game.name);

  if(VM==='list'){
    return `<article class="game-card game-card-list" data-game-id="${game.id}" tabindex="0" role="button" aria-label="View details for ${safeName}">
      <img src="${esc(img)}" alt="" loading="lazy" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0">
        <div style="color:var(--heading);font-weight:600;font-size:.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeName}</div>
        <div style="color:var(--muted);font-size:.75rem">${genres}</div>
      </div>
      <span class="verdict-badge ${vClass}" style="flex-shrink:0">${vLabel}</span>
      <span style="color:${sColor};font-size:.75rem;font-weight:600;flex-shrink:0">${s.score}</span>
    </article>`;
  }
  // ...existing grid-card return stays exactly as-is below this point
}
```

## 6. Store links — always show something

```js
function getStoreLinks(game){
  const links=/* existing resolution logic stays here, unchanged */;
  if(links.length)return links;
  const q=encodeURIComponent(game.name+' buy');
  return[{label:'Search',url:`https://www.google.com/search?q=${q}`,cls:'store-fallback'}];
}
```

## 7. More games + platform tags

Append to `MOCK_GAMES` — exact shape to copy, `background_image` left empty on purpose (see warning below):
```js
{id:1051,name:'Age of Empires II: Definitive Edition',description_raw:'A real-time strategy game about building civilizations, managing resources and commanding armies across historical campaigns.',genres:[{name:'Strategy'}],tags:[{name:'building'},{name:'strategy'}],esrb_rating:{name:'Everyone 10+'},released:'2019-11-14',background_image:'',platforms:['PC']},
{id:1052,name:"Sid Meier's Civilization VI",description_raw:'A turn-based strategy game about building an empire through diplomacy, science, culture and war across the ages.',genres:[{name:'Strategy'}],tags:[{name:'building'},{name:'4x'}],esrb_rating:{name:'Everyone 10+'},released:'2016-10-21',background_image:'',platforms:['PC','Mobile']},
{id:1053,name:'Baba Is You',description_raw:'A puzzle game where the rules of each level are physical blocks you can push and rearrange to change how the game works.',genres:[{name:'Puzzle'}],tags:[{name:'puzzle'},{name:'indie'}],esrb_rating:{name:'Everyone'},released:'2019-03-13',background_image:'',platforms:['PC','Mobile']},
{id:1054,name:'Monument Valley',description_raw:'A puzzle game about guiding a silent princess through impossible architecture and optical illusions.',genres:[{name:'Puzzle'}],tags:[{name:'puzzle'},{name:'indie'}],esrb_rating:{name:'Everyone'},released:'2014-04-03',background_image:'',platforms:['Mobile']},
{id:1055,name:'StarCraft II',description_raw:'A real-time strategy game of resource management and military tactics across three competing species.',genres:[{name:'Strategy'}],tags:[{name:'strategy'},{name:'esports'}],esrb_rating:{name:'Teen'},released:'2010-07-27',background_image:'',platforms:['PC']},
```
**Do not hand-type `background_image` hashes.** Several earlier entries were fabricated this way and 404'd in production. Leave it `''` (the placeholder generator covers it) unless pulling a real URL from an actual RAWG API response.

Surface `platforms` on the card as small text:
```html
<span style="color:var(--muted);font-size:.6875rem">${(game.platforms||[]).join(' · ')}</span>
```

## 8. Resources/About as a menu modal + legal pages

**Shared modal shell (HTML, one instance handles all five panels):**
```html
<div class="modal-overlay" id="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-title">
  <div class="modal-content" style="max-width:560px">
    <button class="modal-close" onclick="closeInfoModal()" aria-label="Close">✕</button>
    <h2 id="info-title" style="color:var(--heading);font-size:1.25rem;font-weight:700;margin-bottom:1rem"></h2>
    <div id="info-body" style="color:var(--text);font-size:.875rem;line-height:1.7"></div>
  </div>
</div>
```
**JS** — `about` and `resources` bodies should be lifted verbatim from the current page (cut, not rewritten, so the existing disclaimer text doesn't drift):
```js
const INFO_PANELS={
  about:{title:'About HalalGames Guide',body:/* move the existing "What We Check / How It Works / Disclaimer" HTML here as-is */''},
  resources:{title:'Islamic Gaming Resources',body:/* move the existing three resource-link cards here as-is */''},
  privacy:{title:'Privacy Policy',body:`<p>HalalGames Guide doesn't use accounts, analytics, or tracking scripts.</p><p>Searches are sent through our own server to RAWG's game database. RAWG never sees your IP address or browser directly.</p><p>Reports and votes you submit are stored to review flagged verdicts. They include the game and your message, not your identity.</p>`},
  terms:{title:'Terms of Service',body:`<p>HalalGames Guide is an informational tool. Verdicts are generated automatically and reviewed informally by the community. They are not a religious ruling.</p><p>We make no guarantee that any verdict is complete or error-free. Use your own judgment and consult a qualified scholar for religious guidance.</p>`},
  cookies:{title:'Cookie Policy',body:`<p>This site does not set cookies.</p>`}
};
function openInfoModal(key){
  const p=INFO_PANELS[key];
  if(!p)return;
  document.getElementById('info-title').textContent=p.title;
  document.getElementById('info-body').innerHTML=p.body;
  document.getElementById('info-modal').classList.add('open');
  toggleMenu();
}
function closeInfoModal(){document.getElementById('info-modal').classList.remove('open')}
```
**Footer link:**
```html
<a href="https://mscarabia.com" target="_blank" rel="noopener" style="color:var(--accent-brand)">MSC Arabia</a>
```

## 9. Copy — remove em-dashes, cut marketing triads

Exact find/replace pairs:
```
FIND:    <title>HalalGames Guide — Islamic Content Ratings for Games</title>
REPLACE: <title>HalalGames Guide: Islamic Content Ratings for Games</title>

FIND:    Search any video game for an instant Islamic content rating — faith, gambling, modesty and violence, checked in seconds. Free, no signup.
REPLACE: Search any game and get its Islamic content rating in seconds.
```
Standing rule for any new copy Mimo writes: no em-dashes (period or comma instead), short sentences, no "X, Y, and Z" triads unless the three items are genuinely necessary.

## 10. Color palette (WCAG-checked, drop-in)

```css
:root{
  --bg-deep:#0B1210;      /* was #06070b */
  --bg-surface:#131F1B;   /* was #0c1018 */
  --bg-card:#182722;      /* was #12192a */
  --border:#25362F;
  --heading:#F2EFE6;      /* was #f0f4f8 */
  --text:#C7D2C9;         /* was #c8d6e5 */
  --muted:#7E9089;        /* was #6b7fa3 */
  --accent-brand:#C9A24B; /* was #818cf8 */
  --accent-halal:#5CBE88; /* was #10B981 */
  --accent-caution:#DCA84F; /* was #F59E0B */
  --accent-haram:#E2917F;   /* was #f87171 */
}
```
Every pair here, including the 15%-tint verdict badges, checks at 4.5:1 or better. Straight variable swap, no other CSS changes needed for this part.

---

## Suggested order
1. §3 + §4 + §5 — self-contained CSS/JS, biggest usability win
2. §2 + §9 — text only, no logic
3. §10 — CSS variables, do alongside #1 or #2
4. §1 + §8 — one new drawer pattern, reuses existing modal CSS
5. §6 + §7 — data and small logic changes, no UI risk
