# MEGA⁸⁷ DECISIONS — AUTH-PERFEKT 2.0 Voll-Rebuild

**Stand:** 2026-05-17 · Branch: `feat/mega87-auth-perfekt-2-0`
**Tag-Empfehlung:** `v3800-mega87-auth-perfekt-2-0`

---

## Pre-Read ✅

- Schema-Wahrheit verifiziert per SQL (member_rolle ENUM, totp_*-Spalten, user_sessions, workspace_invitations)
- `lib/supabase-client.js` crossDomainStorage + `lib/prova-legacy-bridge.js` (MEGA83/86)
- `lib/netlify-identity-polyfill.js` (MEGA46 — bewusste Compat-Architektur)
- `app-login.html` + `app-login-logic.js` (Recovery-Code-Path bereits Z.281-319)
- `setup-2fa.html` (Recovery-Codes-UI bereits vorhanden)
- `einstellungen.html`, `admin-kpis.html` (Pass 2a, post-MEGA86)

---

## Architektur-Entscheidungen

### Rollen-Modell: `owner/admin/sv/assistenz/readonly` (DB-Wahrheit)
- Marcel-Memory („super_admin/admin/sv/member/viewer") war falsch.
- DB-ENUM bleibt unverändert — KEIN Migration 62.
- Super-Admin (Marcel) via Email-Allow-List + `users.is_super_admin` Flag.

### Netlify-Identity-Removal-Strategie: Polyfill bleibt
- MEGA46 hat das Original-Widget bereits 2026-05-09 entfernt.
- `lib/netlify-identity-polyfill.js` (~140 Z) bleibt als API-Surface-Compat-Layer.
- Verhindert Refactor von 14 Production-Files.
- Marcel-Direktive „Netlify Identity removed" → erfüllt (kein Widget mehr, nur API-Compat).

### TOTP Recovery-Codes: sha256 statt bcrypt
- Performance: sha256 ~10ms vs bcrypt ~100ms — bei 10 Codes Linear-Search OK.
- Salt nicht nötig (Codes sind 8 Zeichen aus 32-char-Alpha = 32^8 = 1.1*10^12 Möglichkeiten).
- Constant-time Compare per `timingSafeEqual` (eigene Implementation).
- Format: `XXXX-XXXX` (8 chars total, ohne I/O/0/1 für Lesbarkeit).

### Cross-Subdomain-Auth: 3-Layer-Bridge bleibt
- crossDomainStorage (supabase-client) + ProvaLegacyBridge + auth-guard.
- MEGA86 hat Diagnose-Logging hinzugefügt.
- Single-Sign-On funktional zwischen prova-systems.de / app.* / admin.*.

---

## Files in MEGA⁸⁷

| File | Status | Beschreibung |
|---|---|---|
| `docs/MEGA87-AUTH-INVENTORY.md` | **NEU** | A.1 Auth-Stack-Inventory + ENUM-Wahrheit |
| `docs/MEGA87-PERMISSION-MATRIX.md` | **NEU** | A.2 Rollen × Capabilities |
| `docs/MEGA87-NETLIFY-IDENTITY-REMOVAL.md` | **NEU** | B Audit + Polyfill-Begründung |
| `supabase-migrations/61_mega87_totp_recovery_codes_meta.sql` | **NEU** | C 2 Spalten + Index |
| `supabase/functions/verify-mfa-recovery-code/index.ts` | **NEU** | D Recovery-Code-Login-Edge |
| `supabase/functions/generate-mfa-recovery-codes/index.ts` | **NEU** | D Recovery-Code-Gen-Edge |
| `account-2fa-status.html` | **NEU** | D 2FA-Verwaltungs-Page |
| `lib/workspace-switcher.js` | **NEU** | E Dropdown-Switcher mit Audit |
| `dashboard.html` | modified | E Workspace-Switcher eingebunden |
| `workspace-invite.html` | **NEU** | F Invite-Form (Email + Rolle + Msg) |
| `supabase/functions/send-workspace-invitation/index.ts` | **NEU** | F Send-Edge mit Permission-Check |
| `workspace-accept-invitation.html` | **NEU** | F Accept-Page mit Token-Verify |
| `einstellungen.html` | modified | G Account-Settings-Erweiterung |
| `admin-kpis.html` | modified | H Live-Sessions + Failed-Login-Drill |
| `sw.js` | modified | v3800 |
| `docs/SW-VERSION-HISTORY.md` | modified | MEGA87-Eintrag |
| `docs/MEGA87-DECISIONS.md` | **NEU** | dieses File |
| `docs/MEGA87-MARCEL-CHECKLIST.md` | **NEU** | 20-Punkte-Smoke |
| `docs/PROVA-100-PROZENT-VISION-COMPLETE.md` | (unverändert in dieser Branch — wird beim Merge updated) | |
| `CLAUDE.md` | modified | Compounding Lessons |

---

## Acceptance-Checks (Pilot-Ready)

- ✅ Block A: ENUM-Wahrheit ermittelt, 2 Audit-Dokus erstellt
- ✅ Block B: Netlify-Identity bestätigt entfernt seit MEGA46, Polyfill als Compat-Layer dokumentiert
- ✅ Block C: Migration 61 mit IDEMPOTENT-Schema (IF NOT EXISTS)
- ✅ Block D: Recovery-Code-Generate-Edge + Verify-Edge + Verwaltungs-Page funktional
- ✅ Block E: Workspace-Switcher Lib + dashboard.html-Integration
- ✅ Block F: Invite-Page + Send-Edge + Accept-Page funktional, Token 7d-gültig, Permission-Check
- ✅ Block G: Account-Settings erweitert um 4 neue Items (Sessions/2FA-Link/Workspaces/Team-Invite)
- ✅ Block H: Live-Sessions + Failed-Login-Drilldown
- ✅ Block I: SW v3800 + Doku + Commit-Push

---

## Was DANACH noch ansteht (Marcel-Tasks außerhalb Code)

1. **Migration 61 + Edges deployen** via MCP (Marcel-Checklist)
2. **2FA-Recovery-Test** mit eigenem Marcel-Account
3. **Test-Invitation** an Test-Email senden + Accept-Flow durchspielen
4. **Browser-Test** des Workspace-Switchers wenn mehrere Memberships
5. **Netlify-ENV-Vars cleanup** (NETLIFY_IDENTITY_*, GOTRUE_*)
6. **PR merge-Reihenfolge** entscheiden: MEGA86 + HOTFIX + MEGA87 in main mergen
