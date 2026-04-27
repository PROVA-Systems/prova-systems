# CHANGELOG-MASTER — ERGÄNZUNG für Sprint 04f + Sprint K

**Anweisung an Marcel:**
Diese Blöcke werden **OBEN** in `CHANGELOG-MASTER.md` eingefügt — über dem bestehenden „Sprint 04 — P5 Reste + Seiten-Bugs"-Eintrag. Format ist konsistent zu bestehenden Blöcken: neueste Sprints zuoberst.

---

## Sprint K-1 — Voll-Supabase-Migration (gestartet)

**Tag:** *(in Vorbereitung — wird in K-1.5 Cutover gesetzt: `v300-supabase-foundation`)* · **Stand:** 27.04.2026 · **Sub-Sprint:** K-1.0 Foundation

### Strategische Entscheidungen

**Marcel-Pivot 27.04.2026:** „Pilot kann warten — erst bauen wir richtig fertig". Time-Pressure auf Pilot raus, Konsolidierung+Quality first.

**Voll-Supabase-Refactor entschieden** statt Hybrid-System. Begründung: 14k€/Jahr Einsparung ab 50 SVs, EU-DSGVO sauber, pgvector für KI-RAG, Architektur-Kohärenz.

**Make.com raus** → Edge Functions only. Begründung: PROVA hat keinen echten Workflow-Use-Case, alle 10 Scenarios sind klassische Code-Tasks. T3 Termine + F1 Stripe-Webhook waren in Make ohnehin nie aktiv. Make-Quirks (`isinvalid`, manuelle Aktivierung, Account vs `__IMTCONN__`) wegen Code lösbar. **Kein Wechsel zu n8n** — laterale Migration ohne strukturellen Gewinn.

**Resend statt Gmail-via-Make** — $20/Mo bei 50k Mails, Audiences integriert für späteres Email-Marketing, Bounces/Complaints automatisch in `email_log`-Tabelle.

**Cloudinary raus** → Supabase Storage. EXIF-Strip in Edge Function, RLS auf Files, kein Vendor-Lock.

**Forced Re-Consent für AGB/DSE/AVV** — DSGVO Art. 7 Pflicht. Beim Onboarding direkt abgehakt; neue Versionen zeigen Popup beim nächsten Login mit Pflicht-Zustimmung. View `v_user_pending_einwilligungen` + Function `record_einwilligung()` integriert in Patch 06.

### Schema-Setup komplett (heute)

**Supabase-Projekt aktiviert:**
- Project-Ref: `cngteblrbpwsyypexjrv`
- Region: Frankfurt (EU)
- Plan: Free (Pro-Upgrade vor Pilot)
- Postgres 17.6, pgvector 0.8.0

**6 SQL-Schema-Files deployed (61 Tabellen total):**

- **Phase 1 — Foundation** (6 Tabellen): `workspaces`, `users`, `workspace_memberships`, `user_sessions`, `audit_trail`, `notifications`
- **Phase 2 — Kerngeschäft** (14 Tabellen): `auftraege` (universal mit JSONB), `kontakte`, `auftrag_kontakte`, `auftrag_phasen`, `ortstermine`, `anknuepfungstatsachen`, `befunde`, `messwerte`, `messgeraete`, `ursachen_hypothesen`, `sanierungspositionen`, `auftrag_normen`, `eintraege`, `az_sequences`
- **Phase 3 — Artefakte+Storage** (8 Tabellen): `dokumente` (universal), `dok_sequences`, `dokument_positionen`, `fotos`, `audio_dateien`, `anhaenge`, `termine`, `notizen` + 3 Storage-Buckets (sv-files, sv-public, sv-system)
- **Phase 4 — Komplett-Finale** (26 Tabellen): Wissens-Bibliotheken (`normen_bibliothek` mit pgvector, `textbausteine`, `ki_prompt_templates`, `positionen_bibliothek`, `wissen_diagnostik`), KI-Tracking (`ki_protokoll`, `ki_lernpool`, `ki_feedback`), Migration (`import_jobs`, `import_records`, `workflow_errors`), System (`push_subscriptions`, `feature_flags`, `system_health`), Admin-Cockpit (`support_tickets` mit Browser-Diagnose, `support_replies`, `support_attachments`, `impersonation_log`, `feature_events`, `churn_reasons`), Compliance (`einwilligungen`, `rechtsdokumente`, `versicherungs_partner`, `dokument_templates`, `empfehlungen`, `leads_pipeline`)
- **Patch 05 v2** — Billing + Master-Cockpit: 4 neue Spalten in `workspaces` (abrechnungs_intervall, kuendigung_zum_am, mrr_eur_snapshot, naechste_zahlung_am), 5 Cockpit-Views (v_cockpit_mrr, v_cockpit_master_uebersicht, v_cockpit_kunden_liste, v_cockpit_monats_verlauf, v_cockpit_jahres_verlauf), Yearly-Plan-Support
- **Patch 06 v3** — Final-Lückenschluss + Forced Re-Consent: 7 Tabellen (`stripe_events`, `email_log`, `workspace_invitations`, `onboarding_progress`, `api_keys`, `tags_global`, `bookmarks`), 5 Helper-Functions, Trigger für Auto-Notification bei neuem Rechtsdokument

