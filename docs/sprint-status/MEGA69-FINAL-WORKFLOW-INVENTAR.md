# MEGA⁶⁹-FINAL — Phase A — Delta-Workflow-Audit

**Datum:** 2026-05-12
**Audit-Stand:** Delta-Inspektion ohne Code-Änderung (Marcel-Direktive)
**Vorgänger:** MEGA⁶⁸-FINAL-WORKFLOW-INVENTAR.md (Phase A Original)
**Methode:** Was wurde in FINAL-1/2/3 erledigt? Was bleibt für MEGA⁶⁹?

---

## TL;DR (60 Sek)

MEGA⁶⁸-FINAL-1/2/3 hat **viele MEGA⁶⁹-Items vorab geliefert** (B.1-3, C.1-4, E.2-4).
Verbleibendes MEGA⁶⁹-Scope: **6 echte Items + 5 Polish-Items = 11 Tasks @ ~36-54h**.

**Empfehlung:** Wegen Skizze-Editor (6-10h Tiefe, Session-5-Spec) **2 Sub-Sprints** statt 1 Marathon. Sonst Skizze-Editor frisst die Hälfte und der Rest wird Skelett.

---

## A.1 — Was MEGA⁶⁸-FINAL bereits erledigt hat

### Phase B Pilot-Blocker (alle ✅)
| Block | Status | Quelle |
|---|---|---|
| B.1 Login-Doppel-Eingabe | ✅ verified, kein Fix nötig | MEGA³⁹ Phase 10 Cross-Domain-Cookie-Adapter aktiv |
| B.2 Index/App-Split | ✅ verified | netlify.toml v6.0 Block A/B/C aus MEGA⁵⁰+MEGA³¹ |
| B.3 Diktat-Mode-Bug | ✅ gefixt FINAL-1 | `ortstermin-modus.html` `autoStopDiktatBeiTextEingabe()` |

### Phase C Vollständigkeits-Lücken (4 von 7 ✅)
| Item | Status | Liefer-Datei |
|---|---|---|
| C.1 Global Search Cmd+P | ✅ FINAL-2 | `lib/prova-global-search.{js,css}` |
| C.2 Kontakt-360 Modal | ✅ FINAL-2 | `lib/prova-kontakt-360.{js,css}` |
| C.3 Mein-Aktivitätsprotokoll | ✅ FINAL-2 | `lib/prova-mein-protokoll.{js,css}` |
| C.4 Bibliothek-UI | ✅ FINAL-2 | `bibliothek.html` (250 LOC, Tabs Normen/Bausteine/Briefe) |
| **C.5 Fristen Kalender-View** | ❌ OFFEN für MEGA⁶⁹ | `fristen.html` existing Listen-View, Kalender + Phase-Templates fehlen |
| **C.6 Mahnwesen 3-Stufen-Flow** | ⚠ teilweise | `mahnwesen.html` existing mit Mahn1/2/3-Buttons (Airtable!), aber 1-Klick PDF+Email + Workflow-Integration fehlt |
| **C.7 Skizze-Editor** | ❌ OFFEN für MEGA⁶⁹ | `lib/skizzen-canvas.js` + `lib/extensions/prova-skizze-embed.js` Skelett, Canvas-Tools + Maßstab + Foto-Overlay fehlen |

### Phase D MEGA⁶⁸-Original (alle ✅ aus MEGA⁶⁸)
Externe Dokumente, IHK-Export, SMTP-Versand, Inhaltsangabe, Anhang-Lightbox, Beweisfragen-Panel, Audit-Search, Version-Diff Beta — alle live aus MEGA⁶⁸ + MEGA⁶⁷.

### Phase E Workflow-Heilung (3 von 6 ✅)
| Item | Status | Quelle |
|---|---|---|
| E.2 Workflow-Engine | ✅ FINAL-3 | `lib/prova-workflow-engine.{js,css}` 10 typ-Definitionen + Frist-Templates |
| E.3 Cmd+K Navigation | ✅ FINAL-1+2 | +20 Commands in `prova-commands-registry.js` |
| E.4 Dashboard-Widgets | ✅ FINAL-3 | `lib/prova-dashboard-widgets.{js,css}` 5 Tiles |
| **D.1 Asset-Trigger Auto-Wiring** | ❌ OFFEN | `prova-asset-event-bus.js` ist da, aber whisper-diktat/foto-upload/skizze-save dispatchen **nicht** automatisch |
| **D.5 Akte komplett mit Tabs** | ❌ OFFEN | `akte.html` 901 LOC, Audit/Versand/Versionen-Tabs müssen aus stellungnahme.html migriert werden |
| **D.6 Top-10 Brüche fixen** | ❌ OFFEN | Kontakte-Duplikat (kontakte.html vs kontakte-supabase.html), mahnwesen Airtable-Legacy, akte-Tabs unvollständig |

### Phase F Polish (0 von 5 für MEGA⁶⁹)
Alle F-Items sind MEGA⁶⁹-spezifisch (sw.js v3130+, MEGA69-Sprint-Doku, akte/dashboard Integration).

