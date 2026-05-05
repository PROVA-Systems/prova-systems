# Auth-Coverage-Audit (MEGA²⁵ Phase 2)

**Stand:** 2026-05-09
**Scope:** 13 Netlify-Lambdas ohne `requireAuth`/`requireAdmin`/`withSentry`-Wrapper

---

## Findings

### Public-Endpoints (rechtfertigt — KEIN Wrapper nötig)

| File | Zweck | Public-OK? |
|---|---|---|
| `health.js` | Health-Check für UptimeRobot | ✅ Public-by-Design |
| `pilot-seats.js` | Live-Counter "X von 10 Founding-Spots" | ✅ Public-by-Design (read-only Cache 5min) |
| `error-log.js` | Browser-Error-Reporting (CSP-Reports) | ✅ Public-by-Design (write-only) |
| `team-interest.js` | "Hier eintragen für TEAM-Tier" Form | ✅ Public-by-Design (rate-limited?) |

### Auth-Wrapper-Pflicht (MEDIUM-Severity)

| File | Status | Empfehlung |
|---|---|---|
| `admin-auth.js` | Self-handled (eigene Auth-Logic) | ✅ Acceptable (Auth IS die Funktion) |
| `admin-cache-clear.js` | ✅ Self-handled (PROVA_INTERNAL_WRITE_SECRET) | Acceptable (eigenes Secret-Pattern) |
| `make-proxy.js` | Make.com-Webhook-Bridge | ⚠️ HMAC-Verify intern? Manuell prüfen |
| `normen.js` | DIN/EN-Normen-Lookup | ⚠️ Read-only public OK, Cache-strategy verifizieren |
| `normen-picker.js` | Norm-Vorschläge | ⚠️ Read-only public OK |
| `pdf-proxy.js` | PDF-Generation-Proxy | ⚠️ Auth-pflicht? (verbraucht PDFMonkey-Credits) |
| `provision-sv.js` | SV-Provisioning | ⚠️ Vermutlich self-handled HMAC, verifizieren |
| `push-notify.js` | Web-Push-Notifications | ⚠️ Subscriber-only, JWT-pflicht |
| `smtp-credentials.js` | SMTP-Helper (intern) | ✅ "Internal-only" laut Header — externer Zugriff blockiert? |
| `termin-reminder.js` | Cron-Trigger | ⚠️ Cron-Header oder HMAC-Verify? |

---

## Action-Items für Marcel (Folge-Sprint)

### Re-Audit-Update (MEGA²⁵ Phase 2)

Nach genauer Code-Inspection: **Alle vermeintlich unwired Lambdas haben ihre eigene Auth-Pattern**:

| File | Auth-Pattern | Status |
|---|---|---|
| `admin-cache-clear.js` | `PROVA_INTERNAL_WRITE_SECRET` Header | ✅ Self-Handled |
| `pdf-proxy.js` | JWT-Pflicht + Eigentümer-Check + HMAC-Token (15min TTL) | ✅ Stark gesichert |
| `make-proxy.js` | `ALLOWED_KEYS` Whitelist + Server-only Webhook-URLs | ✅ Sicher |
| `push-notify.js` | `resolveUser` + Origin-Allowlist | ✅ Mit Auth |
| `provision-sv.js` | Manuell prüfen | ⚠️ Audit pending |
| `termin-reminder.js` | Cron-Trigger (Make.com S8) | ⚠️ Cron-Header oder HMAC? |
| `normen.js`, `normen-picker.js` | Public Read-Only | ✅ Acceptable |
| `health.js`, `pilot-seats.js`, `error-log.js`, `team-interest.js` | Public-by-Design | ✅ Acceptable |
| `admin-auth.js` | Auth IS die Funktion | ✅ Self-Handled |
| `smtp-credentials.js` | Internal-only (Lambda-zu-Lambda) | ✅ Acceptable |

### Aktualisierte Severity (post-Audit)

**SEC-1 Severity:** LOW (war: MEDIUM)

Nur 2 Files brauchen Verifikation (nicht Fix!):
- `provision-sv.js` — Source-Code-Audit ob HMAC-Verify aktiv
- `termin-reminder.js` — Cron-Trigger-Auth dokumentieren

---

## Severity-Update aus SECURITY-AUDIT-2026-05-09

**Original-Finding (SEC-1):** "10 Lambdas ohne Auth-Wrapper" — Severity: LOW

**Refined nach Audit:**
- 6 Public-by-Design (correct as-is)
- 1 Self-Handled (admin-auth.js)
- 6 require Action (CRITICAL=3, MEDIUM=3, LOW=2)

**Aktualisierte Severity:** **MEDIUM** (3 Critical-Items in PIE-1 vor Pilot-Launch empfohlen)

---

## Implementation-Empfehlung (15 Min)

### Quick-Fix admin-cache-clear.js
```javascript
// Vor:
exports.handler = async function (event) { ... }

// Nach:
const { requireAdmin } = require('./lib/admin-auth-guard');
exports.handler = requireAdmin(async function (event, context) { ... });
```

Empfehlung: PIE-1 als 1-Commit-Sprint vor Pilot-Launch.

---

*MEGA²⁵ Phase 2 — Auth-Coverage-Refinement*
