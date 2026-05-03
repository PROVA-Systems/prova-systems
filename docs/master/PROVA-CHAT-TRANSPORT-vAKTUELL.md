# PROVA Chat-Transport — AKTUELL

**Stand:** 03.05.2026 mittag (Tag 9 — Power-Setup MAX done + Founding-Pilot LIVE)
**Vorgänger:** v37 (01.05. mittag, archiviert in `docs/archiv/chat-transports/PROVA-CHAT-TRANSPORT-v35.md`)
**Single Source of Truth** — siehe `docs/master/README.md`

> ⚠️ **Versions-Hinweis:** Diese Datei heißt absichtlich `vAKTUELL` (statt fortlaufender Nummer wie v37/v38). Sie wird nach jedem Sprint **direkt überschrieben** — Versions-Historie liegt im git-Log. Einzige laufend gepflegte Briefing-Quelle für Chat-Wechsel.

---

## ⚡ Sofort-Briefing (60 Sekunden)

**Wer bin ich:** Du bist Browser-Claude für Marcel Schreiber von PROVA Systems — KI-natives B2B-SaaS für ö.b.u.v. Bauschaden-Sachverständige in Deutschland.

**Wo stehen wir:** Tag 9 mittag. Catch-Up-Sprint abgeschlossen — **Founding-Pilot-Programm ist deployed**. Pilot-Page `/pilot` live, 90T Trial + Auto-FOUNDING-99-Coupon, Stripe-Webhook erweitert (trial_will_end + Trial-zu-Paid-Transition + Pilot-Audit-Logs). 4 Email-Templates. Webhook-Monitoring-Skripte (`stripe-status` + `stripe-replay`). 3 Marcel-Vorbereitungs-Doku-Files. 2 Tot-Code-Decision-Files. Tag v204-security-hardening-done aus Mega-Mega-Sprint bleibt.

**Stripe-Test-Status:**
12 ENV-Vars in Netlify gesetzt + Webhook-Endpoint angelegt + Founding-Coupon angelegt + Customer-Portal aktiviert + Trigger Deploy ausgeführt. Test-Käufe stehen aus (Marcel macht heute mit Verify-Skript-Suite).

**Findings-Stand:**
- 1 CRITICAL (auth-token-issue, NACHT-PAUSE für Marcel)
- ~30 HIGH in BACKLOG (12 ✅ FIXED, 4 Tot-Code-Decision-Files vorhanden, ~14 in Folge-Sprints)
- 1 PLANNED-Migration (RLS-Findings, Marcel-Dev-Test pending)

**Power-Tools aktiv (Max-Plan):**
- `.claude/settings.json` — Pre-Allowed Permissions + PostToolUse-Hooks + Stop-Beep
- 4 Custom Slash-Commands: `/prova-deploy`, `/prova-status`, `/prova-test`, `/prova-verify-stripe`
- 1 Custom Subagent: `prova-rls-auditor`
- CLAUDE.md v3.1 mit Compounding-Engineering-Sektion
- 4 /loop-Workflows dokumentiert (`docs/strategie/CC-LOOPS-WORKFLOW.md`)
- Plugins (Marcel installiert via CLI): claude-mem, claude-hud, context-mode, last30days, SDD-Kit, security-sweep

**Was als nächstes (priorisiert):**
1. **Marcel installiert die 6 Plugins** via CLI (~15 Min, siehe `docs/sprint-status/POWER-SETUP-MAX-DONE.md`)
2. **Marcel verifiziert Stripe-Setup:** `/prova-verify-stripe` (custom command) oder `npm run verify-stripe`
3. **Loop 1 + Loop 2 aktivieren** (Daily Smoke-Test + npm audit)
4. **Tot-Code-Decisions:** foto-upload + invite-user löschen
5. **Erste Pilot-SVs einladen** (`docs/strategie/PILOT-EINLADUNG-WORKFLOW.md`)
6. NACHT-PAUSE-Decisions + PLANNED-Migration

**Worauf achten:**
- Bei Bug-Diagnose: **Diagnose-First** (Regel 33). Nicht blind Code-Vorgaben übernehmen — selbst aus Files validieren
- Bei Auth-Migration: **Hardcoded-Defaults greppen** (Regel 34) bevor Cutover
- Bei ENV-Vars: **PROVA-Prefix** (Regel 35) gegen Multi-Tenant-Konflikte

