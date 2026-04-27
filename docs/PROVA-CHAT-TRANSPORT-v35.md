# PROVA-CHAT-TRANSPORT-v35.md
**Aktueller Stand zum Chat-Wechsel — nach Schema-Refactor + Make-Out-Decision**

**Stand:** 27.04.2026, abend
**Vorheriger Chat:** Session 34 → 35 (Schema-Refactor + Sprint-K-1-Vorbereitung)
**Branch:** `sprint-k-1-0-supabase-foundation` (frisch erstellt)

---

## ⚡ TLDR — Was ist GERADE Stand

### ✅ Heute komplett abgeschlossen

**Sprint 04f Layout-Vereinheitlichung mit Hotfix P5f.X3:**
- Cache v220 → v226
- Pattern A für alle Wizards durchgesetzt
- Stepper-Konsistenz (Telefonberatung-Balken entfernt)
- Tag: `v180-ssicher-p5f-done` (nach Marcel-Browser-Test)

**SUPABASE-SCHEMA komplett (61 Tabellen):**
- Phase 1 Foundation (Workspaces, Users, Auth, Audit)
- Phase 2 Kerngeschäft (Aufträge, Kontakte, Befunde, Sanierung)
- Phase 3 Artefakte+Storage (Dokumente, Fotos, Audio, Storage-Buckets)
- Phase 4 Komplett-Finale (Wissen, KI, Support, Compliance)
- Patch 05 v2 (Billing + Master-Cockpit + Yearly-Plan)
- Patch 06 v3 (Stripe-Events + Email-Log + Team-Invites + Onboarding + Forced Re-Consent)

**Architektur-Decisions getroffen:**
- ✅ Voll-Supabase statt Hybrid
- ✅ Make.com raus → Edge Functions only
- ✅ Resend für Mails (statt Gmail über Make)
- ✅ Auth-Migration zu Supabase Auth
- ✅ Cloudinary raus → Supabase Storage
- ✅ Forced-Re-Consent-Workflow für AGB/DSE/AVV

**Founder-Setup:**
- Email: `marcel.schreiber@prova-systems.de`
- `is_founder = TRUE` in `public.users`
- Test-User `marcel_schreiber891@gmx.de` als „normaler SV" für UX-Tests

### 🚧 In Vorbereitung — Sprint K-1.0

**Sprint K-1.0 Foundation (heute Abend / morgen früh):**
- Aufwand: 6-8h für Claude Code
- Branch: `sprint-k-1-0-supabase-foundation`
- 7 Blöcke (Schema-Versionierung → Auth-Migration → Frontend-Lib-Skeleton → Test)

---

## 📊 Sprint-K-1-Roadmap (6 Sub-Sprints)

```
K-1.0  Foundation                    ~6-8h    NEXT
       └─ Supabase-Client + Auth-Migration + Frontend-Lib-Skeleton

K-1.1  Migrations-Pipeline           ~8-12h
       └─ Skript Airtable → Supabase, alle ~30 Tabellen

K-1.2  Edge Functions (alle 8)       ~6-8h
       └─ pdf-generate, email-send, user-lifecycle, stripe-webhook, ...

K-1.3  Frontend-Pilot Kurzstellung.  ~4-6h
       └─ Erste Page komplett auf Supabase

K-1.4  Frontend-Refactor Rest        ~12-16h
       └─ 11 Auftragstyp-Pages + Bürotools

K-1.5  Cutover + Make-Deaktivierung  ~3-4h
       └─ 10 Make-Scenarios deaktivieren + Account kündigen
       └─ Tag v300-supabase-foundation
```

**Total Sprint K-1: 6-7 Arbeitstage.**

---

## 🏗️ Tech-Stack neu (nach Refactor)

| Bereich | Vorher | Nachher |
|---|---|---|
| Datenbank | Airtable | **Supabase Postgres** |
| Auth | Netlify Identity | **Supabase Auth** |
| Storage | Cloudinary + Airtable | **Supabase Storage** |
| Backend | Netlify Functions | **Supabase Edge Functions** |
| Email | Make + Gmail | **Resend** (Edge Function) |
| Workflow | Make.com (10 Scenarios) | **Edge Functions + pg_cron** |
| PDF | PDFMonkey via Make | PDFMonkey via Edge Function |
| Stripe | Make.com Webhook | Edge Function `stripe-webhook` |
| KI | Netlify Function | Edge Function `ki-proxy` |

**Reduktion von 7 externen Services auf 5: Supabase + Resend + PDFMonkey + Stripe + OpenAI.**

---

## 📦 Supabase-Projekt-Daten

```
Project-Ref:    cngteblrbpwsyypexjrv
URL:            https://cngteblrbpwsyypexjrv.supabase.co
Region:         Frankfurt (EU)
Plan:           Free (Pro-Upgrade vor Pilot)
Postgres:       17.6
pgvector:       0.8.0 aktiv

Tables:         61
Functions:      24
Cockpit-Views:  12 (8 KPI + 4 Time-Series)
Storage-Buckets: 3 (sv-files, sv-public, sv-system)
RLS:            scharf auf jeder Tabelle
```

