# MEGA⁶⁸-FINAL-3 — Workflow-Heilung (KERN-Sprint)

**Datum:** 2026-05-12
**Sprint:** MEGA⁶⁸-FINAL-3 (letzter Sub-Sprint MEGA⁶⁸-FINAL)
**Status:** ✅ Phase E.2 + E.4 geliefert · E.5 / C.5 / C.6 / C.7 als Hooks vorbereitet, Voll-Implementation MEGA⁶⁹
**Vorgänger:** MEGA⁶⁸-FINAL-2 (Vollständigkeits-Lücken v3120)
**Nachfolger:** MEGA⁶⁹ (Pre-Pilot Polish + E2E + Skizze-Editor + Mahnwesen-UI)

---

## TL;DR

**Workflow-Engine** (Phase E.2) implementiert: Phasen-Definitionen für alle 10
`auftraege.typ`-Enum-Werte (schaden / beweis / ergaenzung / gegen / kurzstellungnahme /
wertgutachten / beratung / baubegleitung / schied / gericht) mit Helferlein-Buttons pro
Phase + Frist-Templates. **Dashboard-Widgets** (Phase E.4) als modulare Tiles für
existing dashboard.html, nutzen Workflow-Engine für Phase-Stepper-Progress.

Recherche-Mandat erfüllt: 10 Quellen für SV-Workflows (IHK-Mustertext, BVS-RL, IfS, ZPO §404/407a/411/485, JVEG, BGB §286, ImmoWertV, HOAI §34, DIN 31051) plus PROVA-Master-Docs.

---

## Items

### E.2 — Workflow-Engine ✅
**Datei:** `lib/prova-workflow-engine.{js,css}`

**Pro `auftrag_typ` Phasen-Definition** (mit Recherche-Quellen):

| typ | Phasen | Quellen |
|---|---|---|
| `schaden` | 9 (Eingang → Akte → Ortstermin → Befund → §6 → PDF → Versand → Rechnung → Archiv) | BVS-RL, IHK-Mustertext |
| `gericht` | 10 (§404 Beauftragung → Akteneinsicht → Beweisbeschluss-Analyse → … → ggf. Ergänzungsgutachten) | §404/407a/411 ZPO, JVEG |
| `beratung` | 5 (Anruf → Notiz → Zusammenfassung → Rechnung → Archiv) | BVS Telefon-Beratung-RL |
| `baubegleitung` | 7 (Beauftragung → Bestandsaufnahme → Phasen-Termine → Zwischenberichte → Abnahme → Bericht → Rechnung) | HOAI §34 |
| `kurzstellungnahme` | 5 (Eingang → Sichtung → Editor → Versand → Rechnung) | IHK-Mustertext |
| `wertgutachten` | 5 (Beauftragung → Besichtigung → Wertermittlung → Gutachten → Versand+Rechnung) | ImmoWertV |
| `beweis` | 5 (Eingang §485 → Termin → Ortstermin → Bericht → Versand) | §485 ZPO |
| `ergaenzung` | 5 (Eingang → Vor-Gutachten-Sichtung → Antwort → Versand → Rechnung) | §411 ZPO (NIE als "§411" im UI — "Ergänzungsgutachten") |
| `gegen` | 5 (Eingang → Vor-Analyse → Befund → Vergleich → Versand) | BVS-RL |
| `schied` | 5 (Auftrag → Parteien-Anhörung → Beweisaufnahme → Schiedsgutachten → Versand+Rechnung) | BGB §317 ff |

**API:**
```js
ProvaWorkflowEngine.getPhases(auftragsTyp)          // → Array<Phase>
ProvaWorkflowEngine.getCurrentPhase(auftrag)        // → Phase
ProvaWorkflowEngine.getNextActions(auftrag)         // → Array<{label, action, icon, phase}>
ProvaWorkflowEngine.getFristTemplates(auftragsTyp)  // → Array<{titel, daysFromNow, pipeline}>
ProvaWorkflowEngine.renderStepper(container, auftrag)
ProvaWorkflowEngine.renderHelferlein(container, auftrag)
```

**Frist-Templates pro typ** (Stand: Recherche):
- `schaden`: 28 Tage Stellungnahme + 14 Tage Rückfrage
- `gericht`: 90 Tage Abgabe + 21 Tage Akteneinsicht + 28 Tage Ergänzung
- `kurzstellungnahme`: 10 Tage
- `beweis`: 28 Tage Bericht
- `ergaenzung`: 21 Tage
- `gegen`: 42 Tage
- `wertgutachten`: 35 Tage
- `baubegleitung`: 30/90/180 Tage Phasen-Reports
- `schied`: 60 Tage
- `beratung`: keine

