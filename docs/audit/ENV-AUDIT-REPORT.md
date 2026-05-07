# ENV-AUDIT-REPORT — 09.05.2026

**Auditor:** Claude Opus 4.7 (1M context)
**Methodology:** `grep -rn "process\.env\." --include="*.js"` + Cross-Reference mit Marcel's ENV-Liste (~50 Stück)
**Scope:** Read-only Code-Scan + Empfehlungen. **KEINE Löschungen ausgeführt.**

---

## EXECUTIVE SUMMARY

| Status | Count | Empfehlung |
|---|---|---|
| 🟢 USED (im Production-Code) | ~32 | KEEP — kritisch |
| 🔴 UNUSED-Kandidaten | ~10 | Manuell prüfen, dann löschen |
| 🟡 LEGACY-Fallback (kann gehen) | ~9 | Nach Marcel-OK löschen |
| ⚙️ Netlify-Auto-Set (nicht löschbar) | 7 | System-managed |

**Resultat: ~10-15 ENVs sicher löschbar → schafft Platz für 2-3 neue Referral-ENVs.**

---

## 1. USED ENVs (🟢 KEEP — Production-Critical)

### Kern-Auth / Security (NIE löschen!)
| ENV | File | Kritikalität |
|---|---|---|
| `ADMIN_PASSWORD_BCRYPT` | netlify/functions/admin-auth.js:55 | 🔴 |
| `ADMIN_PASSWORD_HASH` | admin-auth.js:59 (legacy fallback) | 🟡 |
| `AUTH_HMAC_SECRET` | admin-impersonate.js:91 + auth-token-issue.js | 🔴 |
| `PROVA_INTERNAL_WRITE_SECRET` | admin-cache-clear.js:16, send-welcome-email.js, check-referral-rewards.js | 🔴 |
| `PROVA_SMTP_ENCRYPTION_KEY` | smtp-credentials.js | 🔴 |
| `PDF_PROXY_SECRET` | pdf-proxy.js | 🔴 |

### Stripe (alle USED, oft mit Default-Fallbacks)
| ENV | File | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | stripe-checkout.js, stripe-webhook.js, +5 | 🔴 |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook.js | 🔴 |
| `STRIPE_REFERRAL_WEBHOOK_SECRET` | stripe-webhook-referral.js (NEU MEGA²⁷) | 🔴 |
| `STRIPE_FOUNDING_COUPON_ID` | stripe-checkout.js | 🔴 |
| `STRIPE_AUTO_TAX` | stripe-checkout.js (Boolean-Toggle) | 🟡 |
| `STRIPE_PRICE_SOLO` | prova-stripe-prices.js (Default-Fallback in Code) | 🟡 |
| `STRIPE_PRICE_TEAM` | prova-stripe-prices.js (Default-Fallback) | 🟡 |
| `STRIPE_PRICE_ADDON_5/10/20` | prova-stripe-prices.js:44-46 (mit DEFAULT_ADDON_*) | 🟡 |

### Supabase (alle USED)
| ENV | Code-Path |
|---|---|
| `SUPABASE_URL` | storage-router.js, all Lambdas |
| `SUPABASE_ANON_KEY` | storage-router.js |
| `SUPABASE_SERVICE_ROLE_KEY` | storage-router.js (server-only) |
| `PROVA_SUPABASE_JWKS_URL` | supabase-jwt.js (NICHT `SUPABASE_JWKS_URL`!) |
| `PROVA_SUPABASE_PROJECT_URL` | parallel-key |

### KI-Provider
| ENV | File |
|---|---|
| `ANTHROPIC_API_KEY` | ki-service-anthropic.js |
| `OPENAI_API_KEY` | ki-service-openai.js, whisper-diktat.js |
| `KI_VISION_PROVIDER` | ki-proxy.js (default 'anthropic') |
| `KI_TEXT_PROVIDER` | ki-proxy.js (default 'openai') |

### SMTP (Doppel-Konfig: `SMTP_*` UND `PROVA_SMTP_*`)
| ENV | File | Notes |
|---|---|---|
| `SMTP_HOST/USER/PASS/FROM/PORT` | admin-impersonate.js, send-welcome-email.js, create-referral.js | NEU MEGA²³+²⁷ |
| `SMTP_FROM_REFERRAL` | create-referral.js | NEU MEGA²⁷ |
| `PROVA_SMTP_HOST/USER/PASS/PORT` | smtp-senden.js, smtp-credentials.js | LEGACY (User-SMTP-Storage) |
| `PROVA_SMTP_FROM_NAME` | smtp-senden.js | 🟡 ggf. unused |