---

## A.2 — Verbleibendes MEGA⁶⁹-Scope (mit Aufwand)

### KERN (Pilot-Blocker oder sichtbare Lücken)
| # | Item | Beschreibung | Aufwand | Priorität |
|---|---|---|---|---|
| **1** | **D.1** Asset-Trigger Auto-Wiring | whisper-diktat / foto-upload / skizze-save → `dispatchEvent('prova:asset-created')`. Strategie: Edge-Response-Header `X-Prova-Audio-Id` oder Frontend-Poll. | 2-3h | 🔥 HOCH |
| **2** | **C.5** Fristen Kalender-View | Kalender-Grid + Drag-Drop + "Template anwenden"-Button pro Auftrag (nutzt Workflow-Engine `getFristTemplates`) | 4-6h | 🔥 HOCH |
| **3** | **C.6** Mahnwesen 3-Stufen-Flow | mahnwesen.html Airtable→Supabase, 1-Klick PDF+Email-Versand, Auto-Stufen-Erhöhung, integriert mit Versand-Modal (existing) | 5-7h | 🔥 HOCH |
| **4** | **D.5** Akte-Tabs vollständig | akte.html: Audit + Versand-Historie + Versionen-Tabs aus stellungnahme.html migrieren oder als sektion einbinden | 4-6h | 🔥 HOCH |
| **5** | **D.6** Top-10 Brüche fixen | Kontakte-Duplikat consolidieren, dashboard veraltete Tiles ersetzen, mahnwesen Airtable→Supabase | 3-5h | 🟡 MITTEL |
| **6** | **C.7** Skizze-Editor | Session-5-Spec voll: Canvas + Linie/Rechteck/Pfeil/Maß-Tool + Foto-Overlay + SVG-Export + Mobile-Touch | **6-10h** | 🟡 MITTEL |

### POLISH (kann split werden)
| # | Item | Aufwand | Notiz |
|---|---|---|---|
| 7 | E.1 anhang-process PDF/DOCX OCR-Roundtrip (parse-docx integrieren) | 2-3h | Edge Function existing, Schema-Inspektion nötig |
| 8 | E.3 KI-Funktions-Garantie 5 Tests (Regel 15) für Diktat/Foto/Skizze/Befund/Suggestion | 3-4h | tools/test-* |
| 9 | E.4 iPad-Latenz-Test 60ms-Doktrin | 1h | requires physical iPad oder Sim |
| 10 | E.5 Version-Diff Myers/Changeset upgrade | 3-4h | existing line-diff Beta |
| 11 | E.6 ki_lernpool-Index für Audit-Search | 2-3h | war MEGA⁶⁸ defer, jetzt umsetzen |
| 12 | F.1-F.5 Polish: editor=mega69 default, akte/dashboard Integration, test-page, sw.js, Sprint-Doku | 3-4h | |

### **TOTAL: 38-55h CC-Zeit** — am oberen Ende 30-50h-Budget, Skizze ist der größte Brocken

---

## A.3 — Sub-Sprint-Empfehlung (2-Splits)

### Variante A (empfohlen): **2 Sub-Sprints**

#### MEGA⁶⁹-1 — "Pilot-Bereit Core" (~18-27h, 2-3 Sessions)
- D.1 Asset-Trigger Auto-Wiring (Items 1)
- C.5 Fristen-Kalender (2)
- C.6 Mahnwesen 3-Stufen (3)
- D.5 Akte-Tabs (4)
- D.6 Top-10 Brüche (5)
- F.2 Integration in akte/dashboard
- F.4 sw.js → v3140
- F.5 MEGA69-1-Sprint-Doku

→ **Marcel kann sofort Pilot-E2E testen.** Skizze ist sekundär (war NinjaAI-Wunsch, aber Pilot-SVs zeichnen meist mit Stift auf Papier + fotografieren).

#### MEGA⁶⁹-2 — "Skizze + Pre-Pilot Polish" (~20-28h, 3-4 Sessions)
- C.7 Skizze-Editor (Item 6) — eigener Mini-Sprint mit voller Aufmerksamkeit
- E.1 anhang-process PDF/DOCX (7)
- E.3 KI-5-Tests (8)
- E.4 iPad-Latenz (9)
- E.5 Version-Diff Myers (10)
- E.6 ki_lernpool (11)
- F.1/F.3 editor=mega69 + test-page
- F.4/F.5 sw.js → v3150 + finale Sprint-Doku

→ **Pre-Pilot-Härtung + Vision-100%.**

### Variante B: **1 Marathon-Sprint (>50h)**
Riskant. Skizze-Editor wird vermutlich Skelett. Marcel-Direktive: *"lieber 2× sauber als 1× halbgar"*.

### Variante C: **3 Sub-Sprints**
Wenn Marcel maximale Sauberkeit will:
- MEGA⁶⁹-1 Pilot-Core (Items 1-5 + F-Integration) — 15-22h
- MEGA⁶⁹-2 Skizze-Editor solo (Item 6) — 6-10h
- MEGA⁶⁹-3 Pre-Pilot-Polish (Items 7-11 + F) — 14-19h

