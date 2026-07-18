# HalalGames Guide

**Live:** https://halalgames.mscarabia.com

A free, open-access Halal Video Game Screener. Search any video game and get an instant Islamic content rating — faith impact, gambling mechanics, modesty, and violence levels.

## What It Does

- **Search 50+ games** from a built-in database (with RAWG API integration for live search)
- **Islamic content screening** across 4 categories: Faith Impact, Financial Ethics, Modesty, Violence Level
- **Halal Score** (0-100) with verdict: Halal Friendly, Caution, or Avoid
- **How to Play Safely** tips generated per game
- **Where to Buy** affiliate links (Steam, PlayStation, Xbox, Nintendo, Amazon)
- **Report system** — users can flag incorrect verdicts for admin review

## Tech Stack

- **Single-file HTML** — all CSS and JS inline, zero build step
- **Tailwind CSS** via CDN for utility classes
- **RAWG API** for live game search (proxied through Cloudflare Pages Function)
- **Inline SVG placeholders** for instant image rendering (no external image dependencies)
- **Cloudflare Pages** for hosting + serverless API proxy

## Architecture

```
halalgames/
├── index.html              # Entire application (single file)
├── functions/
│   └── api/
│       └── games.js        # Cloudflare Pages Function — RAWG API proxy
├── _headers                # Cloudflare Pages security headers (CSP)
├── .cfignore               # Cloudflare Pages ignore patterns
├── 404.html                # Custom error page
├── robots.txt              # Crawler rules
├── sitemap.xml             # Sitemap
└── README.md               # This file
```

## Setup

### Local Development

```bash
# No build step needed — just open index.html in a browser
# Or use a local server:
npx serve .
```

### Cloudflare Pages Deployment

1. Push to `main` branch — auto-deploys
2. Set `RAWG_API_KEY` as an environment variable in Cloudflare Dashboard → Workers & Pages → halalgames → Settings → Environment variables
3. Set custom domain `halalgames.mscarabia.com` in Cloudflare Dashboard

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `RAWG_API_KEY` | Cloudflare Pages env vars | RAWG API key (free at https://rawg.io/apidocs) |

**Note:** The RAWG API key must be set as a Cloudflare Pages environment variable (not in the code). The `functions/api/games.js` proxy reads it from `env.RAWG_API_KEY`.

## Lighthouse Scores

| Category | Score |
|----------|-------|
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

## Features

- **50+ built-in games** — works offline without API key
- **RAWG API integration** — live search for any game in the database
- **Islamic content screening** — keyword-based analysis across 5 categories
- **Community voting** — upvote/downvote verdicts (localStorage)
- **Report system** — flag incorrect verdicts for admin review
- **Responsive design** — works on mobile and desktop
- **Keyboard accessible** — full keyboard navigation support
- **No tracking** — no analytics, no cookies, no user data collection

## Screening Categories

| Category | What It Checks |
|----------|---------------|
| Faith Impact | Shirk, magic, polytheism, mythology, idol worship |
| Financial Ethics | Gambling, lootboxes, gacha, microtransactions |
| Modesty | Nudity, sexual content, suggestive themes |
| Violence Level | Gore, blood, graphic violence vs cartoonish |
| Audio Content | Music (informational — most games include music) |

## Contributing

This is a community tool. Contributions welcome:

1. Fork the repository
2. Make your changes
3. Test locally (open `index.html` in browser)
4. Submit a pull request

## Disclaimer

This is a community tool for informational purposes only and does not constitute a religious ruling (fatwa). Islamic scholars may differ on specific games. Always consult qualified scholars for personal religious guidance.

## License

Free and open source. Part of the [MSC Arabia](https://mscarabia.com) community tools.

## Credits

- Game data powered by [RAWG](https://rawg.io)
- Islamic content guidance from [IslamQA](https://islamqa.info), [IslamWeb](https://www.islamweb.org), and [Halal Guidelines](https://halalguidelines.com)
