# MEGA⁷² Phase A — Read-Path Migration Audit

**Stand:** 2026-05-14 (entstanden vor MEGA72-Phase-A Migration-Sprint)
**Branch:** `feat/mega72-phase-a-read-path-migration` (von `fix/mega70-phase-1-2-4-auftrag-insert-schema`)
**Vorbedingung:** Phase 1.2.4 Auftrag-Insert-Fix (`d9a5086`) — branch-base
**Audit-Methode:** `grep -l "/.netlify/functions/airtable" --include="*.js" -r .` + Inhalts-Sample

---

## 1 — Discovery: Airtable-Caller-Inventar

**Total Files mit Airtable-Calls:** 44

```bash
grep -l "/.netlify/functions/airtable\|netlify/functions/airtable" --include="*.js" -rn . \
  | grep -v node_modules | grep -v "\.git/" | grep -v "^./docs/"
# → 44 Treffer
```

**Files mit CapitalCase-Field-Reads (`Schaden_Strasse`, `Aktenzeichen`, etc.):** 118
→ Größeres Universum als die 44 Airtable-Caller; viele Files lesen die Felder aus localStorage-Cache oder anderen Indirektionen.

## 2 — Datei → Tabelle Mapping mit Priorisierung

### P1 — Blockiert Live-Funktion nach 1.2.4-INSERT-Fix

| Datei | Liest Tabelle(n) | LOC | Komplexität | Notiz |
|---|---|---|---|---|
| **akte-logic.js** | `auftraege`, `eintraege`, `fotos`, `dokumente`, `fristen`, `termine` | 1143 | HOCH | Akte-Hub mit 12 Tabs. Nach 1.2.4-Insert sind neue Aufträge in Supabase, akte-logic liest aber via Airtable-Proxy. KRITISCH. |
| **dashboard-logic.js** | `auftraege`, `fristen`, `dokumente`, `ki_protokoll` | 1243 | HOCH | KPI-Tiles + Workflow-Karten. Zeigt nach 1.2.4 leere/falsche Werte. |
| **freigabe-logic.js** | `auftraege`, `ki_protokoll`, `eintraege` | 1331 | MITTEL | Workflow-Block — kann §6 nicht freigeben wenn Auftrag nicht ladbar. |
| **archiv-logic.js** | `auftraege` | 620 | NIEDRIG | List-View — neuer Auftrag erscheint nicht in Liste. |

### P1 schon migriert (Audit-Finding)

| Datei | Status | Beweis |
|---|---|---|
| **schadensfaelle-logic.js** | ✅ ALREADY-SUPABASE | nutzt `/.netlify/functions/list-auftraege` Edge-Function, nicht Airtable-Wrapper (Z.179) |
| **kontakte-supabase-logic.js** | ✅ ALREADY-SUPABASE | direct `sb.from('kontakte')`-Calls (Sprint K-1.4) |

### P2 — Wichtig aber nicht Pilot-blockierend

| Datei | Liest Tabelle(n) | LOC | Notiz |
|---|---|---|---|
| termine-logic.js | `termine` | ~375 | Kalender-Liste |
| rechnungen-logic.js | `dokumente` (typ=rechnung) | 817 | Rechnungs-Übersicht |
| mahnwesen-logic.js | `dokumente` (mahn_stufe) | 141 | Mahn-Workflow |
| briefvorlagen-logic.js | `dokumente` (typ=brief) | 691 | Brief-Hub |
| jahresbericht-logic.js | `auftraege`, `dokumente` | 411 | Reporting |
| statistiken-logic.js | `auftraege`, `ki_protokoll` | 259 | Stats-View |
| wertgutachten-logic.js | `auftraege` (typ=wertgutachten) | 1434 | Flow B Wizard |
| baubegleitung-logic.js | `auftraege`, `eintraege` | 753 | Flow D |
| beratung-logic.js | `auftraege` (typ=beratung) | 705 | Flow C |
| erechnung-logic.js | `dokumente` (ZUGFeRD) | 461 | E-Rechnung |
| gericht-auftrag-logic.js | `auftraege` (zweck=gericht) | 236 | Gerichtsauftrag |
| kontakte-logic.js | `kontakte` (legacy?) | 803 | evtl. Duplikat zu kontakte-supabase |

### P3 — Nice-to-have, später

| Datei | Notiz |
|---|---|
| einstellungen-logic.js | Profil-Update |
| import-assistent-logic.js | CSV-Import |
| onboarding-logic.js | Onboarding-Flow |
| hilfe-logic.js | FAQ-Page |
| schnelle-rechnung-logic.js | Quick-Bill |
| nav.js | Sidebar-Counts (3 Airtable-Aufrufe für Badges) |
| global-search.js | Cmd+K |
| textbausteine-logic.js / textbaustein-search.js | Bibliothek-Reads |
| vor-ort-logic.js | Ortstermin-Modus |
| effizienz-logic.js | Reporting |
| compliance-check.js / frist-guard.js | Compliance-Helper |

