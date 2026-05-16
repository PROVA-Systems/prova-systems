# MEGA⁸² MARCEL-CHECKLIST — Verkauf-Ready (Pass 1)

**Stand:** 2026-05-16 · **Branch:** `feat/mega82-verkauf-ready`
**Voraussetzung:** Pull + Hard-Reload (Strg+F5) damit v3245 lädt.

---

## A. Smoke-Tests (12 Punkte)

### 1️⃣ CORS eintraege-list weg

- Akte mit Eintraegen öffnen (z.B. SCH-2026-XXX)
- F12 → Network → Filter `eintraege-list`
- **Erwartung:** Request geht an `/.netlify/functions/eintraege-list` (NICHT `functions/v1/...`)
- Status 200, kein CORS-Block-Error in Console
- Eintraege erscheinen in der Akte ✅

### 2️⃣ Dashboard zeigt Fristen genau 1×

- Dashboard öffnen
- Browser-Search „Fristen" — sollte nur in zwei Stellen vorkommen:
  - KPI-Box „Fristen diese Woche" (Count, oben links)
  - Heute-Widget „Fristen heute oder überfällig" (im Workflow-Übersicht-Grid)
- **NICHT mehr:** „📅 Fristen"-Box in rechter Spalte oder zweite Liste oben ✅

### 3️⃣ skizzen.html zeigt Sidebar + Topbar

- `/skizzen.html` öffnen
- **Erwartung:** Sidebar links sichtbar (mit allen Menü-Punkten), Topbar oben mit Breadcrumb
- Vor Fix: Page rendert ohne Layout, sieht "schwebend" aus ✅

### 4️⃣ Einstellungen-Tabs lesbar

- `/einstellungen.html` öffnen
- Linke Sidebar: 7 Items (Profil, Darstellung, KI&Diktat, Benachrichtigungen, Export&Import, Datenschutz, Paket)
- **Erwartung:** Alle Items klar lesbar (nicht gegraut), Hover unterscheidbar, Active-Tab mit Accent-Color
- Mobile: Touch-Targets ≥ 44px ✅

### 5️⃣ §§-Notation in UI mit Gedankenstrich

- demo.html aufrufen → „§§ 1–5 Gutachten-Struktur"
- Browser-Search auf `§§ 1-` (Bindestrich) → **0 Treffer** in Frontend-UI
- (Backend/Tests/Templates haben noch Bindestrich — DEFER MEGA83) ✅

### 6️⃣ „PDFMonkey" verschwunden aus User-UI

Browser-Search auf folgenden Pages nach `pdfmonkey` (case-insensitive):
- Dashboard ✓ (war nie da)
- Akte mit Auftrag ✓ (5 Stellen gepatcht)
- Freigabe ✓
- Kurzstellungnahme ✓ (Empty-State-Text)
- Hilfe-Page ✓ (nur Error-Code NO_PDFMONKEY bleibt — Tech-Identifier ist OK)
- Pilot-Tutorial ✓
- Status-Page ✓
- Push-Setup ✓

**Erwartung:** Außer Error-Code `NO_PDFMONKEY` (Tech-Identifier) **keine** UI-Treffer mehr. ✅

### 7️⃣ LG-Darmstadt-Warnbox in fachurteil.html

- `/fachurteil.html?az=<irgendein-aktiver-fall>` öffnen
- **Erwartung:** Direkt unter Banner sichtbar:
  - ⚠️ „§ 6 Fachurteil ist Ihre persönliche Leistung"
  - LG-Darmstadt-Beschluss vom 10.11.2025
  - „Verstanden, ausblenden"-Button
- Button klicken → Box verschwindet
- Reload → Box bleibt unsichtbar
- Anderen Fall öffnen → Box wieder sichtbar (Per-Auftrag-Storage-Key) ✅

### 8️⃣ Landing-Trust-Block auf prova-systems.de

- `prova-systems.de` öffnen
- Nach unten scrollen — zwischen Hero und „Normen-Statistik"-Bar:
  - Gelblicher Streifen mit „Schützt deine Sachverständigen-Zulassung"
  - Headline „Compliance, die deine Vergütung sichert."
  - 4-Punkte-Liste
  - Quelle-Footnote LG Darmstadt
