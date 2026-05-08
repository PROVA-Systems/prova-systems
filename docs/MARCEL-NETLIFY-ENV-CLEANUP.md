# MARCEL — Netlify ENV Cleanup (Build-Crisis 2026-05-08)

**Ziel:** AWS Lambda 4 KB ENV-Limit unterschreiten, damit Build durchläuft.
**Aktuell:** ~5800 bytes → Build broken seit 6.5.
**Nach Cleanup:** ~3100-3900 bytes (✅ unter 4 KB).

**Reihenfolge ZWINGEND:**
1. Du machst TEIL 1 + TEIL 2 (Netlify Dashboard).
2. Du sagst mir "Cleanup done", dann pushe ich den Code.
3. Wenn ich pushe BEVOR du fertig bist, crasht alles (Lambdas suchen JSON-ENVs die noch nicht da sind).

---

## TEIL 1 — LÖSCHEN (UNUSED + LEGACY)

Im Netlify Dashboard → Site → Settings → Environment variables → einzeln löschen:

### 1A) UNUSED (sofort weg, 0 Risiko)

```
PDFMONKEY_BRIEF_TEMPLATE_ID    # 0 Code-Refs (nur in hilfe.html als Hinweistext)
SMTP_USER_REFERRAL              # 0 Code-Refs (Code nutzt geteilte SMTP_USER + SMTP_FROM_REFERRAL)
SMTP_PASS_REFERRAL              # 0 Code-Refs
MAKE_WEBHOOK_KAUF               # nicht im Mapping (lib/get-make-webhook-url.js)
MAKE_WEBHOOK_WILLKOMMEN         # Anomalie "4 values in 4 contexts"
```

### 1B) Frontend-Only — Scope auf "Builds only" wechseln (NICHT löschen!)

Im Netlify Dashboard pro ENV: "Edit" → unter "Different value for each deploy context" lassen, ABER unter Scopes "Builds only" wählen (statt "All scopes"). Dann werden sie nicht ins Lambda-Bundle injiziert.

```
STRIPE_PUBLISHABLE_KEY   # Frontend-only via Stripe.js
SENTRY_DSN_FRONTEND      # Frontend-Sentry-Bundle
NODE_VERSION             # Build-time only
```

### 1C) AIRTABLE_TOKEN (nur falls identisch zu AIRTABLE_PAT)

```
AIRTABLE_TOKEN   # nur Fallback-Alias, gleicher Wert wie AIRTABLE_PAT
```

**Falls unsicher:** behalte. Kein dringender Drop.

### 1D) LEGACY-AIRTABLE — NACH K-1.5-Cutover-Tag

NICHT JETZT — Code liest noch aus Airtable in 15+ Lambdas. Später (eigene Cleanup-Welle):

```
AIRTABLE_PAT
AIRTABLE_BASE_ID
AIRTABLE_TABLE_SV
AIRTABLE_AUDIT_TRAIL_TABLE
AIRTABLE_BRIEFE_TABLE
PROVA_AUDIT_TRAIL_TABLE
AIRTABLE_API_KEY
```

---

## TEIL 2 — JSON-KONSOLIDIERUNG

Du sammelst die aktuellen Werte aus den alten ENVs (kannst sie im Netlify Dashboard sichtbar machen oder hast sie woanders dokumentiert), packst sie in ein JSON, setzt EINE neue ENV, dann löschst du die alten. **Reihenfolge pro Bundle: NEU setzen → testen → ALT löschen.**

Code-Helper liegt in `netlify/functions/lib/env-config.js`. Liest JSON-Primary, fällt auf Einzel-ENVs zurück → sanfter Cutover möglich.

### 2A) MAKE_WEBHOOKS_JSON (oder MAKE_WEBHOOKS — beide funktionieren)

Code-Helper: `lib/make-webhooks.js` (existiert bereits seit M³⁶).

**Neuer ENV-Name:** `MAKE_WEBHOOKS` (oder `MAKE_WEBHOOKS_JSON` — Code probiert beide).

**Wert (sammle aus alten ENVs, KAUF + WILLKOMMEN raus weil unused):**
```json
{"a5":"<wert von MAKE_WEBHOOK_A5>","f1":"<wert von MAKE_WEBHOOK_F1>","g1":"<wert von MAKE_WEBHOOK_G1>","g3":"<wert von MAKE_WEBHOOK_G3>","k2":"<wert von MAKE_WEBHOOK_K2>","l8":"<wert von MAKE_WEBHOOK_L8>"}
```

**Nach Test → DELETE:**
```
MAKE_WEBHOOK_A5
MAKE_WEBHOOK_F1
MAKE_WEBHOOK_G1
MAKE_WEBHOOK_G3
MAKE_WEBHOOK_K2
MAKE_WEBHOOK_L8
MAKE_S3_WEBHOOK   # falls gesetzt
MAKE_S4_WEBHOOK   # falls gesetzt (kein Code-Pfad)
```

**Einsparung:** ~480 bytes

### 2B) STRIPE_PRICES_JSON (optional — kein hoher Win)

