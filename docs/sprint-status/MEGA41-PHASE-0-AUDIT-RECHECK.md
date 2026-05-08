# MEGA⁴¹ Phase 0 — Audit-Recheck + Code-Stand-Snapshot

**Datum:** 2026-05-08
**Branch:** `mega41-pre-pilot-completion` (von `main` @ `a72a803`)
**Backup-Tag:** `main-backup-pre-mega41` (auf origin)
**Hauptquelle:** `docs/audit/PROVA-VOLLSTAENDIGKEITS-AUDIT-2026-05-12.md`

---

## 1. Audit-Bericht-Synthese

### Score-Stand 12.05.2026

| # | Bereich | Status | Aufwand |
|---|---------|--------|---------|
| 1 | Globale Suche (Cmd-K) — DIN-Drilldown | 🟡 PARTIAL | 2-3h |
| 2 | 360°-Verbindungen (Archiv + Kontakte) | 🟡 PARTIAL | 3-4h |
| 3 | Workflows verständlich + nicht überladen | 🟡 PARTIAL | 4-6h |
| 4 | Skizzen-Funktion | ✅ DONE | (verify 1h) |
| 5 | Bilder + Skizze + Diktat + Manuell IN GUTACHTEN | 🟡 PARTIAL | 4-5h |
| 6 | Audit Trail — gerichtsfest, beweissicher | 🟡 PARTIAL | 3-4h |
| 7 | Support-System | 🟡 PARTIAL | 4-5h |
| 8 | Admin-Dashboard Vollständigkeit | ✅ DONE | (verify 1h) |
| 9 | Externe Tool-Überwachung | 🟡 PARTIAL | 3-4h |
| 10 | PDFs perfekt | 🟡 PARTIAL | 2-3h |
| 11 | Daten-Import von externen Systemen | 🟡 PARTIAL | 6-8h |
| 12 | Einstellungen einheitlich | ✅ DONE | (verify 1h) |
| 13 | Mobile + Offline | 🟡 PARTIAL | 3-4h |

**Aktuell:** 3 ✅ / 10 🟡 / 0 ❌
**Ziel M⁴¹-FINAL:** 13 ✅ / 0 🟡 / 0 ❌

### Was bei den 10 PARTIAL-Punkten genau fehlt

| Punkt | Was fehlt konkret |
|-------|-------------------|
| P1 Cmd-K | `Cmd+K`/`metaKey`-Keybinding fehlt in Lib-Files (0 Matches), kein zentraler Modal-Picker, Drilldown-Test (DIN→DIN9→DIN98) nicht codifiziert |
| P2 360° | `archiv.html` (2 Mentions), `schadensfaelle.html` (0), `akte.html` (3) — kein zentrales 360-Widget. Nur `kontakte.html` hat aggregateEvents-Lambda |
| P3 Workflows | `baubegleitung.html` + `schadensfaelle.html` haben 0 Stepper-Refs. Inkonsistente Stepper-Adoption über 4 Flows. Kein Pause/Resume-Pattern |
| P5 PDF-Multi | Kein Lambda aggregiert eintraege chronologisch (0 Matches `fotos.*skizzen` in PDF-Lambdas). PDFMonkey-Walker nicht durchsucht |
| P6 Audit-Trail | Kein `source: 'ki'\|'sv_eigen'`-Spalten-Index. EU-AI-Act-Disclosure nur bei `weg_c` PDF, nicht bei jedem KI-Call. §407a-Eigenleistungs-Tracking nicht explizit |
| P7 Support | `support_tickets`-Schema fehlt in Migrations. `hilfe.html` hat nur Search+Quick-Links, kein "Ticket erstellen". Keine Push-Notification an Admin |
| P9 Push-Alerts | `admin-system-health.js` checkt 4 Services aber kein Cron + keine Verkettung mit `push-notify.js`. Make.com + PDFMonkey gar nicht im Health-Check |
| P10 PDFs | Marcel-Anforderung "22+ PDFMonkey-Templates" — nur 2 lokal sichtbar. Master-Liste fehlt. Pseudonymisierungs-Test gegen PII-Leaks nicht codifiziert |
| P11 Daten-Import | `import-assistent.html` UI existiert (374 LOC) aber **kein Backend-Lambda** für Mass-Import (CSV/JSON). Kein `gutachten-manager-import.js` |
| P13 Mobile | `prova-offline-queue.js` existiert aber kein Konflikt-Resolver-Test. DevTools-Offline-Smoke-Test nicht dokumentiert. Nur `diktat-mobile.html` als spezifische Page |

