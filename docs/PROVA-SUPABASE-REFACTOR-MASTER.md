# PROVA-SUPABASE-REFACTOR-MASTER.md
**Strategische Doku der Voll-Supabase-Migration**

**Stand:** 27.04.2026 · **Owner:** Marcel Schreiber · **Bindend für Sprint K-1**
**Co-Founder:** Claude (Strategy), Claude Code (Execution)

---

## 🎯 Mission

**PROVA wird komplett auf Supabase migriert.** Das alte Hybrid-System aus Airtable + Make + Cloudinary + Netlify Identity wird durch eine konsolidierte Stack-Architektur ersetzt: **Supabase + Resend + PDFMonkey + Stripe + OpenAI**. 

Ziel: **Architektur-Kohärenz, DSGVO-Optimierung, Skalierbarkeit, Code-as-Infrastructure.**

---

## 🚨 KRITISCHE REGEL — Parallel-Betrieb

**Das alte System bleibt UNANGETASTET bis Sprint K-1.5 (Cutover).**

```
┌──────────────────────────────────────────────────────────────┐
│ ALT-SYSTEM (läuft weiter bis K-1.5)                          │
│ • Airtable Base appJ7bLlAHZoxENWE                            │
│ • Make.com 10 Scenarios                                      │
│ • Netlify Identity Auth                                      │
│ • Cloudinary Storage                                         │
│ • alte airtable.js Proxy                                     │
│ • alle 11 Auftragstyp-Pages                                  │
└──────────────────────────────────────────────────────────────┘
                            ║
                            ║  PARALLEL
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ NEUES SYSTEM (wird gebaut in K-1.0 → K-1.4)                  │
│ • Supabase (Datenbank + Auth + Storage + Edge Functions)     │
│ • Resend (Email)                                             │
│ • neue Frontend-Lib: data-store.js, supabase-client.js, ...  │
│ • neue auth-supabase.html                                    │
│ • neue Edge Functions (in K-1.2)                             │
└──────────────────────────────────────────────────────────────┘
                            ║
                            ║  K-1.5 CUTOVER
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ FINAL-SYSTEM (Sprint K-1.5 grün)                             │
│ • Nur noch neues Supabase-System aktiv                       │
│ • Make-Scenarios deaktiviert                                 │
│ • Alt-Daten migriert + 4 Wochen Backup                       │
│ • Make-Account gekündigt                                     │
│ • Tag: v300-supabase-foundation                              │
└──────────────────────────────────────────────────────────────┘
```

**Verboten in K-1.0 bis K-1.4:**
- ❌ `airtable.js` Proxy-Function antasten
- ❌ `login.html` (Netlify Identity) antasten
- ❌ Make-Scenarios deaktivieren
- ❌ Make-Webhook-URLs in Netlify-ENV löschen
- ❌ Cloudinary-Integration brechen
- ❌ Bestehende 11 Auftragstyp-Pages umbauen (kommt in K-1.4)

---

## 📜 Architektur-Decisions-Log

| # | Decision | Datum | Begründung |
|---|---|---|---|
| 1 | **Voll-Supabase statt Hybrid** | 27.04.2026 | Pre-Pilot kleines Volumen, 14k€/Jahr Einsparung ab 50 SVs, EU-DSGVO sauber, pgvector für KI-RAG |
| 2 | **Make.com raus → Edge Functions only** | 27.04.2026 | PROVA hat keinen Workflow-Use-Case (alles Code-Tasks), Make-Quirks (`isinvalid`, manuelle Aktivierung) wegen Code lösbar, Architektur-Kohärenz |
| 3 | **Resend statt Gmail-via-Make** | 27.04.2026 | Transaktionale Mails + Audiences (Listen) + Bounces/Complaints integriert, $20/Mo bei 50k Mails |
| 4 | **Auth-Migration zu Supabase Auth** | 27.04.2026 | Konsolidierung, JWT-Auto-Refresh, Email-Verification eingebaut, Forced-Re-Consent möglich |
| 5 | **Cloudinary raus → Supabase Storage** | 27.04.2026 | One-Service-Migration, EXIF-Strip in Edge Function, RLS auf Files, kein Vendor-Lock |
| 6 | **Forced-Re-Consent für AGB/DSE/AVV** | 27.04.2026 | DSGVO Art. 7 Pflicht, Marcel-Wunsch: Popup beim nächsten Login bei neuer Version |
| 7 | **Universal `auftraege`-Tabelle mit JSONB** | 27.04.2026 | Multi-Auftragstyp-Support ohne Schema-Multiplikation, Felder pro Typ in `daten JSONB` |
| 8 | **Universal `dokumente`-Tabelle** | 27.04.2026 | Alle Artefakte (PDFs, Rechnungen, Briefe, Mahnungen) in einer Tabelle mit Mahnungs-Kette |
| 9 | **Multi-Tenancy mit `workspaces`** | 27.04.2026 | Solo+Team-ready vom Start, klare RLS, Login-as-User für Founder |
| 10 | **`pflicht_einwilligungen_komplett` per Trigger statt GENERATED** | 27.04.2026 | Robuster bei Schema-Änderungen, IMMUTABLE-Probleme vermieden |

