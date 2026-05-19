# PROVA Pilot-Launch-Readiness Report

**Stand:** 2026-05-19 · Tag: `v4000-pilot-launch-ready`
**MEGA-Marathon:** 5 Phasen + Phase 2.5 NEU komplett.

---

## ✅ Was ist Live

### Security & Compliance
- **RLS Hard-Lock** auf 21 User-Content-Tabellen via `workspace_is_writable()` Helper (Migration 67+68)
- **Auto-Trial-Expiry** Cron daily 02:00 UTC mit Founder-Exclude-Hotfix (Migrations 69+72)
- **Suspicious-Activity-Detection** via `suspicious_activity_v1` View + Cockpit-Section + 1-Click-Sperren (Migration 71 + admin-suspend-workspace Edge)
- **Login-Tracking** via `record_user_login()` atomar + 5min-Heartbeat (Migration 70 + lib/prova-session-heartbeat.js)
- **TOTP-Sync** zwischen auth.mfa_factors ↔ users.totp_enabled (Migration 62 Trigger)
- **2FA Recovery-Codes** mit sha256-Hash + 10-Code-Format + Constant-Time-Compare (Migration 61 + 2 Edges)
- **Coupon-Security:** FOUNDING-99 niemals mehr hartcoded (MEGA88-D Block A)

### Subscription & Trial
- **Founding-Status** ENUM (standard/founding_member/pilot_tester) auf workspaces (Migrations 63+73)
- **90-Tage-Trial** via `?founding=1` / `?pilot=1` URL-Param + extended_trial_days-Spalte
- **Workspace-Invite-Founding-Toggle** für Marcel (Super-Admin-only)

### UX & Branding
- **Logo-System** 4 SVG-Varianten + PNG-Pipeline (MEGA88-A)
- **Bibliothek-Drawer** Cmd+B Hotkey in 5 Pages (MEGA86)
- **Workspace-Switcher** mit Auto-Mount (MEGA87)
- **5-Step Onboarding-Tour** Auto-Trigger nach Register
- **Trial-Banner** mit Founding-Variante
- **Cockpit:** Live-Sessions + Suspicious-Activity + Conversion-Funnel + 2FA-Anzeige
- **Button-Design-System** (NEU MEGA-Marathon Phase 3): 5 Varianten × 3 Sizes mit Multi-Layer-Shadows + Hover-Lift + Loading-State + Dark-Mode + Legacy-Compat-Bridge

### Tooling
- **PDFmonkey-Bulk-Patch** Tool (NEU Phase 2.5): `tools/pdfmonkey-bulk-patch.js` REST-API mit Dry-Run/Backup/Rollback
- **Audit-Log-v1** Single-Endpoint mit Integrity-Hash-Kette (MEGA84)
- **Global-Search-v2** RPC über 5 Tabellen (MEGA84)

---

## 🛠 Marcel-Tasks vor Pilot-Live

### Sofort (Marcel-Manual)
1. **Migrations 63+73 sind appliziert** ✅ — `founding_status` + `extended_trial_days` Spalten live
2. **PDFmonkey-Templates patchen:**
   ```bash
   $env:PDFMONKEY_API_KEY = "..."
   node tools/pdfmonkey-bulk-patch.js --dry-run
   node tools/pdfmonkey-bulk-patch.js --execute
   ```
3. **Stripe-Coupon FOUNDING-99 limitieren:** `max_redemptions: 10`, `valid_until: 2026-12-31` (siehe `docs/MEGA88-D-MARCEL-STRIPE-CHECKLIST.md`)
4. **Pro Founding-Tester:** eigenen Stripe-Coupon `FND-99-<NAME>` erstellen + in `workspaces.stripe_coupon_assigned` setzen
5. **stripe-checkout Netlify-Function ergänzen:** liest `workspaces.stripe_coupon_assigned` → pre-applied `discounts: [{ coupon }]` (5-10 Z Patch)