**Total deployed:** 61 Tabellen, 24 Helper-Functions, 12 Cockpit-Views (8 KPI + 4 Time-Series), pgvector aktiv, RLS scharf überall.

### Founder-Setup

- Email: `marcel.schreiber@prova-systems.de` (über IONOS angelegt)
- Test-User: `marcel_schreiber891@gmx.de` als „normaler SV" für UX-Tests
- Beide automatisch via `handle_new_user()` Trigger: User-Eintrag + Solo-Workspace + Trial-Status (14 Tage) + Owner-Membership + Audit-Trail
- `is_founder = TRUE` nur für `marcel.schreiber@`
- Postfach-Architektur final: 5 Slots = `marcel.schreiber@`, `support@`, `noreply@`, `kontakt@`, `rechnungen@` — `admin@` entfernt zugunsten `marcel.schreiber@`

### Token-Rotation durchgeführt

- Alter Personal Access Token (`sbp_4bd1...`) revoked
- Alter Service Role Key (`sb_secret_ddg2...`) regeneriert
- MCP-Connection mit neuem PAT re-connected, Read-Only-Modus aktiv

### Lessons-Learned aus Schema-Refactor

- **CREATE OR REPLACE VIEW kann Spalten-Namen nicht ändern** → DROP VIEW + CREATE neu (Patch 05 v1 → v2 Fix)
- **`unaccent()` nicht IMMUTABLE** → in GENERATED-Columns nur `lower()` ohne unaccent (Patch 06 v1 → v2 Fix)
- **DROP TRIGGER auf nicht-existenter Tabelle crasht** trotz IF EXISTS → DO/EXCEPTION-Blocks (Patch 06 v2 → v3 Fix)
- **PostgreSQL Transaction-Rollback automatisch bei Error** → DB konsistent
- **Idempotente Pattern als Standard:** `CREATE IF NOT EXISTS`, `DROP IF EXISTS`, `DO $$ BEGIN ... EXCEPTION END $$`

### Sprint-K-1-Roadmap (6 Sub-Sprints, 6-7 Arbeitstage)

```
K-1.0  Foundation                      6-8h    NEXT (heute Abend / morgen früh)
       └─ Supabase-Client + Auth + Frontend-Lib-Skeleton (parallel zu altem System)
K-1.1  Migrations-Pipeline             8-12h
       └─ Skript Airtable → Supabase, alle ~30 Tabellen, Cloudinary → Storage
K-1.2  Edge Functions (8 Stück)        6-8h
       └─ pdf-generate, email-send, user-lifecycle, admin-notify,
          termin-reminder, stripe-webhook, mahnung-trigger, dsgvo-handler
K-1.3  Frontend-Pilot Kurzstellungn.   4-6h
       └─ Erste Page komplett auf Supabase + Auto-Save Realtime
K-1.4  Frontend-Refactor Rest          12-16h
       └─ 11 Auftragstyp-Pages + Bürotools auf data-store.js
K-1.5  Cutover + Make-Deaktivierung    3-4h
       └─ Make-Scenarios deaktivieren, Make-Account kündigen,
          Tag v300-supabase-foundation
```

### Reduktion Tech-Stack

