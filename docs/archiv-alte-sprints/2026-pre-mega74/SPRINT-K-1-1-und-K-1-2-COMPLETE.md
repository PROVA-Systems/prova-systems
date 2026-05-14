# Sprint K-1.1 + K-1.2 — COMPLETE

**Branch:** `sprint-k-1-1-bis-1-5-mega`
**Status:** Code grün, wartet auf Marcels Live-Migration + Edge-Function-Deploy
**Sprint A komplett:** 25/25 Blöcke (14 Migration + 11 Edge Functions)

---

## TLDR — was Marcel morgen früh tun muss

### 1. Migration (K-1.1)

```bash
# Vor allem: .env.local mit Keys ergänzen
# AIRTABLE_PAT=patABC...
# SUPABASE_URL=https://cngteblrbpwsyypexjrv.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Dry-Run (kein Risiko, nur lesen):
node scripts/migrate/run-all.js

# Wenn alles ✅:
node scripts/migrate/run-all.js --live

# Validation:
node scripts/migrate/validate.js
```

→ Detail in `docs/MIGRATION-RUNBOOK.md`.

### 2. Edge Functions (K-1.2)

```bash
supabase login
supabase link --project-ref cngteblrbpwsyypexjrv

# Secrets (Block aus EDGE-FUNCTIONS-DEPLOY.md):
supabase secrets set OPENAI_API_KEY=... PDFMONKEY_API_KEY=... \
  RESEND_API_KEY=... STRIPE_WEBHOOK_SECRET=... \
  PROVA_SYSTEM_TOKEN=$(openssl rand -hex 32) \
  PROVA_ICAL_SECRET=$(openssl rand -hex 32)

# Deploy alle 8:
for fn in ki-proxy whisper-diktat pdf-generate send-email \
          lifecycle-trigger audit-write; do
    supabase functions deploy $fn
done
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy ical-feed --no-verify-jwt
```

### 3. Health-Check

```
https://prova-systems.de/tools/test-edge-functions.html
→ Alle 8 testen → Console-Output zurück bei Errors
```

→ Detail in `docs/EDGE-FUNCTIONS-DEPLOY.md`.

---

## Akzeptanz-Check Sprint A

### Phase A (K-1.1 Migration-Pipeline) — 14/14 Blöcke

| # | Block | Status | Datei(en) |
|---|---|---|---|
| A1 | Setup + Architektur | ✅ | `scripts/migrate/{README,package.json,.gitignore}` |
| A2 | airtable-reader.js | ✅ | `lib/airtable-reader.js` (168 Zeilen) |
| A3 | supabase-writer.js | ✅ | `lib/supabase-writer.js` (273 Zeilen, +Patch A4-fix) |
| A4 | transform.js + UUIDv5 | ✅ | `lib/transform.js` (285 Zeilen) — deterministisch verifiziert |
| A5 | 01-sachverstaendige.js | ✅ | → workspaces + workspace_memberships |
| A6 | 02-kontakte.js | ✅ | → kontakte (workspace-scoped, address-parser) |
| A7 | 03-schadensfaelle.js | ✅ | → auftraege + auftrag_kontakte (M:N) |
| A8 | 04-eintraege.js | ✅ | → eintraege (audio_dateien separat) |
| A9 | 05-rechnungen.js | ✅ | → dokumente + dokument_positionen |
| A10 | 06-audit-trail.js | ✅ | → audit_trail (volume-aware) |
| A11 | 07-ki-statistik.js | ✅ | → ki_protokoll |
| A12 | run-all.js | ✅ | Orchestrator mit Subprocess-Spawn |
| A13 | validate.js | ✅ | Counts-Vergleich + --diff-detail |
| A14 | MIGRATION-RUNBOOK.md | ✅ | `docs/MIGRATION-RUNBOOK.md` (260 Zeilen) |
| **GATE** | Akzeptanz | ✅ | 14/14 syntax-OK, env-Loader OK, error-paths klar |

### Phase B (K-1.2 Edge Functions) — 11/11 Blöcke

