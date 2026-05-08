# MEGA⁴¹ Phase 12 — E2E Compound-Szenarien

**Status:** Source-basierte Pfad-Verifikation ✅, Live-Browser-E2E (Playwright) = **Marcel-Pflicht**
**Branch:** `mega41-pre-pilot-completion`

---

## Strategie

5 Szenarien aus Master-Prompt automatisiert via Source-Inspection: Alle benötigten Bauteile (Files + Lambdas + Routes + Konstanten) müssen existieren UND verlinkt sein. Live-Browser-E2E mit Playwright braucht echte Browser-Session — separater Test-Run.

---

## Szenario 1 — "Neuer SV migriert von Gutachten Manager" (10 Tests ✅)

**Pfad:** Account → DSGVO-Consent → CSV-Import → Editor 3-Wege → Aggregation → PDF + Audit

| Komponente | Status |
|------------|--------|
| DSGVO-Consent (datenschutz.html) | ✅ |
| Account-Creation (app-register/onboarding) | ✅ |
| Import-Flow (UI + 3 Lambdas + 2 Libs + Bridge) | ✅ |
| Format `gutachten_manager` im Detector | ✅ |
| Editor + 3-Wege-Modal | ✅ |
| Eintraege-PDF-Aggregator | ✅ |
| §407a + EU AI Act Footer (Locked-Sections) | ✅ |
| Audit-Trail-Viewer | ✅ |
| import-assistent → Supabase-Bridge geladen | ✅ |
| Migration 36 import_logs mit Rollback-Token | ✅ |

---

## Szenario 2 — "Mobile Außentermin" (10 Tests ✅)

**Pfad:** Offline → Foto/Skizze/Diktat/Notiz → Online → Sync → Aggregation → PDF

| Komponente | Status |
|------------|--------|
| PWA-Foundation (sw.js + manifest + offline.html) | ✅ |
| IndexedDB-Queue mit 4 Stores | ✅ |
| Foto-Upload + EXIF-Strip | ✅ |
| Skizzen-Canvas mit Pressure + Marker | ✅ |
| diktat-mobile.html | ✅ |
| Sync-Conflict-Resolver | ✅ |
| Offline-Sync-Status-Icon | ✅ |
| Recovery-Page (Drafts) | ✅ |
| Eintraege-Aggregation chronologisch | ✅ |
| APP_SHELL-Caching | ✅ |

---

## Szenario 3 — "Etablierter SV mit Word-Vorlage" (10 Tests ✅)

**Pfad:** Login → DOCX-Import → Hybrid weg_c → Bibliothek → Spell+Konjunktiv-II → PDF

| Komponente | Status |
|------------|--------|
| Cross-Domain-Auth (M³⁹ Cookie-Adapter) | ✅ |
| DOCX-Import via mammoth.js | ✅ |
| Hybrid weg_c mit 4 Locked-Sections | ✅ |
| Bibliothek-Adapter 6 Kategorien + Auto-Footnote | ✅ |
| Spell-Layer 3-Schicht (Browser+S1+S3) | ✅ |
| KEIN gpt-4o im Code-Path | ✅ |
| PDF-Print mit weg_c Locked-Inject | ✅ |
| Editor-Toolbar (Bibliothek+Spell+Konjunktiv+PDF) | ✅ |
| 3-Wege-Modal mit confirmModeSwitch | ✅ |
| Migration 33 documents.weg + locked_sections | ✅ |

---

## Szenario 4 — "System-Admin tagsüber" (11 Tests ✅)

**Pfad:** Admin-Dashboard → Health-Spike → Push-Alert → Support-Inbox → Audit-Trail

| Komponente | Status |
|------------|--------|
| Admin-Cockpit 12 Sections | ✅ |
| 28 admin-* Lambdas | ✅ |
| Health-Check-Cron 8 Services | ✅ |
| Push-Throttling 1/Service/h | ✅ |
| 3 Alert-Types (down/recovery/latency) | ✅ |
| admin-system-uptime mit 2 Views | ✅ |
| Support-Inbox + Defensive-Fallback | ✅ |
| Support-Ticket-Create + faq-search | ✅ |
| Audit-Trail-Lambda + Viewer | ✅ |
| KI-vs-SV ENUM (audit_source) | ✅ |
| PDFMonkey-Inventory + Pseudonymisierungs-Audit | ✅ |

---

## Szenario 5 — "Globale Suche und Kontakt-360" (10 Tests ✅)

**Pfad:** Cmd-K → "Müller" → Kontakt-Treffer → 360-View → Quick-Action neuer Auftrag

| Komponente | Status |
|------------|--------|
| Cmd-K Modal mit Keybinding | ✅ |
| global-search Lambda mit 8 Bereichen | ✅ |
| kontakt-360 Lambda mit 9 Tabs | ✅ |
| kontakt-detail.html 9 Tabs + 5 Quick-Actions | ✅ |
| Quick-Action mit kontakt_id-Param | ✅ |
| Drilldown DIN→DIN9→DIN98 (Highlight) | ✅ |
| Recent-Searches max 10 (localStorage) | ✅ |
| Statistiken (Umsatz/Bearbeitungstage/Score) | ✅ |
| PDF-Bericht-Export | ✅ |
| 4 Quick-Action-Pages mit kontakt_id-Routing | ✅ |

---

## Test-Bilanz

| Szenario | Tests | Status |
|----------|-------|--------|
| 1 Migration | 10 | ✅ |
| 2 Mobile | 10 | ✅ |
| 3 Hybrid | 10 | ✅ |
| 4 Admin | 11 | ✅ |
| 5 Search-360 | 10 | ✅ |
| **Σ E2E** | **51** | **✅** |

---

## Marcel-Pflicht: Live-Browser-E2E (Playwright)

Nach M⁴¹-FINAL muss Marcel die folgenden Live-Tests ausführen (z.B. via existing `tests/04-e2e-workflow.spec.js`):

1. **SZ1 Migration:** echtes CSV-Sample vom Gutachten-Manager → durchspielen
2. **SZ2 Mobile:** iPad mit Apple Pencil offline → online → Sync verifizieren
3. **SZ3 Hybrid:** echte Word-Vorlage hochladen → Mode-C → PDF-Output
4. **SZ4 Admin:** Health-Check Service down simulieren (z.B. Stripe-API-Key invalidieren) → Push erhalten
5. **SZ5 Search-360:** Echten Test-Kontakt mit 50+ Bezügen → Performance <2s

Performance-Erwartungen (Master-Prompt):
- Re-Sync 50 Einträge < 30s
- PDF-Generation <30s für 30-Seiten
- Kontakt-360 mit 100+ Bezügen lädt <2s

---

## Acceptance-Status (Master-Prompt P12)

- [x] 5 Szenarien Source-basiert verifiziert (51 Tests)
- [x] Doku mit Pfad-Diagramm pro Szenario
- [ ] **Marcel-Pflicht:** Live-Playwright-Run + Performance-Messung + Bug-Report

---

## Bekannte Limitierungen

1. **Source-Verifikation != Live-Funktional** — Tests prüfen Bauteil-Existenz + Verlinkung, nicht Runtime-Verhalten.
2. **Performance-Werte** — nur Live messbar.
3. **Browser-Hardware-Tests** (Pencil/S Pen) — nur auf realer Hardware.

---

*MEGA⁴¹ Phase 12 — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
