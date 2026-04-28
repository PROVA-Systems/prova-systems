# NACHT-PAUSE — Dashboard-Migration (F2 aus Mega-Sprint #4)

**Datum:** 28.04.2026 · **Sprint:** Mega-Sprint #4 Phase 4
**Status:** STOP, eskaliere zu Marcel — Architektur-Konflikt erkannt

---

## Was passiert ist

Ich habe versucht `dashboard.html` (978 Zeilen) + `dashboard-logic.js` (1199 LOC) auf Supabase zu migrieren laut Pattern-Guide. Bei Pre-Flight-Read ist ein **fundamentaler Architektur-Konflikt** in `window.PROVA_CONFIG` aufgefallen, den ich nicht ohne Marcel-Decision lösen kann.

---

## Der Konflikt

### Zwei Files setzen `window.PROVA_CONFIG`:

**Alt:** `prova-config.js` (Repo-Root, S-SICHER 1.7)
```js
window.PROVA_CONFIG = { AIRTABLE_BASE: "appJ7bLlAHZoxENWE" };
```

**Neu:** `lib/prova-config.js` (HF-2,3,4 Hotfix)
```js
window.PROVA_CONFIG = {
    SUPABASE_URL: '...',
    SUPABASE_ANON_KEY: 'sb_publishable_...',
    PLACEHOLDER: '...'
};
```

**Beide nutzen direkten Assignment (`= { ... }`)** — kein Merge. Das später geladene File **überschreibt** das vorher geladene komplett.

### Wer braucht was:

| Page | braucht AIRTABLE_BASE | braucht SUPABASE_URL+KEY |
|---|---|---|
| dashboard.html | ✅ (dashboard-logic.js Z.13) | ⏳ (für Migration auf dataStore) |
| app.html | ✅ (app-logic.js) | ⏳ |
| akte.html | ✅ (akte-logic.js) | ⏳ |
| gutachterliche-stellungnahme.html | ❌ | ✅ |
| auth-supabase.html | ❌ | ✅ |
| onboarding-supabase.html | ❌ | ✅ |

→ Pages im **Hybrid-Modus** brauchen **beides**. Aktuell unmöglich ohne Code-Änderung.

---

## Warum ich nicht selbst löse

Sprint-Regel:
> NICHT antasten:
> * Hotfix-Files lib/prova-config.js + lib/data-store.js (HF-3,4,5 — funktioniert!)

→ `lib/prova-config.js` darf ich nicht ändern. Aber genau dort wäre der Fix richtig.

Andere Optionen wären Workarounds, alle mit Trade-offs:
1. **Inline-Bridge in dashboard.html** (4 Zeilen JS zwischen den beiden Imports): hacky, in jede Page kopieren
2. **Neues `prova-config-bridge.js`**: Ein zusätzliches File, weiterer Layer
3. **Dashboard nicht migrieren, K-2 abwarten**: Hybrid-Modus läuft weiter — saubere aber nicht-progressiv
4. **Hotfix anpassen** (Marcel-only): `lib/prova-config.js` macht `Object.assign(window.PROVA_CONFIG ||= {}, { SUPABASE_URL, ... })` statt direkter Assignment

---

## Was ich analysiert habe (Pre-Flight)

### dashboard.html (978 Zeilen)

Imports (Z.14-51):
```
prova-preise.js, paket-guard.js, prova-fetch-auth.js, auth-guard.js,
prova-notifications.js, prova-sanitize.js, prova-pseudo.js, prova-pseudo-send.js,
prova-account-gate.js, prova-config.js  ← ALT (AIRTABLE_BASE)
prova-status-hydrate.js, theme.js, nav.js, mobile.css
```

Plus Body-End (Z.953-961):
```
sw-register.js, global-search.js, auftragstyp.js, prova-context.js,
prova-error-handler.js, support-chat.js, onboarding-tour.js, trial-guard.js,
dashboard-logic.js  ← Hauptlogik
frist-guard.js, honorar-tracker.js
```

→ **20+ Imports**, viele mit Side-Effects auf `window.PROVA_CONFIG` oder `localStorage`.

### dashboard-logic.js (1199 LOC)

