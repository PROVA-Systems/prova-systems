# MEGA¹⁵.5 ENV-FIX — Final-Report

**Sprint:** MEGA¹⁵.5 (Production-Hotfix nach Deploy-Block)
**Datum:** 2026-05-07
**Vorgaenger-Tag:** v221 (MEGA¹⁵ TipTap-LIVE — Code im Repo, Deploy blockiert)
**Tag-Empfehlung:** v222-env-fix-done

---

## 1. Honesty-Note

Marcel-Direktive: "ENV-FIX HAT ABSOLUTEN VORRANG. Mode B kann nicht live sonst."

**Was geliefert ist (Code-Side):**
- ✅ ENV-Audit-Doku (alle 85 ENVs klassifiziert)
- ✅ make-webhooks.js Helper mit JSON-Lookup + Backwards-Compat
- ✅ 3 Functions refactored (make-proxy, emails, team-interest)
- ✅ Marcel-Actions-Doku (Step-by-Step Netlify-UI)
- ✅ 23 neue Tests gruen

**Was NICHT geliefert (ehrlich):**
- ❌ Mode B in akte.html (Token-Budget — wandert nach MEGA¹⁶)
- ❌ Mode B in stellungnahme.html (MEGA¹⁶)
- ❌ KI-Integration im Editor (MEGA¹⁶)
- ❌ Onboarding-Wizard (MEGA¹⁶)

**Was Marcel pflichtig macht (Netlify-UI):**
- MAKE_WEBHOOKS JSON setzen
- 9+ veraltete ENVs loeschen
- 21 Legacy MAKE_WEBHOOK_*-ENVs loeschen
- Function-Scopes setzen pro ENV-Group
- Deploy triggern + verifizieren

**Strategische Entscheidung:** lieber ENV-Fix vollstaendig + ausfuehrliche Marcel-Anleitung als ENV-Fix halb + Mode B in 1 weiterer Page.

---

## 2. Was geliefert (W37-W42)

### W37: ENV-Audit (`docs/ops/env-audit-2026-05-07.md`)

**85 ENVs im Code identifiziert via:** `grep -rh "process\.env\." netlify/functions/`

**Klassifikation:**
| Klasse | Anzahl | Aktion |
|---|---:|---|
| AWS-Built-In | 8 | keine — automatisch |
| Pflicht-Production | 8 | bleiben — alle Functions |
| Konsolidierbar | 26 | JSON-Helper W38 + Loeschen |
| Function-Scope-faehig | ~30 | Marcel-UI-Aktion W40 |
| Veraltet/Loeschbar | 9 | Marcel loescht |

**Total Reduktions-Potential:** -31 ENVs (85 → 54).

### W38: `lib/make-webhooks.js` Helper

**Public API:**
```js
const { getMakeWebhook, listMakeWebhooks } = require('./lib/make-webhooks');
const url = getMakeWebhook('a5');  // → URL
```

**Resolution-Reihenfolge:**
1. `process.env.MAKE_WEBHOOKS` JSON-Object lookup (case-insensitive)
2. `process.env.MAKE_WEBHOOK_<KEY>` Legacy-Backwards-Compat
3. `MAKE_S3_WEBHOOK` / `MAKE_S4_WEBHOOK` Special-Cases
4. null

**Defensive Features:**
- Cached Module-Level Parsing (1x JSON.parse pro Lambda-Container-Lifetime)
- Fail-Loud bei korrupter JSON (devops-friendly Error)
- Backwards-Compat: kein Production-Outage waehrend Migration
- Empty-String-Filter (leere Werte werden ignoriert)

### W39: Refactor in 3 Functions

**`make-proxy.js`** (war 21-Vars-Block, jetzt 2 Zeilen):
```js
// VOR: 21 process.env.MAKE_WEBHOOK_* in einem WEBHOOKS-Object
// NACH:
const { getMakeWebhook } = require('./lib/make-webhooks');
const aliasedKey = (key === 'kauf') ? 'k2' : key;
const webhook = getMakeWebhook(aliasedKey) || '';
```

**`emails.js`:**
```js
const { getMakeWebhook } = require('./lib/make-webhooks');
const WEBHOOKS = {
  willkommen:        getMakeWebhook('willkommen') || '',
  trial_erinnerung:  getMakeWebhook('trial')      || '',
  kauf_bestaetigung: getMakeWebhook('kauf')       || '',
  support:           getMakeWebhook('support')    || '',
};
```

