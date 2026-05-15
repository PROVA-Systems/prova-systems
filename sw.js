/* ============================================================
   PROVA Systems — Service Worker v60 (Sprint K1)
   Strategie: Network-First für HTML (kein Zwischenbild mehr!)
              Cache-First für Assets (Fonts, JS, CSS)
              Network-Only für APIs
============================================================ */

const CACHE_VERSION = 'prova-v3242-mega79-edge-functions';   // MEGA⁷⁹ 2026-05-15: ki-proxy persoenlicher_ki_kontext-Anhang an system_prompt (additiv+defensiv, user_workflow_settings-Read mit try/catch — kein Production-Risiko) + Audit-Trail `has_personal_context`-Flag für Web-Claude-Verify. Migrations 53 (pg_cron + process_fristen_erinnerungen-Function + täglicher Cron-Schedule) ist VORBEREITET im Repo aber NICHT applied — Marcel autorisiert Apply manuell oder via Branch nach Auto-Mode-Classifier-Block. Phase B (admin-ki-aggregations Edge-Function), Phase C (Server-Side Netlify-Functions Airtable-Cleanup), Phase D (applyPhaseVisibility echte Logik — Audit ergab: kein data-phase-Markup in akte.html, braucht DOM-Strukturarbeit) DEFER mit konkreten Gründen in MEGA79-DECISIONS. Voraus: v3241 MEGA⁷⁸ 2026-05-15: Phase B.1 + B.3 (Backfill notification_settings auf neues Schema + user_workflow_settings Default-Rows für alle User + UNIQUE-Constraint user_id) + Phase C komplett (RPC public.global_search über 9 Quellen, lib/prova-global-search.js ruft RPC statt obsoleter Edge-Function, Cmd+K-Trigger statt Cmd+P, Filter-Pillen für 8 Quellen + Alle, Editor-Restriction entfernt — Cmd+K öffnet von überall) + Phase E.2 (bibliothek.html .bib-wrap max-width 1280→1360px + padding 20px→28px angeglichen an dashboard .page-content). DEFER MEGA79: Phase A (KI-Edge-Function-system_prompt-Anhang, Whisper-Sprache, ki_lernpool-Einwilligungs-Check) — Backend-Edge-Function-Audit ohne lokales Test-Env zu risikoreich; Phase B.2 (admin-ki-aggregations Edge-Function auf users.is_founder umstellen) — Edge-Function-Deploy braucht Service-Role-Read-Test mit potentieller Admin-Auth-Auswirkung; Phase E.1 (applyPhaseVisibility echte Logik) — Pass-Through-Stub ist Production-Safe. Details: docs/MEGA78-DECISIONS.md. Voraus: v3240 MEGA⁷⁷ 2026-05-15: Real-Cleanup-Marathon — Phase B (akte-logic applyPhaseVisibility-Stub + admin-ki Founder-Check + parse-docx Lambda-Boundary), Phase C (Settings-Page entrümpelt + Migration 50_mega77 4 neue user_workflow_settings-Spalten + notification_settings ehrliches Schema + Tab "Integrationen"→"Export & Import"), Phase D (skizzen.html in shell-Array + hilfe.html Duplikat-Sections weg). Phase E (Cmd+K 360°) DEFER MEGA78. Details: docs/MEGA77-DECISIONS.md. Voraus: v3239 MEGA⁷⁶A Hotfix 2026-05-15: 3 Schema-Bug-Fixes vor Squash-Merge. (1) akte-lightbox.js ladeFotosVonAirtable liest jetzt aus fotos-Tabelle direkt (storage_bucket/storage_path/thumbnail_path/original_filename/beschreibung/captured_at/position_in_dokument) statt aus eintraege. (2) lib/prova-supabase-adapters.js neuer mapAuftragTyp-Helper (auftrag_typ-Enum-Mapping: beweissicherung→beweis, schiedsgutachten→schied, kurzstellung→kurzstellungnahme, baubegleit→baubegleitung, gegen→gegen, default schaden); offline-gutachten.js _syncEntwurf nutzt jetzt ad.mapAuftragTyp(payload.Auftragstyp) statt fragiler toLowerCase().replace()-Hack. (3) Doku-only: docs/MEGA76-DECISIONS.md Defer-Block um freigabe-pending Dead-Filter-Warnung (phase_aktuell=5 ist Dead weil phase_max default 3) und app.html abo_status='pausiert' nicht-geblockt erweitert. Voraus: v3238 MEGA⁷⁶ 2026-05-14: Airtable Death Marathon — 0 Frontend-Caller verbleiben. Teil A 5 Schema-Bug-Fixes aus Batch-2 (support_tickets/kontakte/fristen Spalten + Adapter-Erweiterung auditTrailInsert/logBriefGenerated/logEinwilligung/sendSupportTicket/mapKontaktTyp). Teil B 13 Brief-Pattern-HTMLs (10 Standard via Node-Bulk + 3 Special-Cases: stellungnahme-gegengutachten Read+Write, ergaenzung list+create, schiedsgutachten, zpo-anzeige §407a-Audit). Teil C 5 Bridge-Files (prova-fetch-auth Airtable-Reroute-Branch raus, prova-auth-api+prova-api-cache+prova-error-handler+prova-notifications Stubs). Teil D 7 Single-Caller (404/akte-lightbox/app/benachrichtigungen/freigabe-queue/offline-gutachten/onboarding-schnellstart). Teil E netlify/functions/airtable.js Tombstone-Stub (410 Gone) + mahnung-pdf.js Server-Side Airtable-Write raus. Teil F vor-ort Offline-Queue Migration (queueMigrateMega76 purgt obsolete Airtable-Format-Einträge aus IndexedDB). Teil G docs/MEGA76-DECISIONS.md + docs/MEGA76-MARCEL-CHECKLIST.md (Netlify-ENV-Löschung 12 Variablen, Airtable-Base archivieren, Make.com Connection deaktivieren, 10 Scenarios auditen). Voraus: v3237 MEGA⁷⁵-F-Batch2 2026-05-14: Teil-A 3 Mini-Fixes (fristen-Sidebar in prova-layout.config, admin-ki 2FA-Pre-Check, parse-docx-Probe lazy via IntersectionObserver) + Teil-B 10 Heavy/Single-Files Airtable→Supabase migriert: B1 honorar-tracker (4 Calls, dokumente), B2 akte-logic (2 Calls, auftraege+dokumente), B3 briefvorlagen-logic (2 Calls, auftraege+dokumente-update), B4 import-assistent-logic (3 Calls, kontakte+auftraege.insert mit Duplikat-Check via az), B5 vor-ort.html + vor-ort-logic (3+1 Calls, auftraege+termine + Offline-Queue auf supabase_insert-Payload umgestellt), B6 gericht-auftrag×2 (2 Calls, auftraege.insert typ='gericht'), B7 fachurteil-logic (1 Call, auftraege.fachurteil_text via az-Lookup), B8 global-search (1 Call, auftraege PostgREST .or ilike statt Airtable FIND), B9 mahnung-check+schnelle-rechnung+textbausteine-logic+textbaustein-search+kontakte-logic+hilfe-logic (6 Files, dokumente/textbausteine/support_tickets/kontakte), B10 Wrapper-Tötung prova-airtable-api+prova-api+prova-sv-airtable (3 Files zu Console-Warn-Stubs mit window-Symbol-Compat). Restbestand: 25 Files (14 Brief-Pattern-HTMLs für Bulk-Pass, 5 Helper/Wrapper-Files, 6 verbleibende Single-Caller). Voraus: v3236 MEGA⁷⁵-F-Batch-1. A1 fristen.html in prova-layout.config.js shell-Array eingetragen (Sidebar+Topbar werden gerendert), A2 dashboard-logic.js loadKiTokenKpi 2FA-Pre-Check (Admin-Email AND totp_enabled in users → call; sonst Tile zeigt 'Admin (2FA)' silent), A3 einstellungen.html ladeVorlagen() lazy via IntersectionObserver statt DOMContentLoaded — parse-docx-Call erst wenn Vorlagen-Container in Viewport scrollt. Teil B (9-10 Heavy-File-Migrationen) in eigenen Sub-Commits. Voraus: v3236 MEGA⁷⁵-F-Batch-1 2026-05-14: Airtable→Supabase Migration Priorität-1-Batch (7 Files). lib/prova-supabase-adapters.js erweitert um kontaktRowToFields, usersRowToFields, fieldsToUsersUpdate, fieldsToWorkspacesUpdate, loadSvProfile, auditTrailInsert, logBriefGenerated, logEinwilligung. prova-audit.js: AUDIT_TRAIL/STATISTIKEN/KI_STATISTIK → audit_trail mit action-Codes. prova-context.js: atFetch/atGet/atCreate/atPatch routen jetzt via _AT_TO_SB_MAP auf Supabase-Tabellen (auftraege/termine/dokumente/kontakte/users/normen/audit_trail), liefern Airtable-style {records:[{id,fields}]} für Compat. provaMarkOnboardingDone() direkter users.onboarding_completed_at-Update. einstellungen-logic.js: syncZuAirtable + provaSync → users + workspaces.briefkopf jsonb (Schema-Drift Vorname/Nachname → users.name single, Bürodaten → briefkopf jsonb). app-logic.js: airtableProxy/ladeSVProfil/speichereAirtable/ladeGutachtenListe/ladeArchivDaten auf Supabase. provaKontaktFaelleErhoehen → No-Op (Faelle_Anzahl ergibt sich aus auftrag_kontakte-JOIN). onboarding-logic.js: schreibeEinwilligung → audit_trail action='dsgvo.einwilligung' (eigene einwilligungen-Tabelle defer'd). syncOnboardingSV → users.onboarding_completed_at + workspaces.abo_tier. syncPipeline → audit_trail action='pipeline.onboarding'. nav.js loadSidebarCounts: 4 parallele Supabase-Count-Queries (head+exact) ersetzen 4 Airtable-formelas. fetchAirtableCount entfernt. Voraus: v3235 MEGA⁷⁵-E 2026-05-14: Multiple GoTrueClient Singleton-Dedup — 23 Frontend-Files (17 lib/prova-* mit _getSb-Pattern + 3 lib/extensions/* + lib/prova-asset-trigger + lib/prova-fragment-sidebar + lib/prova-skizze-editor + mahnwesen.html) erstellten je einen eigenen createClient via esm.sh, statt das zentrale lib/supabase-client.js Singleton zu nutzen. Fix: alle dynamischen Imports auf /lib/supabase-client.js umgestellt, mod.supabase || mod.getSupabase() — kein eigener GoTrueClient mehr, alle teilen jetzt storageKey 'prova-auth-token' + Cross-Domain-Cookie-Storage. Voraus: v3234 MEGA⁷⁵-D 2026-05-14: Dashboard 4 Endpoint-Bugs — (1) get-referral-stats Endpoint existiert nirgendwo → getStats/getHistory in lib/referral-system.js liefern empty-defaults statt 401-Spam, (2) lib/prova-dashboard-widgets.js widgetMahnungen: Tabelle 'rechnungen' existiert nicht — Daten sind in dokumente mit typ IN ('rechnung','rechnung_jveg','rechnung_stunden'), Spalten doc_nummer/mahn_stufe/faelligkeit (statt rechnungsnr/mahnung_stufe/faellig_am) + Status 'versendet'/'ueberfaellig', (3) widgetFaelligeFristen: Schema-Drift — fristen-Tabelle hat datum_soll/frist_typ/notiz, kein titel/faellig_am, plus .is('deleted_at', null), (4) dashboard-logic.js loadKiTokenKpi: admin-ki-aggregations ist admin-only — Frontend-Pre-Check gegen Hardcoded-Email-Whitelist spart Non-Admin den 403-Call (Tile zeigt 'nur Admin' silent). Voraus: v3233 MEGA⁷⁵-C 2026-05-14: parse-docx 501 — edge-shim.js leitete /.netlify/functions/parse-docx auf den Supabase-Edge-501-DEFERRED-Stub um, während die Netlify-Function voll implementiert ist (mammoth via esm.sh, GET/POST/PUT/DELETE, magic-bytes-check). Fix: parse-docx in SKIP_REROUTE-Set aufgenommen → bleibt Netlify-only. Pfad A1 (Implementierung wiederherstellen statt Stub-Deaktivieren), weil user_vorlagen-Tabelle + Frontend-UI in einstellungen.html bereits live sind. Voraus: v3232 MEGA⁷⁵-B 2026-05-14: fristen.html SyntaxError (Z.229:140) — falsches \\' Escape in inline-Template-Literal repariert (\\' → \' damit der innere JS-String nicht versehentlich am ersten ' nach dem Backslash schließt). Voraus: v3231 MEGA⁷⁵-A 2026-05-14: RLS-Production-Stopper Fix — workspace_id im Login-Flow nach Supabase-Auth setzen (prova_workspace_id in localStorage aus workspace_memberships-Lookup) + INSERT-Payload für auftraege via getCurrentWorkspaceId-Helper ergänzt + Logout-Cleanup (supabase-client.signOut + auth-guard.clearSession entfernen prova_workspace_id). Files: app-login-logic.js, app-logic.js, lib/supabase-client.js, auth-guard.js. Behebt 403 bei "Neuer Auftrag" weil safe-payload kein workspace_id hatte → auftraege_insert-Policy (WITH CHECK workspace_id IN get_user_workspaces()) hat geblockt. Voraus: v3230 MEGA74 EIN-SYSTEM-KONSOLIDIERUNG 2026-05-14: Phase 0 Pre-Read + DECISIONS-Skeleton ✅, Phase 1 NinjaAI-Verify (eigener Audit, NinjaAI-Source nicht verfügbar) — 98 Function-Overlaps verifiziert (14 SCHUTZ + 67 safe + 17 BRIDGE), 16 Airtable-HTMLs aber nur 6 mit aktiven Logic-Calls, lib/_deprecated/ki-s-stufen 1 Ref in fachurteil.html, marked_min.js MD5-Bytewise-Duplikat zu marked.min.js, fragmente.html 2 Google-Fonts-CDN-Lines, 24 Root-MDs ✅, Phase 2 Quick-Wins (2a 20 Root-MDs → docs/archiv-alte-sprints/2026-pre-mega74/, 2b lib/_deprecated/ aufgelöst + fachurteil.html-Tag raus, 2c marked_min.js delete + freigabe.html-Ref auf marked.min.js, 2d fragmente.html Google-Fonts-CDN raus) ✅, Phase 2e/2f/2g (Onboarding/Kontakte/Migrations-Folder) DEFER zu MEGA75 (Multi-File-Ref-Sweeps + Logic-File-Rename + Migration-Reihenfolge brauchen Per-Page-Verify), Phase 3 410-Wrapper DEFER zu MEGA75 (Mass-Wrap ohne Per-Function-Caller-Audit = Production-Risk; Audit-Output docs/MEGA74-FUNCTION-DIFF-AUDIT.md), Phase 4 16-Airtable-Page-Migration DEFER zu MEGA75 (6 aktive Files ~45-90min Per-Page Schema-Verify + Browser-Test), Phase 5 Session-4-Geister-Code NICHT-MACHBAR (NinjaAI-Source-Files fehlen), Phase 6 Session-5-Roll-Out 8 Editor-Pages DEFER zu MEGA75 (TipTap-Module-Init braucht Per-Page-Browser-Test), Phase 7 Schema audit_action Enum DEFER (keine neuen Audit-Actions ohne Phase 3-6 Live-Code). Conservative-Lieferung statt Aggro-Marathon: 5 Sub-Commits, ~50KB Code-Cleanup, 0 Production-Risk durch klare Phase-3-6-Deferrals. Voraus: v3220 MEGA73-Cleanup-Marathon (8 P2-Files Read+Write + audit_trail-Insert + SV-Profile-Load + onboarding_completed_at-Sync), v3211 MEGA72-Marathon, v3204 MEGA70-1.2.4 Schema-Fix. Branch feat/mega74-ein-system. Siehe docs/MEGA74-COMPLETE.md + docs/MEGA74-DECISIONS.md für Marcel-5-Punkte-Smoke-Test + MEGA75-Roadmap.
const SYNC_TAG = 'prova-sync-queue';