---

## 2. Code-Stand-Snapshot pro Phase

### Phase 1 — P11 Daten-Import (TOP-PRIO)

**Was DA ist:**
- `import-assistent.html` (374 LOC) — 4-Step-Wizard-UI mit Progress-Bar (step-dot active/done/pending)
- `dokument-import.html` (M⁴⁰ P4) — DOCX-Drag&Drop für **einzelne** Dokumente
- `kontakte.html` (Hinweise auf CSV)

**Was FEHLT:**
- Backend-Lambdas: keine `bulk-import-*.js` für Kontakte/Aufträge/Rechnungen
- Format-Detector
- Mapping-UI im Frontend nur prototypisch
- Audit-Trail-Integration für Imports
- Rollback-Mechanismus

### Phase 2 — P6 KI-Audit-Trail-Trennung

**Was DA ist:**
- `audit_trail`-Tabelle in `01_schema_foundation.sql:297` mit `payload JSONB`, `integrity_hash`, 4 Indizes
- 37 Lambdas haben audit_trail-Inserts
- 3 dedizierte Audit-Lambdas: `admin-audit-trail.js`, `audit-log.js`, `audit-trail-write.js`
- EU-AI-Act-Disclosure als Locked-Section in `lib/editor-locked-sections.js`

**Was FEHLT:**
- `source ENUM ('ki', 'sv_eigen', 'sv_uebernommen', 'system')`-Spalte
- `confidence`-Score-Spalte
- `eu_ai_act_disclosed BOOLEAN`-Spalte
- Auto-Logging in `lib/ki-werkzeug-stufen.js` mit source-Tag
- `audit-trail.html` Viewer-Page
- §407a SV-Eigenleistungs-Quote-Berechnung

### Phase 3 — P9 Push-Alerts + Health

**Was DA ist:**
- `admin-system-health.js` — checkt 4 Services (Stripe, Supabase, OpenAI, Sentry)
- `push-notify.js` mit VAPID-Keys-Config
- ENV-Status-Check + DB-Connection-Check
- `health.js` (öffentlicher Endpoint)

**Was FEHLT:**
- pg_cron-Schedule (alle 5 Min)
- `system_health_history`-Tabelle für Uptime
- Verkettung: Service down → push-notify Trigger
- Make.com + PDFMonkey-Pings
- Throttling-Logic (max 1 Push/h)
- SSL-Cert-Ablauf-Warning

### Phase 4 — P5 PDF-Aggregation

**Was DA ist:**
- `eintrag_typ ENUM` mit 5 Werten: `('diktat', 'text', 'foto', 'mix', 'skizze')`
- 5 Eintraege-Lambdas (CRUD + JVEG-Export)
- `lib/editor-pdf-generator.js` (M⁴⁰ P9, Browser-Print)

**Was FEHLT:**
- `eintraege-pdf-aggregator.js` Lambda — chronologische Aggregation aller Eintraege
- Foto-Layout-Logic mit Caption + Alt-Text
- Skizzen-Marker → Befund-Reference-Mapping
- Diktat-Original-vs-bereinigt-Trennung
- Editor-Integration "Aus Einträgen generieren"-Button

### Phase 5 — P7 Support-System

**Was DA ist:**
- `hilfe.html` (434 LOC) mit FAQ-Search + Quick-Links-Grid
- `admin-support-inbox.js` mit defensive Fallback (support_tickets → audit_trail-Filter → Sample-Data)
- `admin-support-update.js`