**`team-interest.js`:**
```js
const { getMakeWebhook } = require('./lib/make-webhooks');
const MAKE_L4_WEBHOOK = getMakeWebhook('l4') || '';
const MAKE_L5_WEBHOOK = getMakeWebhook('l5') || '';
```

### W40: `docs/ops/marcel-actions-required-env-fix.md`

**Step-by-Step fuer Netlify-UI mit 6 Schritten:**

1. **MAKE_WEBHOOKS JSON setzen** (mit Beispiel-Struktur, Scope auf 3 Functions)
2. **Veraltete ENVs LOESCHEN** (9 Vars: AIRTABLE_TOKEN/_API_KEY, 5 STRIPE_PRICE_*, STRIPE_PRICE_-Tippfehler, PROVA_SENTRY_TEST_SECRET, MAKE_S3/S4_WEBHOOK falls duplikat)
3. **21 Legacy MAKE_WEBHOOK_*-Vars loeschen** (NACH Test in Schritt 1)
4. **Function-Scopes setzen** (8 Gruppen: Stripe/Admin/Airtable/Make/VAPID/SMTP/PDFMonkey/Webhook-Secrets)
5. **Deploy triggern** + verifizieren
6. **Schema-Migration 07 anwenden** (separat, MEGA¹⁵-Pflicht)

**Plus:** Tests, Rollback-Plan, Verifikations-Skripte.

---

## 3. Quality-Metrics

| Metric | Pre-MEGA¹⁵.5 (v221) | Post |
|---|---:|---:|
| Tests | 909 | 932 |
| LOC neu | — | ~600 |
| sw.js | v272 | v273 |
| ENV-Vars im Code | 85 | 85 (Code), aber Marcel-Side reduzierbar -31 |
| Pro-Function-ENV-Last (Pre-Scope) | ~5-6KB | gleich (ohne Marcel-Action) |
| Pro-Function-ENV-Last (Post-Scope) | ~5-6KB | <4KB (mit Marcel-Action) |

**Marcel-Action ist der kritische Schritt — Code-Side allein loest das 4KB-Limit nicht.**

---

## 4. Marcel-Pflicht-Aktionen (BLOCKING fuer Pilot-Launch)

### Reihenfolge (siehe `docs/ops/marcel-actions-required-env-fix.md`):

**Phase 1 (sofortige Reduktion, ~5 Min):**
1. AIRTABLE_TOKEN, AIRTABLE_API_KEY loeschen → -2
2. 5 STRIPE_PRICE_* loeschen (Defaults im Code) → -5
3. STRIPE_PRICE_ Tippfehler loeschen → -1
4. PROVA_SENTRY_TEST_SECRET loeschen → -1

**Total Phase 1: -9 ENVs ohne Code-Aktion noetig.**

**Phase 2 (Konsolidierung, ~10 Min):**
5. MAKE_WEBHOOKS JSON setzen mit allen 21 URLs (Werte vorher BACKUP!)
6. Smoke-Test: Webhook-Trigger funktioniert
7. 21 Legacy MAKE_WEBHOOK_*-Vars loeschen
8. MAKE_S3/S4_WEBHOOK loeschen (falls duplikat)

**Total Phase 2: -23 ENVs.**

**Phase 3 (Scope-Strategie, ~30 Min):**
9. Pro ENV "Specific scopes" setzen statt "All scopes"
10. 8 Gruppen (Stripe/Admin/Airtable/Make/VAPID/SMTP/PDFMonkey/Secrets)

**Phase 4 (Verification):**
11. Deploy triggern → Erwartet: Success
12. Function-Tests (Stripe-Checkout, Webhook-Trigger, Email-Send)

---

## 5. NACHT-PAUSE-Pflichten an Marcel (kumulativ MEGA¹⁰-¹⁵.5)

### Aus MEGA¹⁰-¹⁵ (43 Items, weiterhin offen)

### Neu in MEGA¹⁵.5
44. **MAKE_WEBHOOKS JSON manuell setzen mit 21 Werten** (Marcel-Backup-pflicht)
45. **9+ veraltete ENVs loeschen** (siehe Marcel-Actions-Doku)
46. **Function-Scopes setzen** (8 Gruppen)
47. **Deploy triggern** + verifizieren
48. **Schema-Migration 07 applyen** (war schon W31 — falls noch nicht gemacht)

---

## 6. Lessons fuer MEGA¹⁶

