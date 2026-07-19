# HalalGames Guide

**Live:** https://halalgames.mscarabia.com

A free, open-access Islamic content screener for video games. Search any game and get a verdict (Halal, Caution, or Avoid) with the reasons behind it: faith impact, gambling mechanics, modesty, and violence.

## What It Does

- **Search 30+ curated games** with full review data (verdict, reasons, warnings, alternatives)
- **RAWG API integration** for live search across the full RAWG catalog
- **Steam library scan** — paste a public Steam profile URL and see which games are screened
- **Admin review panel** — rate-limit-protected workspace with research links, filter checkboxes, and version-based concurrency for live catalog editing
- **Catalog KV backend** — reviewed games stored in Cloudflare KV, served via `/api/catalog` with games.json fallback
- **Community report system** — users flag incorrect verdicts for admin review (KV-backed, rate-limited)

## Tech Stack

- **HTML + external JS** — single HTML file with `/assets/app.7035cc8.js` (extracted runtime)
- **CSS custom properties** — Steam-inspired palette with glass-surface effects, no framework
- **Cloudflare Pages** — hosting, serverless Functions, KV storage
- **RAWG API** proxied through `/api/games` (key stored server-side, never exposed)
- **Steam Web API** proxied through `/api/steam-library` (vanity URL resolution, library lookup)

## Architecture

```
halalgames/
├── index.html                    # Application shell (HTML + CSS only)
├── assets/
│   └── app.7035cc8.js           # Runtime JS (versioned for cache busting)
├── games.json                    # Curated seed data (30 games)
├── functions/
│   └── api/
│       ├── games.js              # RAWG API proxy (input validation, error handling)
│       ├── catalog.js            # Live catalog from CATALOG_KV (falls back to games.json)
│       ├── admin-games.js        # Admin catalog editor (rate-limited, version-concurrency)
│       ├── steam-library.js      # Steam library scan (vanity URL + owned games)
│       ├── reports.js            # User reports (KV-backed, rate-limited)
│       └── admin-check.js        # Admin auth verification
├── scripts/
│   └── validate-games.mjs        # Pre-deploy games.json validator
├── _headers                      # CSP, security headers, cache policy
├── .cfignore                     # Cloudflare Pages ignore patterns
├── sitemap.xml                   # Search Engine sitemap
├── robots.txt                    # Crawler rules
├── 404.html                      # Custom error page
├── package.json                  # Tailwind build + CI validation scripts
├── tailwind.config.js            # Tailwind theme (local build, not CDN)
├── src/
│   └── input.css                 # Tailwind directives
└── .github/workflows/
    └── ci.yml                    # HTML validation, games validation, Lighthouse
```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `RAWG_API_KEY` | Cloudflare Pages env | RAWG API key (free at https://rawg.io/apidocs) |
| `ADMIN_PASSWORD` | Cloudflare Pages env | Password for admin review panel |
| `STEAM_API_KEY` | Cloudflare Pages env | Steam Web API key for library scan |
| `CATALOG_KV` | Cloudflare Pages KV binding | Live catalog storage for admin-edited games |
| `REPORTS_KV` | Cloudflare Pages KV binding | User report storage and rate limiting |

## Local Development

```bash
# Install dependencies
npm install

# Build Tailwind CSS
npm run build:css

# Run games validator
npm run test:catalog

# Start local server
npx serve .
```

## Pre-Deploy Checks

```bash
npm ci
npm run test:catalog    # Validates games.json structure and rules
npm run build:css       # Builds Tailwind CSS
node scripts/validate-games.mjs
```

## Security

- **CSP**: `script-src 'self'` (no unsafe-inline), `frame-ancestors 'none'`, Steam API in connect-src
- **No tracking** — no analytics, no cookies, no user data collection
- **Server-side secrets** — API keys never exposed to client code
- **Rate limiting** — admin login (5/hour), admin save (10/min), reports (10/hour)
- **Input validation** — all user input sanitized, slug normalization, source URL validation
- **Concurrency control** — integer version on catalog saves prevents stale overwrites

## Disclaimer

This is a community tool for informational purposes only and does not constitute a religious ruling (fatwa). Islamic scholars may differ on specific games. Always consult qualified scholars for personal religious guidance.

## License

Free and open source. Part of the [MSC Arabia](https://mscarabia.com) community tools.
