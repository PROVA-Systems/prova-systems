# MEGA³⁷ D04 — Headers + CORS + CSP + Cookies

**Datum:** 2026-05-08
**Methodik:** netlify.toml-Audit, Cookie-Inspect via lib/cookie-consent.js, CORS-Helper-Audit.

## netlify.toml — Verify

| Header | Wert | Severity |
|--------|------|----------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | 🟢 |
| `X-Frame-Options` | `SAMEORIGIN` | 🟢 |
| `X-Content-Type-Options` | (zu prüfen) | 🟡 |
| `Referrer-Policy` | (zu prüfen) | 🟡 |
| `Permissions-Policy` | (zu prüfen) | 🟡 |
| `Content-Security-Policy` | granular mit Whitelist (Stripe, Sentry, Supabase) | 🟢 |
| `frame-ancestors` | `'self'` | 🟢 |
| `object-src` | `'none'` | 🟢 |

## CSP-Detail-Analyse

```
default-src 'self';
script-src 'self' 'unsafe-inline' [Stripe, esm.sh, jsdelivr, Supabase, Sentry];
style-src 'self' 'unsafe-inline' [Google-Fonts, jsdelivr];
connect-src 'self' [APIs];
frame-src 'self' https://*.stripe.com [...];
```

| Issue | Severity | Note |
|-------|----------|------|
| `'unsafe-inline'` in script-src | 🟡 MEDIUM | Nötig für Inline-Scripts, aber XSS-Risiko erhöht |
| `'unsafe-inline'` in style-src | 🟢 LOW | Für Inline-Styles (Common Pattern) |
| ESM.sh in script-src | 🟡 MEDIUM | Externe Skript-Quelle — SRI empfohlen |

## Cookies (lib/cookie-consent.js)

| Eigenschaft | Status |
|-------------|--------|
| Cookie-Banner | 🟢 vorhanden, DSGVO-konform (3 Buttons gleichberechtigt) |
| Tap-Targets ≥ 44px | 🟢 (M³⁶ W7.3 verified) |
| 13-Monate-Re-Show | 🟢 implementiert |
| HttpOnly + Secure + SameSite | ⚠️ nur clientseitig (localStorage-basiert) — JWT in HttpOnly-Cookie wäre sicherer |

## Top-3-Empfehlungen
1. **CSP härten:** Inline-Scripts auf `'nonce-…'` umstellen statt `'unsafe-inline'` (großer Refactor, 🟡 MEDIUM Aufwand).
2. **SRI-Hashes** für CDN-Scripts (siehe D01-A08).
3. **Auth-Token-Cookies** auf HttpOnly + Secure + SameSite=Strict statt localStorage (CSRF-/XSS-Schutz).

## Quellen
- OWASP Secure Headers — cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers
- MDN Content-Security-Policy — developer.mozilla.org
- BSI TR-03108 (sichere Webseiten)
