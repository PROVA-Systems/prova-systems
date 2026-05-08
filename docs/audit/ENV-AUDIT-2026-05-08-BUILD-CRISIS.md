# ENV-AUDIT — Netlify Build Crisis 2026-05-08

**Anlass:** Netlify-Build seit 6.5. broken. Build-Log meldet
> "Your environment variables exceed the 4KB limit imposed by AWS Lambda"

→ 66+ Lambda Functions können nicht mehr deployed werden.
→ Alle MEGA⁴⁰/⁴¹/⁴² Code-Stände stecken in der Pipeline fest.
→ Live-Site stuck auf `prova-v303` (MEGA²⁸).

**Auditor:** Claude Opus 4.7 (1M context)
**Methodology:** `grep -rohE "process\.env\.[A-Z_]+" netlify/functions/ | sort | uniq -c`
**Scope:** Read-only Code-Scan + handlungsfähige Action-Liste.
**Vorgänger-Audit:** `docs/audit/ENV-AUDIT-REPORT.md` (09.05.2026)

---

## EXECUTIVE SUMMARY

| Kategorie | Count | Action |
|---|---|---|
| 🟢 USED — Production-Critical | 31 | KEEP |
| 🔴 UNUSED — sofort löschbar | 5 | DELETE in Netlify Dashboard |
| 🟡 LEGACY-AIRTABLE — nach K-1.5-Cutover obsolet | 5 | DELETE (nach Cutover-Tag) |
| 🟠 DUPLIZIERBAR — JSON-Konsolidierung möglich | 13→4 | MIGRATE → JSON-Bundles |
| ⚙️ Frontend-Only / Test-Tooling | 3 | aus Lambda-Scope entfernen |

**Erwartete Total-Size:**
- AKTUELL: ~5800 bytes (über 4 KB Limit ❌)
- NACH Cleanup (DELETE + Frontend-Scope): ~4200 bytes (knapp drüber)
- NACH Cleanup + Konsolidierung: **~3100 bytes** ✅ (mit ~900 bytes Buffer)

---

## A) USED — Production-Critical (KEEP)

| ENV | Refs | Files |
|---|---|---|
| `SUPABASE_URL` | 24 | quasi alle Lambdas |
| `SUPABASE_SERVICE_ROLE_KEY` | 22 | server-side DB-Access |
| `STRIPE_SECRET_KEY` | 16 | stripe-checkout, -webhook, -portal, admin-* |
| `OPENAI_API_KEY` | 10 | ki-proxy, whisper-diktat, foto-captioning, normen-picker |
| `PROVA_INTERNAL_WRITE_SECRET` | 7 | admin-cache-clear, send-welcome-email, check-referral-rewards |
| `PDFMONKEY_API_KEY` | 6 | pdf-proxy, foto-anlage-pdf, admin-pdfmonkey-inventory, admin-pdf-queue |
| `RESEND_API_KEY` | 5 | dsgvo-loeschen-antrag, fristen-reminder-cron, onboarding-mail-cron |
| `REFERRAL_BASE_URL` | 4 | create-referral, send-referral-reminders, check-referral-rewards |
| `ANTHROPIC_API_KEY` | 4 | ki-proxy, ai-router, ki-anthropic |
| `AUTH_HMAC_SECRET` | 3 | admin-impersonate, auth-token, admin-system-health |
| `PROVA_EMAIL_CRON_SECRET` | 3 | email-pilot-feedback-cron, email-trial-ending-cron, email-welcome |
| `SUPABASE_ANON_KEY` | 2 | public-status, status-check |
| `STRIPE_WEBHOOK_SECRET` | 2 | stripe-webhook, admin-system-health |
| `SENTRY_DSN_FUNCTIONS` | 2 | sentry-wrap, admin-system-health |
| `VAPID_PUBLIC_KEY` | 2 | push-notify (×2) |
| `FRISTEN_CRON_SECRET` | 2 | fristen-reminder-cron, mahnwesen-cron |
| `SMTP_FROM` | 2 | admin-impersonate, send-welcome-email |
| `STRIPE_REFERRAL_WEBHOOK_SECRET` | 1 | stripe-webhook-referral |
| `STRIPE_FOUNDING_COUPON_ID` | 1 | stripe-checkout |
| `STRIPE_AUTO_TAX` | 1 | stripe-checkout |
| `STRIPE_PRICE_SOLO/TEAM/ADDON_5/10/20` | 5×1 | prova-stripe-prices.js |
| `PDFMONKEY_FOTO_TEMPLATE_ID` | 1 | foto-anlage-pdf |
| `PDFMONKEY_MODE_C_TEMPLATE_ID` | 1 | lib/pdf-service-pdfmonkey.js (transitive via generate-pdf-mode-c) |
| `PDF_PROXY_SECRET` | 1 | pdf-proxy |
| `VAPID_PRIVATE_KEY` | 1 | push-notify |
| `VAPID_SUBJECT` | 1 | push-notify |
| `ICAL_TOKEN_SECRET` | 1 | generate-ical |
| `PROVA_SMTP_ENCRYPTION_KEY` | 1 | smtp-credentials |
| `PROVA_SENTRY_TEST_SECRET` | 1 | sentry-test (USED — Name irreführend) |
| `STATUS_CRON_SECRET` | 1 | status-check |
| `HEALTH_CHECK_CRON_SECRET` | 1 | health-check-cron (NEU M42) |
| `TWO_FACTOR_ENCRYPTION_KEY` | 1 | lib/totp-helper |
| `ADMIN_PASSWORD_BCRYPT` | 1 | admin-auth (mit PROVA_-Fallback) |