### Wrapper/Util-Libraries (NICHT migrieren — deprecation-target)

| Datei | Rolle |
|---|---|
| prova-airtable-api.js | Wrapper-Lib (zu deprecaten) |
| prova-api.js | Generic API-Wrapper |
| prova-api-cache.js | Cache-Layer für API-Wrapper |
| prova-sv-airtable.js | SV-Profil-Airtable-Helper |
| prova-fetch-auth.js | Auth-Bearer-Injection — bleibt (wird auch für Supabase verwendet) |
| prova-context.js, prova-audit.js, prova-error-handler.js, prova-notifications.js, prova-auth-api.js | Cross-cutting concerns — separat zu evaluieren |

### Test-Files (out of scope für Phase A)

- `tests/04-e2e-workflow.spec.js`
- `tests/05-security.spec.js`
- `tests/07-doppelklick.spec.js`

→ Test-Helper-Updates passieren NACH Migration in Phase B / mini-Sprint.

---

## 3 — Phase-A-Migrations-Plan

### Sprint-Output (realistisch innerhalb 5–7 h CC-Zeit)

| Schritt | Aufwand | Output |
|---|---|---|
| Track A (dieses Doc) | 30 min | ✅ Audit-Datei |
| Track B Field-Mapping-Doku | 30 min | `docs/CLEANUP-FIELD-MAPPING.md` |
| Migrate `akte-logic.js` (HOCH) | 90 min | Sub-Commit |
| Migrate `dashboard-logic.js` (HOCH) | 60 min | Sub-Commit |
| Migrate `freigabe-logic.js` (MITTEL) | 60 min | Sub-Commit |
| Migrate `archiv-logic.js` (NIEDRIG) | 30 min | Sub-Commit |
| Track D Wrapper-DEPRECATE | 15 min | Sub-Commit |
| Track F sw.js + Status | 15 min | Sub-Commit |

**Bei Zeit-Knappheit (Pragma):** Wenn ein File größer als geplant: nur Read-Funktion umstellen (ladeRecord / loadAkte / etc.) + die unmittelbaren Field-Access-Stellen. Stress-Tests + Polish in Phase B-mini.

### Pattern pro File (Inkrementell, mit Fallback)

Statt eines komplett-Switch nutzen wir ein **Dual-Read-Pattern** während Migration:

```js
// Vorher: Airtable-Direct
const fall = (await provaFetch('/.netlify/functions/airtable?...')).records[0].fields;
const adresse = fall.Schaden_Strasse;

// Nachher: Supabase-Direct mit Defensive-Fallback für alte Datenquellen
const { data: fall, error } = await sb.from('auftraege')
  .select('id, az, titel, status, objekt, details, schadensart_label, ...')
  .eq('id', auftragId).maybeSingle();
const adresse = fall?.objekt?.adresse
              || fall?.objekt?.strasse        // Variante 1
              || fall?.Schaden_Strasse         // Airtable-Cache-Fallback (kurz vor Removal)
              || '—';
```

Das Fallback in der Anzeige-Logik ist wichtig damit alte Aufträge (vor 1.2.4) nicht weiß-leer angezeigt werden.

---

## 4 — Out-of-Scope (Marcel-Decision)

Während des Audits identifiziert, NICHT Teil von Phase A:

1. **`akte.html` 12-Tab-Bar** — die einzelnen Tabs nutzen verschiedene Edge-Functions (eintraege-list, anhaenge-list, audit-narrative-v1). Diese sind schon Supabase-basiert. Migration betrifft nur das `recFields`-Pattern in `ladeRecord()` und `renderAkte()`.
2. **Airtable-Wrapper-Function selbst** — bleibt als 410-Response-Stub. Echtes Delete in Phase B (nach 7-Tage-Monitoring).
3. **`kontakte-logic.js` vs `kontakte-supabase-logic.js`** — eines der beiden ist Tot-Code. Audit + Decommissioning in Phase B.
4. **Test-File-Updates** — `tests/04/05/07-*.spec.js` patchen wenn Migration fertig.
5. **Schema-Extensions** — falls Phase A entdeckt dass ein Frontend-Feld keine echte Spalte hat (z.B. `ortstermin_datum`), wird das in `docs/SCHEMA-DRIFT-AUDIT.md` als "BLOCKED, needs schema-extension" markiert und Marcel entscheidet.

---

## 5 — Acceptance Criteria

- ✅ `docs/MEGA72-PHASE-A-AUDIT.md` (dieses File) committed
- ✅ `docs/CLEANUP-FIELD-MAPPING.md` mit allen Mappings committed
- ✅ Mindestens 3 P1-Files migriert (akte/dashboard/freigabe als Minimum)
- ✅ Wrapper-Function als DEPRECATED markiert
- ✅ sw.js v3205-mega72-phase-a-read-paths
- ✅ Sub-Commits einzeln pushbar
- ✅ `node --check` für jeden modifizierten Logic-File grün

---

*Audit done. Migration begins next.*
