# MEGA⁸⁷ Block A.1+A.2 — Auth-Stack-Inventory

**Stand:** 2026-05-17 · Sprint MEGA⁸⁷ AUTH-PERFEKT 2.0

---

## Tabellen-Übersicht (Auth-relevant)

| Tabelle | Zweck | Status |
|---|---|---|
| `auth.users` | Supabase nativ — Email + Hash + Metadata | ✅ aktiv |
| `public.users` | App-Profil-Daten (vorname, nachname, founding_member, **totp_secret, totp_enabled, totp_recovery_codes, totp_last_used_at, totp_setup_started_at**) | ✅ aktiv |
| `public.workspaces` | Tenants | ✅ aktiv |
| `public.workspace_memberships` | User↔Workspace + rolle + 4 can_*-Flags | ✅ aktiv |
| `public.workspace_invitations` | Pending-Invitations mit token + ablauf_at + status | ✅ aktiv (für Block F) |
| `public.user_sessions` | Live-Sessions mit device_typ + ip_address + jwt_hash + revoke_at | ✅ aktiv (für Block H) |
| `public.audit_trail` | Append-Only Log mit integrity_hash-Kette | ✅ aktiv |

### ENUM `member_rolle` (verifiziert via SQL)

```
{owner, admin, sv, assistenz, readonly}
```

**Abweichung von Marcel-Memory** (`super_admin/admin/sv/member/viewer`) — die tatsächliche DB-Wahrheit zählt. Mapping:

| Marcel-Memory | Tatsächlich DB | Bedeutung |
|---|---|---|
| `super_admin` | (nicht in ENUM) | Marcel als Owner aller Workspaces via `users.is_super_admin` Flag-Check, NICHT als ENUM-Rolle |
| `admin` | `owner` (Hauptrolle) + `admin` (Stellvertreter) | Owner = Account-Holder, Admin = darf invite+billing+export+delete |
| `sv` | `sv` | Default-Rolle Sachverständiger |
| `member` | `assistenz` | Team-Mitglied mit reduzierten Rechten |
| `viewer` | `readonly` | read-only Share-User |

---

## Auth-Frontend-Files

### ✅ KEEP — Aktive Auth-Files (post-MEGA46-Refactor)

| File | Funktion | Notes |
|---|---|---|
| `app-login.html` + `app-login-logic.js` | Supabase signInWithPassword + MFA-Step + Recovery-Code-Path | MEGA45 + MEGA52, funktional |
| `app-register.html` | Supabase signUp + Coupon-Field (Pass 2b) + Onboarding-Pending-Flag (MEGA86) | aktiv |
| `auth-supabase.html` | Alternative Supabase-Login-Page | Sprint K-1.4 B12 |
| `auth-guard.js` | Token-Verify (JWT 3-part + Legacy 2-part) + Session-Timeout + Activity-Tracking | MEGA53 |
| `lib/supabase-client.js` | Singleton + crossDomainStorage-Adapter + signOut | MEGA39 P10 F1 |
| `lib/prova-legacy-bridge.js` | Cross-Subdomain-Cookies für 5 Legacy-Keys + Hydrate | MEGA83 + MEGA86-Diag |
| `setup-2fa.html` | Initial 2FA-Setup mit QR-Code | wird Block D erweitert |
| `account-gesperrt.html` | Lockout-Page | aktiv |
| `dsgvo-mein-konto.html` | DSGVO Art. 15/17/20 — Auskunft/Löschung/Export | aktiv |
| `profil-supabase.html` | User-Profil | wird Block G erweitert |

### ⚠️ MIGRATE — Legacy-Pages mit polyfill-API

29 Files referenzieren `netlifyIdentity` — aber **alle nutzen den `lib/netlify-identity-polyfill.js`** (MEGA46, 2026-05-09). Der Polyfill ist eine API-Surface-Shim die intern auf Supabase Auth + localStorage umleitet ohne das Original-Widget zu laden. Praktisch: kein echtes Netlify-Identity-Widget mehr aktiv, nur API-Compat.

**Status:** ✅ Polyfill-Pattern bleibt aktiv und ist Production-stable (seit MEGA46 deployed). Marcel-Direktive „Netlify Identity removed" ist **erfüllt** — kein Widget mehr geladen, nur API-Compat-Shim.

**Files mit Polyfill-Refs (29):**
- HTML: `app-register.html`, `mahnung.html`, `account-gesperrt.html`, `app-login.html`, `briefe/maengelanzeige.html`, `einstellungen.html`
- JS: `app-login-logic.js`, `nav.js`, `lib/edge-shim.js`, `vor-ort-logic.js`, `prova-auth-api.js`, `lib/editor-tiptap.js`, `lib/import-assistent-supabase.js`, `lib/editor-spell-layer.js`, `lib/docx-export.js`, `push-optin.js`
- Polyfill selbst: `lib/netlify-identity-polyfill.js`
- Docs/Tests/Archive (nicht Production): 12 weitere

### ❌ REMOVE — Tot-Code

| Item | Status |
|---|---|
| Original `netlify-identity-widget.js` Script-Tag | ⚪ war bereits entfernt vor MEGA87 (MEGA46) — nirgends mehr im Repo |
| `[[redirects]]` für `/.netlify/identity/*` in netlify.toml | ⚪ war bereits entfernt — keine Treffer |
| `NETLIFY_IDENTITY_*` ENV-Vars | ⚪ in docs/ops/env-cleanup-phase-2.md als deprecated dokumentiert |

→ **Keine Hard-Removal-Aktionen mehr nötig.**

---

## Auth-Edge-Functions

### Aktive Auth-Edges

| Edge | Zweck | Status |
|---|---|---|
| `admin-impersonate` | MEGA54 — Admin Login-as-User mit reason+rate-limit | ✅ aktiv |
| `audit-log-v1` | MEGA84 Pass 2c — Single Audit-Endpoint mit Integrity-Hash-Kette | ✅ aktiv |
| `send-email` | Resend-API Wrapper | ✅ aktiv |
| `send-support-reply` | MEGA86 — Marcel-only Support-Reply | ✅ aktiv |

### Noch zu bauen (Block D-F)

| Edge | Block | Status |
|---|---|---|
| `verify-recovery-code` | D | **NEU bauen** |
| `send-workspace-invitation` | F | **NEU bauen** |
| `accept-workspace-invitation` | F | **NEU bauen** (oder im accept-page-Frontend) |

---

## Architektur-Übersicht (post-MEGA87)

```
                 ┌─ supabase.auth.signInWithPassword (MEGA45)
                 │
   Login-Form ──┼─ TOTP-Step (existing MEGA52)
   (app-login)  │
                 └─ Recovery-Code-Step (NEW Block D)
                              │
                              ▼
                  _completeLogin() (app-login-logic.js)
                              │
                              ▼
            ┌── localStorage Bridge-Keys (5)
            ├── crossDomainStorage Cookie .prova-systems.de
            └── workspace_memberships → erste/aktive Workspace
                              │
                              ▼
                  dashboard.html
                              │
                              ├── nav.js Workspace-Switcher (NEW Block E)
                              ├── auth-guard refreshActivity
                              └── audit-log-v1 task=login Event
```

---

## Acceptance Block A ✅

- 2 Doku-Files: dieses + `MEGA87-PERMISSION-MATRIX.md`
- 0 Code-Änderungen
- Rollen-ENUM-Wahrheit ermittelt (owner/admin/sv/assistenz/readonly)
- totp_recovery_codes-Column existiert bereits — Migration 61 muss nur 2 neue Spalten ergänzen
- workspace_invitations + user_sessions Tabellen existieren bereits (gut für F + H)
