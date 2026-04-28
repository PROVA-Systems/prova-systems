# Sprint K-1.1 + K-1.2 — MEGA-PROMPT für Claude Code

**Voraussetzung:** Sprint K-1.0 Browser-Roundtrip-Test ist GRÜN (alle 5 Buttons funktional, Console ohne rote Errors).

**Dauer-Schätzung:** 6-10h autonomer Wallclock-Lauf für ~25 Blöcke
**Modus:** Auto-Run mit Push nach jedem Block, NACHT-PAUSE bei Konflikt
**Branch:** Neuer Branch `sprint-k-1-1-und-k-1-2` (von `main` ausgehend, NICHT von `sprint-k-1-0-supabase-foundation` — das wird in K-1.5 Cutover gemerged)

---

## ANWEISUNG AN MARCEL

1. Erst K-1.0 Browser-Test grün machen (siehe SPRINT-K-1-0-COMPLETE.md)
2. Dann `sprint-k-1-0-supabase-foundation` in `main` mergen (oder Cherry-Pick wichtigster Commits)
3. Power-Settings auf "Niemals" (für Nachtlauf)
4. Diesen Prompt KOMPLETT (von "PROMPT START" bis "PROMPT ENDE") in Claude Code pasten
5. Schlafen 🌙

---

## PROMPT START