---

## 🏆 Was die letzten 24h passiert ist

### 30.04.2026 abend — APP-LANDING-SPLIT live

- Phase 4 Cutover komplett · 9 Commits in main · Tag `v200-app-landing-split-done`
- 2 Domains live: `prova-systems.de` (LANDING) + `app.prova-systems.de` (APP)
- 30+ Cross-Domain-Redirects + 37 host-spezifische Path-Rewrites
- Smoke-Test 15/15 PASS (`scripts/smoke-test-cutover.sh`)
- Hotfix `redirect-precedence` (App-Pfade in netlify.toml host-spezifisch)
- Doc: `docs/sprint-status/PHASE-4-CUTOVER-DONE.md`

### 01.05.2026 nachts — Cutover Block 3 (Login-Loop-Fix)

- 51 Hybrid-Pages auf `lib/auth-guard.js` migriert
- Bridge-Layer + Belt-and-Suspenders Loop-Counter
- sw.js v248
- Doc: `docs/sprint-status/CUTOVER-BLOCK-3-DONE.md` + `NACHT-SPRINT-LOG.md`

### 01.05.2026 morgens — Token-Expired-Bug-Diagnose

- Loop weg, neuer Bug: Login → Dashboard ~1s → `/login?reason=token_expired`
- Diagnose: `prova-fetch-auth.js` Zeile 66-67 + `prova-status-hydrate.js` Zeile 104 als Trigger
- Root-Cause: Bridge-Token server-side HMAC-invalid → 401 → Auto-Logout
- Doc: `docs/diagnose/TOKEN-EXPIRED-BUG.md`

### 01.05.2026 mittag — Option C deployed

- **Server-Side Supabase-JWT-Verify** via `jose@^6.2.3` + JWKS-URL
- Asymmetric ES256 (ECC P-256) — Industry-Standard wie Auth0/Stripe/Vercel
- Migration vom Bridge-Hack: echter `session.access_token` in `prova_auth_token`
- Defense-in-Depth in `prova-fetch-auth.js`: refresh-vor-Logout
- 8 Edits + 1 NEU-File + 2 ENV-Vars
- sw.js v249 LIVE · Negativ-Test Garbage-JWT → HTTP 401 ✓
- Merge `3b27cd1` · Doc: `docs/sprint-status/OPTION-C-DONE.md`

### 01.05.2026 mittag — Parallel-Sprint (3 Branches)

- `cleanup/cluster-review-auto`: 20 DEAD-Pages weg (-3350 LOC), 3 BLOCKED
- `docs/ki-prompts-master-skeleton`: KI-PROMPTS-MASTER.md Skeleton
- `fix/pricing-discrepancy`: index.html 25 → 30 Gutachten
- Doc: `docs/sprint-status/PARALLEL-SPRINT-DONE.md`

### 02.05.2026 — Voll-Cleanup-Sprint (Airtable raus)

- **Block 1:** `prova-fetch-auth.js` lazy-import — Race-Condition gefixt (sw.js v250)
- **Block 2A:** `prova-fetch-auth.js` blockiert hart `/.netlify/functions/airtable`-Calls (fake-410-Response). `frist-guard.js`, `prova-status-hydrate.js` entkernt — Cache-only-Mode bis Sprint 11
- **Block 3:** 16 Legacy-Functions + 1 lib-Helper gelöscht (47 → 31 Functions): `airtable.js` + Helper, `setup-tabellen`, `identity-signup`, 11 Legacy-PDF/SMTP/Auth-Endpoints
- **Block 4:** `netlify.toml` CSP `api.airtable.com` raus, `sw.js` Skip-Bedingung raus + supabase.co ergänzt (v251), `AIRTABLE-ENV-CLEANUP-LIST.md` für Marcel (12 ENV-Vars manuell)
- **Block 5:** Verifikation 15/15 PASS, Master-Files-Update
- **Tag:** `v203-vollcutover-airtable-out` (pending bis Marcel-Test grün)

### 01.05.2026 abend — Master-Doku-Konsolidierung