### ENV-Strategie etabliert
- Konsolidierungs-Pattern: einzelne Vars → JSON
- Helper-Library mit Backwards-Compat
- Function-Scopes als zweite Reduktions-Stufe
- Marcel-Actions klar dokumentiert

### Mode-B-Erweiterung weiter offen
- akte.html (§6 Fachurteil-Editor) — nach Deploy-OK
- stellungnahme.html (Freitext-Sektionen)
- Onboarding-Wizard (Mode-Wahl bei erster Anmeldung)
- TipTap-Plugins fuer ProvaConfidence + ProvaAutosuggest

### Word-Import (Mode C — MEGA¹⁶ Hauptaufgabe)
- mammoth.js fuer DOCX-Parsing
- Variablen-Detection mit Regex
- Vorlagen-Library pro User

---

## 7. CHANGELOG-MASTER ergaenzen

```
## v222 — MEGA¹⁵.5 ENV-FIX (2026-05-07)
### W37 — ENV-Audit
- docs/ops/env-audit-2026-05-07.md (alle 85 ENVs klassifiziert)
- 31 Vars Reduktions-Potential identifiziert

### W38 — make-webhooks Helper
- lib/make-webhooks.js (JSON-Lookup mit Backwards-Compat)
- Cached Module-Level Parsing
- Special-Cases fuer alte Naming-Patterns

### W39 — Refactor in 3 Functions
- make-proxy.js: 21-Vars-Block → 2 Zeilen
- emails.js: 4 ENVs → getMakeWebhook
- team-interest.js: 2 ENVs → getMakeWebhook

### W40 — Marcel-Actions-Doku
- 6 Schritte fuer Netlify-UI
- Function-Scope-Strategie fuer 8 Gruppen
- Rollback-Plan + Tests

### Tests: 909 → 932 (+23)
### sw.js: v272 → v273

### Marcel-Pflicht: ENVs in Netlify-UI bereinigen (siehe Doku)
```

### Tag-Empfehlung

```bash
git tag -a v222-env-fix-done -m "MEGA¹⁵.5: ENV-Fix Code-Side ready (Marcel-UI-Action pflicht)"
```

**NICHT ausgefuehrt von mir — Marcel-OK pflicht.**

---

## 8. File-Inventory

**Neu:**
- `docs/ops/env-audit-2026-05-07.md` (~250 Zeilen Audit)
- `docs/ops/marcel-actions-required-env-fix.md` (~200 Zeilen Step-by-Step)
- `docs/diagnose/MEGA15-5-ENV-FIX-PLAN.md` (Plan)
- `docs/sprint-status/MEGA-QUINDECIMA-5-ENV-FIX-FINAL.md` (diese Datei)
- `netlify/functions/lib/make-webhooks.js` (~100 LOC Helper)
- `tests/env/make-webhooks.test.js` (23 Tests)

**Modifiziert:**
- `netlify/functions/make-proxy.js` (Helper-Integration)
- `netlify/functions/emails.js` (Helper-Integration)
- `netlify/functions/team-interest.js` (Helper-Integration)
- `sw.js` v272 → v273

**Test-Suite:** 909 → 932 (+23, alle gruen)

---

## 9. TAG-Empfehlung + Final-Status

**Tag:** `v222-env-fix-done`
**Subject:** MEGA¹⁵.5: ENV-Fix Code-Side ready (Marcel-UI-Action ausstehend)

**Status:**
- 5 Tasks completed (W37-W40, W42)
- W41 (Mode B in akte.html) ehrlich gedeleted (Token-Budget)
- 23 neue Tests gruen, 932 Total
- 0 Production-Breaking-Changes (Backwards-Compat)
- sw.js v272 → v273
- KEIN Push, KEIN Tag — Marcel-OK pflicht

**Was Marcel ehrlich versprochen war:**
- ✅ ENV-Audit komplett (alle 85 Vars klassifiziert)
- ✅ Helper-Library produktionsreif (Backwards-Compat fuer rollback-safe Migration)
- ✅ 3 Functions refactored mit Pre-Post-Pattern verifiziert
- ✅ Marcel-Actions-Doku Step-by-Step mit Rollback-Plan
- ❌ NICHT Mode B in akte.html (ehrlich kommuniziert — MEGA¹⁶)

---

*MEGA¹⁵.5 ENV-FIX done — Code-Side production-ready. Marcel kann jetzt Netlify-UI-Aktionen ausfuehren um Deploy-Block zu loesen. Backwards-Compat in Helper schuetzt vor rollback-Risiken.*
