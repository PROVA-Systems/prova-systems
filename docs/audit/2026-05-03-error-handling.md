# Audit 18 — Error-Handling

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** Code-Review aller catch-Blöcke + Response-Strings

---

## Findings

### MEDIUM-1 — Stack-Traces in Responses
- ✅ keine Stack-Traces direkt im Body
- ⚠️ aber: `e.message` wird in einigen Functions exposed (z.B. `stripe-checkout.js:135`, `stripe-portal.js:81`)
- Manche `e.message`-Strings könnten Tabellen-Namen oder ENV-Var-Werte enthalten

**Beispiel (potentiell sensitiv):**
```js
return json(500, { error: e.message }); // könnte "AIRTABLE_PAT not set" exposen
```

**Fix-Pattern:**
```js
const trace = crypto.randomUUID().slice(0,8);
console.error('[function]', trace, e.stack);
return json(500, { error: 'Server error', trace_id: trace });
```

**Severity:** MEDIUM
**Status:** BACKLOG (Defense-in-Depth)

### MEDIUM-2 — DB-Fehler-Messages unsanitized
- Supabase-Error-Messages enthalten oft Tabellen + Spalten-Namen
- bei `error.message` direkt durchreichen: Schema-Disclosure

**Severity:** MEDIUM

### MEDIUM-3 — 404 vs 403 Inkonsistent
- DSGVO-Endpoints (`dsgvo-auskunft`, `dsgvo-loeschen`) sollten bei nicht-existentem User 404 (statt 403) returnen — verhindert User-Enumeration

**Severity:** MEDIUM (V13.3.1 ASVS)

### LOW-1 — Trace-IDs für Support fehlen
- Bei Error-Report kann User aktuell nicht „Trace-ID 8a3f9c12" liefern
- Sentry-Setup (Audit 21) würde das adressieren

**Severity:** LOW (siehe ASVS V16.1.3)

---

## Findings → BACKLOG

| ID | Severity | Titel | Action |
|---|---|---|---|
| EH-01 | MED | Generic-Errors für Public-API + Trace-IDs | BACKLOG (Sentry-Sprint) |
| EH-02 | MED | DB-Error-Messages sanitizen | BACKLOG |
| EH-03 | MED | 404 statt 403 bei Existenz-Info | BACKLOG |

---

*Audit 18 abgeschlossen 03.05.2026*