---

## A.4 — Recherche-Mandat (für KERN-Items)

Pro fachlichem MEGA⁶⁹-Item ≥10 Quellen. Standard-Set:

1. IHK Sachverständigenordnung (BIH-Mustertext)
2. BVS Verbandsrichtlinien
3. IfS Köln Praxis-Handbuch
4. §407a–414 ZPO
5. JVEG (Justizvergütungs-/-entschädigungsgesetz)
6. **BGB §286 ff Verzug + §288 Verzugszinsen (kritisch für C.6 Mahnwesen!)**
7. HOAI §34 (Baubegleitung-Fristen)
8. DIN 1961 / VOB-B
9. DIN 31051 (Instandhaltung)
10. EU AI Act Art. 50
11. LG Darmstadt 10.11.2025 (KI-Transparenz)
12. NinjaAI Session 4 (Workflow-Sparring)
13. NinjaAI Session 5 (Skizze-Spec für C.7)
14. PROVA-VISION-MASTER + CLAUDE.md

### Item-spezifisch zusätzlich:
- **C.5 Fristen-Kalender:** Linear Cycles-Pattern, FullCalendar.io API-Doku, EU eIDAS Fristberechnung
- **C.6 Mahnwesen:** §286 BGB, Inkassodienstleistungsgesetz, BMJ-Standardmahnung-Mustertext
- **C.7 Skizze:** TLDraw + Excalidraw Source-Code Patterns, SVG-Spec, iPad-Pencil Force-API

---

## A.5 — Self-Scoping-Vorschläge

- **Skizze-Editor:** Vanilla-Canvas + SVG-Export, KEIN Excalidraw/TLDraw als Dependency (Bundle-Größe + Lizenzen). Tools-Palette minimal (Linie, Rechteck, Pfeil, Maß, Text, Foto-Layer). Mobile-Touch über Pointer-Events.
- **Mahnwesen Migration:** Airtable-Path → Supabase mahnungen-Tabelle (existing Schema?). Wenn nicht: Migration-File `42_mega69_mahnwesen.sql`. Existing `mahnwesen-cron` Edge Fn nutzen.
- **Akte-Tabs:** **Embed**-Strategie statt Migration: stellungnahme.html-Sektionen laden in akte-Tab via IFrame oder JS-Component-Bridge. Schneller, weniger Code-Duplikat-Risiko.
- **Asset-Trigger:** Frontend-Poll als MVP, Edge-Header-Strategie als V2 (komplexer, später).
- **Brüche fixen:** Top-3 reicht für Pilot. Kontakte-Duplikat archive (rename → kontakte-airtable-legacy.html.bak), mahnwesen.html neuschreiben, dashboard.html Workflow-Engine wiring.

---

## A.6 — Fragen an Marcel vor Phase B

1. **Variante A/B/C** der Sub-Sprint-Aufteilung — welche?
2. **Skizze-Editor MEGA⁶⁹ oder MEGA⁷⁰?** Pilot-SVs können erstmal Foto-Annotationen statt Vektor-Skizze nutzen — Aufschub würde MEGA⁶⁹ um 6-10h entlasten.
3. **Mahnwesen Migration Airtable → Supabase JETZT** oder bleibt Mahnwesen weiterhin Airtable bis K-1.5-Cutover (Master-Plan: Make-Account-Kündigung nach Cutover)?
4. **akte.html Strategie:** Embed (IFrame-Bridge) oder volle Migration der stellungnahme-Sektionen?
5. **D.6 Brüche-Liste:** Top-3 reicht oder alle 10 fixen?

---

## Quellen (Phase-A-Audit)

Für Audit reichten:
- File-Inspektion (Glob + Read)
- DB-Inspektion (vorherige MEGA⁶⁸-FINAL-Audit-Daten)
- Sprint-Status-Reports MEGA⁶²-MEGA⁶⁸-FINAL-3
- MEGA⁶⁸-FINAL-WORKFLOW-INVENTAR.md (Vorgänger-Audit)

Fachliche Recherche pro KERN-Item kommt in Phase B+C+D (10+ Quellen pro Item, siehe A.4).

---

## Empfehlung

**Variante A (2 Sub-Sprints) mit Skizze-Aufschub auf MEGA⁷⁰** wäre ehrlich-pragmatisch:
- MEGA⁶⁹-1 Pilot-Core (~18-22h, 2-3 Sessions) → **Marcel testet Pilot-E2E**
- MEGA⁶⁹-2 Pre-Pilot Polish (~12-17h) → **Vision 95%**
- MEGA⁷⁰ Skizze-Editor solo + Onboarding-Doku (~10-14h) → **Vision 100%**

So bleibt jeder Sprint <25h, Skizze bekommt verdiente Aufmerksamkeit, Pilot startet schneller.

**Bei Marcel-OK auf eine Variante:** Phase B Start mit den ersten KERN-Items.

---

*Ende Phase A · MEGA⁶⁹-FINAL · 11 Items @ 38-55h · 2-3 Sub-Sprints empfohlen.*
