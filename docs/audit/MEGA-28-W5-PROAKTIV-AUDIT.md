# MEGA²⁸ W5-I8 — Proaktiv-Audit Round 2

**Datum:** 2026-05-10
**Auditor:** Claude Opus 4.7
**Methodik:** 6 Audit-Pfade durchgeführt, Quick-Fix wo gefahrlos

---

## TL;DR

**Findings:** 6 (1 🔴 für Welle 6, 3 🟡 dokumentiert, 2 🟢 ALL-CLEAR)
**Bug-Find-Bilanz Welle 1+2+3+5:** insg. **7 Production-Bugs** durch Audit-Initiative
**Quick-Fixes Welle 5:** Auth-Hardening (W5-I2) + AVV-Sync (W5-I4) bereits committed

---

## 🔴 CRITICAL

### F1 — admin_password_bcrypt + admin_password_hash ✅ KORREKTUR W6-I3
**Severity:** 🟢 INFO (intentional Migration-Fallback)
**Befund Round-2-Korrektur:** Beide ENVs sind absichtlich koexistent:
- `ADMIN_PASSWORD_BCRYPT` = aktuelles bcrypt-Pattern (Primary)
- `ADMIN_PASSWORD_HASH` = Legacy-SHA-256-Migration-Fallback (Pre-Bcrypt-Phase)

Code-Pattern in `admin-auth.js`: prüft erst BCRYPT, fallback auf HASH wenn BCRYPT fehlt. Das ist eine bewusste Migration-Period — kein Bug.

**W6-I3 Quick-Fix:** Kommentar in `admin-auth.js:55-60` präzisiert ("Migration-Fallback, NICHT Doppelung").

**Welle-7-Item (optional):** PROVA-Prefix-Konsolidierung als Teil ENV-Rename-Sprint, gleichzeitig HASH-Fallback nach 1 Jahr deaktivieren.

---

## 🟡 MEDIUM

### F2 — setInterval ohne clearInterval ✅ KORREKTUR W6-I3
**Severity:** 🟢 INFO (intentional Best-Effort-GC)
**Befund Round-2-Korrektur:** Alle 3 Backend-Lambda-setInterval-Patterns sind dokumentierte **Best-Effort-GC für In-Memory-Buckets**:
- `lib/rate-limit-user.js` — Comment: "alle 5 Min Buckets aufraeumen die laenger als 5 Min alt sind. Verhindert unbounded Memory-Growth"
- `lib/rate-limit-ip.js` — gleiches GC-Pattern für IP-Buckets
- `auth-token-issue.js` — `global._authTokenIssueLockoutGc` Marker verhindert Multi-Init bei Container-Reuse

Frontend-setInterval (auth-guard, frist-guard, sw-register) sind Standard-Browser-Lifetime-Pattern.

**Quick-Fix W6-I3:** keine notwendig — alle setInterval-Patterns sind intentional und korrekt-dokumentiert.

### F3 — ENV-Var-Naming-Inconsistencies (Regel 35 Verstoß)
**Befund:** 17 ENVs ohne `PROVA_`-Prefix in Multi-Tenant-Setup.

