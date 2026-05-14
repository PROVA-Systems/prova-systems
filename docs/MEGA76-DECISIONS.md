# MEGA⁷⁶ DECISIONS — Airtable Death Marathon

**Stand:** 2026-05-14
**Branch:** `feat/mega74-ein-system`
**Ziel:** 0× `airtable-wrapper-deprecated` + 0× `/.netlify/functions/airtable` in der Console aller Pages.

---

## Sub-Commit-Tabelle

| Teil | Commit | Was |
|---|---|---|
| A | `7193832` | 5 Schema-Bug-Fixes (hilfe/textbausteine support_tickets, import-assistent kontakte, kontakte-logic Read, vor-ort fristAlsTermin) + Adapter-Erweiterung (auditTrailInsert Enum-Mapping, logBriefGenerated PDFMonkey-Refs, logEinwilligung einwilligungen-Tabelle, sendSupportTicket, mapKontaktTyp) |
| B | `3da2e89` | 13 Brief-Pattern-HTMLs migriert (10 via Node-Bulk-Script + 3 Special-Cases: stellungnahme-gegengutachten, ergaenzung, schiedsgutachten, zpo-anzeige) |
| C | `64ab40d` | 5 Bridge-Files: prova-fetch-auth (Airtable-Reroute komplett raus), prova-auth-api (Dedup-Branch + provaFetchAirtable-Stub), prova-api-cache (airtableGet-Stub), prova-error-handler (atProxy-Stub), prova-notifications (atQuery-Stub) |
| D | `092712f` | 7 Single-Caller (404, akte-lightbox, app.html, benachrichtigungen, freigabe-queue, offline-gutachten, onboarding-schnellstart) |
| E | `ce1e33e` | netlify/functions/airtable.js → 410-Tombstone + mahnung-pdf.js (Server-Side-Netlify-Function) Airtable-Write raus |
| F | `e902d6c` | vor-ort.html queueMigrateMega76() purgt obsolete Airtable-Format-Einträge aus IndexedDB |
| G | (dieser Commit) | DECISIONS + MARCEL-CHECKLIST + sw.js bump + AIRTABLE-CALLER-AUDIT-Update |

---

## Final-Bilanz

| Metric | Vorher | Nachher |
|---|---:|---:|
| Live-Caller-Files mit `/.netlify/functions/airtable` | 25 | **0** |
| Live-Caller mit direktem `api.airtable.com` | 6 (Server-side) | **0** (Frontend) + 3 (Server-side deferred zu MEGA77) |
| Console-Warns `airtable-wrapper-deprecated` | 3-5× pro Page-Load | **0** |
| Wrapper-Files mit aktivem Airtable-Code | 5 (Bridge) | **0** (alle Stubs/Audited) |

---

## Final-Grep-Beleg

```
$ grep -rln "/.netlify/functions/airtable" . --include="*.js" --include="*.html" \
  --exclude-dir=_archiv --exclude-dir=node_modules --exclude-dir=tests \
  --exclude-dir=docs --exclude-dir=tools

# (empty output — 0 hits)

$ grep -rln "airtable-wrapper-deprecated" . --include="*.js" --include="*.html" \
  --exclude-dir=_archiv --exclude-dir=node_modules

# (empty output — 0 hits)
```

**Restbestand `airtable` (Generic-Grep) sind:**
- Kommentare/Deprecation-Marker in Stub-Files (`prova-airtable-api.js`, `prova-api.js`, `prova-sv-airtable.js`, `prova-fetch-auth.js`, etc.)
- Doku in `docs/` und `_archiv/`
- Server-Side-Netlify-Functions die `process.env.AIRTABLE_PAT` nutzen (ki-statistik, push-notify, team-interest) — fallen automatisch nach Marcel-ENV-Cleanup aus
- 1 Make-Webhook-Body-Key `airtable_id` in freigabe-logic.js Z.809 (kein Call, nur Payload-Field)

---

## Schema-Drift-Findings die in diesem Sprint zusätzlich entdeckt wurden

### 1. `support_tickets` (Anhang A.5) — Batch-2 hat 3 Pflichtfelder vergessen

In MEGA75-F-Batch2 schrieben `hilfe-logic.js` + `textbausteine-logic.js` mit `email`/`betreff`/`nachricht` (Airtable-Style). Echte Spalten sind `user_email`/`titel`/`beschreibung` (alle 3 NOT NULL ohne Default). Plus `status='offen'` war invalid — Enum kennt nur `neu|in_bearbeitung|wartet_auf_user|wartet_auf_dritte|geloest|closed|duplikat`. Fix: A.1+A.2 via neuem `sendSupportTicket()`-Helper.

### 2. `kontakte` (Anhang A.4) — `name` ist NOT NULL ohne Default