**Vorher:** 7 externe Services (Airtable, Make, Cloudinary, Netlify Identity, PDFMonkey, Stripe, OpenAI)
**Nachher:** 5 externe Services (Supabase, Resend, PDFMonkey, Stripe, OpenAI)

### Master-Plan-Dokumente angelegt

- `PROVA-CHAT-TRANSPORT-v35.md` — Status-Snapshot
- `PROVA-SUPABASE-REFACTOR-MASTER.md` — Strategische Doku (Vision + Decisions + Sprints)
- `SPRINT-K-1-0-MASTER-PROMPT.md` — Detail-Plan K-1.0
- `EDGE-FUNCTION-INVENTAR-K-1-2.md` — Vorausschau K-1.2
- `CLAUDE.md v3.0` — Updated für Voll-Supabase-Stack

### Nicht durch — explizit deferred

- **Migration der Bestandsdaten** — kommt in K-1.1
- **Edge Functions Implementation** — kommt in K-1.2 (8 Functions, ~770 Zeilen Code)
- **Resend-Account-Setup** — kommt in K-1.2 (Domain-Verifikation, API-Key)
- **Make-Deaktivierung** — kommt in K-1.5 nach Cutover
- **Make-Account-Kündigung** — nach K-1.5 grün
- **Pro-Plan-Upgrade Supabase** — vor erstem Pilot-User-Onboarding
- **2FA für Founder-Account** — wird in K-1.0 im Frontend richtig aufgesetzt

---

## Sprint 04f — Layout-Vereinheitlichung Pattern A

**Tag:** `v180-ssicher-p5f-done` (nach Marcel-Browser-Test) · **Stand:** 27.04.2026 · **Cache:** v220 → v226

### Was deployed wurde

**P5f.X1 — Pattern-A-Vereinheitlichung:**
- Alle Wizards (`app.html?typ=schaden`, `app.html?typ=beweis`, `app.html?typ=ergaenzung`, `app.html?typ=gegen`, `wertgutachten.html`, `beratung.html`, `baubegleitung.html`, `schied.html`, `kurzstellungnahme.html`) auf einheitliches Layout-Pattern A umgestellt
- Stepper-Komponente konsistent (32px Kreise, accent-Farbe Active, gleiche Connector-Linien)
- Karten-Container konsistent
- Buttons-Reihen konsistent

**P5f.X2 — Hotfix Stepper-Größe:**
- Erst 24px-Kreise eingeführt (zu klein), zurück auf 32px gemäß Marcel-Feedback

**P5f.X3 — Hotfix beratung.html Stepper-Balken entfernt:**
- `beratung.html` hatte zusätzlich Karten-Leiste mit Surface-Background + Border um den Stepper, Active-Phase als gefülltes Segment im „Balken"
- Auf Plain Stepper wie alle anderen Pages umgestellt: nur Punkte mit Labels darunter
- `.br-phases` ohne background/border, `.br-phase.active` ohne background

### Cache-Verlauf Sprint 04f total
`v220` → `v221` → `v222` → `v223` → `v224` → `v225` → `v226`

### Live-Verifikation
- `https://prova-systems.de/sw.js` → `prova-v226` ✓
- `beratung.html` `.br-phases` ohne background/border ✓
- `beratung.html` `.br-phase.active` ohne background ✓

### Marcel-Test
`/beratung.html` neben `/app.html?typ=schaden` öffnen — Stepper visuell identisch (32px Kreise, accent-Farbe im Active, gleiche Connector-Linien). Nur Anzahl Steps unterschiedet (3 vs 5).

### Vergangene Iterationen / Lessons Learned

- **P5f.X1 → X2 Iteration** — Stepper-Größe-Anpassung zeigte: bei UI-Vereinheitlichung pixel-genau bleiben, nicht „ähnlich". 32px ist 32px, nicht 24px „weil der Designer das Reduzieren wollte".
- **P5f.X2 → X3 Iteration** — beratung.html hatte historisch eigenen Stepper-Stil (Karten-Leiste mit gefülltem Active-Segment) der bei Pattern-A-Vereinheitlichung nicht migriert wurde. Pre-Flight-Audit hätte das gefangen.

---

[bestehender CHANGELOG-MASTER weiter unten...]
