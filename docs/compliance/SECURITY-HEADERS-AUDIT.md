# Security-Headers Audit — PROVA Systems

**Stand:** 04.05.2026 (MEGA⁷ U2)
**Quelle:** `netlify.toml` + Code-Audit

---

## Aktive Security-Headers (in netlify.toml)

| Header | Status | Bewertung |
|---|---|---|
| `Content-Security-Policy` | ✅ aktiv | Defense-in-Depth solid (script-src, frame-ancestors, object-src none) |
| `Strict-Transport-Security` | ✅ `max-age=31536000; includeSubDomains; preload` | OWASP A05-konform |
| `X-Content-Type-Options` | ✅ `nosniff` | (in netlify.toml Z. 657) |
| `X-Frame-Options` | ✅ `SAMEORIGIN` | (Z. 656) |
| `Referrer-Policy` | ✅ `strict-origin-when-cross-origin` | (Z. 658) |
| `Permissions-Policy` | ✅ vollstaendig (camera=self, microphone=self, geolocation=(), payment=self) | (Z. 662) |
| `Cross-Origin-Opener-Policy` | ✅ `same-origin-allow-popups` | (Z. 659) — `allow-popups` fuer Stripe-Checkout |
| `Cross-Origin-Resource-Policy` | ✅ `same-origin` | (Z. 661) |
| `Cross-Origin-Embedder-Policy` | optional | nicht benoetigt (kein SharedArrayBuffer) |

---

## CSP Detail-Bewertung

### Aktuelle CSP-Direktiven:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://js.stripe.com https://esm.sh
           https://cdn.jsdelivr.net https://*.supabase.co
           https://browser.sentry-cdn.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https:;
media-src 'self' blob:;
worker-src 'self' blob:;
frame-src 'self' https://*.stripe.com https://js.stripe.com https://hooks.stripe.com;
connect-src 'self' https://esm.sh https://cdn.jsdelivr.net
            https://prova-systems.netlify.app https://api.netlify.com
            https://api.stripe.com https://api.openai.com
            https://hook.eu1.make.com https://hook.eu2.make.com
            https://*.supabase.co wss://*.supabase.co
            https://*.ingest.de.sentry.io https://*.sentry.io;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
```

### Bewertung

| Direktive | Bewertung | Empfehlung |
|---|---|---|
| `script-src 'unsafe-inline'` | ⚠ schwächt CSP | LANGFRISTIG: nonce-based oder hash-based replacement. Pre-Pilot OK. |
| `default-src 'self'` | ✅ | Whitelist-only-Approach |
| `frame-ancestors 'self'` | ✅ | Clickjacking-Schutz |
| `object-src 'none'` | ✅ | Plugin-Block |
| `img-src ... https:` | ⚠ wide | Pragmatisch fuer Foto-Hosting in PDFs. Risk: Mixed-Content. |
| `connect-src` | ✅ | explizit pro Service |
| `base-uri 'self'` | ✅ | Base-Tag-Injection-Schutz |

---

## Marcel-Pflicht-Aktionen

✅ **Alle Headers bereits in netlify.toml gehardenisiert.**

Open Items:
- ⚠ `Permissions-Policy` hat `geolocation=()` — sollte `geolocation=(self)` sein wenn Mobile-Geolocation-Feature genutzt wird (siehe Tier 1)
- ⚠ Bei Service-Worker-Update: pruefen dass `Cross-Origin-Resource-Policy` SW-Loading nicht blockt

---

## CSP-Hardening Roadmap (Sprint K-2)

### Step 1 — `unsafe-inline` entfernen
- Inline-Scripts in HTML mit nonce-Tags ersetzen
- Inline-Style-Attributes durch Classes ersetzen
- Build-Step erforderlich: nonce-Generator pro Request

### Step 2 — `unsafe-eval` zukuenftig hinzufuegen-vermeiden
- Aktuell nicht in CSP — gut!
- Bei zukuenftiger Library-Nutzung pruefen

### Step 3 — Reporting
- `report-to` + `report-uri` ergaenzen fuer CSP-Violations
- Sentry-Integration fuer CSP-Reports

---

## Rate-Limit-Coverage Audit

| Function | Rate-Limit? | Empfehlung |
|---|---|---|
| auth-token-issue | ✅ M1c-Brute-Force | OK |
| stripe-webhook | n/a | Stripe-Signatur-Verifikation reicht |
| ki-proxy | ✅ via requireAuth | OK |
| admin-* (16 Endpoints) | ✅ via requireAdmin | OK (10-30/min) |
| normen | ❌ public + ohne RL | **Add 60/min/IP** |
| audit-log | ❌ requireAuth + ohne RL | **Add 30/min/User** |
| error-log | ✅ inline 10/min/IP | OK |
| pilot-seats | n/a public read-only Counter | OK (keine RL noetig) |
| sentry-test | ✅ Secret-Gate | OK |
| team-interest | ✅ inline 10/min/IP | OK |

**Pflicht-Hardening:** normen + audit-log Rate-Limit ergaenzen.

---

## Dependency-Audit (npm)

```bash
npm audit --omit=dev
# Stand 04.05.2026: 0 vulnerabilities
```

**Auto-Audit-Script:** `scripts/security-audit.sh` siehe MEGA⁷ U2.

---

## OWASP Top 10 (2021) Mapping

| Risiko | Status | Mitigation |
|---|---|---|
| A01 Broken Access Control | ✅ | RLS + JWT + 2FA Admin |
| A02 Cryptographic Failures | ✅ | TLS 1.3 + AES-256 at-rest |
| A03 Injection | ✅ | Parameterized queries (Supabase) + zod |
| A04 Insecure Design | ✅ | Multi-Tenancy by-Design + Workspace-Scoped |
| A05 Security Misconfiguration | ⚠ | CSP-Polish + fehlende Headers (siehe oben) |
| A06 Vulnerable Components | ✅ | npm audit 0 issues, Auto-Script in U2 |
| A07 Auth+ID Failures | ✅ | bcrypt + JWT + 2FA |
| A08 Software+Data Integrity | ✅ | Stripe Webhook-Sign-Verifikation |
| A09 Logging+Monitoring | ✅ | Sentry + audit_trail |
| A10 SSRF | ⚠ | make-proxy + ki-proxy URL-Whitelisten pruefen |

---

## Marcel-Pflichten

1. **Sofort:** Fehlende Headers in netlify.toml ergaenzen (siehe oben, ~5 Min)
2. **Sprint K-2:** CSP-Hardening Step 1 (unsafe-inline weg)
3. **Quartalsweise:** OWASP-Top-10-Review

---

*Audit-Stand 04.05.2026 — MEGA⁷ U2.*
