# MEGA⁷⁵-F Phase 2 — Airtable → Supabase Schema-Mapping

**Stand:** 2026-05-14
**Quellen:** `supabase-migrations/*.sql` + `supabase/migrations/*.sql` + bestehende Adapter in `lib/prova-supabase-adapters.js` + MEGA⁷⁰/⁷²-Migrations-Doku.

## Mapping pro Tabelle

### SCHADENSFAELLE (`tblSxV8bsXwd1pwa0`) → `auftraege`

| Airtable-Field | Supabase-Spalte | Notiz |
|---|---|---|
| `Auftragsnummer` | `az` | "Aktenzeichen" |
| `Schadensart` | `schadensart_label` | (NICHT `schadensart`) |
| `Schadensdatum` | `schadensstichtag` | DATE statt TEXT |
| `Datum` (created) | `created_at` | TIMESTAMPTZ |
| `Status` | `status` | Enum: aktiv/abgeschlossen/storniert |
| `Phase` | `phase_aktuell` | INTEGER 1-9 |
| `Typ` | `typ` | Enum: schaden/gericht/schied/beweis/baubegleitung/beratung |
| `Auftraggeber_Typ` | `auftraggeber_typ` | Enum: privat/gewerbe/gericht/versicherung/behoerde/andere |
| `Auftraggeber_Name` | `details.auftraggeber.name` | **jsonb** (kein eigenes column) |
| `Adresse` (Straße) | `objekt.adresse` | **jsonb** |
| `PLZ` | `objekt.plz` | **jsonb** |
| `Ort` | `objekt.ort` | **jsonb** |
| `Ortstermin_Datum` | `details.ortstermin_datum` | **jsonb** |
| `Beweisfragen` | `details.beweisfragen` | **jsonb** |
| `Workspace` | `workspace_id` | UUID (RLS-Pflicht) |

**Pflichtfilter:** `.is('deleted_at', null)` zusätzlich, `workspace_id` automatisch via RLS.

### SV (`tbladqEQT3tmx4DIB`) → `users` + `workspaces`

User-Daten verteilt auf zwei Tabellen.

| Airtable-Field | Supabase | Notiz |
|---|---|---|
| `Email` | `users.email` | gespiegelt aus `auth.users` |
| `Vorname` | `users.vorname` | |
| `Nachname` | `users.nachname` | |
| `Telefon` | `users.telefon` | |
| `Adresse` | `users.adresse_strasse` / `users.adresse_plz` / `users.adresse_ort` | Split |
| `Qualifikation` | `users.qualifikation_jsonb` | jsonb (Liste) |
| `Buero_Name` | `workspaces.buero_name` | An Workspace |
| `Buero_Adresse` | `workspaces.buero_adresse_strasse` / `_plz` / `_ort` | |
| `Paket` | `workspaces.paket` | Solo/Team/Founding |
| `Abo_Status` | `workspaces.abo_status` | trialing/active/past_due/canceled |
| `Trial_Endet_Am` | `workspaces.trial_endet_am` | DATE |
| `Founding_Member` | `users.founding_member` | BOOL |

**Lookup:** `.eq('id', user.id)` für users; workspace via `workspace_memberships`.

### KONTAKTE (`tblMKmPLjRelr6Hal`) → `kontakte`

| Airtable | Supabase | Notiz |
|---|---|---|
| `Name` | `nachname` | |
| `Vorname` | `vorname` | |
| `Firma` | `firma` | |
| `Email` | `email` | |
| `Telefon` | `telefon` | |
| `Adresse` | `adresse_strasse` | |
| `PLZ` | `adresse_plz` | |
| `Ort` | `adresse_ort` | |
| `Typ` | `kontakt_typ` | Enum |
| `Notiz` | `notizen` | |
| `Workspace` | `workspace_id` | RLS |

### TERMINE (`tblyMTTdtfGQjjmc2`) → `termine`

| Airtable | Supabase | Notiz |
|---|---|---|
| `Titel` | `titel` | |
| `Termin_Datum` | `datum` + `uhrzeit_von` | Split DATE + TIME |
| `Termin_Ende` | `uhrzeit_bis` | TIME |
| `Ort` | `ort` | |
| `Notiz` | `beschreibung` | (NICHT `notiz`!) |
| `Notizen_Nach_Termin` | `notizen_nach_termin` | |
| `Auftrag` | `auftrag_id` | FK |
| `Kontakt` | `kontakt_id` | FK |
| `Status` | `status` | Enum: geplant/bestaetigt/abgesagt/durchgefuehrt |
| `Workspace` | `workspace_id` | RLS |

### RECHNUNGEN (`tblF6MS7uiFAJDjiT`) → `dokumente WHERE typ LIKE 'rechnung%'`

| Airtable | Supabase | Notiz |
|---|---|---|
| `Rechnungsnummer` | `doc_nummer` | |
| `Betrag_Netto` | `betrag_netto` | |
| `Betrag_Brutto` | `betrag_brutto` | |
| `Mahnstufe` | `mahn_stufe` | (NICHT `mahnung_stufe`) |
| `Faellig_Am` | `faelligkeit` | (NICHT `faellig_am`!) |
| `Bezahlt_Am` | `bezahlt_at` | |
| `Status` | `status` | Enum: entwurf/versendet/ueberfaellig/bezahlt/storniert |
| `Typ` | `typ` | Enum: rechnung / rechnung_jveg / rechnung_stunden |
| `Auftrag` | `auftrag_id` | FK |
| `Kontakt` | `kontakt_id` | FK |
| `Workspace` | `workspace_id` | RLS |