Externe Anbieter-Standards (akzeptiert): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_*`, `AIRTABLE_*`, `IONOS_*`, `MAKE_*`, `PDFMONKEY_*`, `DOCRAPTOR_*`, `VAPID_*`, `SUPABASE_*`, `SENTRY_*`

Sollten umbenannt werden (Regel 35):
- `ADMIN_PASSWORD_BCRYPT` → `PROVA_ADMIN_PASSWORD_BCRYPT`
- `ADMIN_PASSWORD_HASH` → `PROVA_ADMIN_PASSWORD_HASH` (oder ganz raus per F1)
- `AUTH_HMAC_SECRET` → `PROVA_AUTH_HMAC_SECRET`
- `CONFIRM_LIVE_CHECKOUT` → `PROVA_CONFIRM_LIVE_CHECKOUT`
- `FORCE_FALLBACK` → `PROVA_FORCE_FALLBACK`
- `FW_PATH` → `PROVA_FW_PATH`
- `IMPERSONATION_NOTIFY` → `PROVA_IMPERSONATION_NOTIFY`
- `SITE_NAME` → `PROVA_SITE_NAME`
- `SMTP_*` → schon teilweise als `PROVA_SMTP_*` da, beide-aktiv = Redundanz
- `TEAM_INTEREST_*` → `PROVA_TEAM_INTEREST_*`
- `TERMIN_REMINDER_SECRET` → `PROVA_TERMIN_REMINDER_SECRET`
- `TEST_CHECKOUT_EMAIL` → `PROVA_TEST_CHECKOUT_EMAIL`
- `UPTIME_WEBHOOK_SECRET` → `PROVA_UPTIME_WEBHOOK_SECRET`
- `WEBHOOK_TEST_*` → `PROVA_WEBHOOK_TEST_*`

**Empfehlung Welle 6:** ENV-Rename-Sprint mit Backwards-Compat-Period (1 Welle beide Names lesen, dann alt deprecaten).

### F4 — i18n-Readiness niedrig
**Befund:** Hardcoded deutsche Strings in HTML + JS-Templates (vermutlich >5000 Strings).

**Bewertung:** Heute kein Bug — PROVA ist DE-Markt-only.
**Welle-X-Item:** falls AT/CH-Expansion ansteht, i18n-Library + Phrase-Extraktion-Pipeline.

---

## 🟢 ALL-CLEAR

### F5 — Hardcoded-Secrets-Audit ✅ CLEAN
Pattern: `sk-...`, `pk_test_...`, `pk_live_...`, `whsec_...`
**Treffer:** 0 in production-code
Alle Secrets aus `process.env.*` geladen. Defense gegen Git-Leaks gegeben.

### F6 — DSGVO-Cookie-Banner ✅ CLEAN
- `lib/cookie-consent.js` (MEGA⁷ U4) implementiert mit DSGVO-best-practice
- Minimal-Banner (PROVA setzt KEINE Marketing/Tracking-Cookies)
- Reset-Funktion für /datenschutz Widerruf vorhanden
- Functional-only Storage (Auth-Session, Drafts, Banner-Status)

---

## Audit-Pfade Coverage

| # | Pfad | Status | Findings |
|---|---|---|---|
| 2 | ENV-Var-Prefix-Audit (Regel 35) | ✅ DONE | F3 (17 ENVs zum Renamen) |
| 3 | Hardcoded-Secrets-Audit | ✅ DONE | F5 (CLEAN) |
| 7 | Memory-Leak-Patterns | ✅ DONE | F2 (3 Backend-Lambdas Welle 6) |
| 8 | Accessibility-Stichprobe (Templates Bilder) | ✅ DONE | alle 7 Templates haben alt-Attribute |
| 9 | i18n-Bereitschaft | ✅ DONE | F4 (DE-only, kein Welle-5-Issue) |
| 10 | DSGVO-Cookie-Banner | ✅ DONE | F6 (CLEAN) |

**Nicht durchgeführt (Welle 6):**
- 1 Schema-Drift-Audit (Supabase MCP `list_tables`)
- 4 Test-Coverage-Gap (welche Lambdas haben keine Tests?)
- 5 Stale-Code-Detection
- 6 Frontend-Console-Errors

---

## Quick-Fixes durchgeführt (W5-I2 + W5-I4)

W5-I2:
- `redeem-referral-code.js`: + RateLimitIp 10/min (Code-Fishing-Schutz)
- `sentry-test.js`: + NETLIFY_DEV/PROVA_SENTRY_TEST_ENABLED Gate

W5-I4:
- AVV §5 Subprocessor-Liste vollständig aktualisiert
- VERFAHRENSVERZEICHNIS.md mit AVV synchronisiert
- SUBPROCESSOR-LISTE.md neu (DSGVO Art. 28 Anlage)

---

## Empfehlungen für Welle 6

### Hohe Priorität
- **P1:** ENV-Var-Naming-Konsolidierung (F3 + F1) — Backwards-Compat-Sprint
- **P2:** Cloudflare-Status klären → AVV final (Marcel-Action aus W5-I3)
- **P3:** DocRaptor-Status klären → ENV bereinigen

### Mittlere Priorität
- **P4:** Schema-Drift-Audit via Supabase MCP
- **P5:** Test-Coverage-Gap (Top-3 Lambdas ohne Tests)
- **P6:** Backend-Lambdas setInterval-Audit (F2)

---

*MEGA²⁸ W5-I8 Proaktiv-Audit Round 2 — 6 Pfade, 6 Findings, 2 ALL-CLEAR-Bestätigungen.*