---

## 🔐 Sicherheits-Status

- ✅ Token-Rotation durchgeführt (alte Tokens revoked)
- ✅ Service-Role-Key nur Server-Side
- ✅ Anon-Key öffentlich OK (RLS schützt)
- ✅ Founder-Account mit `is_founder = TRUE`
- ⚠️ 2FA für Founder-Account in Sprint K-1.0 noch zu setzen
- ⚠️ MCP-Connection mit neuem PAT zu re-connecten

---

## 🚧 Was NICHT verändert wurde (alter Stand erhalten)

**Bestehendes System läuft weiter parallel:**
- ✅ Airtable Base `appJ7bLlAHZoxENWE` aktiv mit allen Bestandsdaten
- ✅ Make.com 10 Scenarios live (auch wenn 2 nicht aktiv)
- ✅ Netlify Identity Login funktional
- ✅ Cloudinary für Foto-Upload
- ✅ Alle 11 Auftragstyp-Pages funktional
- ✅ alte `airtable.js` Proxy-Function

**Nicht-antasten-Liste:** Bis Sprint K-1.5 grün ist, bleibt das gesamte alte System aktiv. Cutover am Ende, nicht im Verlauf.

---

## 📋 Marcel-TODO

### Sofort (vor Sprint K-1.0 Start)
- [x] User-Anmeldung in Supabase Auth
- [x] `is_founder = TRUE` setzen
- [x] Token-Rotation
- [ ] Schema-Files in `/supabase-migrations/` kopieren
- [ ] Branch `sprint-k-1-0-supabase-foundation` erstellt
- [ ] Doku-Files in `/docs/sprint-k-1/` kopieren
- [ ] Master-Prompt für Claude Code bereit

### Während Sprint K-1.0
- [ ] Block-für-Block-Verifikation alle 30-60 Min
- [ ] Bei Konflikten: NACHT-PAUSE-K1-0.md schreiben

### Nach Sprint K-1.0 grün
- [ ] Browser-Test Auth-Roundtrip
- [ ] Marcel-Login mit `marcel.schreiber@prova-systems.de`
- [ ] Master-Cockpit-Daten in Console sichtbar
- [ ] „K-1.0 grün" → Sprint K-1.1 starten

---

## 🎬 Lessons-Learned aus Schema-Refactor

1. **CREATE OR REPLACE VIEW** kann Spalten-Namen nicht ändern → DROP VIEW + CREATE neu
2. **`unaccent()` nicht IMMUTABLE** → in GENERATED-Columns nur `lower()` ohne Konvertierung
3. **DROP TRIGGER auf nicht-existenter Tabelle crasht** → DO/EXCEPTION-Blocks
4. **PostgreSQL Transaction-Rollback** automatisch bei Error → Datenbank konsistent
5. **Idempotente Pattern** als Standard für DDL: `CREATE IF NOT EXISTS`, `DROP IF EXISTS`, `DO $$ BEGIN ... EXCEPTION END $$`

---

## 🎯 Vision-Reminder

**Nicht Pilot-Druck.** Marcel-Direktive 27.04.2026: „Pilot kann warten — erst bauen wir richtig fertig". Time-Pressure raus, Konsolidierung+Quality first.

**Cross-Device-Vision** bleibt:
- PC → Tablet/Handy beim Termin → Büro abschließen
- Auto-Save via Supabase Realtime (in K-1.3 implementiert)
- Cloud-Sync ohne Polling

**End-Zustand „PROVA fertig":**
- Solo-SV (149€/Mo) und Team-Büro (279€/Mo) als Tier-Modell
- 4-Flow-Architektur (Schaden / Wertgutachten / Beratung / Baubegleitung)
- IHK-konforme PDFs mit §407a + EU AI Act Boxes
- Cross-Device nahtlos
- Founder-Cockpit live mit MRR + Margin

---

## 📋 Update-Anleitung für nächsten Chat

**Nach Sprint K-1.0 Abschluss:**
- v35 → v36
- Was K-1.0 gebracht hat
- Was K-1.1 als nächstes ist

**Versionierung:**
- v34 = vor Schema-Refactor
- v35 = nach Schema + vor K-1.0 (heute)
- v36 = nach K-1.0 grün
- v37 = nach K-1.2 (Edge Functions)
- v40 = nach K-1.5 Cutover

---

🎯 **PROVA-Foundation ist gebaut. Heute Abend / morgen früh: Frontend & Backend kommen drauf.**

🚀 **Sprint K-1 ist die größte Migration in der PROVA-Geschichte. Sauber gemacht.**

*Ende PROVA-CHAT-TRANSPORT-v35.md*