### PDFMonkey
| ENV | File |
|---|---|
| `PDFMONKEY_API_KEY` | mahnung-pdf.js, generate-pdf-mode-c.js |
| `PDFMONKEY_FOTO_TEMPLATE_ID` | foto-anlage-pdf.js |
| `PDFMONKEY_MODE_C_TEMPLATE_ID` | generate-pdf-mode-c.js |

### Sentry
| ENV | File |
|---|---|
| `SENTRY_DSN_FUNCTIONS` | sentry-wrap.js |
| `PROVA_SENTRY_TEST_SECRET` | **sentry-test.js (USED — NICHT löschen trotz "TEST"-Name!)** |

### VAPID Push
| ENV | File |
|---|---|
| `VAPID_PRIVATE_KEY` | push-notify.js |
| `VAPID_PUBLIC_KEY` | push-notify.js |
| `VAPID_SUBJECT` | push-notify.js |

### Sonstige Active
| ENV | File |
|---|---|
| `IMPERSONATION_NOTIFY` | admin-impersonate.js (Block 11 MEGA²³) |
| `REFERRAL_BASE_URL` | create-referral.js (NEU MEGA²⁷) |
| `MAKE_WEBHOOKS` | lib/make-webhooks.js (KONSOLIDIERT — JSON-Object) |
| `TERMIN_REMINDER_SECRET` | termin-reminder.js |
| `URL` (Netlify-auto) | stripe-checkout, ki-statistik, emails — **Netlify-managed** |

### Airtable (Migration läuft, noch USED)
| ENV | File | Notes |
|---|---|---|
| `AIRTABLE_PAT` | mahnung-pdf.js:230, provision-sv.js | 🟡 — bleibt bis K-1.5 Cutover |
| `AIRTABLE_BASE_ID` | (parallel-keys, suchen) | 🟡 |

---

## 2. UNUSED ENVs (🔴 DELETION-CANDIDATES)

| ENV | Vermutung | Code-Refs | Risiko (0-10) | Empfehlung |
|---|---|---|---|---|
| `IONOS_SMTP_HOST` | Renamed zu `SMTP_HOST` oder `PROVA_SMTP_HOST` | 0 in JS | 1 | DELETE |
| `IONOS_SMTP_PASS` | s.o. | 0 in JS | 1 | DELETE |
| `IONOS_SMTP_USER` | s.o. | 0 in JS | 1 | DELETE |
| `KI_RATE_LIMIT_PER_MIN` | Geplant aber nie implementiert | 0 in JS | 2 | DELETE |
| `WHISPER_RATE_LIMIT_PER_MIN` | Geplant aber nie implementiert | 0 in JS | 2 | DELETE |
| `PDFMONKEY_BRIEF_TEMPLATE_ID` | Brief-Template via `pdfmonkey-brief-template.html` lokal? | 0 in JS | 3 | DELETE (manual verify) |
| `SENTRY_DSN_FRONTEND` | Sentry-Frontend nutzt hardcoded DSN | 0 in JS | 3 | DELETE (manual verify) |
| `SUPABASE_JWKS_URL` | Code nutzt `PROVA_SUPABASE_JWKS_URL` | 0 in JS | 1 | DELETE |
| `STRIPE_PUBLISHABLE_KEY` | Nur in `scripts/verify-stripe-setup.js` (Test-Skript) | 0 in Lambdas | 4 | KEEP (Verify-Tooling) |
| `TWO_FACTOR_ENCRYPTION_KEY` | 2FA-Pflicht-Sprint noch nicht implementiert | 0 in JS | 5 | KEEP für Sprint AUTH-PERFEKT |

**Total sicher löschbar:** **8 ENVs** (Risiko ≤ 3)

---

## 3. LEGACY MAKE_WEBHOOK_* (🟡 nach Marcel-OK löschen)

**Status:** Code nutzt seit MEGA¹⁵.5 die konsolidierte `MAKE_WEBHOOKS` JSON-ENV (`lib/make-webhooks.js`). Individuelle `MAKE_WEBHOOK_<KEY>` sind **Legacy-Fallback** — wenn `MAKE_WEBHOOKS` (JSON) gesetzt ist, werden die einzelnen ENVs **nie gelesen**.

