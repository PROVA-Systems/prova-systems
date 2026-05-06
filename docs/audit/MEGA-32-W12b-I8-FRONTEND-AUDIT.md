# MEGA³² W12b-I8 — Frontend-Audit

**Datum:** 2026-05-11
**Methode:** Drift-grep auf alle Frontend-Pages (W9/W10/W10b)

---

## Drift-Patterns

| Pattern | Drift-Bedeutung |
|---|---|
| `schadensfall_id` (Body-Field, Form-ID) | sollte `auftrag_id` sein |
| `eintrag_typ` mit alten 8 Werten | sollte `typ` ENUM mit 4 Werten sein |
| `beschreibung_text` | sollte `titel + content` sein |
| `svg_data` | sollte `svg_content` sein |

---

## Audit pro Page

### W12b-I1: eintraege.html — RECONCILED ✅
- Filter-Dropdown: 4-ENUM (diktat/text/foto/mix)
- Modal: m-auftrag_id, m-typ, m-titel, m-content
- Pseudonymisiert-Badge + Konjunktiv-OK-Badge
- saveEintrag baut Schema-konformen POST
- PII-Warnings vom Backend angezeigt

### W12b-I2: skizzen.html — RECONCILED ✅
- sk-auftrag_id (NICHT sk-schadensfall_id)
- svg_content im Body (NICHT svg_data)
- s.svg_content im Render-Loop

### W12b-I3: fristen.html — RECONCILED ✅
- m-auftrag_id + p-auftrag_id Modal-Fields
- Body-Field auftrag_id (sed-Replace alle Vorkommen)
- 8 frist_typ ENUM-Werte unverändert (waren korrekt)

### W12b-I6: status.html — RECONCILED ✅
- Map auf system_health.component (NICHT service)
- response_time_ms (NICHT latency_ms)
- Sentry-Card → Resend-Card umgelabelt (W10b-I7)

---

## Schadensfall-Tab-Vorbereitung (für Welle 11)

### Tab-Struktur in `akte.html`

Existing `akte.html` verwendet collapsible `section-card`-Pattern (NICHT Tabs).
Pattern aus W11-I1 (welle-11-final Branch):
```html
<div class="section-card" id="sec-fall-tabs">
  <div class="section-header" onclick="toggleSection('sec-fall-tabs')">
    <div class="section-title">🗂️ Einträge · Skizzen · Fristen</div>
    <span class="section-toggle">▾</span>
  </div>
  <div class="section-body">
    <div data-schadensfall-tabs></div>
  </div>
</div>
```

### Welle-11-Vorbereitung-Status

**Lib-Datei `lib/schadensfall-tabs-widget.js` (W11-I1, NICHT in W12b):**
- Liest `data-schadensfall-id` Attribut ODER URL-Query `?id=`
- 3 interne Tabs: Einträge / Skizzen / Fristen
- Lazy-Loading pro Tab (data-loaded-Flag)
- Pipeline-Auto-Apply via 5 ENUM-Werte

**Was Welle 11 jetzt sicher bauen kann:**
- Widget kann existing Lambdas direkt nutzen
- API-Pfade (auftrag_id) sind durch W12b-I1/I2/I3 reconciled
- Backwards-Compat-Patterns sichern Migration ohne Frontend-Lock-Step

---

## Live-Daten-Test-Strategie

**Eintraege-Page:**
1. Login
2. Auftrag-UUID aus existing `auftraege` (3 Rows in Production)
3. POST `/eintraege-create` mit typ=text, titel="Test", content="Lorem ipsum"
4. GET `/eintraege-list?auftrag_id=...` → erwarte 1 Eintrag
5. POST `/eintraege-jveg-export?auftrag_id=...` → HTML-Stundenzettel

**Skizzen-Page:**
1. SVG zeichnen
2. Save mit auftrag_id
3. List → Thumbnail anzeigen
4. Delete → Soft-Delete

**Fristen-Page:**
1. Pipeline `schadensgutachten` anwenden mit Stichtag
2. Erwarte 5 Fristen erstellt
3. Mark-Erfuellt → status='erfuellt'

**Status-Page:**
1. POST `/status-check` mit X-Cron-Secret → 6 Probes
2. GET `/status-check` → letzte Status pro Service

→ Marcel-Manual: nach Migration-Apply via MCP (alle 4 done in W12b) sind diese Tests live durchführbar.

---

*MEGA³² W12b-I8 — Co-Authored-By Claude Opus 4.7*
