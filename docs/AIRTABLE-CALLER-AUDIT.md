# MEGA⁷⁵-F Phase 1 — Airtable Caller-Inventur

**Stand:** 2026-05-14
**Methodik:** `grep -rln "/.netlify/functions/airtable\|prova-sv-airtable\|/airtable?"` über alle `*.js`/`*.html`, exklusive `_archiv`, `node_modules`, `tests`, `docs`, `tools`.

## Zusammenfassung

- **49 Caller-Files** mit aktiven Airtable-Calls
- **89 Fetch-Lines** insgesamt
- **8 aktiv genutzte Airtable-Tabellen** (von 11 in der Base verlinkten)
- **3 Tabellen-IDs** nur in `admin/*.html` und Helpers referenziert, nie live-aufgerufen

## Aktive Tabellen-IDs (live-genutzt)

| Airtable-ID | Logischer Name | Wer ruft auf |
|---|---|---|
| `tblSxV8bsXwd1pwa0` | **SCHADENSFAELLE/FAELLE** | akte-*, app-logic, briefvorlagen-logic, fachurteil-logic, freigabe-queue, gericht-auftrag-*, global-search, import-assistent, nav, offline-gutachten, prova-airtable-api, prova-api, prova-context, prova-notifications, vor-ort-*, zpo-anzeige |
| `tbladqEQT3tmx4DIB` | **SV (User-Profil)** | app-logic, app.html, einstellungen-logic (×8), onboarding-logic, onboarding-schnellstart, prova-airtable-api, prova-api, prova-context, prova-sv-airtable |
| `tblMKmPLjRelr6Hal` | **KONTAKTE** | app-logic, import-assistent, kontakte-logic, nav, prova-airtable-api, prova-api |
| `tblyMTTdtfGQjjmc2` | **TERMINE** | akte-logic, nav, prova-airtable-api, prova-api, prova-context, prova-notifications, vor-ort.html |
| `tblF6MS7uiFAJDjiT` | **RECHNUNGEN** | mahnung-check, nav, prova-airtable-api, prova-api, prova-context, prova-notifications, schnelle-rechnung-logic |
| `tblSzxvnkRE6B0thx` | **BRIEFE** | abnahmeprotokoll, akte-logic, auftrag-ablehnung, begehungsprotokoll, briefvorlagen-logic, datenschutz-einwilligung-gericht, prova-airtable-api, prova-api, rechnungskorrektur, stellungnahme-gegengutachten (×2), terminabsage, vollmacht-sv, widerspruch-gegengutachten, zwischenbericht |
| `tblEb3A4dukGX8GFs` | **SUPPORT_INBOX** | 404.html, hilfe-logic, textbausteine-logic |
| `tblqQmMwJKxltXXXl` | **AUDIT_TRAIL** | app-logic, prova-audit, prova-api, prova-notifications |
| `tblwgUQgtBWckPMHp` | **EINWILLIGUNGEN** | onboarding-logic |
| `tblK7a3mBdsrxsrp5` | **PILOT_LIST** | onboarding-logic, admin-dashboard-logic |
| `tblnceVJIW7BjHsPF` | **NORMEN** | (nur in admin-Verzeichnis + helpers, kein lebendiger Frontend-Call gefunden) |
| `tblv9F8LEnUC3mKru`, `tblb0j9qOhMExVEFH`, `tblgECx0eyrpQTN8e`, `tbl4LEsMvcDKFCYaF`, `tblDS8NQxzceGedJO`, `tblFVcMxntQhusY2i` | div. Helper-Referenzen | nur in `prova-api.js`/`prova-audit.js`/`prova-notifications.js`/`prova-context.js` als Constants — Live-Caller-Sweep zeigt sie nicht im /v0/-Pfad |

## Caller-Files (Top → Bottom nach Call-Count)

| # | Datei | Calls | Tabellen | Pfad-Typ |
|---|---|---:|---|---|
| 1 | `einstellungen-logic.js` | 8 | SV | Read+Write (Profil) |
| 2 | `prova-context.js` | 7 | FAELLE, SV, TERMINE, RECHNUNGEN, +1 | Read (Sidebar-Context) |
| 3 | `app-logic.js` | 6 | FAELLE, SV, KONTAKTE, AUDIT_TRAIL | Read+Write (Wizard, Toolbox) |
| 4 | `onboarding-logic.js` | 5 | SV, EINWILLIGUNGEN, PILOT_LIST | Write (Setup) |
| 5 | `honorar-tracker.js` | 4 | (wrapper-call ohne explizite Tabelle in dieser Zeile) | Write |
| 6 | `vor-ort.html` | 3 | FAELLE, TERMINE | Read+Write |
| 7 | `prova-fetch-auth.js` | 3 | (wrapper-Logic) | Bridge-Layer |
| 8 | `prova-audit.js` | 3 | AUDIT_TRAIL + 2 | Write |
| 9 | `import-assistent-logic.js` | 3 | KONTAKTE, FAELLE | Write |
| 10 | `stellungnahme-gegengutachten.html` | 2 | BRIEFE | Write (Brief-Log) |
| 11 | `prova-auth-api.js` | 2 | (wrapper) | Bridge |
| 12 | `onboarding-schnellstart.html` | 2 | SV | Write |
| 13 | `ergaenzung.html` | 2 | (wrapper) | Write |
| 14 | `briefvorlagen-logic.js` | 2 | FAELLE, BRIEFE | Read+Write |
| 15 | `akte-logic.js` | 2 | FAELLE, BRIEFE, TERMINE | Read+Write |
| 16-49 | je 1 Call | div. | Write meistens AUDIT_TRAIL/BRIEFE-Logging | trivial |