| # | Block | Status | Datei(en) |
|---|---|---|---|
| B1 | _shared/ Utils | ✅ | `cors.ts`, `auth.ts`, `supabase.ts`, `audit.ts`, `types.ts` |
| B2 | ki-proxy | ✅ | OpenAI + Pseudonymisierung + ki_protokoll |
| B3 | whisper-diktat | ✅ | Audio→Text + audio_dateien |
| B4 | pdf-generate | ✅ | PDFMonkey + Storage + dokumente (+`templates.ts`) |
| B5 | send-email | ✅ | Resend + email_log + System-Token-Auth |
| B6 | stripe-webhook | ✅ | Signature-Verify + Idempotenz + 5 Event-Handler |
| B7 | lifecycle-trigger | ✅ | Trial-Lifecycle + cron_daily-Sweep |
| B8 | audit-write | ✅ | Frontend-Audit + Rate-Limit (100/min) |
| B9 | ical-feed | ✅ | HMAC-Token + iCal-Format + 15min-Cache |
| B10 | test-edge-functions.html | ✅ | 8-Buttons-Smoke-Test |
| B11 | EDGE-FUNCTIONS-DEPLOY.md | ✅ | Vollständige Deploy-Doku |

---

## Schema-Drift gegen Mega-Prompt #1 — Korrekturen

Mega-Prompt #1 hatte Tabellen-Namen die im echten Schema anders heißen. Alle
Migration-Skripte und Edge Functions schreiben gegen das **echte Schema**:

| Mega-Prompt #1 sagte | Echtes Schema |
|---|---|
| `workspace_users` | `workspace_memberships` |
| `rechnungen` + `rechnungs_positionen` | `dokumente` (typ=rechnung\*) + `dokument_positionen` |
| `audit_log` | `audit_trail` |
| `ki_audit` | `ki_protokoll` |
| `diktate` | `eintraege` (+ `audio_dateien` separat) |
| `auftraege.aktenzeichen` | `auftraege.az` |
| `auftrag_typ='schadensgutachten'` | `auftrag_typ='schaden'` (1:1 ohne Suffix) |
| `workspaces.owner_email` | gibt's nicht — Owner via `workspace_memberships.rolle='owner'` |
| `users.id ≠ auth.users.id` | Schema sagt `users.id = auth.users.id` (Sync) |

→ Marcel muss SVs erst in Supabase Auth anlegen, bevor Migration sie verarbeiten kann.
  Skripte loggen `reason: workspace_not_found` und skipen sie.

---

## Architektur-Entscheidungen

### 1. Server-side Pseudonymisierung in ki-proxy
- Aktenzeichen, Email, IBAN, Telefon werden vor OpenAI-Call durch Tokens ersetzt
- Re-Identifizierung nach Response
- TODO K-2: Namen (NER) und Adressen (PLZ-Datenbank)

### 2. UUIDv5 für Idempotenz
- Namespace: `4f7e9b3a-6b7e-4f1c-8a0d-1e2f3a4b5c6d` (PROVA-Migrate, hardcoded)
- Re-Run der Migration produziert identische UUIDs → kein Duplikat
- Wenn Marcel den Namespace ändert, ALLE Records werden neu erzeugt!

### 3. CDN-Import für @supabase/supabase-js in Edge Functions
- `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0'`
- Kein npm-install nötig in Deno-Edge-Runtime

### 4. System-Token-Pattern für interne Function-Calls
- `lifecycle-trigger`, `send-email` (System-Mode) authentifizieren über
  `x-prova-system-token` Header gegen `PROVA_SYSTEM_TOKEN` Secret
- pg_cron + stripe-webhook nutzen das Pattern

### 5. Mega-Prompt-Edge-Function-Set bevorzugt
- Mega-Prompt #1 listete: ki-proxy, whisper-diktat, pdf-generate, send-email,
  stripe-webhook, lifecycle-trigger, audit-write, ical-feed
- Edge-Function-Inventar (älter) listete andere Namen (admin-notify,
  termin-reminder, mahnung-trigger, dsgvo-handler)