---

## 🛣️ Sprint-K-1-Roadmap (6 Sub-Sprints)

### K-1.0 — Foundation
**Aufwand:** 6-8h · **Status:** NEXT

**Was wird gebaut:**
- Supabase-Client als JS-Modul (`lib/supabase-client.js`)
- Auth-Layer auf Supabase Auth (parallel zu Netlify Identity)
- Frontend-Lib-Skeleton: `lib/data-store.js`, `lib/template-registry.js`
- Schema-Versionierung im Repo (`/supabase-migrations/`)
- npm-Dependency `@supabase/supabase-js`
- ENV-Vars in Netlify

**Akzeptanz:**
- ✅ Marcel kann sich auf `auth-supabase.html` einloggen
- ✅ Master-Cockpit-View liefert Daten in Browser-Console
- ✅ Bestehendes System (Airtable+Netlify Identity) weiter funktional

→ **Detail-Plan:** `SPRINT-K-1-0-MASTER-PROMPT.md`

---

### K-1.1 — Migrations-Pipeline
**Aufwand:** 8-12h · **Status:** ⏳ nach K-1.0

**Was wird gebaut:**
- Node.js-Skript: liest aus Airtable-Base, schreibt nach Supabase
- Field-Mapping pro Tabelle (~30 Tabellen)
- Foreign-Keys: Airtable rec-IDs → Supabase UUIDs
- Storage-Migration: Cloudinary → Supabase Storage (mit EXIF-Strip)
- Dry-Run-Modus, dann Live-Run
- Validation-Reports

**Migration-Strategie:**
- Airtable-Daten **kopieren, nicht verschieben** (4 Wochen Backup-Window)
- `import_jobs` + `import_records` in Supabase tracken Fortschritt
- Bei Fehler: Re-Run möglich

---

### K-1.2 — Edge Functions (8 Stück)
**Aufwand:** 6-8h · **Status:** ⏳

**Was wird gebaut:**
1. **`pdf-generate`** — ersetzt Make G1+G3 (PDFMonkey-Wrapper mit Polling)
2. **`email-send`** — ersetzt Make K2 (Resend-Wrapper mit `email_log`)
3. **`user-lifecycle`** — ersetzt Make L3+L8+L9+L10 (pg_cron daily, Trial-Tag-Mails)
4. **`admin-notify`** — ersetzt Make A5 (Founder-Alerts)
5. **`termin-reminder`** — ersetzt Make T3 (pg_cron hourly)
6. **`stripe-webhook`** — ersetzt Make F1 (Idempotenz via `stripe_events`)
7. **`mahnung-trigger`** — NEU (war in Make nicht gebaut)
8. **`dsgvo-handler`** — HTTP-Wrapper für DB-Functions

**Total Code:** ~770 Zeilen für ALLES.

→ **Detail:** `EDGE-FUNCTION-INVENTAR-K-1-2.md`

---

### K-1.3 — Frontend-Pilot Kurzstellungnahme
**Aufwand:** 4-6h · **Status:** ⏳

**Was wird gebaut:**
- `kurzstellungnahme.html` komplett auf Supabase umgestellt
- Auto-Save via Supabase Realtime
- Pflicht-Einwilligungen-Check via `get_pending_einwilligungen()`
- Audio-Upload zu Supabase Storage (statt Cloudinary)
- KI-Strukturierung via Edge Function `ki-proxy`

**Pilot-Test:** Marcel macht eine echte Kurzstellungnahme end-to-end im neuen System.

---

### K-1.4 — Frontend-Refactor (alle anderen Pages)
**Aufwand:** 12-16h · **Status:** ⏳

**Was wird umgebaut:**
- 11 Auftragstyp-Pages (Schaden, Beweis, Wertgutachten, Beratung, Baubegleitung, ...)
- Bürotools (Rechnungen, Briefe, Termine, Kontakte)
- Akte, Cockpit, Settings
- Alle Workflows nutzen `data-store.js` statt direkter Airtable-Calls