## Briefe-Klasse (16 HTMLs, jeweils 1 Call, fast identisch)

Diese HTMLs sind **Template-Pages** mit am Ende einem `provaFetch('/.netlify/functions/airtable', { method: 'POST', path: '/v0/.../tblSzxvnkRE6B0thx', payload: {...} })` der die Brief-Generierung in BRIEFE loggt. Bulk-killable:

- `abnahmeprotokoll-formal.html`
- `auftrag-ablehnung.html`
- `begehungsprotokoll.html`
- `datenschutz-einwilligung-gericht.html`
- `ergaenzung.html` (×2)
- `rechnungskorrektur.html`
- `schiedsgutachten.html` (wrapper-load only)
- `stellungnahme-gegengutachten.html` (×2)
- `terminabsage.html`
- `vollmacht-sv.html`
- `widerspruch-gegengutachten.html`
- `widerspruch-gutachten.html` (wrapper-load only)
- `zpo-anzeige.html` (FAELLE-Read)
- `zwischenbericht.html`

**Behandlung Phase 3:** Pattern-Replace nach `sb.from('dokumente').insert({ typ:'brief', workspace_id, betreff, inhalt_text, ... })`. Vermutlich 5-10 Min/File.

## Heavy Logic-Files (Real Migration-Work)

Die Aufwand-Schwerpunkte (Phase 3) sind diese 15 Files:

| Datei | Komplexität | Schätzung |
|---|---|---|
| `einstellungen-logic.js` | 8 Calls, Profil-Read+Write, Mapping zu users + workspaces | 60-90 min |
| `prova-context.js` | 7 Calls, Sidebar-Aggregation, multi-Table-JOIN | 60-90 min |
| `app-logic.js` | 6 Calls, Wizard + Toolbox + AUDIT | 45-60 min |
| `onboarding-logic.js` | 5 Calls, EINWILLIGUNGEN-Tabelle muss in Supabase neu | 45-90 min (neue Tabelle?) |
| `honorar-tracker.js` | 4 Calls, JVEG-Logic | 30-45 min |
| `vor-ort.html` + `vor-ort-logic.js` | 4 Calls verteilt | 45 min |
| `import-assistent-logic.js` | 3 Calls | 30 min |
| `prova-audit.js` | 3 Calls, AUDIT_TRAIL | 20 min (Helper anpassen) |
| `briefvorlagen-logic.js` | 2 Calls | 20 min |
| `akte-logic.js` | 2 Calls | 20 min |
| `nav.js` | 1 Call (Multi-Table-Dashboard-Count) | 30 min |
| `prova-notifications.js` | 1 Multi-Table | 30 min |
| `prova-airtable-api.js`, `prova-api.js`, `prova-sv-airtable.js` | Wrapper, killen nach Phase 3 | 20 min Tötung |
| `prova-fetch-auth.js` | Bridge-Branch raus | 15 min |

**Heavy-Subtotal:** ~9-13h

## Trivial / Wrapper-Pattern (34 Files)

- 16 Brief-Template-HTMLs (siehe oben) → 5-10 min/File = 1.5-3h
- 18 weitere Single-Call-Files (kontakte-logic, gericht-auftrag-*, fachurteil-logic, global-search, mahnung-check, schnelle-rechnung-logic, textbausteine, akte-lightbox, fristen-/freigabe-/onboarding-related, offline-gutachten, 404, app.html, benachrichtigungen, hilfe) → 10-20 min/File = 3-6h

**Trivial-Subtotal:** ~4.5-9h

## Geschätzter Gesamtaufwand Phase 3

**13.5h - 22h** real Code-Migration + node-Check + per-File-Commit. Plus Phase 4 (Wrapper-Tötung, 30 min) + Phase 5 (Bug-Fixes, 1-2h) + Phase 6 (Polish, 30 min).

## Bemerkungen

- **Wrapper-Layer ist tief verschachtelt**: `prova-fetch-auth.js` → `prova-auth-api.js` → `prova-airtable-api.js` / `prova-api.js` / `prova-sv-airtable.js` → eigentlicher Caller. Migration muss bottom-up sein, sonst brechen Caller die noch durch die Wrapper laufen.
- **EINWILLIGUNGEN existiert NICHT in Supabase**: Phase 3 muss entweder eine neue Tabelle `einwilligungen` anlegen (Migration) ODER `onboarding-logic.schreibeEinwilligung()` in einen sicheren No-Op verwandeln (Daten gehen verloren).
- **AUDIT_TRAIL ist seit MEGA⁷³ in Supabase live** (`audit_trail`-Tabelle existiert) — Migration der Audit-Writes ist 1:1.
- **PILOT_LIST**: `pilots`-Tabelle oder `users.is_pilot`-Boolean — Schema-Klärung nötig.