**Code-Status:** `lib/prova-stripe-prices.js` hat Hardcoded-Defaults für alle 5 Price-IDs. Wenn deine Live-Werte mit den Defaults übereinstimmen, brauchst du diese ENVs gar nicht.

**Live-Defaults im Code (Stand 03.05.2026):**
```
SOLO     = price_1TSjMZRXumrtL2n5fgToRwyr
TEAM     = price_1TSjNXRXumrtL2n56c6emN2k
ADDON_5  = price_1TSl2JRXumrtL2n52XSz85oC
ADDON_10 = price_1TSl3fRXumrtL2n5Gur4BmWL
ADDON_20 = price_1TSl4eRXumrtL2n5tIWx0ET8
```

**Option A (radikal):** Falls deine 5 ENV-Werte exakt diese sind → einfach DELETE alle 5 ENVs. Code nutzt die Defaults.

**Option B (Konsolidierung):** Falls ENV-Werte ABWEICHEN von den Defaults, neuer ENV setzen:

**Neuer ENV-Name:** `STRIPE_PRICES_JSON`
**Wert:**
```json
{"solo":"<wert>","team":"<wert>","addon5":"<wert>","addon10":"<wert>","addon20":"<wert>"}
```

**Nach Test → DELETE:**
```
STRIPE_PRICE_SOLO
STRIPE_PRICE_TEAM
STRIPE_PRICE_ADDON_5
STRIPE_PRICE_ADDON_10
STRIPE_PRICE_ADDON_20
```

**Einsparung:** ~200 bytes

### 2C) VAPID_KEYS_JSON

**Neuer ENV-Name:** `VAPID_KEYS_JSON`
**Wert:**
```json
{"public":"<wert von VAPID_PUBLIC_KEY>","private":"<wert von VAPID_PRIVATE_KEY>","subject":"<wert von VAPID_SUBJECT, z.B. mailto:hallo@prova-systems.de>"}
```