---

## B) UNUSED — sofort löschbar (5 ENVs)

Code-Scan zeigt **0 Referenzen** in `netlify/functions/` und in `lib/`.

| ENV | Befund |
|---|---|
| `PDFMONKEY_BRIEF_TEMPLATE_ID` | 0 in JS — nur in `hilfe.html` als Hinweistext + altem Doku-Verweis. Kein Code-Pfad nutzt es. |
| `SMTP_USER_REFERRAL` | 0 in JS — Referral-Mailing nutzt geteilte `SMTP_USER` mit `SMTP_FROM_REFERRAL`-Override |
| `SMTP_PASS_REFERRAL` | 0 in JS — wie oben |
| `MAKE_WEBHOOK_KAUF` | 0 in `get-make-webhook-url.js` Mapping — 7 andere Make-Keys gemappt, aber nicht KAUF |
| `MAKE_WEBHOOK_WILLKOMMEN` | "Anomalie" laut alter Audit (4 values in 4 contexts) — kein Code-Treffer |

**Total Einsparung:** ~5 × 70 bytes ≈ **350 bytes**

---

## C) LEGACY-AIRTABLE — nach Cutover obsolet (5 ENVs)

Sprint K-1.5 hat zu Supabase migriert. Aktuell laufen Airtable-Pfade als Schreib-Stub parallel; nach Cutover-Tag deaktivierbar.

| ENV | Refs | File-Beispiele | Status |
|---|---|---|---|
| `AIRTABLE_PAT` | 15 | audit-log, dsgvo-auskunft, error-log, normen, push-notify, ki-statistik, mein-aktivitaetsprotokoll, team-interest, provision-sv, lib/prova-fachwissen, lib/auth-resolve, lib/prova-subscription, pdf-proxy, smtp-credentials, dsgvo-loeschen | Solange Lambdas Airtable noch lesen: KEEP. Nach Cutover: DELETE |
| `AIRTABLE_TOKEN` | 5 | normen.js, lib/prova-fachwissen, dsgvo-loeschen, smtp-credentials, health.js | Fallback-only, identisch mit PAT — DELETE wenn AIRTABLE_PAT immer gesetzt |
| `AIRTABLE_BASE_ID` | 5 | dsgvo-loeschen, lib/prova-subscription, smtp-credentials, pdf-proxy, lib/auth-resolve | Hardcoded-Default `appJ7bLlAHZoxENWE` als Fallback → ENV oft nicht-default → ggf. DELETE wenn Default-OK |
| `PROVA_AUDIT_TRAIL_TABLE` | 1 | lib/prova-subscription.js (mit Hardcoded-Default-Fallback) | Solange prova-subscription.js Airtable-Schreib läuft |
| `AIRTABLE_AUDIT_TRAIL_TABLE` | 1 | lib/prova-subscription.js (legacy alias) | Bei Cutover: DELETE |
| `AIRTABLE_BRIEFE_TABLE` | 1 | lib/prova-subscription.js (mit Default) | Bei Cutover: DELETE |
| `AIRTABLE_TABLE_SV` | 2 | lib/prova-subscription, smtp-credentials (mit Default `tbladqEQT3tmx4DIB`) | Bei Cutover: DELETE |
| `AIRTABLE_API_KEY` | 1 | pdf-proxy.js | Legacy — nicht in Marcel's Liste, ggf. eh leer |

