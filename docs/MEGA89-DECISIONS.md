# MEGA⁸⁹ DECISIONS — Pilot-Security-Hardening + Cockpit-Polish

**Stand:** 2026-05-18 · Branch: `feat/mega89-pilot-security-hardening`
**Tag-Empfehlung:** `v3950-mega89-pilot-security`
**Trigger:** Leon-Lottermoser-Incident — Trial expired 16.05., aber Mutationen bis 18.05. möglich.

---

## Pre-Read-Ergebnis

- **47 Mutations-Tabellen** mit workspace_id im public-Schema
- **182 RLS-Policies** gesamt (56 ALL + 31 INSERT + 21 UPDATE + 12 DELETE + 62 SELECT)
- **pg_cron Extension** aktiv → Block B nutzt cron.schedule()
- **21 User-Content-Tabellen** ausgewählt für Read-Only-Lock (System-Tables + user-spezifische bookmarks/user_favoriten/onboarding/einwilligungen unberührt)
- **Migration-Nummern** 67-71 (statt 63-66 aus Prompt — kollidierte mit MEGA88-D)

---

## Architektur-Entscheidungen

### A) workspace_is_writable() statt Trigger
Statt BEFORE-INSERT-Trigger auf jede Tabelle: zentrale Helper-Function `public.workspace_is_writable(uuid)` in **jeder Policy** aufrufen. Vorteile:
- Eine Stelle für Status-Logic → bei Status-Erweiterung (z.B. `frozen`) nur 1 Function ändern
- Postgres optimiert STABLE-Functions besser als BEFORE-Trigger (Index-Lookup pro Row vs Function-Call pro Row)
- SECURITY DEFINER damit Policy-Eval auch für authenticated-Role greift

### B) Read-Policies UNVERÄNDERT
Pausierte/gekuendigte User MÜSSEN ihre Daten weiterhin lesen können:
- DSGVO Art. 15 Datenauskunft
- DSGVO Art. 20 Datenportabilität
- Email-Versprechen „du kannst deine Daten jederzeit als DSGVO-Export herunterladen"

Nur INSERT/UPDATE/DELETE/ALL bekommen den Lock.

### C) pg_cron vs Netlify-Scheduled
pg_cron aktiv → DB-native Schedule. Vorteile vs Netlify-Schedule:
- Atomare Transaction (UPDATE + Audit-Log in einer DB-Connection)
- Keine HTTP-Overhead
- Kein Token-Management
- Failover-sicher (pg_cron läuft selbst bei Netlify-Function-Outage)

### D) record_user_login als DB-Function
Atomarer Insert in 3 Tabellen (users + user_sessions + audit_trail) via SECURITY DEFINER. Frontend bekommt nur Session-ID zurück, kein direkter Insert in user_sessions nötig (RLS-Policy würde funktionieren, aber atomare Garantie ist hier wichtiger).

### E) suspicious_activity_v1 als VIEW statt Materialized View
- Live-Daten (Marcel checkt 1×/Tag im Cockpit, akzeptable Latency)
- Materialized View bräuchte REFRESH-Cron
- LATERAL-Joins für Aggregates per Workspace effizient
- HAVING-Clause filtert direkt im View → Cockpit-Code minimal

### F) admin-suspend-workspace nutzt auth.admin.updateUserById
Statt direktem UPDATE auf `auth.users.banned_until` (geht nicht via Supabase-JS Client) nutzen wir Service-Client `auth.admin.updateUserById(id, { ban_duration: '720h' })`. Setzt `banned_until = NOW + 30d`. Marcel-only via Email-Allow-List in Edge.

---

## Files

| File | Status | Beschreibung |
|---|---|---|
| `supabase-migrations/67_mega89_workspace_is_writable.sql` | **NEU** | Helper-Function |
| `supabase-migrations/68_mega89_rls_writable_lock.sql` | **NEU** | ~30 Policy-Patches auf 21 Tabellen |
| `supabase-migrations/69_mega89_cron_lock_expired_trials.sql` | **NEU** | Cron-Function + Schedule |
| `supabase-migrations/70_mega89_record_user_login.sql` | **NEU** | Login-Tracking-Function |
| `supabase-migrations/71_mega89_suspicious_activity_view.sql` | **NEU** | View für Cockpit |
| `app-login-logic.js` | modified | record_user_login-Hook nach _completeLogin |
| `lib/prova-session-heartbeat.js` | **NEU** | 5min-Heartbeat auf last_activity_at |
| `dashboard.html` | modified | Heartbeat-Lib eingebunden |
| `admin-kpis.html` | modified | 2FA-Anzeige + Suspicious-Section + Funnel-Section |
| `supabase/functions/admin-suspend-workspace/index.ts` | **NEU** | Sperr-Edge mit Owner-Ban |
| `sw.js` | modified | v3905 → v3950 |
| `docs/SW-VERSION-HISTORY.md` | modified | MEGA89-Eintrag |
| `docs/MEGA89-DECISIONS.md` | **NEU** | dieses File |
| `docs/MEGA89-MARCEL-CHECKLIST.md` | **NEU** | 8-Punkte-Smoke |
| `docs/MEGA89-VERIFICATION.md` | **NEU** | Self-Test-Ergebnisse |
| `CLAUDE.md` | modified | 3 neue Compounding Lessons |

---

## Marcel-Apply (5 Schritte)

1. **5 Migrations applien** in Reihenfolge 67→71 via MCP
2. **1 Edge deployen**: `admin-suspend-workspace`
3. **Sofort-Test:** `SELECT public.cron_lock_expired_trials();` → Leon's Workspace gelockt
4. **8-Punkte-Smoke** aus MARCEL-CHECKLIST.md
5. **PR mergen** + Tag `v3950-mega89-pilot-security`
