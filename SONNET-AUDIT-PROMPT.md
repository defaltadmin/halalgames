# Sonnet Audit Prompt for HalalGames Guide

## Files to Upload

Only **ONE file** is needed:

- `halalgames/index.html` — the entire application (single-file, self-contained)

That's it. No build tools, no dependencies, no config files. The HTML file contains all CSS and JS inline.

## Audit Prompt (paste to Sonnet)

---

You are a Senior Full-Stack Developer auditing a single-file web application called "HalalGames Guide" — a free, open-access Halal Video Game Screener.

## What to Audit

1. **Security**: Check for XSS vulnerabilities, injection risks, unsafe HTML rendering (innerHTML usage), CSP compliance
2. **Performance**: Check for memory leaks, unnecessary re-renders, image loading optimization, debounce correctness
3. **SEO**: Verify JSON-LD structured data is valid, meta tags are complete, canonical URL is correct, Open Graph tags are present
4. **Accessibility**: Check ARIA labels, keyboard navigation, focus management, screen reader compatibility, color contrast
5. **Code Quality**: Check for dead code, unused variables, error handling gaps, edge cases in the screening algorithm
6. **API Integration**: Verify RAWG API key handling (should not be hardcoded in production), error fallback behavior, cache strategy
7. **UI/UX**: Check responsive design, loading states, empty states, error states, modal behavior
8. **Islamic Content Accuracy**: Review the halal/haram keyword lists for completeness and accuracy against Islamic scholarly sources

## Specific Concerns to Flag

- The RAWG API key is hardcoded in the source — flag this as a security issue
- innerHTML is used extensively — flag any XSS risks from user-controlled data
- The screener algorithm uses keyword matching — flag false positives/negatives
- No rate limiting on API calls — flag potential abuse
- No PWA/offline support — flag as a missing feature
- No analytics or error tracking — note as intentional (privacy-first design)

## Output Format

Provide findings as:
- **Critical** (must fix): security vulnerabilities, data leaks
- **High** (should fix): performance issues, accessibility gaps
- **Medium** (nice to fix): SEO improvements, code quality
- **Low** (optional): feature suggestions, UX enhancements

For each finding, include: file path (index.html), line number or code section, description, and suggested fix.

---

## How to Run the Audit

1. Open Claude (Sonnet) at claude.ai or via API
2. Create a new conversation
3. Upload `halalgames/index.html`
4. Paste the audit prompt above
5. Review findings
6. Share critical/high findings with me (MiMoCode) to fix

## What I'll Fix

After the audit, I'll address:
- All Critical findings immediately
- All High findings in the next commit
- Medium/Low findings as time permits