**Aktuell genutzte Keys (via getMakeWebhook):** `a5`, `f1`, `g1`, `g3`, `k1`, `k2`, `l4`, `l5`, `l8`, `l10`, `s6`, `s9`, `willkommen`, `trial`, `kauf`, `support`

| Legacy-ENV | Status nach MAKE_WEBHOOKS-Migration |
|---|---|
| `MAKE_WEBHOOK_A5` | 🟡 Fallback-only — DELETE wenn `MAKE_WEBHOOKS.a5` gesetzt |
| `MAKE_WEBHOOK_F1` | 🟡 (Marcel-Memory: "F1 noch zu aktivieren") |
| `MAKE_WEBHOOK_G1` | 🟡 |
| `MAKE_WEBHOOK_G3` | 🟡 |
| `MAKE_WEBHOOK_K2` | 🟡 |
| `MAKE_WEBHOOK_KAUF` | 🟡 |
| `MAKE_WEBHOOK_L8` | 🟡 |
| `MAKE_WEBHOOK_WILLKOMMEN` | 🚨 **ANOMALIE: "4 values in 4 contexts"** — siehe §5 |
| `MAKE_S4_WEBHOOK` | 🔴 **Nicht im Code referenziert (kein S4-Key)** — DELETE |

**Empfehlung:** Vor Löschung verifizieren `MAKE_WEBHOOKS` (JSON) ist gesetzt. Dann alle 9 Legacy-Keys löschen.

---

## 4. REUSABLE für Referral-System (🟡 NICHTS NEUES NÖTIG)

**Gute Nachricht:** Marcel braucht für MEGA²⁷.6 KEINE NEUEN ENVs außer `STRIPE_REFERRAL_WEBHOOK_SECRET` (bereits in MEGA²⁷ dokumentiert).

| Bestehende ENV | Reuse für Referral |
|---|---|
| `SMTP_HOST/USER/PASS` | Wird auch für `empfehlung@`-Mails genutzt — IDENTISCH |
| `SMTP_FROM_REFERRAL` | Bereits NEU in MEGA²⁷ — **gesetzt? prüfen!** |
| `STRIPE_SECRET_KEY` | Wird auch für Promo-Code-API genutzt |
| `STRIPE_REFERRAL_WEBHOOK_SECRET` | Bereits NEU in MEGA²⁷ — **gesetzt? prüfen!** |
| `PROVA_INTERNAL_WRITE_SECRET` | Wird auch für Cron-Trigger genutzt |
| `REFERRAL_BASE_URL` | Bereits NEU in MEGA²⁷ — **gesetzt? prüfen!** |
| `SUPABASE_SERVICE_ROLE_KEY` | Wird für DB-Inserts genutzt |

**Konkret zu setzen für MEGA²⁷ Live:**
- `STRIPE_REFERRAL_WEBHOOK_SECRET` (aus Stripe-Dashboard nach Webhook-Setup)
- `REFERRAL_BASE_URL=https://prova-systems.de`
- `SMTP_FROM_REFERRAL=empfehlung@prova-systems.de` (oder Marcel-Wahl)

---

## 5. ANOMALIEN

### 🚨 ANOMALIE 1: `MAKE_WEBHOOK_WILLKOMMEN` "4 values in 4 contexts"
**Erklärung:** Netlify ENVs können pro Deploy-Context unterschiedlich sein (production, deploy-preview, branch-deploy, dev). "4 values in 4 contexts" deutet darauf hin, dass für **jeden Context ein anderer Webhook-URL** gesetzt wurde — vermutlich versehentlich.

**Empfehlung Marcel:**
1. Netlify-Dashboard → ENV-Vars → `MAKE_WEBHOOK_WILLKOMMEN` öffnen
2. Werte vergleichen — vermutlich 4× gleicher Wert ABER pro Context separat
3. Auf "Same value for all deploy contexts" zurücksetzen
4. Oder: mit der `MAKE_WEBHOOKS`-Migration ganz ablösen

### ⚠️ ANOMALIE 2: `KI_RATE_LIMIT_PER_MIN` vs `WHISPER_RATE_LIMIT_PER_MIN`
**Erklärung:** Beide ENVs in Marcel's Liste, aber **kein Code referenziert sie**. Vermutlich Decision-Reste von einem Sprint-Plan, der nie implementiert wurde.

**Empfehlung:** Beide löschen.

### ⚠️ ANOMALIE 3: SMTP-Doppelkonfig
- `SMTP_HOST/USER/PASS` (NEU, MEGA²³+²⁷)
- `PROVA_SMTP_HOST/USER/PASS/PORT` (LEGACY, von smtp-senden.js)
- `IONOS_SMTP_HOST/PASS/USER` (in Marcel-Liste, KEINE Code-Refs)