```
PROVA Sprint K-1.1 + K-1.2 — Migrations-Pipeline + Edge Functions (Mega-Sprint, autonomer Modus)

ROLLE:
Du bist Senior-Backend-Engineer für PROVA Systems (Vertical SaaS für 
ö.b.u.v. Bauschaden-Sachverständige). Du arbeitest autonom in einem 
Mega-Sprint mit ~25 Blöcken. Marcel schläft. Bei Konflikten oder 
Unsicherheit: STOP + NACHT-PAUSE.md schreiben, NICHT raten.

PFLICHT-LEKTUERE (zwingend in dieser Reihenfolge lesen):
1. CLAUDE.md im Repo-Root
2. SPRINT-K-1-0-COMPLETE.md (Foundation-Status)
3. /supabase-migrations/01_schema_foundation.sql (workspaces, workspace_users, profiles)
4. /supabase-migrations/02_schema_kerntabellen.sql (auftraege, kontakte, etc.)
5. /supabase-migrations/03_schema_artefakte_storage.sql (dokumente, fotos, audio)
6. /supabase-migrations/04_schema_kommunikation.sql (rechnungen, briefe, termine)
7. /supabase-migrations/05_schema_audit.sql (audit_log, ki_audit, feature_events)
8. /supabase-migrations/06_views_cockpit.sql (12 Views)
9. lib/supabase-client.js (Block 3 von K-1.0)
10. lib/data-store.js (Block 4 von K-1.0)
11. lib/template-registry.js (Block 5 von K-1.0)
12. PROVA-VISION-MASTER.md (4-Flow-Architektur, Tier-Strategie)
13. PROVA-REGELN-PERMANENT.md (Disziplin)

KONTEXT:
PROVA migriert von Hybrid-Stack (Airtable + Make.com + Netlify Identity 
+ Cloudinary) auf Voll-Supabase. K-1.0 hat die Foundation gelegt. Jetzt:

  K-1.1: Daten von Airtable nach Supabase migrieren (Dry-Run-First)
  K-1.2: Edge Functions bauen, die Make.com-Scenarios ablösen werden
        (8 Functions ersetzen 10 Make-Scenarios)

Zielzustand nach diesem Mega-Sprint:
- Alle Airtable-Daten als Dry-Run-Validierung in Supabase abbildbar
- Live-Migration-Skripte bereit (Marcel führt sie morgen mit Service-Role aus)
- 8 Edge Functions deployed in Supabase (Frankfurt)
- Health-Check-Page tools/test-edge-functions.html grün
- Migration-Runbook und Edge-Functions-Deploy-Doku im Repo

WICHTIG — SCOPE-DISZIPLIN:

IST scope:
✅ scripts/migrate/* (Migrations-Pipeline)
✅ supabase/functions/* (8 Edge Functions)
✅ supabase/functions/_shared/* (Shared-Code für Edge Functions)
✅ tools/test-edge-functions.html (Health-Check)
✅ docs/MIGRATION-RUNBOOK.md
✅ docs/EDGE-FUNCTIONS-DEPLOY.md

IST NICHT scope:
❌ Frontend-Änderungen (kommt in K-1.3 + K-1.4)
❌ Make.com-Deaktivierung (kommt in K-1.5)
❌ Airtable löschen / Daten verändern (NUR LESEN!)
❌ login.html / Netlify Identity anfassen
❌ sw.js Bump (passiert in K-1.5 Cutover)
❌ CLAUDE.md / masterplan-v2/ / NACHT-PAUSE.md (ohne Marcel-OK)
❌ /supabase-migrations/ Schema-Files ändern (nur lesen!)

============================================================
PHASE A: K-1.1 MIGRATIONS-PIPELINE (Blöcke A1-A14)
============================================================

ARCHITEKTUR-PRINZIP:
- Alle Migrations-Skripte sind Node.js-Skripte unter scripts/migrate/
- Jedes Skript liest aus Airtable (PAT/Token aus .env.local) und schreibt
  in Supabase (Service-Role-Key aus .env.local)
- Standard-Modus: --dry-run (validiert nur, schreibt nicht)
- Live-Modus: --live (schreibt wirklich, Marcel führt das manuell aus)
- Idempotenz: jedes Skript kann mehrfach ausgeführt werden
- Logging: jedes Skript schreibt nach scripts/migrate/logs/<datum>-<modul>.log

Marcel hat .env.local mit AIRTABLE_PAT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
Falls .env.local-Schlüssel fehlen: NACHT-PAUSE.md schreiben.

----------------------------------------
Block A1: Migration-Architektur + Setup
----------------------------------------
Datei: scripts/migrate/README.md
Inhalt:
- Reihenfolge der Migrations-Skripte (FK-Abhängigkeiten beachten!)
- Wie Dry-Run-Modus funktioniert
- Wie Live-Modus ausgeführt wird (Marcel-Workflow)
- Rollback-Strategie (per Skript: scripts/migrate/rollback.js TABLE)
- Logs-Verzeichnis
- ENV-Vars-Anforderungen

Datei: scripts/migrate/.gitignore
Inhalt: logs/, *.log, *.tmp

Datei: scripts/migrate/package.json (lokales package.json oder npm-Workspace?)
- Falls nicht nötig: in Repo-Root package.json einfügen mit "migrate"-Skript
- Dependencies: @supabase/supabase-js (schon da), node-fetch oder native fetch (Node 18+)

PRE-FLIGHT:
- Check ob Repo-Root package.json schon @supabase/supabase-js hat → ja (K-1.0)
- Check ob Node-Version >= 18 (für native fetch)
- Wenn unklar: NACHT-PAUSE.md

Commit: "K-1.1.A1: Migration-Pipeline Architektur + Setup"

----------------------------------------
Block A2: lib/airtable-reader.js
----------------------------------------
Datei: scripts/migrate/lib/airtable-reader.js
Zweck: Generischer Airtable-Connector mit:
- Pagination (Airtable-Limit 100 Records/Page)
- Filter-Support (z.B. nur Records mit sv_email gleich X)
- Rate-Limit-Throttling (5 req/sec pro Base = Standard)
- Error-Handling mit Retry (3× bei 429)

Interface:
  async function readAllRecords(baseId, tableId, options = {})
  async function readRecordById(baseId, tableId, recordId)
  async function getTableSchema(baseId, tableId)

ENV-Vars: AIRTABLE_PAT (Personal Access Token)
Base-ID: appJ7bLlAHZoxENWE (PROVA-Base, in Memory)

node --check verifizieren.

Commit: "K-1.1.A2: lib/airtable-reader.js mit Pagination + Throttling"

----------------------------------------
Block A3: lib/supabase-writer.js
----------------------------------------
Datei: scripts/migrate/lib/supabase-writer.js
Zweck: Supabase-Connector mit Service-Role-Key (RLS bypass für Migration):
- batchInsert(table, records) - Batch von 100 Records
- batchUpsert(table, records, conflictColumn) - mit Idempotenz
- countRows(table, filter) - für Validation
- existsByExternalId(table, external_id) - check vor Insert

Wichtig:
- Service-Role-Key NUR in lokalen Skripten verwenden (NIE in Frontend!)
- Workspace-ID muss bei jedem Insert gesetzt werden
- created_at / updated_at können aus Airtable übernommen werden (falls vorhanden)

ENV-Vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

node --check verifizieren.

Commit: "K-1.1.A3: lib/supabase-writer.js mit batch-write + Idempotenz"

----------------------------------------
Block A4: lib/transform.js
----------------------------------------
Datei: scripts/migrate/lib/transform.js
Zweck: Generische Field-Mapping-Helpers:
- mapAirtableRecord(record, fieldMap, options) - Field-Mapping nach Schema
- transformDate(value) - Airtable-Date → Postgres-timestamptz
- transformEnum(value, enumMap) - Airtable-Single-Select → Postgres-ENUM
- transformLink(linkedRecord, lookupTable) - Airtable-Linked-Record → UUID
- generateUuidFromAirtableId(airtableId) - deterministisch UUIDv5 (für Idempotenz)
- validateRecord(record, schema) - Pflichtfelder + Typen prüfen

Wichtig: deterministische UUID-Generation!
  Beispiel: rec1ABC2DEF3GHI4 → namespace "prova-migrate" + airtableId
  → konstante UUID wenn Skript mehrfach läuft = Idempotenz

node --check verifizieren.

Commit: "K-1.1.A4: lib/transform.js mit deterministischer UUID-Generation"

----------------------------------------
Block A5: 01-sachverstaendige.js (Workspaces + Workspace-Users)
----------------------------------------
Datei: scripts/migrate/01-sachverstaendige.js
Quelle: Airtable SACHVERSTAENDIGE (tbladqEQT3tmx4DIB)
Ziel: Supabase
  - workspaces (1 SV = 1 workspace, owner_email = sv_email)
  - workspace_users (SV als ersten User mit role='owner')

Logik:
- Lese alle SACHVERSTAENDIGE-Records
- Pro Record: erstelle workspaces-Record + workspace_users-Record
- workspace.tier = SV.tier (Solo/Team)
- workspace.created_at = SV.bestellungsdatum oder created
- workspace_users.role = 'owner', invited_at = workspace.created_at

Dry-Run-Output:
- Anzahl gelesen / Anzahl gemappt / Anzahl Validation-Errors
- Liste der Validation-Errors mit airtable-record-id
- Mock-Sample (3 Records als JSON-Output)

Live-Modus: real schreiben.

Commit: "K-1.1.A5: 01-sachverstaendige.js → workspaces+workspace_users"

----------------------------------------
Block A6: 02-kontakte.js (KONTAKTE → kontakte)
----------------------------------------
Datei: scripts/migrate/02-kontakte.js
Quelle: Airtable KONTAKTE
Ziel: Supabase kontakte

Field-Map:
- KONTAKTE.name → kontakte.name
- KONTAKTE.firma → kontakte.firma
- KONTAKTE.email → kontakte.email
- KONTAKTE.telefon → kontakte.telefon
- KONTAKTE.adresse → kontakte.strasse + plz + ort (parse!)
- KONTAKTE.typ → kontakte.kontakt_typ (ENUM: privat/firma/anwalt/versicherung/gericht)
- KONTAKTE.sv_email → workspace_id (lookup über workspaces.owner_email)

WICHTIG: workspace_id muss korrekt gesetzt werden — sonst RLS-Verletzung!

Commit: "K-1.1.A6: 02-kontakte.js → kontakte (workspace-scoped)"

----------------------------------------
Block A7: 03-schadensfaelle.js (→ auftraege)
----------------------------------------
Datei: scripts/migrate/03-schadensfaelle.js
Quelle: Airtable SCHADENSFAELLE (tblSxV8bsXwd1pwa0)
Ziel: Supabase auftraege

Field-Map (kritisch — siehe Architektur-Master):
- SCHADENSFAELLE.az → auftraege.aktenzeichen
- SCHADENSFAELLE.typ → auftraege.auftrag_typ (ENUM):
    'schaden' → 'schadensgutachten'
    'beweis' → 'beweissicherung'
    'ergaenzung' → 'ergaenzungsgutachten'
    'gegen' → 'gegengutachten'
    'wertgutachten' → 'wertgutachten'
    'beratung' → 'beratungsleistung'
    'baubegleitung' → 'baubegleitung'
    'schied' → 'schiedsgutachten'
- SCHADENSFAELLE.phase_aktuell (1-9) → auftraege.phase_aktuell
- SCHADENSFAELLE.status → auftraege.status (ENUM)
- SCHADENSFAELLE.auftraggeber_id (Airtable-Link) → auftraege.kontakt_id (UUID-Lookup)
- SCHADENSFAELLE.sv_email → workspace_id (lookup)
- SCHADENSFAELLE.created_at → auftraege.created_at
- SCHADENSFAELLE.updated_at → auftraege.updated_at

Validation:
- workspace_id muss existieren (sonst skip + Error-Log)
- kontakt_id muss existieren ODER NULL (für freistehende Aufträge)
- aktenzeichen muss eindeutig pro workspace sein

Commit: "K-1.1.A7: 03-schadensfaelle.js → auftraege"

----------------------------------------
Block A8: 04-eintraege.js (EINTRAEGE → diktate)
----------------------------------------
Datei: scripts/migrate/04-eintraege.js
Quelle: Airtable EINTRAEGE (formerly DIKTATE)
Ziel: Supabase diktate (+ ggf. diktat-segmente)

Schema prüfen in /supabase-migrations/02_schema_kerntabellen.sql.
Falls EINTRAEGE und diktate strukturell stark abweichen: NACHT-PAUSE.md.

Commit: "K-1.1.A8: 04-eintraege.js → diktate"

----------------------------------------
Block A9: 05-rechnungen.js (RECHNUNGEN → rechnungen + positionen)
----------------------------------------
Datei: scripts/migrate/05-rechnungen.js
Quelle: Airtable RECHNUNGEN
Ziel: Supabase rechnungen + rechnungs_positionen

JSON-Positionen aus RECHNUNGEN.positionen-Field auf rechnungs_positionen-Rows splitten.

Commit: "K-1.1.A9: 05-rechnungen.js → rechnungen + positionen"

----------------------------------------
Block A10: 06-audit-trail.js (AUDIT_TRAIL → audit_log)
----------------------------------------
Datei: scripts/migrate/06-audit-trail.js
Quelle: Airtable AUDIT_TRAIL
Ziel: Supabase audit_log

Bulk-Insert in Batches von 500 (große Datenmenge erwartet).

Commit: "K-1.1.A10: 06-audit-trail.js → audit_log"

----------------------------------------
Block A11: 07-ki-statistik.js (KI_STATISTIK → ki_audit)
----------------------------------------
Datei: scripts/migrate/07-ki-statistik.js
Quelle: Airtable KI_STATISTIK (tblv9F8LEnUC3mKru)
Ziel: Supabase ki_audit

Commit: "K-1.1.A11: 07-ki-statistik.js → ki_audit"

----------------------------------------
Block A12: run-all.js (Orchestrator)
----------------------------------------
Datei: scripts/migrate/run-all.js
Zweck: Alle Migration-Skripte in der korrekten Reihenfolge ausführen:
1. 01-sachverstaendige.js (workspaces zuerst — alle anderen brauchen workspace_id)
2. 02-kontakte.js
3. 03-schadensfaelle.js (braucht workspaces + kontakte)
4. 04-eintraege.js (braucht auftraege)
5. 05-rechnungen.js (braucht auftraege + kontakte)
6. 06-audit-trail.js (braucht workspaces + alle anderen)
7. 07-ki-statistik.js (braucht workspaces)

CLI-Args:
  --dry-run (default)
  --live (real schreiben)
  --only <skript> (nur eines ausführen)
  --skip-validation (für Speed)

Output: Final-Report mit Counts pro Tabelle.

Commit: "K-1.1.A12: run-all.js Orchestrator"

----------------------------------------
Block A13: validate.js (Counts-Vergleich)
----------------------------------------
Datei: scripts/migrate/validate.js
Zweck: Nach Live-Migration prüfen ob Counts stimmen.

Output:
  Tabelle              Airtable    Supabase    Diff      Status
  ───────────────────────────────────────────────────────────────
  SCHADENSFAELLE       1240        1240        0         ✅
  KONTAKTE             456         456         0         ✅
  RECHNUNGEN           890         888         -2        ⚠️  (nachprüfen)
  AUDIT_TRAIL          15234       15234       0         ✅
  ...
  
  ──────────────────────────────────
  Gesamt: 7/8 grün, 1 Warnung

Optional: --diff-detail (zeigt fehlende Records mit airtable-id).

Commit: "K-1.1.A13: validate.js Counts-Vergleich + Diff-Detail"

----------------------------------------
Block A14: docs/MIGRATION-RUNBOOK.md
----------------------------------------
Datei: docs/MIGRATION-RUNBOOK.md
Inhalt:
- Pre-Migration-Checklist (.env.local, Backups, etc.)
- Dry-Run-Ablauf für Marcel (Schritt für Schritt)
- Live-Migration-Ablauf (mit Sicherheits-Hinweisen)
- Validation-Schritte
- Rollback-Strategie:
  - Falls Migration fehlschlägt vor Cutover: TRUNCATE + retry
  - Falls Migration fehlschlägt nach Cutover: NACHT-PAUSE + Marcel + Snapshot-Restore
- Bekannte Fallstricke:
  - Airtable Linked-Records (manchmal Arrays, manchmal Single)
  - Date-Formate (Airtable ISO vs. Postgres timestamptz)
  - JSON-Felder (Airtable JSON-string vs. Postgres jsonb)

Commit: "K-1.1.A14: MIGRATION-RUNBOOK.md"

============================================================
AKZEPTANZ-GATE A — vor PHASE B prüfen
============================================================

Nach Block A14, BEVOR mit Block B1 weitergemacht wird, prüfen:

1. Alle 14 Skript-Files existieren in scripts/migrate/
2. node --check für ALLE Skripte = OK
3. Dry-Run mit `node scripts/migrate/run-all.js --dry-run` läuft durch
   (auch wenn keine echten Daten — Schema-Check und Connection-Check)
4. logs/ wurde angelegt
5. README + RUNBOOK existieren

WENN GATE-FAILS:
- Schreibe NACHT-PAUSE-K-1-1.md mit Detail-Beschreibung
- Pushe letzten sicheren Stand
- STOP — keine Phase B starten
- Warte auf Marcel

WENN GATE-GREEN:
- Commit "K-1.1.GATE: Phase A Akzeptanz-Gate grün, Phase B startet"
- Mit Phase B fortfahren

============================================================
PHASE B: K-1.2 EDGE FUNCTIONS (Blöcke B1-B11)
============================================================

ARCHITEKTUR-PRINZIP:
- Alle Edge Functions in supabase/functions/
- Sprache: TypeScript / Deno (Supabase-Standard)
- Shared-Code in supabase/functions/_shared/
- ENV-Vars werden in Supabase via `supabase secrets set` gesetzt 
  (Marcel macht das — du dokumentierst was er setzen muss)
- Deployment: Marcel via `supabase functions deploy <name>` 
  (du dokumentierst die Reihenfolge)
- Tests: tools/test-edge-functions.html als Health-Check

Marcel hat Supabase CLI installiert (Annahme — falls unklar: NACHT-PAUSE).

----------------------------------------
Block B1: _shared/ (Utils + CORS)
----------------------------------------
Dateien:
- supabase/functions/_shared/cors.ts
  - corsHeaders Constant
  - handleCors() Function für OPTIONS-Preflight
- supabase/functions/_shared/auth.ts
  - verifyJwt(req): liest JWT aus Header, returnt user oder 401
  - getWorkspaceId(user): liest workspace_id aus profiles
- supabase/functions/_shared/supabase.ts
  - createSupabaseClient(req): mit User-JWT (RLS aktiv)
  - createServiceClient(): mit Service-Role-Key (RLS bypass für System-Ops)
- supabase/functions/_shared/audit.ts
  - logAuditEvent(client, event_type, payload, workspace_id, user_id)
- supabase/functions/_shared/types.ts
  - Types für alle Request/Response-Schemas

deno check für jedes File.

Commit: "K-1.2.B1: _shared/ Utils (cors+auth+supabase+audit+types)"

----------------------------------------
Block B2: ki-proxy
----------------------------------------
Datei: supabase/functions/ki-proxy/index.ts
Zweck: OpenAI-Proxy mit serverseitiger Pseudonymisierung
Ersetzt: Netlify Function netlify/functions/ki-proxy.js

Flow:
1. JWT verifizieren
2. Request-Body parsen: { prompt, context, model, max_tokens }
3. Pseudonymisierung: Namen, Adressen, Aktenzeichen extrahieren und durch Tokens ersetzen
4. OpenAI-Call mit pseudonymisiertem Prompt
5. Response: Tokens zurückübersetzen
6. ki_audit-Eintrag schreiben (workspace_id, user_id, model, tokens_used, cost_estimate)
7. Response zurückgeben

Wichtige Regeln (aus PROVA-REGELN-PERMANENT.md):
- Modellnamen NIE in der Response (kein "gpt-4o" leaken)
- Konjunktiv II in KI-Hinweisen ("könnte" statt "ist")
- Halluzinations-Check vor Return

ENV-Vars (in Supabase secrets):
- OPENAI_API_KEY

Commit: "K-1.2.B2: ki-proxy mit Pseudo+Audit (ersetzt Netlify Fn)"

----------------------------------------
Block B3: whisper-diktat
----------------------------------------
Datei: supabase/functions/whisper-diktat/index.ts
Zweck: Audio-Upload → OpenAI Whisper → Text + Pseudonymisierung
Ersetzt: Netlify Function whisper-diktat.js + chunker

Flow:
1. JWT verifizieren
2. Audio-Datei aus Storage lesen (workspace_id-scoped Pfad)
3. Chunken falls > 25MB (Whisper-Limit)
4. Whisper-API call
5. Pseudonymisierung
6. Diktat in diktate-Tabelle schreiben
7. ki_audit-Eintrag
8. Response: { diktat_id, transcript_pseudo, segments }

ENV-Vars: OPENAI_API_KEY

Commit: "K-1.2.B3: whisper-diktat (Audio→Text mit Chunking)"

----------------------------------------
Block B4: pdf-generate
----------------------------------------
Datei: supabase/functions/pdf-generate/index.ts
Zweck: PDFMonkey-Generation für alle Templates
Ersetzt: Make-Scenario G3 (4790180)

Flow:
1. JWT verifizieren
2. Request: { template_key, payload, auftrag_id }
3. Template-ID aus template-registry lookup (server-side Copy von lib/template-registry.js)
4. PDFMonkey-API-Call mit Payload
5. Polling (max 30s, 1s-Interval) bis status='success'
6. PDF-URL holen
7. PDF in Supabase Storage speichern (workspace-scoped)
8. dokument-Eintrag in dokumente-Tabelle
9. audit_log-Eintrag
10. Response: { dokument_id, storage_url }

ENV-Vars: PDFMONKEY_API_KEY

Commit: "K-1.2.B4: pdf-generate (ersetzt Make G3)"

----------------------------------------
Block B5: send-email
----------------------------------------
Datei: supabase/functions/send-email/index.ts
Zweck: Email-Versand via Resend
Ersetzt: Make-Scenarios K2, T3, alle E-Mails über Gmail-Connection 5630924

Flow:
1. JWT verifizieren (oder Service-Token bei System-Mails)
2. Request: { to, subject, html, text, attachments? }
3. Resend-API-Call
4. Email-Log in audit_log
5. Response: { message_id }

ENV-Vars: RESEND_API_KEY (Marcel muss bei Resend registrieren — Doku schreiben)

Commit: "K-1.2.B5: send-email via Resend (ersetzt Make K2+T3)"

----------------------------------------
Block B6: stripe-webhook
----------------------------------------
Datei: supabase/functions/stripe-webhook/index.ts
Zweck: Stripe-Events empfangen
Ersetzt: Netlify Function stripe-webhook.js

Events:
- checkout.session.completed → workspace.tier setzen, abo_start
- customer.subscription.updated
- customer.subscription.deleted → workspace.tier='canceled'
- invoice.payment_succeeded
- invoice.payment_failed → Mahn-Pipeline triggern

Wichtig: Stripe-Signature-Verification!

ENV-Vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (NEU registrieren!)

Commit: "K-1.2.B6: stripe-webhook (ersetzt Netlify Fn)"

----------------------------------------
Block B7: lifecycle-trigger
----------------------------------------
Datei: supabase/functions/lifecycle-trigger/index.ts
Zweck: User-Lifecycle-Pipeline
Ersetzt: Make-Scenarios L3, L8, L10

Triggers:
- trial_start (von Stripe-Webhook)
- trial_endig_in_3_days (cron-getriggert)
- trial_ended
- abo_renewed
- abo_canceled

Aktionen:
- Email senden (über send-email)
- audit_log schreiben
- workspace.lifecycle_state updaten

Cron-Setup: Supabase pg_cron oder GitHub Actions (Doku schreiben).

Commit: "K-1.2.B7: lifecycle-trigger (ersetzt Make L3+L8+L10)"

----------------------------------------
Block B8: audit-write
----------------------------------------
Datei: supabase/functions/audit-write/index.ts
Zweck: Generisches Audit-Endpoint für Frontend
Ersetzt: Netlify Function prova-audit.js

Flow:
1. JWT verifizieren
2. Request: { event_type, payload, workspace_id }
3. audit_log + STATISTIKEN + ki_audit (je nach Event-Type)
4. Rate-Limiting: max 100 Events/Min pro User

Commit: "K-1.2.B8: audit-write (ersetzt prova-audit.js)"

----------------------------------------
Block B9: ical-feed
----------------------------------------
Datei: supabase/functions/ical-feed/index.ts
Zweck: iCal-Feed für Outlook/Google-Kalender-Subscription

Flow:
1. Token-basierte Auth (KEIN JWT — kommt von externem Kalender)
2. Token → workspace_id Lookup
3. Termine aus termine-Tabelle lesen (alle künftigen + 30 Tage Vergangenheit)
4. iCal-Format generieren
5. Response mit Content-Type: text/calendar

Cache-Header: max-age=900 (15 Min)

Commit: "K-1.2.B9: ical-feed (Outlook+Google-Subscription)"

----------------------------------------
Block B10: tools/test-edge-functions.html
----------------------------------------
Datei: tools/test-edge-functions.html
Zweck: Health-Check-Page für alle 8 Edge Functions

Layout (siehe tools/test-supabase-login.html als Vorbild):
- Gleicher Setup-Banner für Anon-Key
- Login-Box
- 8 Test-Buttons:
  1. Test ki-proxy (Mock-Prompt)
  2. Test whisper-diktat (kleine Audio-Datei)
  3. Test pdf-generate (BRIEF-Template, Mock-Daten)
  4. Test send-email (Test-Mail an marcel.schreiber@prova-systems.de)
  5. Test stripe-webhook (Mock-Event, mit Signatur)
  6. Test lifecycle-trigger (manueller Trigger)
  7. Test audit-write
  8. Test ical-feed (Token aus Profile lesen)

Output-Box pro Test mit Status (✅/⚠️/❌) + JSON-Response.

Commit: "K-1.2.B10: tools/test-edge-functions.html"

----------------------------------------
Block B11: docs/EDGE-FUNCTIONS-DEPLOY.md
----------------------------------------
Datei: docs/EDGE-FUNCTIONS-DEPLOY.md
Inhalt:
- Voraussetzung: Supabase CLI installiert
- Login: supabase login
- Project-Linking: supabase link --project-ref cngteblrbpwsyypexjrv
- Secrets setzen (Reihenfolge!):
  - supabase secrets set OPENAI_API_KEY=...
  - supabase secrets set PDFMONKEY_API_KEY=...
  - supabase secrets set RESEND_API_KEY=... (NEU)
  - supabase secrets set STRIPE_SECRET_KEY=...
  - supabase secrets set STRIPE_WEBHOOK_SECRET=...
- Deploy-Reihenfolge:
  1. _shared (kein Deploy nötig — wird mit anderen Functions deployed)
  2. ki-proxy
  3. whisper-diktat
  4. pdf-generate
  5. send-email
  6. stripe-webhook (Webhook-URL in Stripe-Dashboard updaten!)
  7. lifecycle-trigger
  8. audit-write
  9. ical-feed
- Health-Check: tools/test-edge-functions.html durchklicken
- Rollback: supabase functions delete <name>

Commit: "K-1.2.B11: EDGE-FUNCTIONS-DEPLOY.md Runbook"

============================================================
SPRINT-COMPLETE-DOKU
============================================================

Datei: SPRINT-K-1-1-und-K-1-2-COMPLETE.md
Inhalt nach gleichem Pattern wie SPRINT-K-1-0-COMPLETE.md:
- TLDR was Marcel morgen tun muss
- Akzeptanz-Check Tabelle (Phase A + Phase B)
- Architektur-Entscheidungen + Begründungen
- Was funktioniert / was nicht
- Bekannte offene Punkte (z.B. RESEND_API_KEY noch nicht registriert)
- Marcel-TODO-Liste sortiert

Commit: "K-1.1+1.2.DONE: Sprint-Complete-Doku"

============================================================
PRE-FLIGHT vor JEDEM Block
============================================================

1. Schema-Files kurz konsultieren falls Tabellen-Felder unklar
2. Bei ENUM-Werten: in /supabase-migrations/ den exakten Wert prüfen
3. Bei FK-Beziehungen: Lookup-Skript prüfen ob Quelle existiert
4. node --check (für JS) ODER deno check (für TS) vor Commit
5. Bei Zweifeln über Field-Mappings: NACHT-PAUSE.md statt raten

============================================================
KONFLIKT-PROTOKOLL (NACHT-PAUSE)
============================================================

Wenn ein Block nicht eindeutig lösbar ist:

1. STOP. Nicht raten.
2. Schreibe NACHT-PAUSE-K-1-1.md (oder NACHT-PAUSE-K-1-2.md je nach Phase) mit:
   - Block-Nummer
   - Was Du gebraucht hättest aber nicht eindeutig im Repo gefunden hast
   - Was Du als Vermutung notiert hast
   - Welche Entscheidung Marcel treffen muss
3. Letzten sicheren Stand committen + pushen
4. STOP — Mega-Sprint pausieren

Beispiele für Konflikt-Auslöser:
- EINTRAEGE-Schema unklar (Block A8)
- Service-Role-Key nicht in .env.local (Block A2)
- Resend-API-Key fehlt (Block B5) — DOKU schreiben aber Function kann gebaut werden
- Schema-Mismatch zwischen Airtable-Realität und Supabase-Schema

============================================================
WORKING-TREE-DISZIPLIN
============================================================

NICHT antasten ohne Marcel-OK:
- CLAUDE.md
- masterplan-v2/
- /supabase-migrations/ (Schema-Files lesen, nicht ändern!)
- login.html / Netlify Identity
- airtable.js (das wird in K-1.4 ersetzt)
- sw.js
- Make.com Scenarios (das wird in K-1.5 deaktiviert)
- alle 25+ HTML-Pages
- alle Logic-JS-Files (außer lib/* das schon in K-1.0 angelegt wurde)

============================================================
COMMITS-FORMAT
============================================================

Pattern: "K-1.X.YN: Beschreibung"
- X = 1 oder 2 (Phase)
- Y = A oder B (Phase A = K-1.1 Migration, Phase B = K-1.2 Edge Functions)
- N = Block-Nummer

Beispiele:
"K-1.1.A1: Migration-Pipeline Architektur + Setup"
"K-1.2.B5: send-email via Resend (ersetzt Make K2+T3)"
"K-1.1.GATE: Phase A Akzeptanz-Gate grün, Phase B startet"
"K-1.1+1.2.DONE: Sprint-Complete-Doku"

Push nach JEDEM Commit (Marcel sieht Fortschritt morgen früh).

============================================================
KEIN AUTOMATISCHER TAG
============================================================

Tag setzt nur Marcel nach Browser-Tests:
- v180-k-1-1-done (nach Live-Migration grün)
- v180-k-1-2-done (nach Edge-Functions-Health-Check grün)
- v180-k-1-1-und-1-2-done (zusammen, falls beides parallel grün)

============================================================
FINAL CHECK vor Sprint-Ende
============================================================

Nach allen Blöcken + GATE + Doku:
1. Branch sprint-k-1-1-und-k-1-2 ist gepusht
2. Alle ~25 Commits sind sichtbar in git log
3. SPRINT-K-1-1-und-K-1-2-COMPLETE.md liegt im Repo-Root
4. NACHT-PAUSE.md existiert NICHT (oder ist explizit dokumentiert)
5. Working-Tree ist clean (keine uncommitted changes)

============================================================
SCHLUSS-MELDUNG an Marcel (am Ende generieren)
============================================================

Format:
🌙 Sprint K-1.1 + K-1.2 Mega-Sprint durchgelaufen — STOP für Nacht-Pause

Branch: sprint-k-1-1-und-k-1-2 · Commits: <N> · Status: Code grün, wartet auf Marcels Tests

[Liste der Commits]

Akzeptanz: <X>/<Y> ✅, <Z> ⏳ Tests von Marcel

Marcel-TODO morgen früh:
1. Phase A: Dry-Run-Migration ausführen (siehe MIGRATION-RUNBOOK.md)
2. Phase A: Dry-Run-Output reviewen, dann Live-Migration
3. Phase A: validate.js Counts-Check
4. Phase B: Supabase-CLI-Login + Secrets setzen
5. Phase B: Edge Functions deployen
6. Phase B: tools/test-edge-functions.html durchklicken
7. Bei grün: Tag setzen v180-k-1-1-und-1-2-done

Bei roten Errors: <Liste typischer Verdächtigen>

Schlaf gut, Marcel. K-1 macht Fortschritte. 🌙
```