### BRIEFE (`tblSzxvnkRE6B0thx`) → `dokumente WHERE typ='brief'`

| Airtable | Supabase | Notiz |
|---|---|---|
| `Brief_Typ` | `inhalt_strukturiert.brief_typ` | jsonb |
| `Betreff` | `betreff` | |
| `Inhalt_HTML` | `inhalt_text` | |
| `Empfaenger` | `kontakt_id` | FK |
| `Anrede` | `inhalt_strukturiert.anrede` | jsonb |
| `Auftrag` | `auftrag_id` | FK |
| `Status` | `status` | meist 'entwurf' nach Generate |
| `Workspace` | `workspace_id` | RLS |

### AUDIT_TRAIL (`tblqQmMwJKxltXXXl`) → `audit_trail`

| Airtable | Supabase | Notiz |
|---|---|---|
| `User_ID` | `user_id` | |
| `Workspace` | `workspace_id` | |
| `Aktion` | `action` | Enum |
| `Funktion` | `function_name` | |
| `Auftrag` | `auftrag_id` | FK |
| `Payload` | `payload` | jsonb |
| `Result` | `result` | TEXT (ok/fail/...) |
| `Timestamp` | `created_at` | TIMESTAMPTZ |

**Edge-Function** `audit-trail-write` existiert in Netlify (siehe `netlify/functions/audit-trail-write.js`) — Frontend könnte den Helper nutzen statt direkten Insert.

### SUPPORT_INBOX (`tblEb3A4dukGX8GFs`) → `support_tickets`

Migration `supabase-migrations/39_support_tickets_faq.sql` existiert. Mapping:

| Airtable | Supabase | Notiz |
|---|---|---|
| `Email` | `email` | |
| `Betreff` | `betreff` | |
| `Nachricht` | `nachricht` | |
| `Quelle` | `quelle` | z.B. '404'/'hilfe' |
| `User_ID` | `user_id` | FK nullable (Anon-Submits) |
| `Status` | `status` | offen/in_arbeit/erledigt |
| `Workspace` | `workspace_id` | RLS, nullable |

### NORMEN (`tblnceVJIW7BjHsPF`) → `normen`

Migration vorhanden. Standard 1:1.

### EINWILLIGUNGEN (`tblwgUQgtBWckPMHp`) → **NEU ZU BAUEN**

Keine entsprechende Supabase-Tabelle gefunden. Optionen:

- **(a)** Migration `??_einwilligungen.sql` mit Schema:
  ```sql
  CREATE TABLE einwilligungen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    dok_typ TEXT NOT NULL,
    version TEXT NOT NULL,
    hash TEXT NOT NULL,
    paket TEXT,
    session_id TEXT,
    erteilt_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- **(b)** `users.einwilligungen_jsonb`-Column als Array-Append.
- **(c)** No-Op: nur Console-Log, DSGVO-Pflicht riskant.

**Empfehlung:** (a) — eigene Tabelle für Audit-Trail-Compliance.
**STOP-Punkt:** Marcel muss zustimmen, bevor Phase 3 den Caller migriert.

### PILOT_LIST (`tblK7a3mBdsrxsrp5`) → **UNKLAR**

Es gibt `users.founding_member` (BOOL) — könnte ausreichen. Oder eigene `pilots`-Tabelle.

**STOP-Punkt:** Marcel-Klärung — soll Pilot-Anmeldung nur ein `users.founding_member=true`-Flag setzen, oder separate Tabelle?

## Tabellen ohne aktive Caller

`tblv9F8LEnUC3mKru`, `tblb0j9qOhMExVEFH`, `tblgECx0eyrpQTN8e`, `tbl4LEsMvcDKFCYaF`, `tblDS8NQxzceGedJO`, `tblFVcMxntQhusY2i` — werden in Helper-Files als Constants definiert, aber kein Live-`/v0/`-Fetch gefunden. Vermutlich Dead-Code aus früheren Sprints. Bei Wrapper-Tötung (Phase 4) automatisch obsolet.

## Adapter-Stand (vorhanden)

`lib/prova-supabase-adapters.js` bietet bereits:

- `getCurrentWorkspaceId()` → workspace_id-Lookup für Writes
- `kiProtokollRowToFields()` → ki_protokoll → Airtable-Style
- `typToFlow()` → 4-Flow-Mapping

**Erweitern um (Phase 3):**

- `auftraegeRowToAirtableFields()` und Inverse für UI-Code der noch Airtable-Field-Namen erwartet
- `kontakteRowToAirtableFields()` Inverse
- `dokumentRechnungRowToAirtableFields()`
- `dokumentBriefRowToAirtableFields()`
- `terminRowToAirtableFields()`

So bleibt der Render-Code unverändert (DRY-Pattern aus MEGA⁷²).