**CustomEvents:**
- `prova:phase-click` (User klickt auf Stepper-Phase)
- `prova:cmd-trigger` (Helferlein-Button → Cmd+K-Command auslösen)

**CSS:**
- Stepper im Dark-Theme der dashboard.html/akte.html/fristen.html (DM Sans, accent #4f8ef7)
- Light-Mode-Override via `[data-theme="light"]`
- Stepper-Klassen: `.step-done` (grün), `.step-current` (highlight + box-shadow), `.step-todo` (opacity 0.6)

### E.4 — Dashboard-Widgets ✅
**Datei:** `lib/prova-dashboard-widgets.{js,css}`

**5 Tiles, jedes asynchron geladen:**
1. **`aktive`** — Top 5 aktive Aufträge mit Phase-Progress-Bar (nutzt Workflow-Engine `getPhases(typ).length`)
2. **`fristen`** — Top 8 Fristen in 7 Tagen, Farb-Codes (überfällig=rot, heute=gelb, bald=blau)
3. **`mahnwesen`** — Top 5 offene Rechnungen mit Mahn-Stufe-Badge (0/1/2/3)
4. **`ki_stats`** — KI-Calls/Kosten/Übernahme-Quote/Tokens letzte 30 Tage (aus `ki_protokoll`)
5. **`aktivitaet`** — Top 5 Audit-Narratives (via `audit-narrative-v1` Edge Fn)

**API:**
```js
ProvaDashboardWidgets.render({ container, widgets: ['aktive', 'fristen', 'mahnwesen', 'ki_stats', 'aktivitaet'] })
```

**Auto-Grid:** `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))` → mobile-tauglich.

### E.5 — Akte-Tabs ⏳ DEFER MEGA⁶⁹
- akte.html hat schon 901 LOC mit Layout
- Migration der Audit/Versand/Versionen-Tabs aus stellungnahme.html in akte.html erfordert tiefes Refactoring
- Pattern in MEGA⁶⁹: existing `ProvaAuditTrailView` + `ProvaVersandHistorie` + `ProvaVersionHistory` werden als Tab-Mounts in akte.html eingebaut

### C.5 — Fristen Kalender-View ⏳ DEFER MEGA⁶⁹
- Workflow-Engine liefert jetzt `getFristTemplates(auftragsTyp)` — **Foundation für C.5 steht**
- MEGA⁶⁹: fristen.html bekommt Kalender-View + "Frist-Template anwenden"-Button pro Auftrag
- Backend `fristen-create` Edge Fn nimmt Templates entgegen

### C.6 — Mahnwesen-3-Stufen-UI ⏳ DEFER MEGA⁶⁹
- Dashboard-Widget `mahnwesen` zeigt Stufe-Badges (0-3) **als Foundation**
- MEGA⁶⁹: mahnwesen.html bekommt 1-Klick "Mahnung versenden" mit Stufen-Erhöhung
- existing `mahnwesen-cron` Edge Fn handhabt Auto-Stufung (BGB §286 Verzug-Logic)

### C.7 — Skizze-Editor ⏳ DEFER MEGA⁶⁹ oder eigener Mini-Sprint
- NinjaAI Session 5 Vorgabe ist umfangreich (Canvas + Maßstab + Foto-Overlay + Tools-Palette + Touch + SVG-Export)
- Realistische Schätzung: 6-10h dediziert
- existing `lib/skizzen-canvas.js` als Basis

### E.6 — Brüche fixen ⏳ DEFER MEGA⁶⁹
- Phase A Inventar identifizierte u.a.: kontakte.html + kontakte-supabase.html Duplikat, dashboard veraltete Tiles, stellungnahme-logic.js Legacy-Pfade
- MEGA⁶⁹: Top-10 Brüche systematisch fixen

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Workflow-Engine als **JS-Lib** (nicht Edge Fn) | Frontend-State + Phasen-Definitionen passen ins Browser-Lib | Marcel-Direktive 'Vanilla-JS bleibt' + RLS schützt phase_aktuell-Updates ohne Edge Fn |
| Phasen pro typ als **Hardcoded-Konfig** statt DB-Tabelle | 10 Typen × 5-10 Phasen = 70 Einträge, ändern sich selten | Editierbarkeit via Code statt DB-Admin-UI. Marcel-Memory: keine Schema-Änderung ohne Bedarf |
| **NIE "§411"** im UI | Marcel-Memory bestätigt | Term "Ergänzungsgutachten" überall verwendet |
| Dashboard-Widgets als **Lib** statt dashboard.html-Hardcode | Re-usable für ggf. Tablet-Dashboard, Admin-Cockpit | Modular |
| Akte-Tabs E.5 / Skizze-Editor C.7 deferred | Aufwand sprengt diesen Sub-Sprint (5-10h jeweils) | Marcel-Direktive: lieber 2× sauber als 1× halbgar — analog MEGA⁶⁸-FINAL-1/2-Strategie |
| Frist-Templates **im Workflow-Engine** statt fristen-create-Edge | Templates sind statisch, Edge erstellt nur die Frist | Trennung Definition vs Execution |
| Recherche **10 Quellen** | Marcel-Mandat erfüllt | dokumentiert im Code-Comment + dieser Doku |

---

## Verifikation

| Check | Status |
|---|---|
| 2 neue JS-Libs Syntax-grün | ✅ (workflow-engine, dashboard-widgets) |
| Workflow-Engine 10 typ-Definitionen | ✅ |
| Frist-Templates 9 typ-Definitionen (beratung leer) | ✅ |
| Dashboard-Widgets 5 Tiles | ✅ |
| Stepper-CSS Dark + Light-Mode | ✅ |
| sw.js → v3130-mega68-final-3 | ✅ |

---

## Marcel-Test (12 Min)

```
1. SW Unregister → Reload → v3130-mega68-final-3

2. Workflow-Engine in Console:
   const ed = window.ProvaWorkflowEngine;
   ed.getPhases('schaden').length     → 9
   ed.getPhases('gericht').length     → 10
   ed.getPhases('beratung').length    → 5
   ed.getFristTemplates('gericht')    → 3 Templates

3. Dashboard-Widgets (in dashboard.html oder Test):
   ProvaDashboardWidgets.render({ container: '#dashboard-widgets', widgets: ['aktive','fristen','mahnwesen','ki_stats','aktivitaet'] })
   → 5 Tiles erscheinen, je nach DB-State

4. Phase-Stepper renden:
   const auftrag = { typ: 'schaden', phase_aktuell: 4 };
   ProvaWorkflowEngine.renderStepper(document.querySelector('#stepper-mount'), auftrag);
   → Stepper mit Phase 4 highlighted, 1-3 grün done, 5-9 grau todo

5. Helferlein-Bar:
   ProvaWorkflowEngine.renderHelferlein(document.querySelector('#helf-mount'), auftrag);
   → Buttons "Stellungnahme öffnen", "Befund-Generator", "Konjunktiv-Check"
   → Klick auf "Stellungnahme öffnen" → window.location.href='/stellungnahme'

6. Frist-Template-Test:
   ProvaWorkflowEngine.getFristTemplates('schaden') → [{ titel:'Stellungnahme-Abgabe', daysFromNow:28 }, ...]
```

---

## Bekannte Lücken für MEGA⁶⁹

| Item | Aufwand | Begründung |
|---|---|---|
| E.5 Akte-Tabs (Audit/Versand/Versionen-Migration aus stellungnahme.html → akte.html) | 4-6h | existing Modal-Libs als Tab-Mount |
| C.5 Fristen-Kalender-View + "Template anwenden"-Button pro Auftrag | 4-6h | Foundation steht (getFristTemplates) |
| C.6 Mahnwesen 3-Stufen-Flow + 1-Klick "Mahnung versenden" | 4-6h | Foundation steht (Widget zeigt Stufen) |
| C.7 Skizze-Editor (Canvas + Maßstab + Foto-Overlay + Tools) | 6-10h | Session 5 Vorgabe, eigener Mini-Sprint möglich |
| E.6 Brüche fixen (kontakte-Duplikat, dashboard veraltete Tiles, etc.) | 3-5h | Phase A Top-10-Liste |
| dashboard.html Integration ProvaDashboardWidgets | 1h | 1 Script-Tag + 1 Container |
| Workflow-Engine Integration in akte.html | 1h | Stepper-Mount + renderHelferlein |
| KI-Funktions-Garantie 5 Tests (Regel 15) | 5-10h | Pre-Pilot Pflicht |
| iPad-Latenz-Test + Marcel-Browser-Test | 2-3h | Hardware nötig |

---

## File-Liste

### NEU
```
lib/
  prova-workflow-engine.{js,css}    Phasen-Engine für 10 auftrag_typ + Frist-Templates
  prova-dashboard-widgets.{js,css}  5 modulare Tiles für dashboard.html

docs/sprint-status/MEGA68-FINAL-3-WORKFLOW-ENGINE.md  (dieses)
```

### GEÄNDERT
```
sw.js    CACHE_VERSION → v3130-mega68-final-3-workflow-engine
```

---

## Quellen-Liste (Recherche-Mandat erfüllt)

Pro Workflow-Definition wurde mindestens 1 fachliche Quelle herangezogen (Marcel-Direktive 29.04.2026):

**Rechtliche Grundlagen:**
1. **IHK Sachverständigenordnung** (BIH-Mustertext §1-§7) — allgemeine SV-Pflichten + Verfahren
2. **BVS Verbandsrichtlinien** — Bundesverband ö.b.u.v. SVs, Workflow-Empfehlungen
3. **IfS Köln Praxis-Handbuch** — Institut für Sachverständigenwesen, Praxis-Workflows
4. **§404 ZPO** — Gerichtsgutachten-Beauftragung
5. **§407a ZPO** — Sachverständigen-Pflichten Annahme/Ablehnung
6. **§411 ZPO** — Ergänzungsgutachten (NIE als Term im UI verwenden — "Ergänzungsgutachten")
7. **§485 ZPO** — Selbständiges Beweisverfahren
8. **JVEG** — Justizvergütungs- und -entschädigungsgesetz, Gerichts-Honorar
9. **BGB §286** — Verzug, Mahn-Folgen (Mahnwesen-3-Stufen)
10. **BGB §317 ff** — Schiedsgutachten-Bindung

**Fachliche Grundlagen:**
11. **ImmoWertV** — Immobilien-Wertermittlungs-Verordnung (Wertgutachten)
12. **HOAI §34** — Honorarordnung Architekten/Ingenieure (Baubegleitung)
13. **DIN 31051** — Instandhaltung Bauten

**PROVA-Master-Docs:**
14. PROVA-VISION-MASTER.md (4-Flow-Architektur)
15. PROVA-REGELN-PERMANENT.md (Marcel-Direktiven)
16. NinjaAI Session 4 Master-Index (Workflow-Sparring)

---

## TAG-Empfehlung

`v3130-mega68-final-3-workflow-engine` nach Marcel-Test + Push.

**Sub-Sprint-Status MEGA⁶⁸-FINAL:**
- ✅ FINAL-1 (Bug-Fix + Glue) v3110
- ✅ FINAL-2 (Vollständigkeit C.1-C.4) v3120
- ✅ FINAL-3 (Workflow-Engine + Dashboard-Widgets) v3130 — **dieses**
- ⏳ **MEGA⁶⁹** (Akte-Tabs + Fristen-Kalender + Mahnwesen-Flow + Skizze-Editor + Brüche + Pre-Pilot-Tests) ~20-30h

---

## Marcel-Direktive 100% — Status

Marcel-Quote: *"Alle Features... sollen in einem Fluss sein... Sinnhaftigkeit: es ist so angelegt wie der SV auch arbeitet."*

**Status:** Workflow-Engine ist die Foundation für genau diesen "Fluss":
- Pro `auftrag_typ` definierte Phasen → SV sieht IMMER wo er ist
- `getNextActions` → SV sieht IMMER was als nächstes zu tun ist
- Helferlein-Buttons triggern Cmd+K-Commands oder Page-Navigation → kein Browser-Tab-Suchen mehr
- Frist-Templates → typische SV-Fristen werden mit 1 Klick gesetzt

**Was noch fehlt für 100% "Fluss-Feeling":**
- MEGA⁶⁹ E.5 Akte-Tabs (alles auf 1 Page statt 3 Pages)
- MEGA⁶⁹ Integration in dashboard.html + akte.html (Engine ist da, Wiring fehlt)
- MEGA⁶⁹ C.7 Skizze-Editor inline im Editor

PROVA ist nach MEGA⁶⁸-FINAL-3 **funktional + workflow-fähig**. MEGA⁶⁹ ist Sichtbar-Machen + Polish.

---

*Ende MEGA⁶⁸-FINAL-3 · Workflow-Engine als Foundation steht · 10 SV-Typen mit Phasen-Logic + 10+ Recherche-Quellen.*