### IONOS-DNS + Mail-Provider
6. **admin.prova-systems.de** DNS-Eintrag setzen (CNAME auf Netlify)
7. **IONOS-SMTP** Live-Test mit support-email
8. **Resend-API-Key** im Netlify-ENV verifizieren (für Welcome-Mails)

### Marketing
9. **Pilot-Outreach** an BVS / VBD / IfS-Mitgliederlisten
10. **Founding-Member-Akquise** — Link mit `?founding=1` an erste 10 SVs

---

## 🧪 Smoke-Test (10 Punkte) vor Pilot-Live

| # | Test | OK? |
|---|---|---|
| 1 | Browser-Cache leeren → SW v4000-pilot-launch-ready aktiv | ☐ |
| 2 | Register als Test-User → 14d Trial + Dashboard + 5-Step Onboarding-Tour | ☐ |
| 3 | Register via `?founding=1` → 90d Trial + Founding-Tour-Step OHNE Coupon-Code | ☐ |
| 4 | Auftrag anlegen + Diktat aufnehmen + §1-§5 KI-strukturieren + §6 manuell + Freigabe + PDF | ☐ |
| 5 | 2FA aktivieren mit Recovery-Codes → Logo erscheint in Authenticator-App | ☐ |
| 6 | Recovery-Code-Login (TOTP-Code falsch → Recovery-Code-Pfad) → funktional | ☐ |
| 7 | Marcel-Login auf admin.prova-systems.de → Cockpit zeigt Live-Sessions + Suspicious + Funnel | ☐ |
| 8 | Trial expired (Test mit manuell gesetztem `abo_trial_endet_am`) → INSERT-Versuch in auftraege schlägt mit Policy-Violation fehl | ☐ |
| 9 | Cron-Job läuft 02:00 UTC daily — verifiziert via `SELECT * FROM cron.job WHERE jobname='lock-expired-trials';` | ☐ |
| 10 | Buttons sehen modern aus (Hover-Lift, Shadow-Layers, Loading-Spinner in einstellungen.html) | ☐ |

---

## 📊 Sprint-Bilanz seit MEGA82 (16 Tage)

| Sprint | Datum | Tag | Hauptlieferung |
|---|---|---|---|
| MEGA82 + 2 Hotfixes | 15.-16.05. | v3300 | Phase-System + Kalender + AZ-DB-Trigger |
| MEGA83 | 16.05. | v3350 | Akte-Mission-Control + Cross-Subdomain-Bridge |
| MEGA84/85 (4 Passes) | 16.-17.05. | v3600 | Vor-Ort-Power + Cockpit + Audit-v1 + Bibliothek |
| MEGA86 + HOTFIX | 17.05. | v3710 | Pilot-Blocker + Drawer + Onboarding-Tour |
| MEGA87 AUTH-PERFEKT 2.0 | 17.05. | v3800 | Audit + 2FA-Recovery + Workspace-Switcher + Invitations |
| MEGA88-A Logo | 17.05. | v3850 | Brand-Logo-System + PWA |
| MEGA88-C TOTP-Sync | 18.05. | v3905 | Two-Worlds-Pattern Fix |
| MEGA88-D Coupon-Security | 18.05. | v3950 | FOUNDING-99-Hardcoded raus + 90d-Trial |
| MEGA89 Pilot-Security | 18.05. | v3950 | RLS Hard-Lock + Suspicious + Conversion-Funnel |
| **MEGA-Marathon** | **19.05.** | **v4000** | **PDFmonkey-Bulk + Button-Design-System + Founder-Hotfix** |

---

## 🚀 Pilot-Launch-Ready

**Vision-Master-Status:** ~98% Code-fertig. Verbleibende 2% sind Marcel-Manual-Tasks (Stripe-Limitierung, PDFmonkey-Patches via Tool, DNS, Outreach).

**Bei grünem Smoke-Test:** PROVA Systems ist bereit für Founding-10-Pilot mit echten Sachverständigen.
