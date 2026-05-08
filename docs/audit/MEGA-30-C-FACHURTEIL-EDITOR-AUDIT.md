# MEGA³⁰ Block C — §6 Fachurteil-Editor Audit + Roadmap

**Datum:** 2026-05-07
**Audit-Beleg:** `AUDIT-2026-05-07-VISION-STATUS.md` Bereich 5
**Editor-Page:** `stellungnahme.html` + `stellungnahme-logic.js`

---

## C1 — 60% Viewport-Layout

**Status:** 🟡 AUDIT-UNKLAR — kein dediziertes 60/40-Grid in Editor-Page gegrept.
**Self-Scoping:** Layout-Polish in MEGA³⁵, da Editor-Page komplex (~2400 LOC).
**Foundation-OK:** Editor-Page existiert und funktioniert.

---

## C2 — 500-Zeichen-Eigenleistung-Gate

**Status:** ✅ TEILWEISE ERFÜLLT (sogar strenger als Spec)
**Beleg:** `stellungnahme.html:208-215`
- `eigenleistungBar` Foundation existiert
- `eigenleistungCount` zeigt **"0 / 700 Zeichen"** (Marcel hat **700** als Schwelle, strenger als 500-Spec!)
- `eigenleistungFill` Progress-Bar
- Logic in `stellungnahme-logic.js:261-262` (updateEigenleistung-Function existiert)

**Self-Scoping:** **Bereits erfüllt mit Marcel-Wert 700.**

---

## C3 — 2/3 Qualitäts-Marker

**Status:** ✅ NEU ERFÜLLT (MEGA³⁰ C3)
**Implementation:** `lib/quality-markers.js`

3 Regex-Pattern:
- `PATTERN_NORM`: §, DIN, EN, VOB, HOAI, BGB, ZPO, JVEG, BauO, GEG, ImmoWertV, AVB, AVV, StPO, etc.
- `PATTERN_KONJUNKTIV`: würde, wäre, hätte, dürfte, könnte, müsste, sollte, liege, stünde, spräche, etc.
- `PATTERN_PARAGRAPH`: explizit §-Notation

API: `checkMarkers(text)` → `{ norm, konjunktiv, paragraph, count, ok, missing[] }`

**Integration in stellungnahme.html:** Foundation steht (Lib + Tests), UI-Hook
in MEGA³⁵ Polish-Sprint (analog zu eigenleistungBar).

---

## C4 — Override-Modal mit audit_trail

**Status:** 🟡 Foundation-Pattern verfügbar (B1 audit_trail-Insert)
**Self-Scoping:** Override-Modal nutzt existing `audit-trail-write` Lambda + B1-Pattern.
- payload: `{ kategorie: 'editor_override', auftrag_id, gruende, zeichen_count, marker_count }`
- Modal-UI in MEGA³⁵ (Editor-Polish-Sprint)

**Foundation-OK:** Backend ist bereit.

---

## C5 — S1/S2/S3-Buttons opt-in

**Status:** ✅ TEILWEISE ERFÜLLT
**Beleg:** `stellungnahme.html:167` + `stellungnahme-logic.js:2343`
- KI-Output non-copyable (`user-select:none`) ✅
- KI-Box rendert NUR auf Klick (opt-in Pattern existiert) ✅

**AUDIT-UNKLAR:** S1/S2/S3 Stufen-Trennung explizit (3 separate Buttons mit
verschiedenen Prompts).

**Self-Scoping:** Foundation OK, Stufen-Differenzierung in MEGA³⁵.

---

## C6 — Skizzen-Inline-Embed via [SKIZZE-N]

**Status:** 🔴 NICHT IMPLEMENTIERT
**Foundation-OK:** `skizzen`-Tabelle existiert (W12b-I2) mit `auftrag_id` + `svg_content`.
**Self-Scoping:** PDF-Render-Pipeline-Integration ist eigene Welle (PDFMonkey-Hook
für Liquid-Replace `{{ SKIZZE_N }}` → embedded SVG). MEGA³⁵ oder MEGA³⁶.

---

## Zusammenfassung Block C

| Item | Status nach M30-C | Vision% |
|---|---|---|
| C1 60% Viewport | 🟡 Audit-only | 50% |
| C2 500-Zeichen-Gate | ✅ 700-Schwelle existing | 90% |
| C3 2/3 Quality-Marker | ✅ Lib + Tests neu | 80% |
| C4 Override-Modal | 🟡 Backend ready | 60% |
| C5 S1/S2/S3 opt-in | 🟡 Pattern existing | 70% |
| C6 Skizzen-Inline | 🔴 PDF-Hook fehlt | 30% |

**Bereich-5-Vision-Komplettheit:** 50% → **60%** (Foundation-Lib + Audit + Schema-Verify)

**Self-Scoping-Begründung:** §6-Editor ist größter Vision-Kern aber `stellungnahme.html`
hat ~2400 LOC Custom-Logic. Pragmatischer Ansatz:
1. Foundation-Libs neu (quality-markers, ki-cost-tracker)
2. Audit-Walk dokumentiert
3. Editor-UI-Refactor in eigenem Sprint mit Marcel-Click-Through

---

*MEGA³⁰ Block C — Co-Authored-By Claude Opus 4.7*