**Was FEHLT:**
- `support_tickets`-Migration
- `faq_entries`-Migration mit tsvector-Volltextsuche
- 30+ FAQ-Einträge geseedet
- `support.html` Frontend-Page (oder Erweiterung von hilfe.html)
- Ticket-Erstellung-Lambda
- KI-FAQ-Match vor Ticket-Erstellung

### Phase 6 — P1 Cmd-K + Drilldown

**Was DA ist:**
- `lib/global-search-engine.js` (Live-Filter)
- `netlify/functions/global-search.js` mit 8 Such-Bereichen (akten/kontakte/dokumente/termine/eintraege/textbausteine/templates/normen)
- `NORMEN_SEED` mit DIN 4108, 4109, 18195, 18531, 18532...

**Was FEHLT:**
- `lib/cmd-k-modal.js` — Modal-Komponente
- Keybinding `Cmd+K`/`Ctrl+K` global
- Drilldown-Test (DIN→DIN9→DIN98)
- Recent-Searches via localStorage
- Visual-Match-Highlighting

### Phase 7 — P2 Kontakt-360-View

**Was DA ist:**
- `netlify/functions/kontakt-aktivitaeten.js` mit `__aggregateEvents` Pure-Function (4 Event-Typen: auftrag/rechnung/termin/eintrag)
- `tests/verknuepfungen/b1-360.test.js`
- `kontakte.html:308` ruft Lambda

**Was FEHLT:**
- `kontakt-detail.html` (oder neue `kontakt-360.html`) mit 9-Tab-Layout
- Statistik-Berechnungen (Gesamtumsatz, Durchschnitts-Bearbeitungszeit, Zahlungsverhalten)
- Quick-Actions (Neuer Auftrag/Brief/Termin/Bescheinigung)
- PDF-Export "Kompletter Kontakt-Bericht"
- Bilder/Skizzen/Diktate-Erweiterung von 4 auf 9 Event-Typen

### Phase 8 — P3 Workflow-Stepper-Polish

**Was DA ist:**
- `lib/wizard-live-save.js`
- `neuer-fall.html` mit 12 Stepper-Refs
- `wertgutachten.html` (4), `beratung.html` (3)

**Was FEHLT:**
- `lib/wizard-stepper.js` zentrale Pattern-Lib
- Konsistenz-Pass über `baubegleitung.html` (0 Refs!) + `schadensfaelle.html` (0 Refs!)
- "Pause/Resume"-Pattern via localStorage-Draft
- Mobile-Stepper-Optimierung
- Accessibility-Audit (axe-core)

### Phase 9 — P10 PDFs Vollständigkeit

**Was DA ist:**
- `lib/pdf-service-pdfmonkey.js` mit `PDFMONKEY_MODE_C_TEMPLATE_ID`
- 4 PDF-Lambdas (`pdf-proxy`, `generate-pdf-mode-c`, `foto-anlage-pdf`, `admin-pdf-queue`)
- `bescheinigung-generate.js`
- 2 PDFMonkey-Templates lokal (`pdfmonkey-brief-template.html`, `pdfmonkey-messprotokoll-template.html`)

**Was FEHLT:**
- Live-Inventar via PDFMonkey-API (welche 22+ Templates exist)
- Drift-Detection gegen `lib/dokument-templates-cache.js`
- Test-Render-Suite pro Template
- Pseudonymisierungs-Audit mit synthetischen PII

### Phase 10 — P13 Mobile Sync-Konflikt

**Was DA ist:**
- `manifest.json` + `sw.js` (PWA installierbar)
- `lib/pwa-install-prompt.js`
- IndexedDB in 7 Files (`prova_offline` v2)
- `prova-offline-queue.js`
- `diktat-mobile.html` als Mobile-Page
- `offline.html` Fallback

**Was FEHLT:**
- Konflikt-Resolution-UI (Last-Write-Wins vs Merge)
- Sync-Konflikt-Tests gegen reale Szenarien
- Visual-Sync-Status-Icon
- "Wiederherstellbare Entwürfe"-Page
- DevTools-Offline-E2E-Test

### Phase 11 — Verify ✅-Punkte (P4/P8/P12)

