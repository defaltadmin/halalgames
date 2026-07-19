# Opus Follow-Up: Deferred Items — Code Chunks for Mimo

You already rewrote `index.html` and `games.json` in the previous round. Those are deployed and working. This prompt asks you to provide **code chunks only** for the remaining items — Mimo will apply them.

**Do NOT rewrite the entire file.** Provide each fix as a self-contained code block with clear "find this, replace with this" instructions.

---

## Item 1: Tailwind CDN → Local Build

The current site uses `cdn.tailwindcss.com` which is dev-only and throws a console warning. Provide:

1. A `package.json` with `tailwindcss` as devDependency
2. A `tailwind.config.js` matching the current theme colors
3. A `src/input.css` with `@tailwind` directives
4. The npm commands to build
5. The exact HTML change: replace `<script src="cdn.tailwindcss.com">` + inline config with `<link rel="stylesheet" href="/tailwind.css">`
6. A `.cfignore` entry for `node_modules/` and `src/`

**Important**: Keep the existing CSS custom properties in `:root{}` — Tailwind is for utilities only, not for replacing the design tokens.

---

## Item 2: CSP Hash

Replace `'unsafe-inline'` in `script-src` with a computed SHA-256 hash of the inline script block. Provide:

1. The exact command to generate the hash (openssl)
2. The updated `_headers` CSP line with the hash
3. A note about what to do if the script changes (re-hash)

---

## Item 3: CI/Lighthouse GitHub Action

Provide a `.github/workflows/ci.yml` that:
- Runs on push and PR
- Validates HTML
- Runs Lighthouse CI
- Fails if scores drop below thresholds (90+ for a11y, best practices, SEO)

---

## Item 4: games.json — Verify

The `games.json` file already exists and is being fetched. Just confirm it's correctly structured and being loaded by `loadSeed()`. No code changes needed if it works.

---

## Format

For each item, provide:
```
## Item N: [Title]

### File: [path]
[complete file content or diff]

### Explanation
[1-2 sentences on what changed and why]
```

One section per item. No prose between sections. Mimo can copy-paste each block directly.