- `docs/master/` mit 5 Master-Files + README erstellt
- Drifts vs `masterplan-v2/00_MASTERPLAN.md` (Tag 0) dokumentiert
- Selbst-Pflege-Pflicht etabliert
- Alte Skeleton-Branches (post-option-c-master-update + cleanup-and-update) obsolet
- Doc: dieser File + Status-Doc folgt

---

## 🔧 Tech-Stack-Snapshot (post-Option-C)

```
Frontend Stack:
  Vanilla JS + ESM hybrid · KEINE Frameworks
  Service Worker prova-v249 (cache invalidation per deploy)
  Supabase-JS v2.105.0 (autoRefreshToken, persistSession, PKCE)

Auth-Architektur (post-Option-C):
  Frontend Login    : auth-supabase-logic.js → supabase.auth.signInWithPassword
  Bridge in Storage : prova_auth_token = ECHTER session.access_token (ES256 JWT 3-Teiler)
  Server-Verify     : auth-resolve.js (async, dual-verify)
                       → 3-Teiler: supabase-jwt.js (jose+JWKS, ES256)
                       → 2-Teiler: auth-token.js (Legacy HMAC, Fallback)
  401-Recovery      : prova-fetch-auth.js → refreshSession + 1× Retry → erst dann Logout

Backend:
  Netlify Functions (~48 Stück, davon 25 Auth-protected)
  Supabase Edge Functions (8+, X3 brief-generate v3, X4 pdf-generate v3)
  Supabase Postgres (Frankfurt, 61 Tabellen, RLS-Multi-Tenancy)
  Airtable Legacy-Read-Path (wird ausphased)

Hosting:
  prova-systems.de       → LANDING (DM Sans, Navy)
  app.prova-systems.de   → SaaS-App (Inter — partial, Login-protected)
  admin.prova-systems.de → ADMIN (geplant Sprint 18)

ENV-Vars (Auth):
  PROVA_SUPABASE_JWKS_URL    ← public, kein Secret
  PROVA_SUPABASE_PROJECT_URL ← optional
  AUTH_HMAC_SECRET           ← Legacy-Fallback

Dependencies:
  jose@^6.2.3 (Industry-Standard JWT-Verify)
  @supabase/supabase-js@^2.105.0
  bcryptjs, stripe, nodemailer, web-push, form-data, dotenv
```

---

## 📋 Pending Action-Items

### Akut (heute/morgen)

1. **Marcel-Login-Test** — Option C grün?
   - Bei grün: Tag `v202-jwt-server-verify` setzen
   - Bei rot: Diagnose mit Branch `fix/option-c-supabase-jwt-server-side` rückrollbar
2. **4 Pending Branches reviewen + mergen** (KEIN Merge bisher):
   - `cleanup/cluster-review-auto` (-20 Pages)
   - `docs/ki-prompts-master-skeleton`
   - `fix/pricing-discrepancy`
   - `docs/master-plan-konsolidiert` ← DIESER Sprint
3. **Alte Branches löschen** (obsolete TODO-Skeletons):
   - `docs/post-option-c-master-update`
   - `docs/post-option-c-cleanup-and-update`

### Bald (diese Woche)

4. **Schema-Migration 06b** im Supabase-Dashboard applizieren (`PLANNED_06b_auftraege_extend.sql`)
5. **Sprint 06b/06c Live-Save** aktivieren (LocalStorage → DB-`createDraft`)
6. **UX-Entscheidung Sprint-06b-Skeleton** (COCKPIT-Eintrag vs Sidebar-Split-Button)
7. **3 BLOCKED Cluster-Pages** entscheiden (`ortstermin-arbeitsblatt`, vorlage-10/11)
8. **2 pdfmonkey-Templates** entscheiden (DELETE oder `docs/templates-source/`)
9. **Stripe Webhook Secret erneuern** vor Pilot

### Later (vor Pilot)

10. **Sprint 04e** Verknüpfungen MEGA · **Sprint 04c** Globale Suche · **Sprint 04d** Bescheinigungen Top 12
11. **Sprint 09a/b** KI-Werkzeug komplett (KI-PROMPTS-MASTER.md füllen)
12. **Sprint 10** Auftragstypen-Stufenmodell + Externe Docs
13. **Sprint 11** Workflows + Fristen + Dashboard-Widgets
14. **Sprint 12** Rechnungen + Bescheinigungen-Workflow
15. **Make-Scenarios T3 + F1** manuell aktivieren
16. **Demo-Fall `SCH-DEMO-001`** automatisch beim Onboarding (Sprint 20 Plan)
17. **`auth-guard.js` (Legacy root) löschen** sobald `app-login.html` migriert