const APP_SHELL = [
  '/',
  '/login.html',                        // APP-LANDING-SPLIT: kanonische Login-Page
  '/app-login.html',
  '/auth-supabase.html',                // K-1.4 B12: Supabase-Login parallel
  '/onboarding-supabase.html',          // K-1.3 A6: Workspace-Onboarding
  '/app-register.html',
  '/onboarding.html',
  '/onboarding-schnellstart.html',
  '/dashboard.html',
  '/pilot.html',                        // Catch-Up C1: Founding-Pilot-Programm
  '/archiv.html',
  '/akte.html',
  '/app.html',
  '/freigabe.html',
  '/fachurteil.html',
  '/briefvorlagen.html',
  '/rechnungen.html',
  '/termine.html',
  '/jveg.html',
  '/einstellungen.html',
  '/kontakte.html',
  '/kostenermittlung.html',
  '/textbausteine.html',
  '/normen.html',
  '/positionen.html',
  '/baubegleitung.html',
  '/nav.js',
  // K-1.0 + K-1.3 lib-Stack (Supabase-Foundation)
  '/lib/prova-config.js',
  '/lib/edge-shim.js',                  // MEGA⁴⁴: Frontend → Edge auto-reroute fetch-Shim
  '/lib/sso-landing-redirect.js',       // MEGA⁴⁷: Auto-Forward auf Landing wenn schon eingeloggt
  '/lib/beweisbeschluss-upload.js',     // MEGA²³ Block 1: Beweisbeschluss-PDF-Upload-Library
  '/lib/archiv-filter.js',              // MEGA²⁸ V3.2-W2 KORR-10: Archiv-Filter-Library
  '/lib/global-search-engine.js',       // MEGA²⁸ V3.2-W2 KORR-7: Cmd+K Search-Engine (pure-fn)
  '/lib/admin-ki-stats-frontend.js',    // MEGA²³ Block 4: KI-Stats Frontend-Charts
  '/lib/prova-disclaimer.js',           // MEGA²¹+²² W110: §407a-Disclaimer-Lib
  '/schadensfaelle.html',               // MEGA²⁸ P1-I1: Übersicht-Liste Flow A
  '/schadensfaelle-logic.js',
  '/neuer-fall.html',                   // MEGA²⁸ V3.2-W2 KORR-8: Wizard-Landing-Page
  '/bescheinigungen.html',              // MEGA²⁸ V3.2-W3-I3 KORR-9: 11 Korrespondenz-Briefe Übersicht
  '/admin-cockpit.html',                // MEGA²⁸ V3.2-W5-I9 KORR-23: 12-Sektionen-Übersicht (6 live, 6 skeleton)
  '/lib/referral-system.js',            // MEGA²⁷: Referral-Foundation
  '/lib/referral-ui.js',                // MEGA²⁷: Dashboard-Karte + Modals
  '/lib/referral-redemption.js',        // MEGA²⁷: Pricing-Page Code-Detection
  '/lib/supabase-client.js',
  '/lib/data-store.js',
  '/lib/template-registry.js',
  '/lib/auth-guard.js',
  '/lib/sentry-init.js',                // M3: Sentry Browser-SDK-Init
  '/lib/mobile-polish.css',             // MEGA⁴ Q2: Mobile-Polish CSS
  '/lib/mobile-polish.js',              // MEGA⁴ Q3: Mobile-Polish JS (Lazy/Offline/Camera/Geo)
  '/lib/foto-upload-v2.js',             // MEGA⁹ W1: Magic-Bytes + EXIF-Strip + Image-Optimize
  '/lib/foto-upload-mobile.js',         // MEGA³² C2 P4: Mobile-Foto-Upload mit EXIF-Strip + Geo-Tag
  '/lib/whisper-chunker.js',            // MEGA³² D1: Whisper-Chunker für >25MB Audio
  '/lib/honorar-rechner.js',            // MEGA³² D2: JVEG/BVS/Streitwert Multi-Modus
  '/lib/wizard-live-save.js',           // MEGA³² A1: Wizard-Save + Skip-Logic
  '/lib/dokument-templates-cache.js',   // MEGA³⁶ W6.1: DB-Lookup-Cache für Templates
  '/lib/service-endpoints-cache.js',    // MEGA³⁷ C4: DB-Lookup-Cache für Make-Webhooks
  '/lib/skizzen-canvas.js',             // MEGA³⁹ P3: Skizzen-Canvas Tier 1+2
  '/lib/bibliothek-pattern.js',         // MEGA³⁹ P5: Universal-Toolbar 6 Kategorien
  '/lib/ki-werkzeug-stufen.js',         // MEGA³⁹ P6: KI-Werkzeug-Stufen S1/S2/S3
  '/lib/wertgutachten-verfahren.js',    // MEGA³² A2: Sachwert/Vergleich/Ertrag (ImmoWertV)
  '/diktat-mobile.html',                // MEGA³² C2 P3: Mobile-Diktat-First-UX
  '/honorar-rechner.html',              // MEGA³² D2: Honorar-Rechner UI
  '/bescheinigung-erstellen.html',      // MEGA³² B3: 8-Card-Selector
  '/demo.html',                         // MEGA³² E1: Sandbox-Demo /demo
  '/cookie-einstellungen.html',         // MEGA³⁴ A1: Cookie-Settings-Page (DSGVO § 25 TTDSG)
  '/public-status.html',                // MEGA³⁴ B3: Public Status-Page /status
  '/lib/foto-upload-v2.css',            // MEGA⁹ W1: Drop-Zone + Item-Card Styles
  '/lib/foto-upload-v2-ui.js',          // MEGA⁹ W1: ProvaUploadUI DOM-Helper
  '/lib/public-status-widget.js',       // MEGA¹¹ W6: Footer-Status-Widget
  '/lib/analytics-plausible.js',        // MEGA¹¹ W7: Plausible-Wrapper
  '/lib/prova-alert.js',                // MEGA¹¹ W8: provaAlert-DRY-Helper
  '/lib/ki-cost-display.js',            // MEGA¹¹ W9: KI-Cost-Modal
  '/lib/pwa-install-prompt.js',         // MEGA¹¹ W10: PWA-Install-Banner
  '/offline.html',                      // MEGA¹¹ W10: PWA-Offline-Fallback
  '/lib/ki-fallback-badge.js',          // MEGA¹² W12: Anthropic-Fallback-Badge
  '/lib/ki-confidence-badge.js',        // MEGA¹² W13: KI-Confidence-Badge
  '/lib/safe-area-helper.css',          // MEGA¹² W14: iOS-Safe-Area-Helper-CSS
  '/lib/pull-to-refresh.js',            // MEGA¹² W14: Pull-to-Refresh
  '/lib/admin-drilldown.js',            // MEGA¹² W15: Drilldown-Modal
  '/lib/ki-history-frontend.js',        // MEGA¹³ W18: KI-Historie-Modal
  '/lib/ki-autosuggest.js',             // MEGA¹³ W18: KI-Autosuggest Ghost-Text
  '/lib/hamburger-menu.js',             // MEGA¹³ W19: Hamburger-Menu
  '/lib/bottom-sheet.js',               // MEGA¹³ W19: Bottom-Sheet Modal
  '/lib/admin-bulk.js',                 // MEGA¹³ W21: Bulk-Operations
  '/lib/swipe-gestures.js',             // MEGA¹⁴ W24: Touch-Swipe-Detection
  '/lib/native-share.js',               // MEGA¹⁴ W24: Web-Share-API + Clipboard-Fallback
  '/lib/workflow-mode-router.js',       // MEGA¹⁴-Ext W28: Triple-Mode-Router (Foundation)
  '/lib/prova-editor.js',               // MEGA¹⁵ W32: TipTap-Wrapper (Mode B Editor) + MEGA⁴⁰ P1.2: Underline+Align Extensions
  '/lib/prova-editor.css',              // MEGA¹⁵ W32: Editor-Styles
  '/lib/editor-tiptap.js',              // MEGA⁴⁰ P1.2 + P2: High-Level-Wrapper mit Backend-Sync + Extended-Toolbar
  '/lib/editor-tiptap.css',             // MEGA⁴⁰ P1.2 + P2: Status-Bar + Versions-Panel + Extended-Toolbar + Footnote/PageBreak CSS
  '/lib/editor-extensions.js',          // MEGA⁴⁰ P2: Custom Footnote/PageBreak/CrossRef + Helpers
  '/lib/document-mode-modal.js',        // MEGA⁴⁰ P3: 3-Wege-Auswahl-Modal
  '/lib/document-mode-modal.css',       // MEGA⁴⁰ P3: Modal-CSS (Karten-Grid, Animations)
  '/lib/docx-import.js',                // MEGA⁴⁰ P4: DOCX-Import via mammoth.js
  '/lib/docx-export.js',                // MEGA⁴⁰ P5: HTML/MD/DOCX-Export
  '/lib/editor-spell-layer.js',         // MEGA⁴⁰ P6: Spell+Konjunktiv-II Layer
  '/lib/editor-bibliothek-adapter.js',  // MEGA⁴⁰ P8: Bibliothek-TipTap-Adapter
  '/lib/editor-locked-sections.js',     // MEGA⁴⁰ P9: 4 Compliance-Sektionen (weg_c)
  '/lib/editor-pdf-generator.js',       // MEGA⁴⁰ P9: Browser-Print PDF-Generator IHK
  '/lib/import-format-detector.js',     // MEGA⁴¹ P1: 4 Format-Signatures + CSV/JSON-Parser
  '/lib/aktenzeichen-normalizer.js',    // MEGA⁴¹ P1: AZ-Format-Vereinheitlichung
  '/lib/import-assistent-supabase.js',  // MEGA⁴¹ P1: Bridge zu Backend-Lambdas
  '/lib/audit-source-tracker.js',       // MEGA⁴¹ P2: KI-vs-SV-Frontend-Tracker (EU AI Act)
  '/audit-trail.html',                  // MEGA⁴¹ P2: Audit-Trail-Viewer-Page
  '/support.html',                      // MEGA⁴¹ P5: Support + FAQ-Search + Ticket-Form
  '/lib/cmd-k-modal.js',                // MEGA⁴¹ P6: Cmd+K Drilldown-Modal global
  '/kontakt-detail.html',               // MEGA⁴¹ P7: Kontakt-360-View 9 Tabs
  '/lib/wizard-stepper.js',             // MEGA⁴¹ P8: Workflow-Stepper-Pattern-Lib
  '/lib/wizard-stepper.css',            // MEGA⁴¹ P8: Stepper-CSS
  '/lib/wizard-flow-configs.js',        // MEGA⁴² P2: Flow-Configs A/B/C/D (Source-of-Truth)
  '/lib/workflow-stepper-bridge.js',    // MEGA⁴² P2: Bridge prova-wizard ↔ wizard-stepper
  '/lib/workflow-stepper-bridge.css',   // MEGA⁴² P2: Bridge-Stepper-Header-Styles
  '/push-setup.html',                   // MEGA⁴² P5: Push-Alerts Setup-Wizard 3 Steps
  '/health-test-down.html',             // MEGA⁴² P5: Manueller Health-Check-Trigger (Test-Tool)
  '/pilot-tutorial.html',               // MEGA⁴² P10: 12-Step Pilot-Tutorial mit Resume
  '/lib/sync-conflict-resolver.js',     // MEGA⁴¹ P10: Sync-Konflikt-Resolver
  '/lib/offline-sync-status.js',        // MEGA⁴¹ P10: Offline-Sync-Status-Icon
  '/wiederherstellbare-entwuerfe.html', // MEGA⁴¹ P10: Recovery-Page für Drafts
  '/editor-demo.html',                  // MEGA⁴⁰ P1.2: Editor-Demo-Page (Pattern A volle Page-Width)
  '/dokument-neu.html',                 // MEGA⁴⁰ P3: Neues-Dokument Entry-Page (Modal-First)
  '/dokument-import.html',              // MEGA⁴⁰ P4: DOCX-Import-Page (Drag&Drop)
  '/dokument-vorlagen.html',            // MEGA⁴⁰ P7: Vorlagen-Page Karten-Grid
  // Legacy auth (Hybrid-Modus, bleibt bis Cutover-Phase 5 cleanup)
  '/prova-fetch-auth.js',
  '/prova-notifications.js',
  '/page-template.css',
  '/stellungnahme.css',                 // MEGA²⁸ V3.2-W3-I4 KORR-24: Inline-CSS Extract
  '/app.css',                           // MEGA²⁸ V3.2-W3-I4 KORR-24: Inline-CSS Extract
  '/kurzstellungnahme.html',
  '/kurzstellungnahme-logic.js',
  '/onboarding-supabase-logic.js',
  '/auth-supabase-logic.js',
  '/app-login-logic.js',
  '/auftragstyp.js',
  '/diktat-parser.js',
  '/compliance-check.js',
  '/paragraph-generator.js',
  '/fachurteil-logic.js',
  '/beratung.html',
  '/beratung-logic.js',
  '/baubegleitung-polish.js',
  '/wertgutachten.html',
  '/wertgutachten-logic.js',
  '/theme.js',
  '/trial-guard.js',
  '/prova-status-hydrate.js',
  '/prova-sanitize.js',
  '/prova-pseudo.js',
  '/prova-pseudo-send.js',
  '/prova-preise.js',
  '/paket-guard.js',
  '/ortstermin-modus.html',
  '/frist-guard.js',
  '/honorar-tracker.js',
  '/ki-lernpool.js',
  '/rechtspruefung.js',

  // ── Sprint K1 Files (20.04.2026, Fix) ──
  '/zpo-anzeige.html',
  '/widerrufs-flow.js',
  '/fab.js',
  '/gericht-auftrag-logic.js',

  // ── Sprint K-UI (27.04.2026): Profil-Briefkopf + Kontakte + Briefe ──
  '/profil-supabase.html',
  '/profil-supabase-logic.js',
  '/kontakte-supabase.html',
  '/kontakte-supabase-logic.js',
  '/briefe.html',
  '/briefe-logic.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(() => {
          console.warn('[SW] Konnte nicht cachen:', url);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    )
    .then(() => self.clients.claim())
    // S-SICHER UI-FIX1.6: Clients über neue SW-Version informieren, damit
    // die Page-Seite (optional) ein sanftes Reload triggern kann. Der
    // Client-Handler wird in einem Folge-Sprint in sw-register.js ergänzt.
    // skipWaiting() ist bereits im install-Handler aktiv → neuer SW
    // übernimmt sofort, clients.claim() greift auf alle offenen Tabs.
    .then(() => self.clients.matchAll({ includeUncontrolled: true }))
    .then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith('/.netlify/') ||
    url.pathname.startsWith('/cdn-cgi/') ||
    url.hostname.includes('make.com') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('pdfmonkey.io') ||
    url.hostname.includes('stripe.com') ||
    url.hostname.includes('supabase.co') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Google Fonts → KEIN Cache (CSP erlaubt kein fetch aus SW)
  // Browser lädt Fonts direkt über <link>-Tag — SW darf nicht eingreifen
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    return; // SW ignoriert diese Requests — Browser handelt sie nativ
  }

  // HTML → Network-First: immer frisch, kein Zwischenbild
  // Icons: ewig cachen (ändern sich nie → maximale Performance)
  if (url.pathname.startsWith('/icons/') || url.pathname.match(/favicon/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) { const ri = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(event.request, ri)); }
          return res;
        }).catch(() => new Response('', {status: 404}));
      })
    );
    return;
  }

  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) { const rc = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(event.request, rc)); }
          return res;
        })
        .catch(() => caches.match(event.request).then(cached =>
          cached || new Response('<h1>Offline</h1><p>Bitte Internetverbindung prüfen.</p>',
            { headers: { 'Content-Type': 'text/html' } })
        ))
    );
    return;
  }

  // PROVA Core JS (nav, theme, trial-guard) → Network-First
  // Diese Dateien ändern sich häufig → immer frisch holen
  const isCoreJs = ['/nav.js','/theme.js','/trial-guard.js','/sw-register.js','/mobile.css',
  '/prova-wizard.js'].includes(url.pathname)
    || url.pathname.endsWith('.css')
    || (url.pathname.endsWith('.js') && !url.pathname.includes('netlify'));
  if (isCoreJs) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) { const rj = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(event.request, rj)); }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Andere JS/CSS/Assets → Cache-First mit Background-Update
  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        // Background-Revalidation (kein Clone-Konflikt da nicht im critical path)
        fetch(event.request).then(res => {
          if (res && res.ok) cache.put(event.request, res.clone());
        }).catch(() => {});
        // Sofort aus Cache liefern wenn vorhanden
        if (cached) return cached;
        // Sonst Netz
        return fetch(event.request).then(res => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    )
  );
});

self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) event.waitUntil(verarbeiteOfflineQueue());
});

async function verarbeiteOfflineQueue() {
  const db = await openDB();
  const alle = await getAllFromStore(db.transaction('offline_queue', 'readwrite').objectStore('offline_queue'));
  for (const e of alle) {
    try {
      const res = await fetch(e.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e.payload) });
      if (res.ok) {
        const tx2 = db.transaction('offline_queue', 'readwrite');
        tx2.objectStore('offline_queue').delete(e.id);
        notifiziereClients({ type: 'SYNC_SUCCESS', id: e.id });
      }
    } catch (err) { console.warn('[SW] Retry:', e.id); }
  }
}

self.addEventListener('message', event => {
  if ((event.data&&event.data.type) === 'SKIP_WAITING') self.skipWaiting();
  if ((event.data&&event.data.type) === 'TRIGGER_SYNC') {
    self.registration.sync.register(SYNC_TAG).catch(() => verarbeiteOfflineQueue());
  }
});

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('prova_offline', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('entwuerfe')) db.createObjectStore('entwuerfe', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('offline_queue')) db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror = e => reject(e.target.error);
  });
}
function notifiziereClients(msg) {
  self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage(msg)));
}