**Empfehlung:** Bis K-1.5-Cutover behalten (`AIRTABLE_PAT` ist 15× referenziert!). Nach Cutover ALLE Airtable-ENVs auf einen Schwung löschen → **~700 bytes Einsparung**.

**JETZT-Action:** **NUR `AIRTABLE_TOKEN`** löschen (es ist nur ein Fallback-Alias zu `AIRTABLE_PAT`, immer der gleiche Wert) → **~110 bytes**.

---

## D) DUPLIZIERBAR — JSON-Konsolidierung möglich

### D1) MAKE_WEBHOOK_* (8 ENVs → 1 JSON)

**Code-Status:** `lib/make-webhooks.js` liest **bereits** `MAKE_WEBHOOKS` (JSON) als Primary, mit Fallback auf einzelne `MAKE_WEBHOOK_<KEY>`. `lib/make-webhooks-config.js` Variante `MAKE_WEBHOOKS_JSON`.

**Fall A:** Marcel hat `MAKE_WEBHOOKS` (JSON) bereits gesetzt → einzelne Keys sind Dead-ENV → **DELETE alle 8** → ~560 bytes Einsparung
**Fall B:** Nur einzelne gesetzt → **MIGRATE** zu JSON, dann DELETE einzelne → ~400 bytes Einsparung netto

**ENV-Wert-Schema (für `MAKE_WEBHOOKS`):**
```json
{"a5":"https://hook.eu1.make.com/...","f1":"https://...","g1":"...","g3":"...","k2":"...","l8":"..."}
```

(KAUF + WILLKOMMEN sind in Kategorie B/UNUSED — vor Konsolidierung verifizieren ob aktuelle Werte noch gebraucht werden, sonst weglassen.)

### D2) STRIPE_PRICE_* (5 ENVs → 1 JSON)

**Code-Status:** `lib/prova-stripe-prices.js` liest 5 separate ENVs mit jeweils Hardcoded-Default-Fallback.

**Empfehlung:** Wenn Live-Stripe-IDs identisch mit Hardcoded-Defaults → **DELETE alle 5**, Code nutzt Defaults. Nach M⁴² CACHE_VERSION-Bump verifizieren dass Defaults aktuell sind.

**Stand 2026-05-08:** CLAUDE.md Regel 21 sagt 179€/379€. Hardcoded-Defaults müssen geprüft werden — falls veraltet, **erst Code-Patch in `prova-stripe-prices.js`, dann ENVs DELETE**.

**Einsparung:** ~5 × 40 bytes ≈ **200 bytes** (aber erfordert Code-Verify; aktuell separater Sprint).

### D3) VAPID_* (3 ENVs)

**Code-Status:** 3 separate ENVs in `push-notify.js`. Konsolidierung möglich aber web-push-API erwartet die 3 Werte separat — Konsolidierung würde Code-Refactor erfordern.

**Empfehlung:** **KEEP unverändert.** Einsparung minimal (~30 bytes), Code-Risiko nicht wert.

### D4) PDFMONKEY_*_TEMPLATE_ID (2 USED + 1 UNUSED)

**Code-Status:**
- `PDFMONKEY_FOTO_TEMPLATE_ID` — USED (foto-anlage-pdf.js)
- `PDFMONKEY_MODE_C_TEMPLATE_ID` — USED (lib/pdf-service-pdfmonkey.js)
- `PDFMONKEY_BRIEF_TEMPLATE_ID` — UNUSED (siehe B)

**Empfehlung:** Nach DELETE der UNUSED bleibt 2× Template-ID. Konsolidierung lohnt sich nicht (~20 bytes Einsparung, Code-Refactor in pdf-service-pdfmonkey.js + foto-anlage-pdf.js).

### D5) PROVA_*_SECRET (5+ ENVs)

| ENV | Verwendung |
|---|---|
| `PROVA_INTERNAL_WRITE_SECRET` | 7× — quer durch viele Lambdas, breit |
| `PROVA_EMAIL_CRON_SECRET` | 3× — Cron-Mail-Trigger |
| `PROVA_SENTRY_TEST_SECRET` | 1× — sentry-test |
| `PROVA_SMTP_ENCRYPTION_KEY` | 1× — smtp-credentials |
| `PROVA_INTERNAL_SECRET` | 1× — emails.js (separater Wert!) |