**Nach Test → DELETE:**
```
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

**Einsparung:** ~60 bytes (gering, weil Werte selbst groß sind und im JSON drinbleiben)

### 2D) SMTP_REFERRAL_JSON (kleiner Win — nur 1 Wert effektiv genutzt)

**Hinweis:** Code nutzt nur `from`. `user`/`pass` aktuell ungenutzt (Referral-Mails über geteilte SMTP_USER/SMTP_PASS).

**Neuer ENV-Name:** `SMTP_REFERRAL_JSON`
**Wert:**
```json
{"from":"<wert von SMTP_FROM_REFERRAL, z.B. PROVA Empfehlung <empfehlung@prova-systems.de>>"}
```

**Nach Test → DELETE:**
```
SMTP_FROM_REFERRAL
```
(SMTP_USER_REFERRAL + SMTP_PASS_REFERRAL bereits in TEIL 1A)

**Einsparung:** ~30 bytes

### 2E) PDFMONKEY_TEMPLATES_JSON

**Neuer ENV-Name:** `PDFMONKEY_TEMPLATES_JSON`
**Wert (BRIEF weglassen — unused):**
```json
{"foto":"<wert von PDFMONKEY_FOTO_TEMPLATE_ID>","modeC":"<wert von PDFMONKEY_MODE_C_TEMPLATE_ID>"}
```

**Nach Test → DELETE:**
```
PDFMONKEY_FOTO_TEMPLATE_ID
PDFMONKEY_MODE_C_TEMPLATE_ID
```
(BRIEF bereits in TEIL 1A)

**Einsparung:** ~80 bytes

### 2F) PROVA_SECRETS_JSON (NICHT EMPFOHLEN — nur falls 4 KB nicht erreicht)

**Risiko:** Single point of failure für Secrets-Rotation. Bei Leak weiter Blast-Radius. Code refactor in 12 Lambdas (heute nicht gemacht — aufwändiger).

**Falls dennoch:** Code-Helper `parseProvaSecrets()` in `env-config.js` ist verfügbar.

**Neuer ENV-Name:** `PROVA_SECRETS_JSON`
**Wert:**
```json
{"internal":"<PROVA_INTERNAL_WRITE_SECRET>","email":"<PROVA_EMAIL_CRON_SECRET>","sentry":"<PROVA_SENTRY_TEST_SECRET>","smtp":"<PROVA_SMTP_ENCRYPTION_KEY>"}
```

**Nach Test (und einer separaten Refactor-Welle) → DELETE:**
```
PROVA_INTERNAL_WRITE_SECRET   # 7× Code-Refs — Refactor in 7 Lambdas pending
PROVA_EMAIL_CRON_SECRET       # 3× Code-Refs — Refactor in 3 Lambdas pending
PROVA_SENTRY_TEST_SECRET
PROVA_SMTP_ENCRYPTION_KEY
```

**Einsparung:** ~100 bytes (nach Refactor)

---

## TEIL 3 — SCOPING für Big-3 (NICHT EMPFOHLEN HEUTE)

Bei <70 Lambdas und durchgängiger Nutzung dieser Keys ist Function-Scoping mehr Komplexität als Wert. Skip für jetzt.

| ENV | Größe | Lambdas die es brauchen |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ~330 b | 22 von 66 — zu viele zum scopen |
| `ANTHROPIC_API_KEY` | ~115 b | ki-proxy, ai-router, ki-anthropic (3) |
| `OPENAI_API_KEY` | ~70 b | ki-proxy, whisper-diktat, foto-captioning, normen-picker, ki-konsistenz-check, ki-diktat-strukturierung, ai-router, status-check, health (9) |

**Empfehlung:** Skip Scoping. TEIL 1 + 2 sollten reichen.

---

## TEIL 4 — Reihenfolge der Aktionen

```
1. Backup: Netlify ENV-Liste exportieren (CSV-Export im Dashboard) → lokal sichern
2. TEIL 1A — UNUSED löschen (5 ENVs)        → spart ~350 bytes
3. TEIL 1B — Scope-Wechsel (3 ENVs)          → spart ~300 bytes
4. TEIL 2A — MAKE_WEBHOOKS setzen, dann 6 alte löschen  → spart ~480 bytes
5. TEIL 2C — VAPID_KEYS_JSON setzen, 3 alte löschen      → spart ~60 bytes
6. TEIL 2D — SMTP_REFERRAL_JSON setzen, 1 alte löschen   → spart ~30 bytes
7. TEIL 2E — PDFMONKEY_TEMPLATES_JSON setzen, 2 alte löschen → spart ~80 bytes
8. Manuell triggern: "Trigger deploy → Clear cache and deploy site"
9. Build-Log prüfen — falls Limit-Fehler weg → Marcel sagt "Cleanup done"
10. Ich pushe Code (Branch main bereits ready: env-config.js + 7 refactored Lambdas)
```

**Erwartetes Total nach Schritt 7:** ~5800 - 1300 = **~4500 bytes** (knapp drüber).

**Falls noch zu groß:** TEIL 2B (STRIPE_PRICES, am besten Option A: alle 5 löschen weil Defaults aktuell) → -200 bytes → **~4300 bytes** (immer noch drüber).

**Falls IMMER NOCH zu groß:** TEIL 2F (PROVA_SECRETS_JSON, aber Code-Refactor pending — vorher gefährlich!).

**Plan B falls 4 KB nicht erreichbar:** echte Netlify-ENV-Liste exportieren → re-audit mit echten Werten → ggf. weitere UNUSED finden.

---

## TEIL 5 — Was ICH (Claude) bereits gemacht habe (lokal, NICHT gepusht)

Code-Side ist refactored, sodass nach Marcel's Cleanup ein Push den Build wieder grün bringt.

**Neue Datei:**
- `netlify/functions/lib/env-config.js` — 6 Parser-Functions mit JSON-Primary + Einzel-ENV-Fallback

**Refactored Files (7):**
- `netlify/functions/lib/prova-stripe-prices.js` — `parseStripePrices()`
- `netlify/functions/push-notify.js` — `parseVapidKeys()`
- `netlify/functions/check-referral-rewards.js` — `parseSmtpReferral().from`
- `netlify/functions/create-referral.js` — `parseSmtpReferral().from`
- `netlify/functions/send-referral-reminders.js` — `parseSmtpReferral().from`
- `netlify/functions/foto-anlage-pdf.js` — `parsePdfmonkeyTemplates().foto`
- `lib/pdf-service-pdfmonkey.js` — `parsePdfmonkeyTemplates().modeC`

**NICHT refactored (zu großes Risiko in dieser Welle):**
- PROVA_*_SECRET (12 Aufruf-Stellen) — Parser steht bereit, Refactor pending in eigener Welle

**Backwards-Compat:** Alle Parser haben Fallback auf Einzel-ENVs. D.h. wenn Marcel Einzel-ENVs JETZT lässt UND ich pushe, läuft alles unverändert weiter. Erst wenn Marcel die Einzel-ENVs löscht, müssen die JSON-Bundles gesetzt sein.

**Sequenz für sanften Cutover (zur Sicherheit):**
1. Marcel setzt JSON-ENV (z.B. `MAKE_WEBHOOKS`)
2. Ich pushe Code (Build durch, Lambdas lesen JSON, falls leer → fallen auf Einzel-ENV zurück)
3. Marcel löscht Einzel-ENVs (Lambdas lesen ab jetzt nur noch JSON)

---

## Schluss-Notiz

**Erwartete Total-Size nach erfolgreichem Cleanup:**
- AKTUELL: ~5800 bytes (>4 KB ❌)
- NACH TEIL 1 + 2 (ohne 2B/2F): **~4350 bytes** (knapp 5% drüber)
- NACH TEIL 1 + 2 INKL. 2B (STRIPE Option A): **~4150 bytes** (knapp 1% drüber)
- NACH allen TEIL-Aktionen + K-1.5-Cleanup: **~3100 bytes** (✅ ~24% Buffer)

**Pflicht:** Mindestens TEIL 1 + 2A. **Empfehlung:** Plus 2C/2D/2E.

*Co-Authored-By: Claude Opus 4.7 (1M context)*