## PROMPT ENDE

---

## Was nach diesem Sprint passiert (Roadmap)

```
✅ Sprint K-1.0 — Foundation (8 Commits, grün, wartet auf Browser-Test)
🔄 Sprint K-1.1 — Migrations-Pipeline (~14 Blöcke)
🔄 Sprint K-1.2 — Edge Functions (~11 Blöcke)
⏳ Sprint K-1.3 — Frontend-Pilot Kurzstellungnahme (auf Supabase)
⏳ Sprint K-1.4 — Frontend-Refactor Rest (alle Pages auf Supabase)
⏳ Sprint K-1.5 — Cutover (Make deaktivieren, Netlify Identity entfernen)
```

---

## Marcel — Wie Du den Prompt morgen verwendest

1. **Browser-Test K-1.0 grün?** → ja: weiter | nein: erst K-1.0 fixen
2. **Tag setzen:** `v180-k-1-0-done`
3. **In `main` mergen:** `git checkout main && git merge sprint-k-1-0-supabase-foundation && git push`
4. **Neuer Branch:** `git checkout -b sprint-k-1-1-und-k-1-2`
5. **Power-Settings:** Standby Niemals
6. **Den Prompt von "PROMPT START" bis "PROMPT ENDE"** in Claude Code pasten
7. **Shift+Tab** für Auto-Accept
8. **Schlafen 🌙** — Claude Code läuft 6-10h durch

Morgens wachst Du auf zu:
- ~25 Commits gepusht
- 8 Edge Functions deployed-bereit
- Migration-Pipeline ready für Live-Run
- 2 Test-Pages für Tests

→ Du machst Tests, dann startest Du **K-1.3 Frontend-Pilot** mit dem nächsten Mega-Prompt.

---

🎯 **Marcel — Das ist ein echter Mega-Sprint. Nutze Claude Code's Speed maximal.**

🚀 **Schlaf gut. Morgen früh haben wir eine Menge fertig.**

*Ende SPRINT-K-1-1-und-K-1-2-MEGA-PROMPT.md*