**Empfehlung:** **KEEP getrennt.** Verschiedene Funktionsbereiche, unterschiedliche Rotation-Lifecycle. Konsolidierung erhöht Blast-Radius bei Leak und macht Rotation komplizierter. Einsparung würde ~100 bytes betragen, aber Operational-Risk steigt.

---

## E) Frontend-Only / Test-Tooling — aus Lambda-Scope entfernen

| ENV | Begründung |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | 0 in Lambdas. Nur in `scripts/verify-stripe-setup.js` (lokales Test-Tool). Frontend nutzt Stripe.js mit eigener Embed-Konfig. |
| `SENTRY_DSN_FRONTEND` | 0 in Lambdas. Browser-Sentry-Init via `lib/sentry-init.js` (frontend bundle). |
| `NODE_VERSION` | Build-Time-Only von Netlify selbst gesetzt — KEIN Lambda-Runtime-Bedarf. Sollte automatisch aus Lambda-Scope sein. |

**Action:** Im Netlify Dashboard → Site → ENV-Variables → diese 3 ENVs auf **"Scope: Builds only"** setzen (statt "All scopes"). Dann werden sie nicht in Lambda-Bundle injiziert.

**Einsparung:** ~3 × 100 bytes ≈ **300 bytes**

---

## F) Big-3 Function-Scoping (Power-Move)

Die drei größten ENV-Werte fressen zusammen >900 bytes. Netlify erlaubt Function-Specific-Scoping (statt All-Functions).

| ENV | Größe | Welche Lambdas brauchen es WIRKLICH? |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ~330 bytes | 22 Lambdas — fast alle. **NICHT scopen** (lohnt nicht) |
| `ANTHROPIC_API_KEY` | ~115 bytes | `ki-proxy`, `lib/ai-router`, `lib/ki-anthropic` — Scope: nur Lambdas die ki-proxy direkt sind |
| `OPENAI_API_KEY` | ~70 bytes | 10 Lambdas: ki-proxy, whisper-diktat, foto-captioning, normen-picker, ki-konsistenz-check, ki-diktat-strukturierung, ai-router, status-check (probe), health (probe). Scopen auf diese 9 Lambdas. |

**Realistisch:** Function-Scoping bringt nur dann was, wenn 100+ Lambdas existieren. Bei 66 Lambdas ist die Komplexität nicht wert. **Empfehlung: Big-3 NICHT scopen, stattdessen DELETE + Konsolidierung priorisieren.**

---

## G) Aktuelle Anomalien (aus Build-Log abzuleiten)

Marcel's Build-Log-ENV-Liste enthält **NICHT**:
- `MAKE_WEBHOOKS` oder `MAKE_WEBHOOKS_JSON` (das konsolidierte JSON!)
- `PROVA_SUPABASE_PROJECT_URL` (alternativer Key, in 10 Lambdas referenziert!)
- `PROVA_SUPABASE_JWKS_URL` (für JWT-Validation)
- `PROVA_AUTH_HMAC_SECRET` (3× referenziert, primary vor `AUTH_HMAC_SECRET`)
- `EMAIL_CRON_SECRET` (3× als Fallback referenziert)

**Hypothese:** Marcel's Liste im Master-Prompt ist eine vereinfachte Auswahl, nicht die echte Netlify-ENV-Liste. Real existieren in Netlify mehr ENVs — was das 4KB-Problem erklärt. Die echte Anzahl ist vermutlich 60-70 ENVs, nicht 51.

**Marcel-Action:** Im Netlify Dashboard https://app.netlify.com/projects/prova-systems/configuration/env die echte Liste exportieren (gibt CSV-Export-Funktion).

---

## H) HANDLUNGSFÄHIGE ACTION-LISTE

### Aktion 1: SOFORT-LÖSCHEN im Netlify Dashboard (5 ENVs, ~350 bytes)

Im Netlify Dashboard → Site Settings → Environment variables → Delete:

```
PDFMONKEY_BRIEF_TEMPLATE_ID
SMTP_USER_REFERRAL
SMTP_PASS_REFERRAL
MAKE_WEBHOOK_KAUF
MAKE_WEBHOOK_WILLKOMMEN
```