**Was zu verifizieren:**
- P4 Skizzen: Apple Pencil Pressure-Test, IndexedDB-Recovery
- P8 Admin-Cockpit: 12 Sektionen klickbar, 25 Lambdas erreichbar
- P12 Einstellungen: 8 Sections funktional, Theme-Persist

### Phase 12 — E2E Compound

**Was DA ist:**
- Einzeltests pro Phase (~ 200+ M⁴⁰-Tests)
- Playwright-Tests in `tests/00-smoke`, `01-login`, `02-authenticated-smoke`, `03-core-workflow`, `04-e2e-workflow`

**Was FEHLT:**
- 5 Compound-Szenarien aus Master-Prompt:
  - Migration vom Gutachten-Manager
  - Mobile Außentermin
  - Etablierter SV mit Word-Vorlage
  - System-Admin tagsüber
  - Globale Suche → Kontakt-360

---

## 3. Implementierungs-Reihenfolge mit Begründung

| Order | Phase | Begründung |
|-------|-------|------------|
| 1 | **P0 Recheck** | PFLICHT laut Master-Prompt |
| 2 | **P1 Daten-Import** | Marcel-Direktive: "wenn das nicht funktioniert, funktioniert gar nichts." Pre-Pilot-Blocker #1 |
| 3 | **P2 Audit-Trail** | Compliance-Foundation. Spätere Phasen (P4/P5) hängen davon ab (KI-Logging beim Eintrags-Aggregat) |
| 4 | **P3 Push-Alerts** | Operations-Sicherung. Marcel als Solo-Operator MUSS Down-Time früh erfahren |
| 5 | **P4 PDF-Aggregation** | Baut auf P2 (KI-vs-SV-Markierung) auf — kommt logisch danach |
| 6 | **P5 Support-System** | Kann ohne andere Phasen — aber Recherche-Pflicht (BVS-Foren) braucht Zeit |
| 7 | **P6 Cmd-K** | UI-Polish, kann nach Backend-Foundation |
| 8 | **P7 Kontakt-360** | UI-heavy, braucht erstmal Backend (eintraege+rechnungen+termine schon da) |
| 9 | **P8 Stepper-Polish** | UX-Recherche-Pflicht — kann parallel zu anderen UI-Tasks |
| 10 | **P9 PDFs-Verify** | Audit-only, keine neue Implementation |
| 11 | **P10 Mobile-Sync** | UX-Polish über bestehender Foundation |
| 12 | **P11 ✅-Verify** | Live-Tests, kein Code |
| 13 | **P12 E2E** | Aggregiert ALLES davor |
| 14 | **P13 FINAL** | Tag v1400 |

### Abhängigkeiten

```
P2 (Audit-Trail-source-Spalte)
   ↳ P4 (PDF-Aggregation nutzt source bei Diktat-Markierung)
   ↳ P5 (Support-Antworten loggen source='ki' bei KI-Vorschlag)

P11 (✅-Verify P4/P8/P12)
   ↳ orthogonal — kein Block für andere Phasen

P12 (E2E)
   ↳ benötigt P1-P11 abgeschlossen
```

---

## 4. Token-Kosten-Schätzung pro Phase

Basierend auf M⁴⁰-Empirie (~ 35-50k Tokens pro Phase mit ~25-30 Tests).

| Phase | Aufwand-Stunden | Token-Schätzung | Tests-Schätzung |
|-------|-----------------|-----------------|-----------------|
| 0 (Recheck) | 1h | ~15k | 0 |
| 1 (Daten-Import) | 6-8h | ~80-100k | 15+ |
| 2 (Audit-Trail) | 3-4h | ~40-50k | 12+ |
| 3 (Push-Alerts) | 3-4h | ~40-50k | 10+ |
| 4 (PDF-Aggregation) | 4-5h | ~50-60k | 10+ |
| 5 (Support) | 3-4h | ~50-60k (FAQ-Content groß) | 12+ |
| 6 (Cmd-K) | 2-3h | ~25-35k | 10+ |
| 7 (Kontakt-360) | 3-4h | ~45-55k | 12+ |
| 8 (Stepper) | 2-3h | ~30-40k | 8+ |
| 9 (PDFs-Verify) | 2-3h | ~25-30k | 8+ |
| 10 (Mobile) | 2-3h | ~30-40k | 12+ |
| 11 (✅-Verify) | 2-3h | ~20-25k | 8+ |
| 12 (E2E) | 3-4h | ~40-50k | 5+ |
| 13 (FINAL) | 1h | ~10-15k | 0 |
| **Σ** | **38-49h** | **~500-660k** | **~140 neu** |

