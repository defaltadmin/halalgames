# HalalGames Guide — Code Audit
`index.html` · 711 lines, single-file · audited against SONNET-AUDIT-PROMPT.md

---

## Critical

### C1. RAWG API key hardcoded and shipped to every visitor
**Where:** `CONFIG.RAWG_API_KEY`, line 310 — used directly in the fetch URL, line 508.
Anyone can read the key from view-source or DevTools and reuse it outside your domain. RAWG requires a key on every request and has historically capped free-tier usage around 20,000 requests/month — one scraped key hammered externally can exhaust or get the key banned, breaking search for all real visitors.
**Fix:** Proxy the request through a Cloudflare Worker/Pages Function (you already use this pattern on mscarabia.com). Client calls your own `/api/games?search=...` endpoint; the Worker holds the real key as a secret and forwards to RAWG.

### C2. Third-party API text is injected via `innerHTML` with no escaping — XSS surface
**Where:** `renderCard()` line 543–576 and `openDetail()` line 633–698, both writing into `$results.innerHTML` (580) / `$detailContent.innerHTML` (652).
`game.name`, `game.description_raw`, `esrb_rating.name`, and `game.background_image` all come from RAWG (a community-contributed database) and are interpolated straight into HTML/attribute strings with zero escaping — no `escapeHtml`/sanitizer exists anywhere in the file (confirmed by grep). Two concrete breakouts:
- `<img src="${img}" alt="${game.name} cover art">` (line ~558, ~654) — a quote character in either value breaks out of the attribute and injects a new one (e.g. an `onerror` handler).
- `description_raw` is written as raw HTML content in the modal — any markup in that field executes as-is.

By contrast, the store-link URLs (`getStoreLinks`, ~line 380) correctly run `game.name` through `encodeURIComponent` first — so the fix pattern already exists in your own code, it's just not applied consistently.
**Fix:** Add one helper and use it everywhere untrusted text meets HTML:
```js
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
```
Wrap `game.name`, `description_raw`, `esrb`, and any attribute-position value in `escapeHtml(...)`. For `img` specifically, also validate it's an `http(s)` URL before using it as `src`.

---

## High

### H1. Game cards are completely unusable by keyboard
**Where:** line 553 — `<article class="game-card" onclick="openDetail(${game.id})" tabindex="0" role="button" aria-label="...">`.
`role="button"` on a non-button element does **not** get free Enter/Space activation from the browser — that has to be wired up manually, and grep confirms there is no `keydown` listener attached to `.game-card` anywhere in the file. A keyboard-only or screen-reader user can Tab to a card but has no way to open it.
**Fix:**
```js
card.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(game.id); }
});
```
(Or swap `<article role="button">` for a real `<button>` and get this for free.)

### H2. Modal has no focus management
**Where:** `openDetail()` line 633 / `.modal-overlay` line 170.
On open, focus stays wherever it was (visually behind the overlay); nothing moves focus into the modal, there's no focus trap, and focus isn't restored to the triggering card on close. The modal also has no `role="dialog"`/`aria-modal="true"`/`aria-labelledby` — screen readers won't announce it as a dialog at all. `document.body.style.overflow='hidden'` blocks background *scrolling* but not background *focusability*.
**Fix:** On open — store `document.activeElement`, move focus to the close button or modal container, trap Tab within `.modal-content`. On close — restore focus to the stored element. Add `role="dialog" aria-modal="true" aria-labelledby="detail-title"` to `.modal-content`.

### H3. Search results race condition — no request sequencing
**Where:** `fetchGames()` line 503, debounce at line 605.
The 300ms debounce is implemented correctly, but once a fetch is in flight there's no `AbortController` or request token. If a slow-resolving earlier query (e.g. "a") finishes *after* a faster later one ("ab"), its `.then` still fires and `renderResults()` overwrites the correct, newer results with stale ones. This is the same class of bug flagged in your Prayer Times audits.
**Fix:**
```js
let currentController = null;
async function fetchGames(query) {
  currentController?.abort();
  currentController = new AbortController();
  const res = await fetch(url, { signal: currentController.signal });
  ...
}
```
Ignore/discard results if `controller.signal.aborted` by the time the response resolves.

### H4. Broken fallback images on 100% of the default/fallback catalog
**Where:** All 20 `MOCK_GAMES` entries (confirmed via grep) have `background_image: ''`, which falls through to a `via.placeholder.com` URL in `renderCard`/`openDetail`.
`via.placeholder.com` is effectively dead in 2026 — its SSL/DNS behavior has been flapping between resets and timeouts since 2024, with no migration notice from the operator. Since `MOCK_GAMES` is what renders on first page load (before any search) *and* is the silent fallback whenever the live API call fails (see H5), this means the app's default and error-fallback states both show broken image icons on every card.
**Fix:** Switch to `placehold.co` (drop-in replacement, same URL shape) or better, generate an inline SVG data-URI placeholder client-side — removes a third-party dependency entirely, which also fits the app's existing privacy-first framing.

