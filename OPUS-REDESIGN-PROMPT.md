# Opus 4.8 Redesign Prompt — HalalGames Guide

## Context

You are redesigning `https://github.com/defaltadmin/halalgames` — a single-file Halal Video Game Screener app. The current site is live at `https://halalgames.mscarabia.com` and deployed via Cloudflare Pages.

**Current state**: 55 hardcoded games, muted dark palette, working but boring UI. RAWG API proxy works. Reports/admin endpoints exist. The site needs a ground-up redesign focusing on WHY games are halal/haram, not just scores.

**Your job**: Rewrite `index.html` to fix all issues below. Keep the existing `functions/` directory untouched (API proxy, reports, admin-check all work).

---

## Issues to Fix

### 1. Color Palette — Too Muted/Dull
The current warm ink-and-gold palette (#0B1210, #C9A24B) reads as "default dark template." Needs to be more vibrant and game-oriented. Think neon accents on dark — cyberpunk gamer aesthetic but cleaner. Use contrasting accent colors that pop: bright green for halal, vivid amber for caution, bright coral/red for haram. The brand color should be electric blue or cyan, not gold. Every color must pass WCAG AA (4.5:1 minimum).

### 2. Relevance Dropdown Not Working
The sort dropdown doesn't trigger a re-render. The `handleSearch` and `applyFilters` flow needs to actually re-render when sort changes. Fix: `$ss.addEventListener('change',...)` must call `applyFilters()` after setting `CS`.

### 3. Genre Tags Can't Be Minimized
Once "Show More" is clicked and genres expand, there's no way to collapse them back. Add a "-Less" button that resets `genresExpanded=false` and re-renders.

### 4. Skip Images Entirely
The placeholder images (SVG initials) are ugly and take up space. Remove ALL image rendering from game cards. Instead, make cards text-focused with the verdict and score as the visual elements. Cards should be compact and show: game name, genres, platforms, verdict badge, score bar. No image area at all. This eliminates the CLS issue permanently.

### 5. Focus on WHY — Not Just Scores
The current UI shows a score (87/100) but doesn't explain WHY. Redesign the game detail modal to show:
- **Why it's halal/caution/haram** — concrete reasons, not just "contains magic"
- **What to watch for** — specific content warnings
- **Safe alternatives** — if a game is haram, suggest halal alternatives in the same genre
- The score should be secondary to the explanation

### 6. Database of Halal/Not Games
Remove the 55 hardcoded games from `index.html`. Instead:
- Create a `games.json` file with the curated halal/haram seed data
- Fetch it on page load (falls back to inline if offline)
- The RAWG API search is the primary way to find games
- The seed data should be community-curated from Islamic gaming sources (IslamQA, Halal Guidelines, Muslim gaming forums)

### 7. Burger Menu — Too Much, Too Small
The current menu has 6 items (About, Resources, Privacy, Terms, Cookies, MSC Arabia) each opening tiny popup modals with minimal content. Redesign to:
- **3 items max**: About, Resources, Contact/Feedback
- **About**: Full-page section (not popup) explaining the screener methodology
- **Resources**: Links to Islamic gaming communities, fatwas, scholarly articles — as a proper section, not a tiny modal
- **Footer**: Privacy, Terms, Cookies as simple text links, not separate modals

### 8. Dead Space
The current layout has:
- Too much padding between sections
- The hero area is mostly empty space above the search bar
- The about/resources sections are buried at the bottom
- On mobile, half the screen is empty between the search bar and first results

Fix: Tighter vertical rhythm, use the space for content not padding. The hero should be compact — search bar should be the dominant element, not the title.

### 9. Cool Animated Background
The current background is subtle floating orbs. Make it more dynamic and game-oriented:
- Particle effect that responds to search (subtle)
- Gradient that shifts based on the dominant verdict of displayed games
- Think: dark cyberpunk with neon accents, subtle grid lines, floating geometric shapes
- Must be performant (CSS animations, no canvas/JS animation loops)

### 10. Mobile-First Responsive
The current site looks bad on mobile:
- Cards take up too much vertical space
- Genre row overflows
- Menu drawer overlaps content
- Search bar is too small on mobile

Fix: Cards should be single-column on mobile, compact. Genre chips should scroll horizontally. Search bar should be full-width.

---

## Architecture

Keep the existing architecture:
- Single `index.html` file (all CSS/JS inline)
- `functions/api/games.js` — RAWG proxy (keep as-is)
- `functions/api/reports.js` — reports endpoint (keep as-is)
- `functions/api/admin-check.js` — admin auth (keep as-is)
- `_headers` — CSP (keep as-is)

Add:
- `games.json` — curated seed data (fetched on load, inline fallback)

---

## Code Requirements

- **No images** — all game cards are text-only with verdict badges and score bars
- **escapeHtml()** for all user-facing data (XSS prevention)
- **placeholderImage()** kept only for the detail modal header (minimal)
- **CONTENT_RULES** screening engine (keep the existing one, it works)
- **Bounded cache** (Map with LRU, max 50)
- **trapFocus** for modals
- **WCAG AA** — all colors pass 4.5:1, keyboard navigation works
- **No em-dashes** in copy — use periods or commas
- **Single `admin-check.js`** secret (ADMIN_PASSWORD env var)
- **Reports via KV** (keep existing reports.js)
- **Google Search fallback** for store links when no store found

---

## Design Direction

**Palette**: Neon gamer aesthetic on dark background
- Background: #0a0e1a (deep navy-black)
- Surface: #111827 (slightly lighter)
- Card: #1e293b (slate)
- Brand/Cyan: #06b6d4 (electric cyan)
- Halal: #22c55e (vivid green)
- Caution: #f59e0b (vivid amber)
- Haram: #ef4444 (vivid red)
- Text: #e2e8f0 (light slate)
- Muted: #94a3b8 (slate gray)

**Typography**: Space Grotesk for headings, Inter for body. Bold weights for verdicts.

**Layout**: Compact, information-dense. Search bar is king. Results are a tight grid. Detail modal shows WHY, not just WHAT.

**Animations**: CSS-only particle grid background with subtle neon glow. No JavaScript animation loops.

---

## What NOT to Change

- `functions/api/games.js` — proxy works, leave it
- `functions/api/reports.js` — reports endpoint works, leave it
- `functions/api/admin-check.js` — admin auth works, leave it
- `_headers` — CSP is fine, leave it
- The screening engine logic (CONTENT_RULES) — it works, keep the structure
- The `esc()` function — it works, keep it
- The `trapFocus` implementation — it works, keep it

---

## Deliverable

Rewrite `index.html` with all fixes applied. The file should be:
- Self-contained (single file, all CSS/JS inline)
- Under 80KB
- Mobile-first responsive
- WCAG AA compliant
- Zero console errors (except Tailwind CDN warning, which is acceptable)

Include the `games.json` as a separate file if you extract the seed data.