### Session-Splitting (empfohlen)

```
Session 1 (heute): Phase 0 + 1 (~95-115k Tokens)
Session 2:          Phase 2 + 3 (~80-100k)
Session 3:          Phase 4 + 5 (~100-120k)
Session 4:          Phase 6 + 7 + 8 (~100-130k)
Session 5:          Phase 9 + 10 + 11 (~75-95k)
Session 6:          Phase 12 + 13 (~50-65k)
```

Wenn Token-Window < 15% → PARTIAL-Doku + sauberer Resume.

---

## 5. Master-Doku-Stand (Cross-Check)

**Verfügbar in `docs/master/`:**
- `PROVA-VISION-MASTER.md` (464 LOC, v3.0 100% Komplett markiert)
- `PROVA-ARCHITEKTUR-MASTER.md` (790 LOC)
- `PROVA-REGELN-PERMANENT.md` (415 LOC)
- `PROVA-CHAT-TRANSPORT-vAKTUELL.md` (397 LOC)
- `PROVA-MARATHON-MASTER-PLAN-2026-05-07.md`
- `PROVA-MARCEL-ONBOARDING.md`
- `PROVA-SPRINTS-MASTERPLAN.md`
- `PROVA-SUPABASE-SCHEMA-REFERENCE.md`

**CLAUDE.md** (Repo-Root) — Operations-Quelle, Single Source of Truth für CC-Verhalten.

**Audit-Bericht:** `docs/audit/PROVA-VOLLSTAENDIGKEITS-AUDIT-2026-05-12.md` (369 LOC, gestern committed).

**M⁴⁰-FINAL:** `docs/sprint-status/MEGA-40-FINAL.md` — 10/10 Phasen done, 247 Tests grün, Tag v1300.

---

## 6. Compliance-Anker für M⁴¹

| Bereich | Regel | Anwendung in M⁴¹ |
|---------|-------|-----------------|
| §407a ZPO | Persönliche-Verantwortungs-Doktrin | P2 SV-Eigenleistungs-Quote, P4 Diktat-Markierung |
| EU AI Act Art. 50 | Transparenz-Pflicht | P2 Disclosure-Stempel auf JEDEM KI-Inhalt |
| DSGVO Art. 28-32 | Pseudonymisierung | P9 PII-Audit, P11 Import-Validation |
| IHK-SVO | Bestellungs-Pflichten | P4 PDF-Footer, P9 Template-Audit |
| BVS-Standards | Berufs-Standards | P5 FAQ-Recherche-Quelle |

---

## 7. Anti-Pattern aus M⁴⁰-Lessons

| Lesson | Anwendung in M⁴¹ |
|--------|-----------------|
| Bash-Multi-File-Test-Loop hängt | Tests pro Phase einzeln laufen lassen |
| TipTap-Init braucht extension-Order | Custom-Extensions als `extraExtensions`-Array |
| Mode-Switch-State braucht state-Param | Builder-Functions explizit state übergeben |
| sw.js-Bump bei JEDEM Commit | Per-Item-Push inkludiert sw.js wenn APP_SHELL betroffen |
| `--no-edit` ist NICHT bei `git rebase` valid | Nicht relevant für M⁴¹ |

---

## 8. Resume-Plan für Folge-Sessions

```
Session 1 (jetzt):
   git checkout mega41-pre-pilot-completion
   → Phase 1 starten: Daten-Import-Lambdas

Session 2+:
   git pull
   git log --oneline | head -10  (Stand prüfen)
   → letzte PARTIAL-Doku lesen
   → nächste Phase starten
```

---

*MEGA⁴¹ Phase 0 Audit-Recheck — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