Batch-2-Import-Assistent versäumte das Pflichtfeld. Plus `kontakt_typ` heißt nur `typ`, `adresse_plz`/`adresse_ort` heißen `plz`/`ort` (ohne `adresse_*`-Prefix). Adresse-Prefix gibt's nur bei `adresse_strasse`/`adresse_nr`/`adresse_zusatz`. Fix: A.3.

### 3. `termine.typ`-Enum kennt kein `'frist'`

Batch-2 hat `vor-ort.html fristAlsTermin` als `termine.insert({typ:'frist'})` gebaut → 400 Enum-Error. Semantisch korrekt: Insert in `fristen`-Tabelle mit `frist_typ='gutachten-erstattung'`. Fix: A.5.

### 4. `audit_trail.action` ist Enum mit ~17 Werten

Batch-2 hat string-Actions wie `'sv.audit.407a'`, `'stat.jahresbericht'`, `'dsgvo.einwilligung'` insert'd → 400 Enum-Error. **Alle Batch-2-Audit-Writes haben silent gefailed.** MEGA76 `auditTrailInsert` mappt Legacy-Actions heuristisch auf valide Enum-Werte (`create`/`update`/`import`/etc.) und packt Original in `payload._action_orig`.

### 5. `einwilligungen`-Tabelle existiert tatsächlich (Anhang A.11)

Batch-2 hat sie als "defer'd" markiert und stattdessen audit_trail benutzt. MEGA76 nutzt jetzt die echte Tabelle mit Schema-korrekten Spalten (`typ`, `version`, `inhalt_hash`, `erteilt_at`).

---

## Defer-Items für MEGA77

### 1. Server-Side Airtable-Calls in 3 Netlify-Functions

- `netlify/functions/ki-statistik.js` Z.127
- `netlify/functions/push-notify.js` Z.445/451/459/467
- `netlify/functions/team-interest.js` Z.87

**Diese werden automatisch nicht-funktional** sobald Marcel `AIRTABLE_PAT`-ENV löscht (G.1). Fall-back: 401 von api.airtable.com. Code-Removal in MEGA77.

### 2. `prova-airtable-api.js` + `prova-api.js` + `prova-sv-airtable.js` Stubs

Können nach 14 Tagen Stable-Run komplett aus Repo entfernt werden. Frontend-Caller wurden in F-Batch2 schon migriert; die Files sind nur noch Compat-Layer für `<script>`-Loader in HTMLs. MEGA77 Cleanup: HTMLs die diese Scripts laden audited, Loader-`<script>`-Tags entfernen, dann Files löschen.

### 3. `freigabe-pending` Enum-Erweiterung

Per Spec D.5: `auftrag_status` kennt kein `freigabe-pending`. Aktuell nutzt `freigabe-queue.html` `phase_aktuell=5` als Filter — funktioniert, aber semantisch könnte ein expliziter Status-Wert klarer sein. **Defer** zu eigenem Schema-Migrations-Sprint.

### 4. CACHE_VERSION-Kommentar-Pattern

Per G.5 oben: ab MEGA77 nur 1-Satz-Versionsnotiz + Link auf DECISIONS-MD.

### 5. mahnung-pdf.js Server-Side Supabase-Write

In MEGA76 Teil E wurde nur der Airtable-Write entfernt. Frontend schreibt jetzt via `logBriefGenerated()` clientside. Optional in MEGA77: Server-Side-Persistierung in Netlify Function (Service-Role-Key) für robusteren Audit-Trail.

---

## Adapter-Erweiterungen (lib/prova-supabase-adapters.js, Teil A)

Neue Helper:
- `auditTrailInsert(row)` — Schema-konform mit `audit_action`-Enum-Mapping, `kategorie`/`source`/`entity_typ`/`entity_id`
- `logBriefGenerated(opts)` — erweitert mit `az`→`auftrag_id`-Lookup + PDFMonkey-Refs + Audit-Trail-Auto-Insert
- `logEinwilligung(opts)` — schreibt jetzt in echte `einwilligungen`-Tabelle (statt Audit-Hack)
- `sendSupportTicket(opts)` — DRY-Helper für hilfe/textbausteine/404
- `mapKontaktTyp(input)` — CSV-String → `kontakt_typ`-Enum-Map

---

## CACHE_VERSION

v3237 → **v3238-mega76-airtable-death**

---

## Marcel-Checklist

Siehe `docs/MEGA76-MARCEL-CHECKLIST.md` für:
- G.1 Netlify ENV-Löschung (12+ AIRTABLE_*-Variablen)
- G.2 Airtable-Base archivieren
- G.3 Make.com Connection deaktivieren
- G.4 10 Scenarios auditen
- G.5 sw.js-Pattern für MEGA77
- G.6 8-Punkte-Smoke-Test