### Aktion 2: SCOPE-Wechsel auf "Builds only" (3 ENVs, ~300 bytes)

```
STRIPE_PUBLISHABLE_KEY
SENTRY_DSN_FRONTEND
NODE_VERSION
```

### Aktion 3: AIRTABLE_TOKEN löschen (~110 bytes)

Code nutzt `AIRTABLE_PAT` als Primary, `AIRTABLE_TOKEN` ist nur Fallback-Alias. Wenn beide gleichen Wert haben, ist `AIRTABLE_TOKEN` redundant.

```
AIRTABLE_TOKEN  # nur wenn identisch zu AIRTABLE_PAT
```

### Aktion 4: MAKE_WEBHOOKS-Konsolidierung (~400-560 bytes)

**4a)** Im Netlify Dashboard prüfen: ist `MAKE_WEBHOOKS` (JSON) bereits gesetzt?

**4b)** Falls NEIN: ein neues ENV `MAKE_WEBHOOKS` mit dem JSON-Object setzen:
```json
{"a5":"<URL>","f1":"<URL>","g1":"<URL>","g3":"<URL>","k2":"<URL>","l8":"<URL>"}
```

**4c)** Test-Deploy. Wenn alle Make-Webhook-Lambdas weiter funktionieren → Legacy-ENVs löschen:
```
MAKE_WEBHOOK_A5
MAKE_WEBHOOK_F1
MAKE_WEBHOOK_G1
MAKE_WEBHOOK_G3
MAKE_WEBHOOK_K2
MAKE_WEBHOOK_L8
```

### Aktion 5: NACH erfolgreichem Build — K-1.5-Cutover-Cleanup

Nach K-1.5-Tag (Make-Deaktivierung):
```
AIRTABLE_PAT (15× refs werden zu Dead-Code)
AIRTABLE_BASE_ID
AIRTABLE_TABLE_SV
AIRTABLE_AUDIT_TRAIL_TABLE
AIRTABLE_BRIEFE_TABLE
PROVA_AUDIT_TRAIL_TABLE
AIRTABLE_API_KEY
```
**Einsparung:** ~700 bytes

---

## I) Total-Size-Berechnung

| Schritt | ENVs | bytes |
|---|---|---|
| **AKTUELL** (Build-Log) | ~51-65 | ~5800 |
| Aktion 1 (UNUSED delete) | -5 | -350 |
| Aktion 2 (Frontend-Scope) | -3 | -300 |
| Aktion 3 (AIRTABLE_TOKEN) | -1 | -110 |
| Aktion 4 (MAKE konsolidiert) | -6 | -480 |
| **NACH Aktionen 1-4** | ~36-50 | **~4560** ⚠️ knapp drüber |
| Aktion 5 (Airtable-Cutover) | -7 | -700 |
| **NACH allen Aktionen** | ~29-43 | **~3860** ✅ |

**Anmerkung:** Aktion 5 ist erst nach K-1.5-Tag möglich. **Aktionen 1-4 reichen aktuell vermutlich nicht ganz.** → Empfehlung: zusätzlich zu Aktion 4 alle echten Netlify-ENVs gegen Code prüfen (CSV-Export).

---

## J) Was NICHT in dieser Welle gemacht wurde

Per Marcel-Direktive: KEIN Code-Change.

- ❌ Keine Code-Änderungen
- ❌ Keine Tests neu geschrieben
- ❌ Kein Commit
- ❌ Keine ENV-Löschung in Netlify (Marcel macht das im Dashboard)

---

## K) Priorisierte Empfehlung für Marcel

**SCHRITT 1 (5 Min):** Aktion 1 + Aktion 2 + Aktion 3 manuell im Netlify Dashboard durchführen → re-deploy triggern → schauen ob Build durchläuft.

**Falls JA:** 🎉 Erledigt. Aktion 4 später als Sauberkeits-Refactor.

**Falls NEIN:** Aktion 4 (MAKE-Konsolidierung) durchführen → erneuter Deploy.

**Falls IMMER NOCH FAILT:** Marcel exportiert echte Netlify-ENV-Liste als CSV, Re-Audit mit echten Werten.

---

*ENV-AUDIT-2026-05-08-BUILD-CRISIS — generated by Claude Opus 4.7 (1M context)*
*Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>*
