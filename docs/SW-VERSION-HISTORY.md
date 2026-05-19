# PROVA Systems — Service-Worker Version-Historie

Diese Datei spiegelt die `CACHE_VERSION`-Historie aus `sw.js`. `sw.js` selbst
trägt nur die aktuelle Version + max 3 Sätze Kurz-Kommentar. Vollständige
Sprint-Notes leben hier.

Format: **vNNNN-marker** | YYYY-MM-DD | Sprint | Kurz-Note

---

## 2026-05-19 — MEGA-Serie #17 (MEGA-Marathon Phase 2 Konsolidierung)

**v3960-mega-marathon-merging** | 2026-05-19 | MEGA-Marathon Phase 2 Branches gemerged
- Phase 1.2-1.5: Migrationen 67-71 + Hotfix-Migration 72 (cron_lock_expired_trials excludes founders) via MCP applied. Cron-Schedule live (job-id 11). Marcel-Workspaces restored (abo_status=aktiv + is_founder=true). Final-Tag v4000-pilot-launch-ready nach Phase 5.

---

## 2026-05-18 — MEGA-Serie #16 (MEGA⁸⁹ Pilot-Security-Hardening)

**v3950-mega89-pilot-security** | 2026-05-18 | MEGA⁸⁹ Pilot-Security-Hardening + Cockpit-Polish
- **Trigger-Event:** Leon Lottermoser registriert 02.05., Trial expired 16.05., kam noch rein bis 18.05. → Auto-Expiry fehlte komplett, RLS-Read-Only nicht enforced.
- Block A RLS-Read-Only-Lock: Migration 67 (workspace_is_writable() SECURITY DEFINER Helper) + Migration 68 (Policy-Patches auf 21 User-Content-Tabellen — auftraege/kontakte/dokumente/fotos/audio/eintraege/fristen/termine/ortstermine/skizzen/notizen/befund_fragmente/anhaenge/documents/documents_versions/document_images/ki_feedback/shares/textbausteine/normen/positionen mit AND public.workspace_is_writable(workspace_id) in INSERT/UPDATE/DELETE/ALL — Read-Policies UNVERÄNDERT für DSGVO).
- Block B Auto-Trial-Expiry: Migration 69 (cron_lock_expired_trials() Function + pg_cron Schedule täglich 02:00 UTC — lockt trial-Workspaces deren abo_trial_endet_am<NOW, setzt abo_status=pausiert + max_auftraege=0 + audit_trail-Eintrag pro Lock). Migration 72 Hotfix 19.05.: Function exkludiert is_founder=true Owner.
- Block C Login-Tracking: Migration 70 (record_user_login() atomarer Insert user_sessions + users.last_login_at + audit_trail) + app-login-logic.js _completeLogin ruft Function via supabase.rpc nach _completeLogin (idempotent via sessionStorage-Token-Hash) + lib/prova-session-heartbeat.js NEU (5min-Heartbeat auf users.last_active_at + user_sessions.last_activity_at, skipt bei visibilityState=hidden, in dashboard.html eingebaut).
- Block D Cockpit-2FA-Fix: admin-kpis.html loadWorkspaces() Query refactored — JOIN workspace_memberships+users für owner.totp_enabled, ersetzt require_2fa_for_admins-Workspace-Setting in Anzeige. Filter no2fa nutzt jetzt owner_has_2fa.
- Block E Suspicious-Activity: Migration 71 (suspicious_activity_v1 View mit high/medium-Klassifizierung — high=3+ Logins + 0 Aufträge + 7d alt, medium=1+ Login + 0 Aufträge + 14d alt) + supabase/functions/admin-suspend-workspace Edge NEU (Marcel-only, setzt abo_status=pausiert + Owner-Ban via auth.admin.updateUserById 30d + audit-log-v1) + admin-kpis.html Section mit 1-Click-Sperren-Button (Confirm-Modal mit Reason-Pflicht min 10 chars).
- Block F Conversion-Funnel: admin-kpis.html neue Section mit 5 Steps (Registered → Workspace → 1.Auftrag → 1.PDF → Paid) + Bar-Chart per Step mit Drop-off-% (Color-Coded grün/orange/rot bei >30/>50%).

---

## 2026-05-18 — MEGA-Serie #15 (MEGA⁸⁸-D Coupon-Security + Founding-90d)

**v3950-mega88-d-coupon-security** | 2026-05-18 | MEGA⁸⁸-D Coupon-Security + Founding-Trial-90d
- Block A SECURITY (P0): FOUNDING-99 hartcoded aus lib/prova-onboarding-tour.js entfernt. Step 5 wird dynamisch via `_resolveCouponStep()` aus `workspaces.founding_status` befüllt. Standard-User sehen generischen 'Bereit für ersten Fall'-Step OHNE Coupon-Code. Founding/Pilot-Tester sehen Custom-Step mit Hinweis 'Coupon wird automatisch angewendet' — KEIN Code-Anzeige. Verhindert 80€/mo Verlust lifetime pro Missbrauch.
- Block B Founding-Trial 90d: Migration 63 (workspaces.founding_status ENUM 'standard|founding_member|pilot_tester' DEFAULT 'standard' + founding_assigned_at + stripe_coupon_assigned + Index für non-standard). app-register.html: ?founding=1 / ?pilot=1 URL-Param-Detection → 90d Trial statt 14d + localStorage prova_founding_status_pending + Email-Webhook-Payload erweitert um trial_days + founding_status. lib/trial-banner.js: Founding-Variante mit 🌟 + 'Noch X Tage Founding-Trial — danach 99 €/mo lifetime (Coupon auto)'.
- Block C Marcel-Founding-Invite-Tool: workspace-invite.html Founding-Tester-Checkbox (Marcel-only sichtbar via SUPER_ADMINS Email-Allow-List, _toggleFoundingField). send-workspace-invitation Edge: founding_invite-Flag → FOUNDING-MARKER in persoenliche_nachricht (workspace_invitations-Spalte). workspace-accept-invitation.html liest Marker beim Accept und setzt workspaces.founding_status='founding_member' + abo_trial_endet_am=NOW+90d.

