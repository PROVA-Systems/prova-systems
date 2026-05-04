# MEGA¹⁵.5 — ENV-Fix Self-Capacity-Plan

**Datum:** 2026-05-07
**Vorgaenger-Tag:** v221 (MEGA¹⁵ Tiptap-LIVE — aber Deploy blockiert)
**Modus:** Production-Hotfix (BLOCKING)

---

## 1. Root-Cause-Analyse

### Problem
- Deploy 2026-05-07 15:12:55 fehlgeschlagen
- AWS-Lambda 4KB-ENV-Limit ueberschritten
- ~22 Admin-Functions deploy-blockiert
- MEGA¹⁵-Code (workflow-settings.js, prova-editor.js) liegt im Repo aber NICHT live

### Ursache (durch Code-Audit identifiziert)
Insgesamt **85+ ENV-Variables** im Code referenziert. Hauptquellen der Aufblaehung:

**MAKE-Webhooks (21 separate Variables!):**
```
MAKE_WEBHOOK_A5, _F1, _G1, _G3, _K1, _K2, _K3, _KAUF, _L3-L5, _L8-L10,
_S1, _S3, _S6, _S9, _SUPPORT, _TRIAL, _WHISPER, _WILLKOMMEN
+ MAKE_S3_WEBHOOK, MAKE_S4_WEBHOOK
```

**STRIPE_PRICE-Vars (5 separate):**
```
STRIPE_PRICE_SOLO, _TEAM, _ADDON_5, _ADDON_10, _ADDON_20
```

**Sentry (4 Variables):**
```
SENTRY_AUTH_TOKEN, SENTRY_DSN_FUNCTIONS, SENTRY_ORG_SLUG, SENTRY_PROJECT_SLUG_*
```

**Airtable (3 redundante Auth-Vars):**
```
AIRTABLE_PAT, AIRTABLE_TOKEN, AIRTABLE_API_KEY  (alle drei mit gleichem Zweck!)
```

**SMTP doppelt (PROVA_ und IONOS_):**
```
PROVA_SMTP_HOST, _USER, _PASS, _PORT, _FROM_NAME (5)
IONOS_SMTP_HOST, _USER, _PASS (3)
```

---

## 2. Loesungs-Strategie (3-stufig)

### Stufe 1: Konsolidierung via JSON-Lookup
Reduziert ENV-Count drastisch:

| Vorher | Nachher | Reduktion |
|---|---|---:|
| 21 MAKE_WEBHOOK_* | 1 MAKE_WEBHOOKS (JSON) | -20 |
| 5 STRIPE_PRICE_* | 1 STRIPE_PRICES (JSON) | -4 |
| 3 AIRTABLE_PAT/TOKEN/API_KEY | 1 AIRTABLE_PAT | -2 |
| (5 SMTP konsolidiert) | (kein Code-Change, Function-Scope) | 0 |

**Totale Reduktion durch Konsolidierung allein: ~26 ENVs.**

### Stufe 2: Function-Scopes (Marcel-Pflicht im Netlify-UI)
Pro ENV: nur relevante Functions Scope-zuweisen.

| ENV-Group | Scope (Functions-Pattern) |
|---|---|
| STRIPE_* | nur `stripe-*` Functions (~5) |
| ADMIN_* | nur `admin-*` Functions (~22) |
| AIRTABLE_* | nur `airtable*`, `*-airtable` (~8) |
| MAKE_WEBHOOKS | nur webhook-trigger Functions (~5) |
| VAPID_* | nur `*push*`, `*notification*` (~3) |
| IONOS_SMTP_* | nur `*email*`, `*support*` (~5) |
| SENTRY_* | nur `*sentry*` + alle als optional |

### Stufe 3: Veraltete ENVs loeschen (Marcel-OK pflicht)
**Marcel-bestaetigte Kandidaten:**
- `AIRTABLE_TOKEN`, `AIRTABLE_API_KEY` (redundant zu AIRTABLE_PAT)
- `STRIPE_PRICE_` (eindeutig leer, vermutlich Typo)
- `MAKE_S3_WEBHOOK`, `MAKE_S4_WEBHOOK` (alt vs. neue _S3/_S4 Pattern?)

---

## 3. Token-Capacity-Estimate

Ich bin in einer SEHR langen Session (MEGA⁸ → ¹⁵ + nun ¹⁵.5). Realistisch:

### PRIMARY (sicher, BLOCKING)
- **W37** (~6k): ENV-Audit-Doku
- **W38** (~10k): Helper-Library `lib/env-config.js` mit JSON-Lookups
- **W39** (~8k): Refactor in 3-5 Hauptfunctions
- **W40** (~6k): Marcel-Actions-Doku

### STRETCH (wenn Tokens reichen)
- **W41** (~10k): Mode B in akte.html
- **W42** (~6k): Final-Report

### ULTIMATE (bewusst nicht)
- Mode B in stellungnahme + KI-Integration im Editor + Onboarding-Wizard

**Realistic:** PRIMARY 4 + STRETCH 2 = 6 Tasks.

---

## 4. Anti-Patterns vermeiden

❌ **ENVs blind loeschen** — alle Code-Stellen vorher pruefen
❌ **Function-Scopes via API** — Marcel macht das im Netlify-UI manuell (CLAUDE.md "keine externe Service-Konfig")
❌ **Helper ohne Backwards-Compat** — alte ENV-Vars muessen weiter funktionieren waehrend Migration
❌ **Mode-B-Code vor ENV-Fix** — wenn Deploy nicht durchgeht, kommt Mode-B-Code nie live

---

## 5. Erwartete Quality-Metrics

- **Tests:** 909 → 940+ (~30 neue)
- **ENV-Reduktion via Konsolidierung:** 85 → ~60 (-26)
- **Pro-Function-ENV-Last via Scopes:** dramatic Reduktion (4KB-Pflicht erfuellt)
- **LOC neu:** ~600 (Helper + Refactor + Doku)

---

*Plan-Stand 2026-05-07. Start: W37 (ENV-Audit-Doku).*