Top-of-File Z.13-14:
```js
var AT_BASE = (window.PROVA_CONFIG && window.PROVA_CONFIG.AIRTABLE_BASE) || 'appJ7bLlAHZoxENWE';
var AT_FAELLE = 'tblSxV8bsXwd1pwa0';
var AT_TERMINE = 'tblyMTTdtfGQjjmc2';
var AT_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';
```

→ Logic ist **deeply gegen Airtable gebaut**. Migration auf `dataStore.*` würde:
- 1199 LOC durchgehen
- Pro Karten-Query (KPI, Aufgaben, Termine, Rechnungen) Backend-Call ersetzen
- Tests pro Karte (Browser-Verifikation)

**Aufwand-Schätzung:** 4-6h fokussierte Arbeit + Tests. NICHT 60 Minuten autonom.

---

## Empfehlung an Marcel

### Variante A — Hotfix erweitern (15 Min, sauber)

`lib/prova-config.js` so anpassen dass es **merged** statt **assignt**:

```js
// LIB Variante (Merge-Pattern):
var existing = (typeof window !== 'undefined' && window.PROVA_CONFIG) || {};
var supabaseConfig = { SUPABASE_URL: '...', SUPABASE_ANON_KEY: '...', PLACEHOLDER: '...' };

if (typeof window !== 'undefined') {
    window.PROVA_CONFIG = Object.assign({}, existing, supabaseConfig);
}
```

→ Jetzt können HTML-Pages **beide Files** laden in beliebiger Reihenfolge, beides ist im `window.PROVA_CONFIG` verfügbar.

### Variante B — Eigener Sprint K-1.7-DASHBOARD (4-6h)

dashboard.html und dashboard-logic.js komplett refactoren wie der Pilot:
- Alle Karten via `dataStore.cockpit.*` (Master-Cockpit-View existiert bereits!)
- Aufgaben via `dataStore.auftraege.list({status:'aktiv', phase_aktuell:<x>})`
- Termine via `dataStore.termine.listUpcoming()`
- Rechnungen via `dataStore.dokumente.listInvoices({unpaidOnly:true})`

→ Eigener fokussierter Sprint, weil 4-6h fokussierte Arbeit + Browser-Tests pro Karte.

### Variante C — Bleibt im Hybrid (kein Aufwand)

Dashboard läuft weiter über Airtable-Stack bis K-2 Cutover. Pattern-Guide gilt: „Marcel migriert die 24 anderen Pages inkrementell, wenn er die Page anfasst." Dashboard ist eine davon.

---

## Was ich stattdessen mache

Ich überspringe Phase 4 (F2 Dashboard) und gehe weiter zu **Phase 5 (F3 K-2 Cutover-Plan)**, wie im Mega-Prompt vorgesehen:

> WENN dashboard.html zu komplex ist (>500 Zeilen, viele Inline-Skripte, kaputt):
> → STOP, NACHT-PAUSE-DASHBOARD.md schreiben mit:
>    - Was Du analysiert hast
>    - Warum es zu riskant ist
>    - Vorschlag für Marcel (z.B. eigener Sprint dafür)
> → Weiter mit Phase 5 (Feature F3)

→ Mega-Sprint #4 läuft weiter, F2 = NACHT-PAUSE statt grün.

---

## Marcel-Decision (für nächste Session)

```
[ ] Variante A: Hotfix lib/prova-config.js erweitern auf Merge-Pattern
    Aufwand: 15 Min · Impact: Hybrid-Pages können dataStore nutzen ohne Bruch

[ ] Variante B: Eigener Sprint K-1.7-DASHBOARD voll-refactor
    Aufwand: 4-6h · Impact: Dashboard ist 100% Supabase

[ ] Variante C: Hybrid bleibt, K-2 Cutover-Aufgabe
    Aufwand: 0 · Impact: Dashboard nutzt Airtable bis Cutover
```

**Empfehlung:** Variante A (Quick-Win) + Variante B in Sprint K-1.7 zur klaren Trennung.

---

🌙 **Phase 4 Dashboard-Migration: NACHT-PAUSE. Phase 5 startet.**
