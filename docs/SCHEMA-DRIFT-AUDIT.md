# Schema-Drift-Audit

**Stand:** 2026-05-13 (entstanden während MEGA⁷⁰-Phase-1.2.4 Auftrag-Insert-Hotfix)
**Status:** Audit-Doc für späteren Cleanup-Sprint (Phase 1.4 oder MEGA⁷²)
**Quelle:** Live-Test Marcel + Schema-Verifikation via supabase-migrations/

## Was ist Schema-Drift?

Frontend-Code referenziert Spalten/Felder, die im Supabase-Schema nicht (oder anders) existieren. Häufigster Grund: Legacy-Code aus Airtable-Zeit nutzt CapitalCase-Feldnamen und flache Adress-Spalten.

## Bekannte Drifts

### A — `auftraege` INSERT (BEHOBEN in Phase 1.2.4)

**Symptom:** Beim Submit des Auftrag-Wizards: `Could not find the 'adresse_ort' column of 'auftraege' in the schema cache` (400/403).

**Wurzel:** `app-logic.js:585-600` schrieb flache `adresse_strasse/plz/ort` und `auftraggeber_name/typ/schadenart/schadensdatum/ortstermin_datum/beweisfragen` Top-Level-Columns. Schema hat aber:
- `objekt jsonb` (Container für Adresse + Objektdaten)
- `details jsonb` (Container für typ-spezifische Details)
- `auftraggeber_typ enum` (privat/gewerbe/gericht/versicherung/behoerde/andere)
- `schadensart_label text` (nicht "schadenart")
- `schadensstichtag date` (nicht "schadensdatum")

**Fix:** Payload neu strukturiert (siehe Commit `feat(mega70-phase-1-2-4)`).

### B — `auftraege` READ-Paths (NOT YET FIXED, ~Phase 1.4)

`akte-logic.js`, `dashboard-logic.js`, `archiv-logic.js`, `freigabe-logic.js` lesen NICHT aus Supabase `auftraege`. Sie rufen Airtable-Proxy (`/.netlify/functions/airtable`) und erwarten Airtable-Field-Namen:

| Erwartet (Airtable, Legacy) | Soll (Supabase, neu) |
|---|---|
| `recFields.Aktenzeichen` | `row.az` |
| `recFields.Schadenart` / `.Schadensart` | `row.schadensart_label` |
| `recFields.Schaden_Strasse` + `.Ort` | `row.objekt?.adresse` + `row.objekt?.plz` + `row.objekt?.ort` |
| `recFields.Adresse` | `row.objekt?.adresse` |
| `recFields.Auftraggeber_Name` | `row.details?.auftraggeber?.name` |
| `recFields.Auftraggeber_Typ` | `row.auftraggeber_typ` (enum) + ggf. `details.auftraggeber.typ_label` |
| `recFields.KI_Entwurf` | `row.fachurteil_text` oder separate `documents`-Tabelle |
| `recFields.Schadensdatum` | `row.schadensstichtag` |

**Konsequenz für Phase 1.2.4 INSERT-Fix:** Auftrag wird korrekt in Supabase angelegt. Aber Redirect `/akte?id=<new-uuid>` → akte-logic.js sucht via Airtable → nicht gefunden → Fallback aus localStorage-Cache. User sieht „Akte nicht gefunden" oder leeren Cache-Fallback.

**Workaround:** User kann via `/archiv` neu anlegen + manuell auf `/akte?az=<az>` navigieren (archiv-logic.js lädt mit ähnlichem Pattern, evtl. ähnlich kaputt).

**Real-Fix:** Migration der 4+ Read-Paths von `provaFetch('/.netlify/functions/airtable', …)` zu `sb.from('auftraege').select(…).eq('id', …)`. Plus Field-Mapping wie oben. Plus Tests.

**Geschätzt:** 4-6 h sauber, mit Smoke-Tests pro Page.

### C — `onboarding-create-demo.js` JSONB-Keys (BEHOBEN in 1.2.4)

Demo-Auftrag hatte `objekt.adresse_strasse` + `.adresse_nr` statt schema-konventionell `.adresse` (kombiniert). PDF-Templates lesen `{{ objekt.adresse }}` → Demo-PDF wäre leer gewesen.

**Fix:** `adresse: 'Musterstraße 12'` + Test angepasst.

### D — Weitere ungeprüfte Drifts (Backlog)

Aus `MEGA70-NINJA-DIFF.md` §1.4 + Kartographie: **44 *-logic.js Files** rufen weiterhin `/.netlify/functions/airtable*`. Diese sind tot-code-Pfade (Regel 35a Wrapper blockiert 410), aber Live-Display geht durch sie. Ein systematischer Sweep braucht eigenen Sprint.

Wahrscheinlich ähnliche Drifts in:
- `rechnungen-logic.js` (Rechnungen-Tabelle)
- `termine-logic.js` (Termine-Tabelle)
- `kontakte-logic.js` (Kontakte, hat ABER echte `adresse_*`-Spalten — vermutlich OK)
- `kostenermittlung-logic.js`, `jveg-logic.js`, `wertgutachten-logic.js`

Audit-Befehl:
```bash
grep -rn "provaFetch.*airtable\|/.netlify/functions/airtable" --include="*.js" | grep -v "// " | wc -l
```

## Empfehlung für MEGA⁷² / Phase 1.4

1. **Schema-Mapping-Tabelle** (Airtable-Field → Supabase-Column) pro Tabelle dokumentieren
2. **Field-Resolver-Lib** (`lib/airtable-supabase-field-map.js`) als Brücke (kurzfristig)
3. **Sukzessive Migration** der *-logic.js: pro File ein PR, Tests pro File
4. **Acceptance:** `grep -c airtable lib/ *.js` muss auf 0 fallen (außer Migration-Scripts)

---

*Diese Audit-Doc wird in Phase 1.4 ausgebaut zu vollständiger Field-Mapping-Tabelle.*