### H5. Silent failure in `fetchGames` — no logging, no user-facing signal
**Where:** line 519, `catch {}`.
The only try/catch in the file swallows every error type (network failure, RAWG downtime, revoked/rate-limited key, malformed JSON) with no parameter, no `console.error`, nothing — then silently filters the 20-item `MOCK_GAMES` array instead. A user searching "Zelda" during an outage sees "No games found," which reads as *"Zelda isn't in your database"* rather than the real cause, *"the live search failed."* This isn't about adding analytics/tracking (your no-analytics stance is a fine, intentional choice) — it's the difference between zero telemetry and zero visibility into your own app's failures.
**Fix:** At minimum `console.error(err)` for your own debugging, plus a visible inline banner ("Showing a limited offline list — live search unavailable") when the catch path is taken, so the empty/limited state doesn't read as a data gap.

### H6. "Avoid" verdict badge fails WCAG AA contrast
**Where:** `.verdict-badge` line 152, `.verdict-haram` color rule, used at lines 559 and in the modal.
Computed (WCAG relative-luminance formula, `--accent-haram` #EF4444 text on its ~15%-opacity badge background composited over `--bg-card` #12192a): **4.04:1**, against a 4.5:1 requirement for normal-size text (the badge text is 0.75rem/12px–0.9375rem/15px, well under the "large text" exemption). This is precisely the warning label that most needs to be legible. For reference, the halal (5.45:1) and caution (6.32:1) badges both pass comfortably — haram is the outlier.
**Fix:** Darken the background tint slightly or lighten `--accent-haram` a few steps (e.g. `#f87171`) and re-check; target ≥4.5:1.

### H7. Search input and sort control have no accessible label
**Where:** `#search-input` line 222, `#sort-select` line 248.
Grep confirms zero `<label>` elements exist anywhere in the document. Both controls rely on placeholder text/visual context only — placeholder is not a reliable substitute for a label (it disappears on input and isn't consistently exposed to assistive tech).
**Fix:** Add `aria-label="Search for a game"` to the input and `aria-label="Sort results"` to the select (fastest fix; a visually-hidden `<label for>` is the more conventional option if you want one).

---

## Medium

### M1. Entire game catalog is 100% client-rendered — no crawlable per-game content
The `<div id="results">` (raw HTML) is empty; every card is injected by JS after `DOMContentLoaded`. Given the meta description explicitly targets discovery intent ("halal game screener"), the highest-value long-tail query is plausibly *"is [game] halal"* — but there are no per-game routes/URLs at all, so nothing about any individual game is ever indexable as distinct content. This affects long-tail discoverability far more than the title-length issue below.
**Fix:** Not a same-day fix, but worth roadmapping: static-generate a page per curated/popular game (even just for the 20 `MOCK_GAMES` initially) with its own URL and per-game structured data.

### M2. Title and meta description exceed typical SERP display limits
**Where:** lines 6–7. Title is ~89 characters (Google typically renders ~50–60); description is ~187 characters (typical cutoff ~155–160). Both will likely truncate mid-word in results.
**Fix:** Title ≈ "HalalGames Guide — Islamic Content Ratings for Video Games" (~60 chars). Trim description to the core value prop + CTA within ~155 chars.

### M3. FAQPage schema (line 54) no longer produces rich results
Google retired FAQ rich results from Search entirely on May 7, 2026 (this followed an August 2023 restriction to government/health sites, then full removal for everyone, including those). The schema itself isn't invalid or harmful to leave in — Google still parses it for page understanding — but budget it as informational-only, not a SERP-space lever, and don't spend more effort growing it for that purpose.

### M4. Duplicate, divergence-prone keyword lists
**Where:** `HARAM_KEYWORDS`/`CAUTION_KEYWORDS`/`HALAL_KEYWORDS` (390–392) vs. `faithBad`/`finBad`/`modestyBad`/`violBad` (414, 419, 424, 429).
The same concepts (gambling terms, magic terms, etc.) are hand-duplicated across two independent lists — one drives the score/top-line tags, the other drives the detailed per-category breakdown. Updating one without the other (e.g. adding a new gambling term to `HARAM_KEYWORDS` but forgetting `finBad`) silently desyncs the headline verdict from the detail modal's explanation.
**Fix:** Define each category once (e.g. `{term, severity, category}` objects) and derive both the scoring loop and the flags object from that single source.

### M5. `faithImpact` severity can be set by an unrelated category's match
**Where:** line 416: `flags.faithImpact.status = tags.some(t => t.includes('haram')) ? 'haram' : 'caution';`
This checks the *global* tags array for any `haram:` prefix — not whether the faith-specific match itself was haram-severity. Concretely: a game matching only `idol` (a `CAUTION_KEYWORDS`/`faithBad` term — think a pop-idol rhythm game, not religious idolatry) would correctly show faith caution *unless* the same game also happens to match an unrelated `HARAM_KEYWORDS` term (including a false positive — see M-below), in which case faith impact jumps straight to "haram" for a reason that has nothing to do with faith content. `financialEthics`, `modesty`, and `violenceLevel` are all self-contained and don't have this issue — only `faithImpact` reaches outside its own match set.
**Fix:** Base the haram/caution split on `faithBad`-specific severity (e.g. split `faithBad` into its own haram/caution tiers) rather than the global `tags` array.

### M6. No Content-Security-Policy at all
No CSP meta tag exists anywhere in `<head>`. Given the page loads Tailwind's CDN script, Google Fonts, the RAWG API, and a placeholder-image host, a CSP is very doable via `<meta http-equiv="Content-Security-Policy">` and would materially reduce the blast radius of C2 above.

### M7. Tailwind CDN script shipped to production
**Where:** line 89, `<script src="https://cdn.tailwindcss.com">`.
This is Tailwind's own play-CDN build — documented as intended for prototyping, not production: it ships the full JIT compiler and recompiles styles in-browser on every load, which is heavier and slower than a compiled/purged stylesheet.
**Fix:** Build a purged static CSS file (Tailwind CLI, no framework needed) and drop the runtime script.

### M8. Toggle state and result updates aren't exposed to assistive tech
Filter chips (line 228) toggle a visual `.active` class but carry no `aria-pressed`; `#result-count` (line 247, updated at 578/618) changes text on every search/filter but has no `aria-live="polite"` — screen reader users get no notification that results changed at all.
**Fix:** Toggle `aria-pressed="true/false"` alongside the `.active` class on chips; add `aria-live="polite"` to `#result-count`.

### M9. No custom focus style for cards or chips
`#search-input` has a deliberate custom `:focus` treatment (border/box-shadow), but `.game-card` and `.chip` have only `:hover` styles — no `:focus`/`:focus-visible` rule. Nothing strips the browser default outline, so keyboard focus is likely still visible, but it's inconsistent with the rest of the design system and worth a matching custom style once H1's keyboard handler makes cards genuinely operable.

### M10. Modesty keyword list misses common descriptive phrasing
**Where:** `modestyBad`, line 424 — `['nudity','nude','sexual','erotic','nsfw','ecchi','suggestive']`.
Real RAWG descriptions/tags more often use phrasing like "revealing outfits," "skimpy," "risqué," or "fanservice" than the clinical terms currently listed. In the bundled `MOCK_GAMES` data itself, the *Dead or Alive 6* entry only avoids slipping through because it happens to also carry an `ecchi` tag and match the hardcoded `dead or alive` phrase (L2) — strip either of those and a description containing only "revealing outfits" would currently score as modesty-safe.
**Fix:** Add the common descriptive terms above to `modestyBad`.

### M11. No dedicated "music" screening category
Music in entertainment is a genuinely live topic in the fiqh discussion around video games — one widely-cited Hanafi ruling on gaming treats background music as something to mute where possible, alongside violence and immodesty as core screened concerns. This app doesn't screen for music at all as a category; it only surfaces as an incidental tip ("If in-game music is a concern...", line 455) for RPG/action/adventure genres specifically — even though nearly every game has a soundtrack. Given three of your four flag categories exist to name exactly this kind of concern, music's absence is a completeness gap worth a deliberate decision (add a category, or note the omission explicitly) rather than a genre-specific footnote.

### M12. Search cache key isn't normalized
**Where:** `searchCache[query]` check, near line 503.
The cache key is the raw, case-sensitive query string, so "Minecraft," "minecraft," and " Minecraft " each trigger a separate API call for identical results.
**Fix:** Key on `query.trim().toLowerCase()`.

---

## Low

### L1. Keywords that will essentially never match real API text
`'idol worship'` and `'occult ritual'` (line 390) and `'shirk'` (line 414) require either an exact multi-word phrase or an Arabic transliteration term to appear verbatim in RAWG's plain-English game descriptions — vanishingly unlikely in practice. They're not harmful, just dead weight that overstates the list's actual coverage.

### L2. Franchise-specific keyword hardcoded into a general list
`'dead or alive'` (line 390) singles out one game title inside an otherwise principle-based keyword list — fragile (breaks if RAWG ever phrases a sequel's data slightly differently) and inconsistent with how every other entry works.

### L3. Naive substring matching creates verdict-flipping false positives
Because `text.includes(kw)` is a raw substring test, single-word entries match inside unrelated words: `'war'` (391) matches "hardware," "software," and "award-winning" — all common in game descriptions/system-requirement blurbs; `'slots'` (390) matches "10 inventory slots" or "save slots," not just slot machines; `'guts'` (390, 429) matches "gutsy." This isn't just noisy tagging — the scoring starts at 70 (line 397) and a single caution-level hit is -8, which alone drops a clean game from **Halal (70) to Caution (62)**, since the caution band is 35–64 (line 440). One spurious "award-winning" match is enough to flip the headline verdict.
**Fix:** Wrap single-word, high-collision terms in word-boundary regex (`\bwar\b`) instead of `includes()`, and consider dropping `'war'` as a caution trigger on its own — as a broad genre-defining word for mainstream strategy games, it's a blunt instrument for what's actually a nuanced question of degree/intent.

### L4. `searchCache` grows unbounded for the session
No max size or eviction. Low impact for a typical session, but worth a simple LRU cap if the app is ever left open long-term.

### L5. Inline event handlers mixed with `addEventListener`
Cards/close button use `onclick=`, hover swaps use `onmouseover`/`onmouseout` (5 each), while search/chips/sort/modal use `addEventListener`. Not wrong, just two patterns doing the same job in one file.

### L6. Single self-referential `hreflang` provides no real benefit
Line 34 — a lone `hreflang="en"` pointing at itself, with no other language versions and no `x-default`, doesn't do anything `hreflang` is meant to do. Harmless, but can be removed until there's a second locale.

### L7. Nintendo store-button contrast sits right at the AA line
White text on `#e60012` computes to 4.80:1 against a 4.5:1 minimum — passes today, but with near-zero margin if the brand red ever shifts.

---

## Islamic Content Accuracy

The keyword-matching approach is inherently a blunt instrument for a domain with real scholarly nuance, and the app already handles that honestly — the footer disclaimer ("informational purposes only and does not constitute a religious ruling," line 294, plus "consult qualified scholars," line 295) is good practice and should stay prominent, arguably surfaced near the verdict itself, not just in the footer.

**Where the current logic lines up well with mainstream contemporary guidance:** treating casino/gambling/betting/poker/slots as hard "haram" triggers, and lootbox/gacha/microtransactions as at least "caution," is consistent with recent fatwas specifically on this topic — e.g. Islamweb's Fatwa Center (#379243, already linked in your own footer resources at line 278) rules that paying real money for a randomized in-game reward is gambling and prohibited; Malaysia's Federal Territory Mufti office reached the same conclusion in Irsyad al-Fatwa #626.

**A nuance the keyword approach can't currently capture:** both of those same rulings draw a distinction the app doesn't — a game that merely *contains* optional loot boxes but doesn't require spending on them is treated differently from one that gates progress behind randomized real-money purchases. `finBad` (line 419) flags the mere presence of the term with no way to represent "optional cosmetic gacha" vs. "pay-to-gamble core loop." Not fixable by keyword-matching alone, but worth noting in the UI copy/tips so the caution reads as "check whether this is optional" rather than a flat verdict.

**Where reasonable scholars differ, and the tool currently picks one position silently:** fictional magic/fantasy content (`faithBad`, line 414) is treated as an automatic caution/haram trigger. That's a defensible, common position, but it isn't the only one in circulation — there's a real, live distinction many scholars draw between fictional/game-world magic systems and actual practiced occultism. The tool doesn't need to resolve this, but stating the position it's taking (rather than presenting "Caution: magic" as if it were uncontested) would be more honest about where automated screening is making a judgment call.

**Completeness gap:** as noted in M11, music has no dedicated category despite being treated as a first-order concern (alongside violence and modesty) in at least some scholarly treatments of gaming specifically — worth a deliberate decision either way rather than a single incidental tip.

None of the above is a "this app is wrong" finding — it's a "keyword matching cannot represent contested/conditional fiqh questions" finding, which is really an argument for keeping the disclaimer prominent and perhaps having the specific caution reasons (not just the verdict) reviewed by someone with formal training, rather than a claim that any current mapping is mistaken.

---

## What's already working well
- Debounce logic itself (clear/reset pattern) is correct — the bug is only the missing request-cancellation piece (H3).
- Lazy-loaded images (`loading="lazy"`), `prefers-reduced-motion` respected, viewport allows pinch-zoom up to 5x — all good, deliberate accessibility choices.
- `getStoreLinks` correctly runs `game.name` through `encodeURIComponent` — the safe pattern C2 needs is already used elsewhere in the same file.
- Escape-to-close on the modal is implemented (line 700).
- The non-fatwa disclaimer and linked scholarly resources (IslamWeb, etc.) are exactly the right instinct for a tool making religious-adjacent judgment calls.
- Score has a "safety floor": any single `haram:`-tagged match caps the verdict at Caution regardless of the rest of the score (line 441) — errs toward caution rather than a false "Halal," which is the right direction to be blunt in.