- Entschieden: Mega-Prompt-Set (8 Functions), weil Test-Page direkt darauf zeigt
- TODO K-2: termin-reminder, mahnung-trigger, dsgvo-handler nachbauen

### 6. Whisper-Chunking ist TODO
- Aktuell wird bei > 25MB ein 413 zurückgegeben
- Chunking erfordert Audio-Split-Logik (komplex) — K-2

### 7. lifecycle-trigger nur teilweise
- `trial_start`, `trial_ending_in_3_days`, `cron_daily` voll implementiert
- `trial_ended`, `abo_renewed`, `abo_canceled`: Stub mit TODO-Note
- E-Mail-Templates fehlen außer für die ersten 2 — K-2

---

## Bekannte Limitierungen

1. **`.env.local` muss von Marcel ergänzt werden** — aktuell nur PROVA_TEST_*
   für Playwright drin. Migration scheitert ohne `AIRTABLE_PAT` /
   `SUPABASE_SERVICE_ROLE_KEY`.

2. **Cloudinary-Audio nicht migriert.** `audio_dateien`-Tabelle bleibt leer
   bis K-1.5 Storage-Cleanup. Eintraege haben `audio_dateien_ids = []`.

3. **Whisper > 25MB nicht supported** — 413, kein Chunking.

4. **Kein `rollback.js`** — wäre `node rollback.js workspaces`. K-2.

5. **Kein User-Auto-Create** — SV muss erst in Supabase Auth angelegt sein.

6. **Pseudonymisierung Skeleton** — nur Aktenzeichen/Email/IBAN/Telefon,
   keine Namen/Adressen.

7. **lifecycle-trigger E-Mail-Templates** nur für Welcome + Trial-Ending.
   Restliche Triggers haben TODO-Stubs.

8. **PDFMonkey-Templates hardcoded** in `_shared/templates.ts` (Mirror von
   `lib/template-registry.js`). DB-basierte Single-Source ist K-1.5 TODO.

9. **CORS-Origin auf `*`** — sollte in K-1.5 auf `https://prova-systems.de`
   eingegrenzt werden.

10. **Rate-Limit nur in-memory** — bei mehreren Edge-Instances pro User
    möglicherweise mehrere 100/min. Redis-Backend in K-2 falls Pilot wächst.

---

## Was fehlt für Cutover (K-1.5)

- Frontend-Refactor (K-1.3 + K-1.4) — siehe `SPRINT-K-1-3-4-5-MEGA-PROMPT.md`
- Cutover-Skripte (`scripts/cutover/01-05`)
- `sw.js` CACHE_VERSION-Bump
- Marcel führt manuell aus

→ Phase 2 (K-1.3-1.5) ist **nicht** Teil dieses Mega-Runs. Siehe
   `MEGA-PAUSE-PHASE-2.md` für Status + Empfehlung.

---

## Files-Bilanz Sprint A

```
Hinzugefügt:
  scripts/migrate/
    .gitignore, README.md, package.json
    lib/{airtable-reader,supabase-writer,transform,env,runner}.js
    {01-07}-*.js (7 Migration-Skripte)
    run-all.js, validate.js
    [logs/ — gitignored]

  supabase/functions/
    _shared/{cors,auth,supabase,audit,types,templates}.ts
    ki-proxy/index.ts
    whisper-diktat/index.ts
    pdf-generate/index.ts
    send-email/index.ts
    stripe-webhook/index.ts
    lifecycle-trigger/index.ts
    audit-write/index.ts
    ical-feed/index.ts

  tools/test-edge-functions.html

  docs/MIGRATION-RUNBOOK.md
  docs/EDGE-FUNCTIONS-DEPLOY.md
  SPRINT-K-1-1-und-K-1-2-COMPLETE.md (diese Datei)
```

**Total Sprint A:** ~3500 Zeilen Code, ~800 Zeilen Doku, 8 Edge Functions ready.

---

🎯 **Sprint A grün. Marcel kann Migration + Edge Functions deployen.**

🚀 **Phase 2 (K-1.3-1.5 Frontend + Cutover) bewusst pausiert — siehe MEGA-PAUSE-PHASE-2.md.**