### Post-Pilot Backlog

18. **AUTH-PERFEKT 2.0** — Multi-Role-System, Workspace-Switcher (Sprint 18 Plan)
19. **Logic-Files modernisieren** — `localStorage.prova_sv_email` → `await getCurrentUser()`
20. **HMAC-Fallback entfernen** — wenn alle Functions Supabase-only
21. **Headless-Login-Smoke-Test** — Playwright-Pattern in `scripts/smoke-test-cutover.sh`

---

## 💡 Permanente Regeln (Top-5 für aktuelle Session)

Volle Liste in `docs/master/PROVA-REGELN-PERMANENT.md` (40 Regeln, davon 33-35 Tag-7-Lessons).

1. **Diagnose-First** (Regel 33): Browser-Claude beschreibt Problem, Claude Code analysiert SELBST. Keine blinde Code-Vorgabe.
2. **Hardcoded-Defaults greppen** (Regel 34): Bei Migration Test-File → Production immer grep auf hardcoded Test-URLs.
3. **PROVA-Prefix bei ENV-Vars** (Regel 35): Multi-Tenant-Namen kollisionsfrei.
4. **sw.js Bump bei JS/CSS/HTML in APP_SHELL** (Regel 30): immer im selben Commit.
5. **Konjunktiv-II nur GPT-4o** (Regel 14): NIEMALS GPT-4o-mini — Mini scheitert reproduzierbar.

---

## 🎯 Wichtige IDs

| Was | Wert |
|---|---|
| Supabase-Project-ID | `cngteblrbpwsyypexjrv` (Frankfurt) |
| JWKS-URL | `https://cngteblrbpwsyypexjrv.supabase.co/auth/v1/.well-known/jwks.json` |
| Workspace-ID Marcel | `65b25a13-17b7-45c0-b567-6edee235dd98` |
| Stripe-Add-on 5F | `price_1TJLnv8` |
| Stripe-Add-on 10F | `price_1TJLpG8` |
| Founding-Coupon | `FOUNDING-99` (99 €/Mo lifetime, erste 10 Pilotkunden) |
| Domains | prova-systems.de · app.prova-systems.de · admin.prova-systems.de (TBD) |
| GitHub | github.com/PROVA-Systems/prova-systems |

---

## 📚 Wichtige Doku im Repo

### `docs/master/` (Single Source of Truth — diese Files)
- `README.md` (Selbst-Pflege-Pflicht-Protokoll)
- `PROVA-VISION-MASTER.md`
- `PROVA-SPRINTS-MASTERPLAN.md`
- `PROVA-ARCHITEKTUR-MASTER.md`
- `PROVA-REGELN-PERMANENT.md`
- `PROVA-CHAT-TRANSPORT-vAKTUELL.md` (diese Datei)

### Repo-Root (Operations)
- `CLAUDE.md` (Arbeits-Richtlinien für Claude Code, lebend)
- `CHANGELOG-MASTER.md` (Sprint-02-04 Detail-Log)
- `KI-PROMPTS-MASTER.md` (Sprint-9-Skeleton, auf Branch)

### `docs/` (lebende Operations-Doku)
- `PROVA-MARCEL-SELBSTHILFE.md` (Marcel-Selbsthilfe)
- `PROVA-CHAT-START-NEXT-SESSION.md` (Quick-Start für nächsten Chat)
- `MARCEL-KNOWLEDGE-CLEANUP.md` (Knowledge-Sync-Liste)
- Operations-Runbooks (`CUTOVER-RUNBOOK.md`, `MIGRATION-RUNBOOK.md`)

### `docs/sprint-status/` (Sprint-DONE-Reports, neueste oben)
- `MASTER-DOCS-CLEANUP-DONE.md`
- `OPTION-C-DONE.md` ← LIVE-DEPLOY-STATUS
- `OPTION-C-INVENTORY.md` (Phase 1+1.5)
- `PARALLEL-SPRINT-DONE.md`
- `CUTOVER-BLOCK-3-DONE.md`
- `NACHT-SPRINT-LOG.md`
- `CUTOVER-BLOCK-3-INVENTORY.md`
- `PHASE-4-CUTOVER-DONE.md`
- `APP-LANDING-SPLIT-INVENTORY.md`
- `ARCHIV-INVENTAR.md`