- Mobile responsiv ✅

### 9️⃣ Gutachten-CTA kontextuell

- Neuen Auftrag anlegen (Phase 1 entwurf) → Akte öffnen
- Button-Text **„📄 Gutachten erstellen →"** (vor Fix: immer „Gutachten öffnen")
- Auftrag editieren bis Phase 3 → Akte neu öffnen
- Button-Text **„📄 Gutachten bearbeiten →"** (Click navigiert auf fachurteil.html, NICHT auf app.html-Loop!)
- Auftrag freigeben → Button-Text **„📄 Gutachten ansehen"** ✅

### 🔟 Helper-Layer für 4-Phasen-Stepper

In Browser-Console:
```js
window.getFlow('schaden')         // → 'A'
window.getFlow('wertgutachten')   // → 'B'
window.getFlow('beratung')        // → 'C'
window.getFlow('baubegleitung')   // → 'D'
window.getAktePhasenForAuftrag({ typ: 'wertgutachten' })
  // → Array mit 4 Phasen: Auftrag/Objekt/Bewertung/Abschluss
window.getAkteStatusAuto({ phase_aktuell: 3, status: 'aktiv' })
  // → { db: 'aktiv', label: 'In Bearbeitung', color: 'blue' }
```

**Erwartung:** Alle 4 Functions verfügbar. ✅

### 1️⃣1️⃣ sw.js v3245 lädt

- F12 → Application → Service Workers
- Active: `prova-v3245-mega82-verkauf-ready`
- Wenn alt: F12 → Application → Clear storage → Hard-Reload

### 1️⃣2️⃣ Console sauber bei Akte-Load

- 3 verschiedene Akten öffnen
- F12 Console: **keine** kritischen Errors
- (Warnings wie `[ladeTermine]` o.ä. sind erlaubt wenn Records leer)

---

## B. Bei Fehlern

- Eintraege-Liste leer obwohl Daten vorhanden → CORS-Bug zurück, edge-shim.js prüfen
- Dashboard zeigt nur 1 Fristen-Stelle aber leer → MEGA81 RPC-Migration nicht applied → siehe MEGA81-MARCEL-CHECKLIST Step A
- LG-Warnbox erscheint nicht → fachurteil.html cache hard-reloaden
- Trust-Block auf Landing nicht sichtbar → Netlify-Deploy nicht durch, Cache F12 → Application → Clear

---

## C. Nicht in MEGA82 enthalten (DEFER MEGA83)

| Item | Begründung | Pre-Pilot-Workaround? |
|---|---|---|
| Akte-Layout-Refactor (B.2-B.9) | UI-Refactor 1000+ Zeilen, eigener Sprint | Bestehende 9-Phasen-Akte funktioniert weiterhin |
| Login Cross-Domain (F.1) | Cookie-Domain-Migration mit Test-Pfad | Doppel-Login akzeptabel im Pilot |
| Edge-Reaping (G.1) | Destructive Cloud-Action, Marcel-CLI | Tote Edges blockieren nicht |
| Domain-Split-Audit (F.2) | Live-DOM-Inspect | Marcel kann parallel selbst auditen |
| PDF-Disclosure-Templates (D.5) | 9 Liquid-Templates manuell | Marcel kann F-04/F-09/F-15 direkt patchen vor Pilot |
| §§-Notation Backend/Tests (A.4) | Test-Assertion-Sensitiv | Nur Audit-Doku in MEGA82 |

---

## D. MEGA83-Vorschlag

Pflicht:
- **B.2-B.9 Akte-UI-Refactor** mit AKTE_PHASEN_V2 + getAktePhasenForAuftrag + getAkteStatusAuto (Helper-Layer ist bereit)
- **F.1 Login Cross-Domain** als eigener Mini-Sprint mit Browser-Test

Stark empfohlen:
- **G.1 Edge-Reaping** der 5 sicheren Functions
- **D.5 PDF-Disclosure** für die 3 wichtigsten Templates

Optional:
- **G.2 Duplicate-Pairs**
- **G.3 5 Audit-Edges konsolidieren**
- **A.4 Backend §§-Notation Sweep** mit Test-Update