---

## 2026-05-18 — MEGA-Serie #14 (MEGA⁸⁸-C TOTP-Sync-Fix)

**v3905-mega88-c-totp-sync-fix** | 2026-05-18 | MEGA⁸⁸-C TOTP-Sync-Bug-Fix (Hotfix)
- Block A DB-Trigger: supabase-migrations/62_mega88c_totp_sync_trigger.sql — AFTER INSERT/UPDATE/DELETE Trigger auf auth.mfa_factors → public.users.totp_enabled-Sync. Function `sync_users_totp_from_factors()` mit SECURITY DEFINER. verified→true+totp_last_used_at, unverified/delete OHNE anderen verified-Factor→false. Backfill für existing User (beide Richtungen). Idempotent (DROP TRIGGER IF EXISTS).
- Block B Edge-Hardening: generate-mfa-recovery-codes + verify-mfa-recovery-code prüfen jetzt BEIDE Quellen — primär users.totp_enabled, sekundär auth.mfa_factors WHERE status='verified'. Defense-in-Depth gegen Drift falls Trigger fehlt oder Race-Condition.
- Block C setup-2fa.html: nach erfolgreichem verifyTotp() expliziter UPDATE auf users.totp_enabled=true + totp_last_used_at (Fallback wenn Trigger inaktiv). Bei disable2FA(): explizit totp_enabled=false + totp_recovery_codes=[] + used_count=0. Beide Pfade non-blocking (Trigger übernimmt wenn aktiv).

---

## 2026-05-17 — MEGA-Serie #13 (MEGA⁸⁸-A Logo-Implementation)

