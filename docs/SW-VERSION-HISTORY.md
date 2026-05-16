# PROVA Systems — Service-Worker Version-Historie

Diese Datei spiegelt die `CACHE_VERSION`-Historie aus `sw.js`. `sw.js` selbst
trägt nur die aktuelle Version + max 3 Sätze Kurz-Kommentar. Vollständige
Sprint-Notes leben hier.

Format: **vNNNN-marker** | YYYY-MM-DD | Sprint | Kurz-Note

---

## 2026-05-16 — MEGA-Serie #8

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