---

### K-1.5 — Cutover + Make-Deaktivierung
**Aufwand:** 3-4h · **Status:** ⏳

**Was passiert:**
- Cross-Browser-Test mit echten Daten
- Mobile-Test
- Backup-Strategie aktiv: 4 Wochen Airtable als Read-Only
- 10 Make-Scenarios deaktivieren
- Netlify-ENV-Vars für Make entfernen
- DNS-Update (auth-supabase.html → login.html)
- Tag: `v300-supabase-foundation`
- **NACH grünem Cutover:** Make-Account kündigen (spart $11-19/Mo)

---

## 📦 Tech-Stack-Übersicht

### Vorher (Hybrid, vor Refactor)

```
Frontend → Netlify Functions → Airtable
                            → Cloudinary (Fotos)
                            → OpenAI (KI)
                            → PDFMonkey (PDFs)
                            
Make.com → 10 Scenarios → Gmail (Mails)
                       → Stripe-Webhook
                       → User-Lifecycle
                       → Termin-Erinnerungen
                       
Auth: Netlify Identity
```

### Nachher (Voll-Supabase, nach Refactor)

```
Frontend → Supabase Edge Functions → Supabase DB (Postgres)
                                  → Supabase Storage
                                  → Supabase Auth
                                  → OpenAI (KI)
                                  → PDFMonkey (PDFs)
                                  → Resend (Email)
                                  → Stripe (Billing)
                                  
pg_cron → Edge Functions (Lifecycle, Termine, Mahnungen)
Stripe-Webhook → Edge Function `stripe-webhook`
```

**Reduktion:** 7 Services → 5 Services. Make + Cloudinary raus.

---

## 🗄️ Supabase-Schema-Übersicht (61 Tabellen)

### Foundation (Phase 1) — 6 Tabellen
- `workspaces`, `users`, `workspace_memberships`, `user_sessions`, `audit_trail`, `notifications`

### Kerngeschäft (Phase 2) — 14 Tabellen
- `auftraege` (universal mit JSONB), `kontakte`, `auftrag_kontakte`, `auftrag_phasen`, `ortstermine`, `anknuepfungstatsachen`, `befunde`, `messwerte`, `messgeraete`, `ursachen_hypothesen`, `sanierungspositionen`, `auftrag_normen`, `eintraege`, `az_sequences`

### Artefakte+Storage (Phase 3) — 8 Tabellen
- `dokumente` (universal: PDFs/Rechnungen/Briefe/Mahnungen), `dok_sequences`, `dokument_positionen`, `fotos`, `audio_dateien`, `anhaenge`, `termine`, `notizen`

### Wissens-Bibliotheken + KI (Phase 4) — 8 Tabellen
- `normen_bibliothek` (mit pgvector), `textbausteine`, `ki_prompt_templates`, `positionen_bibliothek`, `wissen_diagnostik`, `ki_protokoll`, `ki_lernpool`, `ki_feedback`

### Migration + System (Phase 4) — 6 Tabellen
- `import_jobs`, `import_records`, `workflow_errors`, `push_subscriptions`, `feature_flags`, `system_health`

### Admin-Cockpit + Support (Phase 4) — 6 Tabellen
- `support_tickets` (mit Browser-Diagnose-Fields!), `support_replies`, `support_attachments`, `impersonation_log`, `feature_events`, `churn_reasons`

### Compliance + Geschäft (Phase 4) — 6 Tabellen
- `einwilligungen`, `rechtsdokumente`, `versicherungs_partner`, `dokument_templates`, `empfehlungen`, `leads_pipeline`

### Patches 05+06 — 7 Tabellen
- `stripe_events`, `email_log`, `workspace_invitations`, `onboarding_progress`, `api_keys`, `tags_global`, `bookmarks`

**Plus 24 Helper-Functions, 12 Cockpit-Views, 3 Storage-Buckets, RLS scharf überall.**

---

## 📋 Pflicht-Lektüre für Claude Code (Reihenfolge!)

### Wenn Claude Code in Sprint K-1.0 startet:

1. **`CLAUDE.md`** — Regeln (Regel 27 sw.js Bump!)
2. **`PROVA-VISION-MASTER.md`** — Was wir bauen (4-Flow-Architektur, Tier-Modell)
3. **`PROVA-REGELN-PERMANENT.md`** — Anti-Patterns (Tier-Namen, KI-Modell-Namen, etc.)
4. **`PROVA-CHAT-TRANSPORT-v35.md`** — Aktueller Stand (heute)
5. **`PROVA-SUPABASE-REFACTOR-MASTER.md`** — DIESES File (Mission, Decisions, Sprints)
6. **`SPRINT-K-1-0-MASTER-PROMPT.md`** — Detail-Plan für aktuellen Sub-Sprint
7. **`EDGE-FUNCTION-INVENTAR-K-1-2.md`** — Vorausschau (für später)
8. **6 Schema-SQL-Files** in `/supabase-migrations/`

### Files die VERALTET sind (Kontext-Hinweis für Claude Code)

- `PROVA-CHAT-TRANSPORT-v34.md` — vor Schema-Refactor, **nur historischer Kontext**
- `PROVA-ARCHITEKTUR-MASTER.md` — beschreibt **alten** Hybrid-Stack, **wird in K-1.5 ersetzt**
- `PROVA-SPRINTS-MASTERPLAN.md` — alte Sprint-Struktur (Sprint 04e, 04f...), **PROVA-SUPABASE-REFACTOR-MASTER.md ist die neue Wahrheit**

---

## 🚦 Sprint-Pacing-Empfehlung

```
Tag 1 (heute Abend / morgen früh)
├─ K-1.0 Foundation                   6-8h

Tag 2
├─ K-1.1 Migrations-Pipeline          8-12h

Tag 3
├─ K-1.2 Edge Functions               6-8h
└─ Resend-Setup parallel

Tag 4
├─ K-1.3 Frontend-Pilot               4-6h
└─ Marcel-Pilot-Test mit echter Kurzstellungnahme

Tag 5-6
├─ K-1.4 Frontend-Refactor Rest       12-16h

Tag 7
├─ K-1.5 Cutover                      3-4h
├─ Browser-Test auf 3 Geräten
├─ Tag v300-supabase-foundation
└─ Make-Account kündigen
```

**Total:** 6-7 Arbeitstage. Dann ist PROVA komplett auf Supabase.

---

## 🎯 Erfolgs-Kriterien Sprint K-1 abgeschlossen

```
✅ 61 Tabellen in Supabase mit Daten gefüllt (von Airtable migriert)
✅ 8 Edge Functions live und getestet
✅ Auth läuft auf Supabase (Netlify Identity entfernt)
✅ Storage in Supabase (Cloudinary entfernt)
✅ 11 Auftragstyp-Pages auf Supabase umgestellt
✅ Stripe-Webhook funktional
✅ Email-Versand via Resend
✅ Cross-Device-Test grün (PC + Tablet + Handy)
✅ Master-Cockpit zeigt MRR + Margin live
✅ Make-Account gekündigt
✅ 4 Wochen Airtable als Read-Only Backup
✅ Tag v300-supabase-foundation gesetzt
```

---

## 🌍 Nach Sprint K-1 — Roadmap-Ausblick

### Sprint K-2 (post-Refactor)
- Pilot-Onboarding (5 SVs)
- Welcome-E-Mail-Sequenz
- Onboarding-Tour
- Initial-Daten-Pflege (Normen, Textbausteine)

### Sprint M (Mobile-Rescue)
- 11 Pages mobile-optimiert
- Mobile-Bottom-Navigation
- PWA-Manifest
- Offline-Modus mit Sync

### Sprint A (AUTH-COCKPIT)
- `admin.prova-systems.de` Subdomain
- Founder-Dashboard mit MRR + Funnel + Heatmap
- Login-as-User produktiv

### Sprint S (APP-LANDING-SPLIT)
- `prova-systems.de` = Landing
- `app.prova-systems.de` = SaaS-App

---

## 💼 Business-Reminder

**PROVA-Pivot 27.04.2026 (Marcel-Direktive):**
> „Pilot kann warten — erst bauen wir richtig fertig"

**Time-Pressure auf Pilot raus.** 5-7-Tage-Pilot-Annahme überholt. Konsolidierung und Quality first. Sprint K-1 ist die strategische Investition für nachhaltige Skalierung.

**Tier-Strategie (UNVERÄNDERT):**
- Solo: 149€/Mo
- Team: 279€/Mo
- KEINE anderen Tiers (NIE Starter/Pro/Enterprise)

---

🎯 **Diese Doku ist die Wahrheit für Sprint K-1. Bei Konflikt: dieses Dokument gewinnt.**

🚀 **PROVA-Architektur 2026: konsolidiert, DSGVO-clean, skalierbar.**

*Ende PROVA-SUPABASE-REFACTOR-MASTER.md*