**v3850-mega88-a-logo-implementation** | 2026-05-17 | MEGA⁸⁸-A Logo-System
- Block A Logo-Assets: img/logo-prova-systems.svg (Master 320×80), img/logo-prova.svg (Compact 200×60), img/logo-icon-only.svg (48×48 mit Gradient Schild), img/logo-icon-mono.svg (Mono Navy). tools/generate-logo-pngs.js Node-Script (sharp + png-to-ico) für Marcel-PNG-Run (32/192/512 + maskable + favicon.ico).
- Block B App-Integration: nav.js Sidebar-Logo durch Schild-Logo ersetzt (.sb-logo-img mit Voll-Logo bei Expanded + Icon-Only bei Collapsed). 7 Auth-Pages mit Logo-Banner + Favicon-Refs eingebaut: app-login.html (Master-Logo Brightness-Invert für Dark-BG-Card), app-register.html, admin-login.html, setup-2fa.html, account-2fa-status.html, workspace-invite.html, workspace-accept-invitation.html.
- Block C Landing-Integration: index.html nav-logo (Master-SVG mit white-filter), footer-logo-mark (Mono-SVG mit opacity .7) + Favicon-Refs im head (SVG primary + PNG-Fallback + apple-touch-icon + manifest + theme-color #1a3a6b).
- Block D 2FA-Komplett: setup-2fa.html friendlyName 'PROVA · email' (zeigt User-Identifier in Authenticator) + TOTP-URI um image-Param erweitert (https://prova-systems.de/img/logo-icon-512.png) + QR-Render via api.qrserver.com (Authy + 1Password rendern Logo automatisch). Fallback auf Supabase-default qr_code wenn URI-Parsing fails.
- Block E Manifest + PWA: manifest.json neu mit theme-color #1a3a6b (Navy statt #111827), 4 Icon-Sizes (SVG primary + PNG 192/512 + 512-maskable mit Navy-Padding für PWA-safe-zone).
- Block F Email-Templates: email-templates/_shared/brand-header.html Snippet (Gradient-Background-Header mit Master-SVG, white-filter) + trial-welcome.html als Beispiel-Patch. Marcel-Smoke für 20+ weitere Templates dokumentiert.
- Block G PDFmonkey: docs/MEGA88-A-PDFMONKEY-LOGO-CHECKLIST.md mit 16+ Templates (4 Gutachten F-04/F-09/F-15/F-19 + Korrespondenz + 12 Bescheinigungen + 4 Rechnungen + 3 Spezial), Liquid-Snippets für Header/Footer/Wasserzeichen, Logo-URLs (SVG primary + PNG-Fallback), LG-Darmstadt-Disclosure-Parallel-Check.

---

## 2026-05-17 — MEGA-Serie #12 (MEGA⁸⁷ AUTH-PERFEKT 2.0)

**v3800-mega87-auth-perfekt-2-0** | 2026-05-17 | MEGA⁸⁷ AUTH-PERFEKT 2.0 Voll-Rebuild
- Block A Audit + Inventory: docs/MEGA87-AUTH-INVENTORY.md (29 Files mit netlifyIdentity-Refs alle ueber Polyfill) + docs/MEGA87-PERMISSION-MATRIX.md mit member_rolle ENUM-Wahrheit `{owner,admin,sv,assistenz,readonly}` (Abweichung von Marcel-Memory dokumentiert).
- Block B Netlify-Identity-Removal: docs/MEGA87-NETLIFY-IDENTITY-REMOVAL.md — bereits seit MEGA46 (2026-05-09) entfernt, Polyfill bleibt als bewusste Compat-Architektur (verhindert 14 Files Refactor). ENV-Cleanup-Pfad dokumentiert.
- Block C Migration 61: supabase-migrations/61_mega87_totp_recovery_codes_meta.sql — ALTER users ADD totp_recovery_codes_generated_at + totp_recovery_codes_used_count + Partial-Index totp_enabled. Idempotent.
- Block D 2FA-Komplett: supabase/functions/verify-mfa-recovery-code/index.ts NEU (~140 Z) mit Email+Password Pre-Auth + constant-time sha256-Match gegen totp_recovery_codes-Array + Code-Verbrauch + last_used_at + audit-log-v1 + warning bei <=3 verbleibenden + Session-Return. supabase/functions/generate-mfa-recovery-codes/index.ts NEU (~110 Z) generiert 10 Codes Format XXXX-XXXX aus ALPHA ohne I/O/0/1, speichert sha256-Hashes, reset used_count. account-2fa-status.html NEU (~170 Z) als 2FA-Verwaltungs-Page mit Status + Recovery-Codes-Counter + Regen-Button + 2FA-Deaktivieren-Link.
- Block E Workspace-Switcher: lib/workspace-switcher.js NEU (~165 Z) mit Auto-Mount-Dropdown (sucht #prova-ws-switcher-mount / .sb-account-footer / header.topbar) + nur sichtbar bei >=2 Memberships + Audit-Log bei Switch via audit-log-v1 + localStorage prova-active-workspace + Page-Reload mit neuem Context. dashboard.html eingebunden.
- Block F Workspace-Invitations: workspace-invite.html NEU mit Email-Form + Rolle-Dropdown (4 Rollen mit Info-Text) + Persönliche-Nachricht. supabase/functions/send-workspace-invitation NEU (~110 Z) mit Permission-Check (owner/admin/can_invite_members) + 7d-Token + INSERT workspace_invitations + send-email-Wrapper + Audit-Log. workspace-accept-invitation.html NEU (~160 Z) mit Token-Verify + Status-Check + Ablauf-Check + Email-Match + Annehmen-Button (INSERT workspace_memberships + Update status) + Ablehnen-Button.
- Block G Account-Settings: einstellungen.html erweitert (~80 Z additiv) um Alle-Sessions-Ausloggen-Button mit signOut({scope:'global'}) + 2FA-Status-Link zur neuen Page + Workspace-Mitgliedschaften-Summary (laedt via supabase mit Rolle-Anzeige) + Team-Invite-Link auf /workspace-invite.html (vorher disabled).
- Block H Auth-Cockpit: admin-kpis.html Live-Sessions-Section (user_sessions WHERE last_activity_at > NOW-15min, mit Email-JOIN + Device-Icon + Geo + Force-Sign-Out-Button) + Failed-Login-Drilldown-Modal (auf KPI-Card-Click, Top-10 Email/IP-Aggregation aus audit_trail action=login_failed letzte 24h).

---

## 2026-05-17 — MEGA-Serie #11 Hotfix (www-Redirects)

**v3710-mega86-hotfix-www-redirects** | 2026-05-17 | MEGA⁸⁶-HOTFIX Index/App-Split-Polish
- netlify.toml v6.1: 21 fehlende www-Varianten für Cross-Domain-Redirects ergänzt (Flow B/C/D + Werkzeuge + Sonstige App-Pages + Admin + Bibliothek). 41 von 42 prova-systems.de-Redirects haben jetzt www-Variante. Doku docs/MEGA86-HOTFIX-WWW-REDIRECTS.md mit 10-URL-Test + curl-Snippet.

---

## 2026-05-17 — MEGA-Serie #11 (MEGA⁸⁶ Final-2%-Sprint)

**v3700-mega86-final-polish** | 2026-05-17 | MEGA⁸⁶ Pilot-Blocker-Fixes + 100%-Vision-Completion
- Block A.1 Cross-Domain-Login: Architektur 3-Layer-Bridge (crossDomainStorage in supabase-client + ProvaLegacyBridge cross-subdomain-cookies + auth-guard.js) verifiziert. Diagnose-Logging in lib/prova-legacy-bridge.js hydrate() ergänzt (sichtbar wenn 0 cookies found). Doku docs/MEGA86-CROSS-DOMAIN-LOGIN-FIX.md mit Marcel-Reproducer + Browser-Console-Snippet + 8-Schritt-Test.
- Block A.2 Index/App-Split: netlify.toml v6.0 (30.04.2026) Cross-Domain-Redirects audited. Status: sauber getrennt. Polish-Issue: 25 sekundäre App-Pages haben nur prova-systems.de Redirect, www-Variante fehlt (DEFER MEGA87 — durch HOTFIX v3710 erledigt). Doku docs/MEGA86-INDEX-APP-SPLIT-AUDIT.md mit 10-Punkte-URL-Test.
- Block A.3 Diktat-Mode-Race-Fix: lib/prova-diktat-mode-guard.js NEU (~170 Z) als 4-fach-Defense Single-Source-of-Truth. Konsolidiert MEGA47/68/69/80-Fixes. APIs: stopAll(reason), bind(element), indicateMode(mode). Auto-Bind auf 5 bekannte Selektoren (#transcriptArea, #transcriptManuell, #notiz-textarea, #diktat-text, #vot-manual-text). Fixed-Position-Mode-Badge oben rechts mit 3 States (🔴 Aufnahme / ✏ Manuell / ⚪ Bereit). Audit-Log-v1-Call bei jedem Mode-Switch. Eingebaut in app.html + ortstermin-modus.html. Doku docs/MEGA86-DIKTAT-MODE-RACE-FIX.md mit 5-Schritt-Reproducer.
- Block B Audit-Edges Phase B Caller-Migration: 3 Frontend-Caller migriert von audit-trail-write / audit-source-log → audit-log-v1 (freigabe-logic.js logComplianceBestaetigung, lib/editor-gate.js logOverrideToAudit, lib/audit-source-tracker.js markSvUebernommen). prova-audit.js nutzt direkt Supabase-Adapter (keine Migration nötig). Alte Edges bleiben aktiv (7-Tage-Probelauf). Doku-Update docs/MEGA84-AUDIT-EDGES-DEPRECATED.md Phase-B-Status.
- Block C Bibliothek-Drawer: lib/prova-bibliothek-drawer.js NEU (~110 Z) — Right-Side-Slide-In mit 60vw Desktop / 100vw Mobile, Cmd+B/Ctrl+B Hotkey, postMessage-Bridge zur Parent-Window. bibliothek.html embedded-Mode (?embedded=1) versteckt Sidebar + Header. Mount in 5 Pages: akte/gericht-auftrag/kurzstellungnahme/freigabe-wizard/briefe.html (Script-Tag + Hotkey + custom-event 'prova:bib-insert' für Editor-Integration).
- Block D Trial-Onboarding-Tour: supabase-migrations/60_mega86_onboarding_tour.sql NEU (ALTER user_workflow_settings ADD onboarding_tour_completed + _at). lib/prova-onboarding-tour.js NEU (~190 Z) mit 5-Step Carousel (Willkommen / Auftrag / Akte / KI-Diktat / FOUNDING-99-Coupon), Progress-Dots + Skip-Link + Persist nach DB. Auto-Trigger nach DOMContentLoaded auf /dashboard.html wenn localStorage.prova_onboarding_pending===1 OR DB.onboarding_tour_completed===false. app-register.html setzt Pending-Flag nach Register, dashboard.html lädt Lib.
- Block E Support-Inbox-Quick-Reply: admin-kpis.html neue Section "Support-Inbox (offen)" listet open support_tickets mit Quick-Reply-Button → Modal mit Textarea → supabase/functions/send-support-reply NEU (Admin-Auth Marcel-only, Service-Client für RLS-bypass, send-email-Wrapper für Resend, support_tickets-Status auf 'beantwortet' + resolution_text + audit-log-v1 task=admin_action).
- Block F Mobile-Sidebar: nav.js hat bereits debounced Resize-Listener (Z.1681 O1-FIX) — kein Code-Fix nötig. Auto-Collapse 769-1099 bewusst deaktiviert per älterer P5b.X1.4-Direktive — Konflikt mit MEGA86-Spec dokumentiert, default-Verhalten beibehalten bis Marcel-Klarstellung. Doku docs/MEGA86-TOUCH-TARGETS-AUDIT.md mit 9-Page-Stichprobe (alle WCAG-AA-konform, 2 Pages knapp).
- Block G UX-Schliffe: docs/MEGA86-KONTRAST-AUDIT.md mit 9 Color-Pair-Ratios (alle Primary-Body-Pairs ≥ AA, 2 Improvements DEFER MEGA87). Akte-Stepper Rückwärts-Klickbarkeit verifiziert (akte.html dc-stepper). 7+ Empty-States bestätigt (Pass 2a/2c).

---

## 2026-05-17 — MEGA-Serie #10 Pass 2c (Sprint-Final)

**v3600-mega84-85-complete** | 2026-05-17 | MEGA⁸⁴/⁸⁵ Pass 2c Audit-Konsolidierung + Bibliothek + Sprint-Final
- Block G audit-log-v1: supabase/functions/audit-log-v1/index.ts NEU (~190 Z) mit Task-Router (ki_request|login|gdpr_export|gdpr_delete|admin_action|generic, audit_action-ENUM-Mapping, admin reason min 5 chars) + Integrity-Hash-Kette (prev_hash=letztes integrity_hash der workspace_id, integrity_hash=sha256(prev||canonicalJson(payload))) + Rate-Limit 200/min + Default-Kategorie (KI/AUTH/DSGVO/ADMIN). docs/MEGA84-AUDIT-EDGES-DEPRECATED.md mit Caller-Inventory + Migrations-Snippets + 3-Phasen-Deprecation-Policy. **5 alte Writer-Edges bleiben funktional** (audit-write/audit-log/audit-trail-write/audit-source-log + Netlify prova-audit) — CC darf nicht eigenmächtig löschen.
- Block H Bibliothek-Funktion: bibliothek.html additiv erweitert (existing 540 Z + ~190 Z) auf 5 Tabs: 📐 Normen + 📝 Textbausteine (bestehend) + 📨 Brief-Vorlagen (aus user_vorlagen, per-user via RLS) + 📋 Bescheinigungen (12 Static-Templates aus dokument_typ-ENUM, leitet auf /bescheinigungen.html?typ=...) + 🔎 360°-Suche (Volltext über alle Quellen via global_search_v2 RPC aus Pass 2b mit Source-Icons). Context-aware-Insert via URL-Param `?aktion=insert&auftrag_id=...` zeigt prominenten Banner + ersetzt CTA-Label "In Editor verwenden" → "In Akte XY-2024-001 einfügen" + leitet bei Klick direkt zur Akte mit localStorage-Pending-Insert.
- Block I Sprint-Final: sw.js v3550 → v3600 + SW-VERSION-HISTORY-Eintrag + docs/MEGA84-85-PASS2C-DECISIONS.md + docs/MEGA84-85-PASS2C-MARCEL-CHECKLIST.md + CLAUDE.md Update + Commit+Push + Tag v3600-mega84-85-complete.

---

## 2026-05-17 — MEGA-Serie #10 Pass 2b

**v3550-mega84-85-pass2b-compliance-search** | 2026-05-17 | MEGA⁸⁴/⁸⁵ Pass 2b PDF + Trial + Search
- Block D PDF-Compliance LG-Disclosure: docs/MEGA84-PDF-LG-DISCLOSURE-PATCH-INSTRUCTIONS.md mit Liquid-Block fuer F-04/F-09/F-15 (Marcel-PDFMonkey-Task) + freigabe-wizard.html Pre-Render-Check (wenn ki_tasks vorhanden aber ki_anzeige_datum=NULL → Modal mit Datum-Pflicht-Eingabe + Persist + Audit-Trail-Eintrag lg_darmstadt_compliance=true)
- Block E Trial-Guard + Coupons: lib/trial-banner.js NEU (auto-mount, 14T gelb dismissable / 3T rot persistent / expired Blocking-Modal "DSGVO-Export oder Upgrade") + app-register.html Coupon-Code-Field mit Live-Validation FOUNDING-99/FRIEND-50/WERBER-MONAT-FREI (localStorage prova_pending_coupon fuer Stripe-Checkout)
- Block F Global-Search 360: Migration 59 global_search_v2 RPC (auftraege+dokumente+kontakte+textbausteine+normen mit per_source_limit 5+, SECURITY DEFINER + workspace_id-Pflicht) + lib/prova-global-search.js Refactor (ruft v2 mit Workspace-ID-Auto-Detect, Client-side Source-Filter, v1-Fallback bei v2-Fehler)

---

## 2026-05-16 — MEGA-Serie #8/9/10

**v3500-mega84-pass2a-cockpit-mobile** | 2026-05-16 | MEGA⁸⁴/⁸⁵ Pass 2a Cockpit + Mobile + Compliance
- Block A.5 vor-ort-tabs.html NEU (Mobile-First 3-Tab-Layout, ~430 Zeilen) — Skizze (Pin-Mode via lib/skizzen-pins) / Foto (Capture + KI-Vision-Caption via lib/prova-ki-foto) / Diktat (Whisper + §§-Chips via lib/prova-ki-diktat-mapping) + Save-Workflow auf dokumente+eintraege+auftraege.details.paragraphen
- Block B Founder-Cockpit admin-kpis.html NEU (~380 Zeilen): 4 Sektionen mit 8 KPIs parallel + Workspace-Liste mit Filter+Suche+Tier-Badges + Login-as-User via existing admin-impersonate Edge (MEGA54, workspace_id+reason-Pattern) + 2FA-Mandatory-Check fuer admin.* Subdomain + KI-Health-Bars (Top-8 Tasks + Konjunktiv/Halluzinations-Pass-Quoten) + 15 letzte Audit-Events
- Block C KI-Disclosure-Audit: GPT-4o → gpt-5.5 in 5 User-facing Pages (hilfe.html FAQ-A, statistiken.html KPI-Sub, admin-dashboard.html 2x KPI-Sub, onboarding.html Feature-Liste, status.html Service-Desc)
- DEFER Pass 2b: D PDF-Compliance + E Trial-Guard + F Global-Search-360
- DEFER Pass 2c: G 5-Audit-Edges-Konsolidierung + H Bibliothek + I Sprint-Final

---

**v3400-mega84-pass1-vor-ort-power** | 2026-05-16 | MEGA⁸⁴/⁸⁵ Mega-Marathon Pass 1
- Block 0.1 Akte-Section-Labels prominent (analog .dc-* aus Hotfix-2): 11px→15px, Icon-Span 20px, Trennlinie + Mobile-Responsive
- Block 0.2 Bridge-Sweep: prova-legacy-bridge.js in 83 App-Pages eingebunden (sed-Bulk-Insert nach prova-config.js) — Cross-Subdomain-Auth-Bridge end-to-end
- Block 0.3 docs/MEGA84-EDGE-DELETED.md mit Marcel-CLI-Apply-Pfad fuer 6 sichere Edge-Deletes
- Block A.1 Migration 58 skizzen.foto_pins jsonb + GIN-Index (Pin-Format mit x_pct/y_pct/foto_id/label/ki_caption)
- Block A.2 lib/skizzen-pins.js NEU: Pin-Mode-Toggle + Modal mit Label/Kategorie/Foto-ID + Lightbox + Persist via Supabase
- Block A.3 KI-Vision-Captions: ki-proxy gpt-5.5-vision mit callOpenAIVision Multi-Modal-API + VISION_PURPOSES Set, neue purposes foto_caption_vision + diktat_paragraph_mapping mit verbindlichen Wortlauten
- Block A.4 lib/prova-ki-foto.js (Frontend-Wrapper Vision-Captions) + lib/prova-ki-diktat-mapping.js (Diktat → §§-Chips mit editierbarem Paragraph-Select)
- DEFER Pass 2: Block A.5 Vor-Ort-Mobile-3-Tab-Refactor, Block B Founder-Cockpit, Block C KI-Pipeline-Migration (gpt-4o-Legacy → gpt-5.5 ist bereits via MODEL_API_NAME-Aliase done), Block D-G

---

## 2026-05-16 — MEGA-Serie #8/9

**v3300-mega83-akte-mission-control** | 2026-05-16 | MEGA⁸³ Akte-Mission-Control + Freigabe-Wizard + Auth-Bridge
- Phase A: Akte-UI komplett 5-Zonen Mission-Control-Pattern
  - A.1 Layout-Restructure (DOM additiv, alte sec-stamm+sec-timeline hidden)
  - A.2 Visueller Phase-Stepper (4 Kreise Flow A/B, 3 Kreise Flow C/D, klickbar)
  - A.3 Stammdaten-Bar collapsible + Inline-Edit + jsonb-Path-Support
  - A.4 Phase-Confirm-Modal (statt browser confirm())
  - A.5 Activity-Sidebar 5 Sub-Blocks (Activity Multi-Entity / Dokumente / Fristen / Termine / Mehr)
  - A.6 Phase-Checklist mit Smart-Detection (termine/eintraege/dokumente/skizzen-Parallel-Query mappt auf done-keys)
  - A.7 Phase-4-CTA via Sticky-Footer (akteNextPhase nutzt neues Modal)
- Phase B: freigabe-wizard.html neu (3-Step Wizard)
  - Step 1 §407a-Auto-Check (Fachurteil/Eigenleistung/Konjunktiv/Kurzbeantwortung/KI-Disclosure)
  - Step 2 Erklaerung mit 3 Pflicht-Checkboxes + LG-Darmstadt-Warning (verbindlicher Wortlaut)
  - Step 3 PDF-Erstellung + Versand (E-Mail/Download/beA disabled) + Rechnung-Vorschlag
- Phase C: Auth-Cross-Domain Bridge-Fix
  - ProvaLegacyBridge Helper-Lib (Cookie+localStorage sync via .prova-systems.de)
  - app-login-logic.js + signOut() integriert
  - Hydration-Script in dashboard/akte/fachurteil/freigabe-wizard
- Phase D: Edge-Reaping Final-Doku + 5-Audit-Edges-Konsolidierungs-Plan (DEFER MEGA84)

---

## 2026-05-16 — MEGA-Serie #8

**v3248-mega82-hotfix2-cleanup-and-calendar** | 2026-05-16 | MEGA⁸²-Hotfix-2 AZ-Cleanup + Section-Labels + Kalender
- A AZ-Frontend-Cleanup: Legacy-Auto-Generator (app-logic.js Z.2120-2155 generiereAZ/aktualisiereAZ) auf No-Op. DB-Trigger v2.0 (Migration mega82_hotfix_auftraege_az_conflict_resolve LIVE) generiert AZ kollisionsfrei. app.html Field-Label "Externes Aktenzeichen (optional)". Toast bei AZ-Mismatch nach Insert.
- B Section-Labels prominenter: dashboard.html 11px→15px, color text3→text, Icon-Span getrennt, Trennlinie unter Header. Empty-Icon 36px in Empty-States. Mobile responsive.
- C kalender.html universal NEU (475 Zeilen): 5 Quellen parallel (termine/fristen/dokumente.rechnung*/dokumente.mahnung*/auftraege.gutachtendatum). Monat+Listen-View. Filter-Toggles persist. Color-Coding nach Kategorie + frist-urgent bei <3T. Routing-Updates nav.js + prova-layout.config.js + sw.js APP_SHELL.

**v3247-mega82-hotfix1-dashboard-clean** | 2026-05-16 | MEGA⁸²-Hotfix-1 Dashboard-Clean
- H0 AZ-Frontend-Fix: app-logic.js generiert AZ NICHT mehr (war 'AZ-' + Date.now-slice → 409 Conflict bei Race). Frontend schickt az leer/null → DB-Trigger `auftraege_autogen_az` (Web-Claude appliziert) füllt mit `<PREFIX>-<JAHR>-<LFD-NR>`. .select() liefert generierten AZ zurück, UI zeigt es im Toast.
- H1+H2 Dashboard-Redesign auf 5 Sektionen (Mission-Control Clean):
  1. Header + Status-Zeile (Tageszeit-Gruss + dynamische Aufgaben-Count)
  2. Heute (Hero mit Fristen+Termine+Notifications)
  3. 4 KPI-Kacheln (Aktive Fälle, Mahnungen, Offene Beträge EUR, KI-Calls 30T)
  4. Aktive Fälle (max 5, mit korrekter 4-Phasen-Progress-Bar via MEGA82 Helper)
  5. Aktivität (max 5 audit_trail-Einträge mit kompakten Texten "27.04. · Eintrag in Akte GS-2026-001 hinzugefügt")
- T-NaN-Bug, "Noch kein Fall"-Empty-State, dritte Fristen-Box alle weg durch Komplett-Replacement
- dashboard-logic.js Script-Tag entfernt (alte 13-Sektionen-Logic + Airtable-Pre-MEGA75)

**v3246-mega82-pass2** | 2026-05-16 | MEGA⁸² Pass 2 (Marathon-Fortsetzung)
- Phase B.5 Sticky-Action-Footer mit Phase-Switch-Helpers (aktePrevPhase/akteNextPhase mit Confirmation + DB-Persist via _akteUpdatePhase + Audit-Trail)
- Phase B.6 Schnellaktionen kontextuell pro Phase (1=Auftrag, 2=Termin, 3=Analyse, 4=Abschluss) + "Mehr ▼"-Drawer
- Phase B.7 Status-Auto-Badge ersetzt Status-Dropdown (5 Color-States via getAkteStatusAuto)
- Phase F.2 Domain-Split-Audit + 2 Drift-Fixes (robots.txt: stellungnahme→fachurteil; sitemap.xml: pricing/demo/kontakt/avv/pilot ergänzt)
- Phase G Edge-Reaping-Pre-Audit: 6 sichere Delete-Kandidaten dokumentiert (global-search, fristen-reminder-cron, mahnwesen-cron, migrate-normen-airtable, migrate-textbausteine-airtable, skizze-save) + 3 Duplicate-Pair-Findings + Marcel-CLI-Apply-Pfad
- DEFER MEGA83: B.2/B.3/B.4/B.8/B.9 Akte-UI-Komplett-Refactor (Stammdaten-Bar, Stepper-Modal, Activity-Sidebar, Freigabe-Wizard, Layout-Pattern), F.1 Login Cross-Domain, G.3 5 Audit-Edges konsolidieren

**v3245-mega82-verkauf-ready** | 2026-05-16 | MEGA⁸² Verkauf-Ready (Pass 1)
- Phase A: 5 Critical Bugs (CORS eintraege-list via SKIP_REROUTE, Dashboard-Triple-Fristen entfernt, skizzen.html app-shell-Wrapper, §§-Notation-Audit, Einstellungen-Tabs CSS-Fix)
- Phase D: PDFMonkey-UI-Cleanup (11 Patches in 7 Files) + WORDING-STANDARDS.md + LG-Darmstadt-Warnbox in fachurteil.html + §407a-Disclosure-Doku
- Phase E: Gutachten-CTA kontextuell (renderGutachtenCTA + updateGutachtenCTAButton) — Loop-Bug-Fix (oeffneGutachten sprang immer auf app.html)
- Phase H: Landing-Trust-Block (LG Darmstadt 0€-Risiko + 4-Pfeiler PROVA-Lösung) + Pitch-Slide-Doku
- Phase B.1 + C: 4-Phasen-Helper-Layer (getFlow, AKTE_PHASEN_V2, getAktePhasenForAuftrag, getAkteStatusAuto) — UI-Refactor DEFER MEGA83
- DEFER MEGA83: Akte-UI-Refactor B.2-B.9 (Layout-komplett), Phase F.1 Login Cross-Domain, Phase G Edge-Reaping (Cloud-CLI-Action)

---

## 2026-05-15 — MEGA-Serie #6/#7

**v3244-mega81-mission-control** | 2026-05-15 | MEGA⁸¹ Dashboard + Repo-Sync
- Phase A: Migrations 55/56 mit Live-SQL synchronisiert (process_termin_tagesplan statt process_termin_erinnerungen, 9% B2B Verzugszinsen, 14/21/35 Tage Stufen)
- Phase B: Notification-RPCs (Migration 57) + Bell im Header (`lib/prova-notification-bell.js`) + Heute-Widget + Fristen/Mahnwesen-Widget-Refresh + Dashboard-Layout
- Phase C: Edge-Function-Inventory (docs/MEGA81-EDGE-FUNCTION-INVENTORY.md) — 13-Kategorien-Tabelle, global-search Edge als sicher-tot markiert
- Phase D: admin-ki-aggregations is_founder-Check, whisper-diktat Sprache aus user_workflow_settings.diktat_sprache, provaInlineSuggestionsEnabled in TipTap-Editor
- Phase F.2/G/H/F.1 DEFER MEGA82 mit technischen Gründen

**v3243-mega80-cron-pipeline** | 2026-05-15 | MEGA⁸⁰ Cron-Pipeline + Pilot-Blocker
- F.3 Diktat-Mode-Bug (Stream-Tracks + Whisper-WS Cleanup in stoppeAufnahme, harter Cleanup-Check in switchDiktatTab)
- Phase A Termin-Cron (Migration 55), Phase B Mahnwesen-Vorbereitungs-Cron (Migration 56, kein Auto-Increment §407a)
- Phase E Inline-Suggestions-Skip via `provaInlineSuggestionsEnabled` + ki_lernpool-Einwilligungs-Check (Opt-In Default false, DSGVO)
- C/D/F.1/F.2/G/H DEFER MEGA81

**v3242-mega79-edge-functions** | 2026-05-15 | MEGA⁷⁹ Edge-Function-Marathon
- ki-proxy persoenlicher_ki_kontext-Anhang an system_prompt (additiv+defensiv mit try/catch)
- Audit-Trail `has_personal_context`-Flag für Verify
- Migration 53 (pg_cron + process_fristen_erinnerungen) — VORBEREITET, Marcel applied via MCP
- Hotfix Migration 54 (frist_status enum 'erfuellt' statt 'erledigt' — live-fix beim Test entdeckt)

**v3241-mega78-backend-wiring** | 2026-05-15 | MEGA⁷⁸ Backend-Wiring + Global Search
- Phase B.1+B.3 Backfill notification_settings + user_workflow_settings Default-Rows + UNIQUE(user_id)
- Phase C RPC public.global_search über 9 Quellen, lib/prova-global-search.js ruft RPC statt Edge-Function
- Cmd+K-Trigger (war Cmd+P), Filter-Pillen für 8 Quellen + Alle, Editor-Restriction entfernt
- Phase E.2 bibliothek.html .bib-wrap max-width 1280→1360px + padding 20→28px

**v3240-mega77-real-cleanup** | 2026-05-15 | MEGA⁷⁷ Real-Cleanup-Marathon
- Phase B akte-logic applyPhaseVisibility-Stub, admin-ki Founder-Check, parse-docx Lambda-Boundary
- Phase C Settings-Page entrümpelt + Migration 50_mega77 (4 neue user_workflow_settings-Spalten) + notification_settings ehrliches Schema + Tab "Integrationen"→"Export & Import"
- Phase D skizzen.html in shell-Array + hilfe.html Duplikat-Sections weg
- Cmd+K DEFER MEGA78

**v3239-mega76a-hotfix** | 2026-05-15 | MEGA⁷⁶A Hotfix
- akte-lightbox.js ladeFotosVonAirtable liest aus fotos-Tabelle direkt
- lib/prova-supabase-adapters.js neuer mapAuftragTyp-Helper
- Doku-Update: freigabe-pending Dead-Filter-Warnung dokumentiert

---

## 2026-05-14 — Airtable Death + Migration

**v3238-mega76-airtable-death** | 2026-05-14 | MEGA⁷⁶ Airtable Death Marathon
- 0 Frontend-Caller verbleiben. 5 Schema-Bug-Fixes + 13 Brief-Pattern-HTMLs + 5 Bridge-Files + 7 Single-Caller migriert
- airtable.js Tombstone-Stub (410 Gone), mahnung-pdf.js Server-Side Airtable-Write raus
- vor-ort Offline-Queue Migration (queueMigrateMega76 purgt obsolete Airtable-Einträge)
- docs/MEGA76-DECISIONS.md + MARCEL-CHECKLIST (Netlify-ENV-Löschung 12 Variablen, Airtable-Base archivieren, Make.com Connection deaktivieren, 10 Scenarios auditen)

**v3237-mega75-f-batch2** | 2026-05-14 | MEGA⁷⁵-F-Batch2
- 3 Mini-Fixes (fristen-Sidebar, admin-ki 2FA-Pre-Check, parse-docx-Probe lazy)
- 10 Heavy/Single-Files Airtable→Supabase migriert
- Wrapper-Tötung: prova-airtable-api + prova-api + prova-sv-airtable → Console-Warn-Stubs

**v3236-mega75-f-batch1** | 2026-05-14 | MEGA⁷⁵-F-Batch1
- 7 Heavy-Files migriert (prova-context atFetch/atGet/atCreate/atPatch routen via _AT_TO_SB_MAP)
- einstellungen-logic.js syncZuAirtable → users + workspaces.briefkopf jsonb
- app-logic.js airtableProxy etc → Supabase, nav.js loadSidebarCounts 4 parallele Supabase-Counts

**v3235-mega75-e-singleton** | 2026-05-14 | MEGA⁷⁵-E GoTrueClient Singleton-Dedup
- 23 Frontend-Files mit eigenen createClient via esm.sh → alle auf /lib/supabase-client.js Singleton

**v3234-mega75-d-dashboard** | 2026-05-14 | MEGA⁷⁵-D Dashboard 4 Endpoint-Bugs
- get-referral-stats Empty-Defaults, widgetMahnungen Schema-Fix (dokumente statt rechnungen), widgetFaelligeFristen Schema-Drift, loadKiTokenKpi Admin-Pre-Check

**v3233-mega75-c-parse-docx** | 2026-05-14 | MEGA⁷⁵-C parse-docx 501
- edge-shim.js SKIP_REROUTE für parse-docx (Netlify-Function bleibt aktiv)

**v3232-mega75-b-fristen** | 2026-05-14 | MEGA⁷⁵-B fristen.html SyntaxError
- Z.229:140 falsches \\' Escape repariert

**v3231-mega75-a-rls** | 2026-05-14 | MEGA⁷⁵-A RLS-Production-Stopper
- workspace_id im Login-Flow + INSERT-Payload für auftraege + Logout-Cleanup

**v3230-mega74-ein-system** | 2026-05-14 | MEGA⁷⁴ EIN-SYSTEM-KONSOLIDIERUNG
- Phase 0 Pre-Read + DECISIONS-Skeleton, Phase 1 NinjaAI-Verify (eigener Audit, 98 Function-Overlaps verifiziert), Phase 2 Quick-Wins (20 Root-MDs archiviert, lib/_deprecated aufgelöst, marked_min Duplikat raus, Google-Fonts CDN raus)
- Phase 3-7 DEFER MEGA75 mit technischen Gründen (Mass-Wrap, Multi-File-Sweeps, Per-Page-Audits)

---

## Älter — kompakt

- **v3220** MEGA73 Cleanup-Marathon (8 P2-Files Read+Write + audit_trail + SV-Profile-Load + onboarding-Sync)
- **v3211** MEGA72-Marathon
- **v3204** MEGA70-1.2.4 Schema-Fix

Ältere Versionen siehe `git log -p sw.js`.
