# PROVA Systems — Service-Worker Version-Historie

Diese Datei spiegelt die `CACHE_VERSION`-Historie aus `sw.js`. `sw.js` selbst
trägt nur die aktuelle Version + max 3 Sätze Kurz-Kommentar. Vollständige
Sprint-Notes leben hier.

Format: **vNNNN-marker** | YYYY-MM-DD | Sprint | Kurz-Note

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