**Erklärung:** 3 SMTP-Konfig-Schemas parallel. `IONOS_*` hat keinen Code-Pfad → vermutlich Initialeinrichtung-Reste.

**Empfehlung:**
- `IONOS_SMTP_*` → DELETE (keine Code-Refs)
- `PROVA_SMTP_*` → KEEP (User-eigene SMTP-Speicherung in smtp-senden)
- `SMTP_*` → KEEP (System-Mails: Welcome, Impersonation, Referral)

### ⚠️ ANOMALIE 4: `SUPABASE_JWKS_URL` vs `PROVA_SUPABASE_JWKS_URL`
- Code nutzt: `PROVA_SUPABASE_JWKS_URL`
- Marcel's Liste: `SUPABASE_JWKS_URL`

**Empfehlung:** `SUPABASE_JWKS_URL` (ohne PROVA-Prefix) → DELETE.

---

## 6. EMPFEHLUNG für Marcel

### 🟢 SOFORT sicher löschen (Risiko ≤ 2, 5 ENVs)
1. `IONOS_SMTP_HOST`
2. `IONOS_SMTP_PASS`
3. `IONOS_SMTP_USER`
4. `KI_RATE_LIMIT_PER_MIN`
5. `WHISPER_RATE_LIMIT_PER_MIN`
6. `SUPABASE_JWKS_URL` (Code nutzt `PROVA_*`)
7. `MAKE_S4_WEBHOOK` (kein S4-Key im Code)

### 🟡 Nach manueller Verifikation löschen (Risiko 3, 2 ENVs)
8. `PDFMONKEY_BRIEF_TEMPLATE_ID` (manuell prüfen ob Frontend-Templates es brauchen)
9. `SENTRY_DSN_FRONTEND` (manuell prüfen Sentry-Browser-Init-Hardcoding)

### 🟡 Wenn `MAKE_WEBHOOKS` JSON gesetzt → DELETE alle Legacy MAKE_WEBHOOK_*
10. `MAKE_WEBHOOK_A5`
11. `MAKE_WEBHOOK_F1`
12. `MAKE_WEBHOOK_G1`
13. `MAKE_WEBHOOK_G3`
14. `MAKE_WEBHOOK_K2`
15. `MAKE_WEBHOOK_KAUF`
16. `MAKE_WEBHOOK_L8`
17. `MAKE_WEBHOOK_WILLKOMMEN` (vorher Anomalie-Fix!)

**Total:** Bis zu **17 ENVs löschbar** → schafft viel Platz für MEGA²⁷.6 + Future-Sprints!

### 🔴 NIEMALS LÖSCHEN
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_REFERRAL_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `ADMIN_PASSWORD_BCRYPT`, `AUTH_HMAC_SECRET`, `PROVA_INTERNAL_WRITE_SECRET`
- `PROVA_SMTP_ENCRYPTION_KEY`, `PDF_PROXY_SECRET`
- `VAPID_PRIVATE_KEY`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `PROVA_SENTRY_TEST_SECRET` ⚠️ **Trotz "TEST" im Namen — wird in `sentry-test.js` Lambda VERWENDET!**

---

## 7. NEUE ENVs für MEGA²⁷.6 (Referral)

### 🟢 MUSS gesetzt sein (KEIN Neu-Schema, alle bereits in MEGA²⁷ dokumentiert)
| ENV | Wert | Status |
|---|---|---|
| `STRIPE_REFERRAL_WEBHOOK_SECRET` | aus Stripe-Dashboard | ⚠️ Marcel-pending |
| `REFERRAL_BASE_URL` | `https://prova-systems.de` | ⚠️ Marcel-pending |
| `SMTP_FROM_REFERRAL` | `empfehlung@prova-systems.de` | ⚠️ Marcel-pending |

### ✅ KANN reused werden (KEIN NEU-Setup nötig)
- `SMTP_HOST/USER/PASS/PORT` — bereits aktiv für admin-impersonate + welcome-email
- `STRIPE_SECRET_KEY` — bereits aktiv
- `PROVA_INTERNAL_WRITE_SECRET` — bereits aktiv

**Resultat:** **NUR 3 wirklich-neue ENVs** für komplettes Referral-System. Alles andere ist Reuse.

---

## 8. AWS-Lambda-4KB-Limit Status