### `docs/diagnose/`
- `LOGIN-REDIRECT-BUG.md` (Hotfix v246)
- `LOGIN-LOOP-SOLUTION.md` (Cutover Block 3 Architektur)
- `TOKEN-EXPIRED-BUG.md` (Option C Trigger)

### `docs/archiv/` (post-Cleanup)
- `chat-transports/` (alte CHAT-TRANSPORT-vXX)
- `sprint-prompts/` (alte *-COMPLETE, *-PROMPT)
- `anleitungen/` (alte CLEANUP-ANLEITUNG)
- `master-snapshots/` (für Pre-Update-Backups)

### `masterplan-v2/` (HISTORISCH, Plan-Stand 25.04.)
- `00_MASTERPLAN.md` (21-Tage-Plan v2.1)
- `01_UI-PRINZIPIEN.md` (Design-System v1.0 Source)
- weitere Sprint-Detail-Files

### Live-Architektur-Code (Schlüssel-Files)
- `lib/auth-guard.js` (runAuthGuard, writeLegacyBridge, Loop-Counter)
- `lib/supabase-client.js` (Supabase-Singleton, prova-auth-token storageKey)
- `auth-supabase-logic.js` (handleLogin/handleSignUp mit Session-Bridge)
- `prova-fetch-auth.js` (Defense-in-Depth Refresh-vor-Logout)
- `netlify/functions/lib/supabase-jwt.js` (NEU — jose-JWKS-Verify)
- `netlify/functions/lib/auth-resolve.js` (async, dual-verify)
- `netlify.toml` (v6.0 — Cross-Domain-Redirects + Block C-pre Path-Rewrites)
- `_redirects` (LANDING-only Path-Aliase)
- `sw.js` (CACHE_VERSION prova-v249)

---

## 🚀 Erste Antwort an Marcel — Template

(Wenn Marcel einen neuen Browser-Claude-Chat startet:)

```
Hallo Marcel,

ich habe die letzten Stand-Files gelesen:
- docs/master/PROVA-CHAT-TRANSPORT-vAKTUELL.md (dein Stand-Briefing)
- docs/sprint-status/OPTION-C-DONE.md (Live-Stand sw.js v249)
- docs/master/PROVA-SPRINTS-MASTERPLAN.md (Sprint-Historie + Restplan)

Stand 01.05.2026 abend (Tag 7):
✅ APP-LANDING-SPLIT live (Tag v200, 30.04. abend)
✅ Cutover Block 3 — 51 Pages migriert (sw.js v248)
✅ Option C — Server-Side Supabase-JWT-Verify deployed (sw.js v249)
✅ Master-Doku konsolidiert in docs/master/ (Selbst-Pflege-Pflicht etabliert)
⏳ Login-Test pending → bei grün: Tag v202

Pending Branches zum Review/Merge:
- cleanup/cluster-review-auto (20 DEAD-Pages weg)
- docs/ki-prompts-master-skeleton
- fix/pricing-discrepancy

Wo möchtest du weitermachen — Login-Test reviewen, 
3 Branches mergen, oder Sprint 06b/06c Schema-Migration?
```

---

## 🧭 Selbst-Pflege-Pflicht (für Claude Code)

Diese Datei wird NACH JEDEM Sprint überschrieben. Update-Trigger:
- **Sprint-Ende** — Sektion „Was die letzten 24h passiert ist" + „Pending Action-Items"
- **Architektur-Änderung** — Tech-Stack-Snapshot + Wichtige IDs
- **Tag-Setzen** — Tag-Liste in `PROVA-SPRINTS-MASTERPLAN.md` zuerst, dann hier referenzieren
- **Major-Bugfix** — Sektion „Worauf achten" + ggf. neue Regel

Volles Update-Protokoll in `docs/master/README.md`.

---

*Chat-Transport vAKTUELL · 01.05.2026 abend · Wird nach jedem Sprint überschrieben · Versions-Historie im git-Log*