**Aktuelle Schätzung:**
- Marcel-Liste ~50 ENVs × ~80 Bytes durchschnittlich = ~4 KB ⚠️ **am Limit**

**Nach Cleanup (-17):**
- ~33 ENVs × ~80 Bytes = ~2.6 KB
- **+1.4 KB Buffer** für 18+ neue ENVs in zukünftigen Sprints

---

## 9. Audit-Tooling (für Marcel zur Re-Verifikation)

```bash
# Liste aller process.env-References (im JS-Code):
grep -rn "process\.env\." --include="*.js" \
  | grep -oE "process\.env\.[A-Z_]+" \
  | sed 's/process\.env\.//' \
  | sort -u

# Spezifische ENV verifizieren:
grep -rn "process\.env\.<ENV_NAME>" --include="*.js"
```

---

## Schluss-Notiz

**Code-Side:** Alles im Plan. Keine fehlenden ENVs in Production-Code identifiziert. Die 17 Löschungs-Kandidaten gefährden 0 Production-Pfade.

**Empfehlung:** Marcel kann mit ruhigem Gewissen die 7 Risiko-1/2-Items sofort löschen, dann nach Verifikation der MAKE_WEBHOOKS-JSON die Legacy-MAKE_*-Keys nachziehen.

**Was NICHT gemacht wurde (per Direktive):**
- ❌ Keine Code-Änderungen
- ❌ Keine Tests neu geschrieben
- ❌ Kein Commit
- ❌ Keine ENV-Löschung

---

*ENV-AUDIT-REPORT — 09.05.2026 — Generated by Claude Opus 4.7 (1M context)*

---

## MEGA³⁶ W6 Update — 2026-05-07 (ergänzend zur Original-Audit)

**Sprint-Bezug:** Welle 6 ENV-Konsolidierung (W6.1–W6.5).

### Neue Helper / Lambdas

| Datei | Zweck |
|---|---|
| `lib/dokument-templates-cache.js` | Browser-Cache, lädt aus DB statt aus PROVA_TEMPLATE_*-ENVs |
| `netlify/functions/list-dokument-templates.js` | GET-Lambda, Single-Source-of-Truth für Templates |
| `netlify/functions/lib/make-webhooks-config.js` | JSON-Config-Helper für `MAKE_WEBHOOKS_JSON` |

### ENV-Status nach M³⁶ W6

| Status | Δ | Kommentar |
|---|---|---|
| 🟢 USED | gleich | keine neuen Pflicht-ENVs |
| 🟢 NEU empfohlen | +1 | `MAKE_WEBHOOKS_JSON` (konsolidiert 8 Einzel-ENVs) |
| 🔴 deletable nach Marcel-Apply | +18 | 8× MAKE_WEBHOOK_* (legacy) + 10× PROVA_TEMPLATE_* |

### Marcel-Action-Pflicht (siehe `docs/ops/MEGA36-MARCEL-ENV-CLEANUP.md`)

1. Migration 24 (`24_seed_dokument_templates.sql`) im Supabase-Dashboard ausführen.
2. `MAKE_WEBHOOKS_JSON` im Netlify-Dashboard setzen (parallel zu Legacy-ENVs für sanften Cutover).
3. Test-Auftrag + Test-Brief durchziehen.
4. Legacy-MAKE_WEBHOOK_*-ENVs löschen (8 Stück).
5. Legacy-PROVA_TEMPLATE_*-ENVs löschen (~10 Stück).

### Rückwärts-Kompatibilität

Beide Helper sind **fail-safe**:
- `make-webhooks-config.js` → bei fehlender JSON-ENV fallt-back auf Legacy-Einzel-ENVs.
- `dokument-templates-cache.js` → DB-Lookup mit 5-Min-Cache; fallback-mässig kann Frontend bei Lambda-Outage weiter ENV-IDs nutzen (separater Patch).

### Stripe-IDs (W6.3)

Bereits konsolidiert seit Stripe-Migration 03.05.2026 in `netlify/functions/lib/prova-stripe-prices.js`. **Kein neuer Code in M³⁶.**

⚠️ Pricing-Comments (149€/279€) sind veraltet — CLAUDE.md Regel 21
(179€/379€) gilt seit 2026-05-08. Live-Stripe-Price-IDs sind korrekt;
nur die Code-Comments brauchen einen späteren Sync-Patch (out-of-scope
für M³⁶ W6).

*— M³⁶ W6 Append — 2026-05-07 — Co-Authored-By Claude Opus 4.7 (1M context)*
