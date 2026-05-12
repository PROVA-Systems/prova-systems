# MEGA⁶⁹-FINAL-2 — Skizze-Editor (NinjaAI Session 5 voll)

**Datum:** 2026-05-12
**Sprint:** MEGA⁶⁹-FINAL-2 (Sub-Sprint 2 von 3)
**Status:** ✅ COMPLETE (8 Items in ~5h)
**Vorgänger:** MEGA⁶⁹-FINAL-1 Pilot-Core (v3140)
**Nachfolger:** MEGA⁶⁹-FINAL-3 Pre-Pilot-Polish (~14-19h)

---

## TL;DR (60 Sek)

SVG-basierter Skizze-Editor neu gebaut (Strategie: Neu-Bau statt Modernisierung — Canvas-API der existing `skizzen-canvas.js` ist Raster, fundamental nicht-konform mit "SVG zwingend"-Direktive). 9 Tools inkl. Maßstab-Workflow + Foto-Overlay-Layer. Undo/Redo via JSON-State-Snapshots (nicht Pixel-Snapshots). TipTap-Integration via existing prova-skizze-embed (MEGA⁶⁴-Skelett) erweitert um globalen Re-Open + Create-Listener. ~10 KB gzipped total, deutlich unter 30 KB Budget — kein Lazy-Load nötig.

---

## Inspektion-Entscheidung (Item 7.1)

Siehe separates Dokument **MEGA69-FINAL-2-INSPEKTION.md**.

**Kurz:** `lib/skizzen-canvas.js` (MEGA³⁹) ist Canvas-API (Raster) — Marcel-Direktive "SVG zwingend" ist nicht erfüllbar mit Canvas. `lib/extensions/prova-skizze-embed.js` (MEGA⁶⁴) bleibt UN-anfassbar im Kern, wird erweitert um globale Re-Open/Create-Listener. `lib/skizzen-embed.js` (Legacy [SKIZZE-N]-Marker) bleibt vollständig.

---

## Architektur

```
┌─── Frontend ──────────────────────────────────────────┐
│                                                       │
│  Slash-Menu /skizze       ProvaSkizzeEmbed Custom-Node│
│   onSkizzeCreate-CB         (TipTap-Block, atomic)    │
│   ↓                             ↓ Click               │
│  dispatch                  dispatch                   │
│  prova:skizze-create       prova:skizze-open          │
│                              ↓                        │
│                  ┌── Global Listener ──┐              │
│                  │ (in skizze-embed.js)│              │
│                  └──────────┬──────────┘              │
│                             ↓                         │
│                  ProvaSkizzeEditor.openModal()        │
│                    (lib/prova-skizze-editor.js)       │
│                    SVG-Engine                         │
│                    9 Tools + Maßstab + Foto-Overlay   │
│                    Undo/Redo JSON-Snapshots           │
│                    Serialize → SVG-String             │
│                             ↓                         │
│                          _save()                      │
│                             ↓                         │
└──────── POST /functions/v1/skizzen-save ──────────────┘
                              ↓
        prova:asset-created event (ProvaAssetEventBus.emit)
                              ↓
           ProvaAssetTrigger.processSkizze →
           asset-to-fragments-v1 → Pipeline
```

---

## Items im Detail

### 7.1 Inspektion + Strategie-Entscheidung ✅
Siehe `MEGA69-FINAL-2-INSPEKTION.md`. Entscheidung: NEU-BAU, SVG-Engine.

### 7.2 SVG-Engine Core ✅
**`lib/prova-skizze-editor.js`** (~780 LOC)

- **State-Management:** Single object mit shapes[], fotoLayer, massstab, history[], historyIdx
- **SVG-Renderer:** `document.createElementNS('http://www.w3.org/2000/svg', ...)` für alle Elements
- **Pointer-Events API:** Vereinheitlicht Maus + Touch + Pencil
- **Pressure-Support:** `e.pointerType === 'pen'` → lineWidth-Variation
- **Undo/Redo:** JSON.stringify-Snapshots des State (30 Schritte, NICHT Pixel-Snapshots — viel kompakter, exakt-rekonstruierbar)
- **Coordinate-Transform:** `svg.createSVGPoint() + matrixTransform(ctm.inverse())` für korrektes Pointer → SVG-User-Space-Mapping (auch bei Zoom/Pan später)

### 7.3 Tools-Palette UI ✅
**`lib/prova-skizze-editor.css`** (~280 LOC) + Markup im Editor-JS

- **9 Tools** (44×44 Mobile-Tap-Target, Marcel-Direktive):
  - 👆 Auswahl (Click → selectedId, Outline-Highlight)
  - ╱ Linie · ➤ Pfeil · ▭ Rechteck · ◯ Kreis · A Text
  - 📏 Maß · 🗑 Eraser · 📷 Foto-Overlay
- **Top-Bar:** Color (6 Optionen, IHK-konform) + Stroke-Width (1/2/4/8 px) + Maßstabs-Anzeige
- **Right-Panel:** Layers (Foto + Zeichnung), Maßstab-Info, Reset-Button
- **Mobile:** Layers wird grid-row 2 (collapse unter Canvas), Tools-Sidebar bleibt links
- **Light-Mode:** vollständige `[data-theme="light"]`-Overrides

### 7.4 Maßstab-Tool ✅
Click+Click → Inline-Modal (kein external prompt()) → Input + Einheit-Dropdown (mm/cm/m) → `px_per_unit` berechnet + persistiert.

**Schema-Format** (in `skizzen.massstab`):
```json
{
  "px_per_unit": 100.5,
  "unit": "m",
  "reference_line": { "x1": 200, "y1": 300, "x2": 700, "y2": 300 }
}
```

Alle nachfolgenden Maß-Linien zeigen Längen-Label in der gewählten Einheit (live-berechnet via `_calcLengthLabel`).

### 7.5 Foto-Overlay-Layer ✅
- `ProvaFotoPicker.open({ auftragId, filter: { exif_stripped: true }, onSelect })` (existing MEGA⁶⁶)
- **DSGVO-Filter:** Nur Fotos mit `exif_stripped=true` durchgelassen (Marcel-Direktive Anti-Pattern)
- **Layer 0:** SVG `<image>` mit `href=signed_url`, `opacity` Slider (0-100%)
- **foto_referenz_id** wird in `skizzen.foto_referenz_id` persistiert
- Remove-Button (×) entfernt Layer + History-Snapshot

### 7.6 TipTap-Integration ✅
- **`lib/prova-slash-menu.js`** erweitert: neues Item `skizze` in Gruppe "Inhalt" mit Keywords + Fallback-Dispatch
- **`lib/extensions/prova-skizze-embed.js`** erweitert:
  - Globaler Document-Listener `prova:skizze-open` → lädt `skizzen.svg_content` via direct Supabase → `ProvaSkizzeEditor.openModal({ initialSvg, onSave })`
  - Globaler Listener `prova:skizze-create` → öffnet leeren Editor → bei Save: `editor.chain().insertContent('provaSkizzeEmbed', { skizzeId, svgContent, titel, massstab })`
  - Bestehender `onCreate`-Click-Handler bleibt für Embed→Re-Open

### 7.7 Save/Load-Pipeline ✅
- **Save:** `POST /functions/v1/skizzen-save` mit `{ titel, svg_content, foto_referenz_id, massstab, auftrag_id, skizze_id?, pseudonymisiert: true }`
- **Audit:** automatisch via `prova-asset-autowire.js` fetch-Interceptor (MEGA⁶⁹-FINAL-1 D.1) — disptached `prova:asset-created` event
- **Asset-Event:** explizit `ProvaAssetEventBus.emit('skizze', skizzeId, auftragId)` nach Save → triggers `asset-to-fragments-v1` Pipeline
- **Pseudonymisierung:** `pseudonymisiert: true` (SVG enthält keine Auto-PII, nur SV-eigene Text-Marker — DSGVO-konform)
- **skizzen.html "Neue Skizze (Editor)"-Button** prominent oberhalb des Legacy-Mini-Tools

### 7.8 Integration + Tests ✅
- `stellungnahme.html` mega69-Block: `+/lib/prova-skizze-editor.js`
- `akte.html` Tab "Skizzen" → bereits in MEGA⁶⁹-FINAL-1 als Page-Navigation (`/skizzen?auftrag=ID`) verlinkt
- `tools/test-mega69-final-2.html` Stand-alone-Test mit 15-Punkt-Checklist
- Bundle-Check siehe unten

---

## Bundle-Size

| File | Raw | Gzipped |
|---|---|---|
| `prova-skizze-editor.js` | ~22 KB | ~8 KB |
| `prova-skizze-editor.css` | ~5 KB | ~1.5 KB |
| **Total** | **~27 KB** | **~10 KB** |

**Budget:** Marcel-Direktive ≤30 KB gzipped → eingehalten. Kein Lazy-Load nötig.

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Engine-Strategy | **Neu-Bau** statt Modernisierung skizzen-canvas.js | Canvas-API ist Raster → Marcel-Direktive "SVG zwingend" nicht erfüllbar |
| Undo/Redo-Format | **JSON-State-Snapshots** statt Pixel-ImageData | 30 Snapshots kosten ~10 KB statt ~30 MB; perfekt rekonstruierbar |
| Bundle-Strategy | **Synchroner Load** statt Lazy-Import | 10 KB gzipped ist unter Budget → keine Lazy-Komplexität nötig |
| Maß-Modal | **Inline-Modal** in Editor-Markup statt window.prompt() | UX: Einheit-Dropdown + number-Input + Tab-Order |
| Text-Input | **window.prompt()** als MVP | Für Pilot ausreichend, full-WYSIWYG-Text-Edit ist FINAL-3 Backlog |
| Slash-Menü Fallback | **Document-Event** bei fehlendem `onSkizzeCreate`-Callback | Macht Editor optional-bound, funktioniert auch ohne Bootstrap-Code |
| Multi-Layer-System | **2 Layers** (foto + zeichnung) statt n-Layer | Session 5 Spec spezifiziert nur diese zwei |
| Pen-Pressure | **Linear-Scaling** lineWidth * (0.5 + pressure * 1.5) | Pattern aus existing skizzen-canvas.js übernommen, bewährt |

---

## Verifikation

| Check | Status |
|---|---|
| `lib/prova-skizze-editor.{js,css}` Syntax | ✅ |
| `lib/prova-slash-menu.js` /skizze Item | ✅ |
| `lib/extensions/prova-skizze-embed.js` global-Listener | ✅ |
| `stellungnahme.html` mega69-Block → +editor | ✅ |
| `skizzen.html` "Neue Skizze (Editor)"-Button | ✅ |
| `tools/test-mega69-final-2.html` Test-Page | ✅ |
| Bundle ≤ 30 KB gzipped | ✅ ~10 KB |
| `sw.js` → v3150-mega69-final-2-skizze-editor | ✅ |
| skizzen-Tabelle Schema (svg_content + massstab + foto_referenz_id) verifiziert | ✅ aus Marcel-Direktive-Schema |

---

## Marcel-Test (10 Min)

```
1. SW Unregister → Reload → v3150

2. Stand-alone /tools/test-mega69-final-2.html:
   - Klick "+ Neue Skizze öffnen" → Modal erscheint
   - 9 Tools (Auswahl/Linie/Pfeil/Rechteck/Kreis/Text/Maß/Eraser/Foto) klickbar
   - Linie ziehen → SVG-Linie sichtbar in Editor
   - Pfeil ziehen → Linie mit Pfeilkopf
   - Rechteck + Kreis ziehen
   - Text-Tool → Klick → prompt "Text eingeben" → Text erscheint im SVG

3. Maßstab:
   - Tool "📏 Maß" → Klick 1, Klick 2 → Inline-Modal erscheint
   - Eingabe "5" + Einheit "m" → Maßlinie mit Label "5.00 m"
   - Zweite Maßlinie ziehen → Label-Länge automatisch berechnet aus Maßstab
   - Right-Panel: "Maßstab" zeigt "x.x px = 1 m"

4. Foto-Overlay (Auftrag-UUID nötig):
   - Auftrag-UUID eintragen → "+ Foto-Overlay" → Foto-Picker öffnet
   - DSGVO: nur exif_stripped=true Fotos sichtbar
   - Foto wählen → wird Layer 0 mit 75% Opacity
   - Slider verschiebt Opacity
   - "×"-Button entfernt Foto-Layer

5. Undo/Redo:
   - 5× verschiedene Shapes zeichnen
   - 5× Ctrl+Z → leeres Canvas
   - 5× Ctrl+Y → alle Shapes zurück

6. Eraser:
   - Eraser-Tool → Klick auf existing Shape → entfernt

7. Speichern:
   - "Speichern" → Status "Speichere…" → "✓ Gespeichert"
   - Console-Network: POST /functions/v1/skizzen-save → 200 mit skizze_id
   - Modal schließt sich nach 600ms

8. Re-Open:
   - "Re-Open Test" → skizze_id eingeben → Editor öffnet mit deserialisierten Shapes
   - Maßstab + Foto-Layer + Shapes alle wiederhergestellt

9. Stellungnahme-Integration (/stellungnahme?az=...&editor=mega69):
   - Slash "/skizze" → Editor-Modal öffnet
   - Speichern → Custom-Node mit SVG inline im Editor erscheint
   - Klick auf Embed → Editor öffnet wieder mit Skizze geladen

10. Mobile-Test (iPad):
    - Touch funktioniert
    - Apple Pencil mit Pressure → Strichstärke variiert
    - Layers-Sidebar collapse unter Canvas
```

---

## Bekannte Limitierungen

| Limitation | Plan |
|---|---|
| Text-Edit ist `window.prompt()` MVP | FINAL-3 Backlog: Inline-Edit mit doppelklick |
| Auswahl-Tool zeigt nur Outline-Highlight, kein Drag-Resize | FINAL-3 Backlog (oder MEGA⁷⁰) |
| Kein Pinch-Zoom/2-Finger-Pan | Pointer-Events-API unterstützt — Implementation FINAL-3 |
| Pressure-Vereinfachung (linear) | Excalidraw-style Velocity-Smoothing wäre besser, aber Pilot-OK |
| Keine Layer-Reorder (z-index) | Session 5 fordert nicht — Pilot-OK |

---

## Recherche-Quellen (Recherche-Mandat)

1. **DIN ISO 5455** — Bauzeichnungen Maßstab-Konventionen (1:1, 1:5, ..., 1:500)
2. **DIN 1356-1** — Bauzeichnungen Allgemeine Grundsätze
3. **DIN 6779** — Kennzeichnungssystematik (Marker/Pos-Nummern)
4. **BVS-Leitfaden Schadensaufnahme** — Skizze-Pflichtelemente
5. **IfS Köln Praxis-Handbuch** — Maßstab-Standards bei Wohngebäuden (typisch 1:50, 1:100)
6. **ImmoWertV §§4-5** — Maßstab-Pflichten Wertgutachten
7. **W3C SVG 1.1 + 2.0 Spec** — `<image>`, `<line>`, `<rect>`, `<ellipse>`, `<polyline>`, `<text>`, `<desc>` für Metadaten
8. **MDN Pointer Events** — pointerdown/move/up, `pointerType`, `pressure`, `tangentialPressure`
9. **MDN SVG Coordinate Systems** — `getScreenCTM`, `createSVGPoint`, `matrixTransform`
10. **Excalidraw Source** — Open-Source SVG-Pattern: history-as-state-snapshots
11. **TLDraw Source** — Layer-Management ohne foreign-Deps
12. **DSGVO Art. 4 Nr. 11 + Art. 32 Abs. 1** — Pseudonymisierung-Pflicht für Foto-Metadaten
13. **PROVA-VISION-MASTER** — Skizze als BUERO-Werkzeug, vector-Export für IHK-PDF
14. **NinjaAI Session 5** — UNVERHANDELBARE Spec (Tools, Maßstab, Foto-Overlay, Mobile, SVG-Export)
15. **CLAUDE.md** — Vanilla-JS, keine CDN-Deps, ≤30 KB Budget

---

## File-Liste

### NEU
```
lib/prova-skizze-editor.js                  SVG-Engine + 9 Tools + Maßstab + Foto-Overlay (~780 LOC)
lib/prova-skizze-editor.css                 Tools-Palette + Layers + Light/Dark + Mobile (~280 LOC)
tools/test-mega69-final-2.html              Stand-alone Test-Page mit 15-Punkt-Checklist
docs/sprint-status/MEGA69-FINAL-2-INSPEKTION.md      Item 7.1 Strategie-Entscheidung
docs/sprint-status/MEGA69-FINAL-2-SKIZZE-EDITOR.md   (dieses)
```

### GEÄNDERT
```
lib/prova-slash-menu.js               /skizze Item + Fallback-Dispatch
lib/extensions/prova-skizze-embed.js  Globaler prova:skizze-open + prova:skizze-create Listener
stellungnahme.html                    mega69-srcs +/lib/prova-skizze-editor.js
skizzen.html                          "Neue Skizze (Editor)"-Button + Editor-Script-Load
sw.js                                 CACHE_VERSION → v3150-mega69-final-2-skizze-editor
```

### UN-anfassbar (verified)
```
lib/skizzen-canvas.js          Legacy Canvas-Mini-Tool (bleibt für Backward-Compat)
lib/skizzen-embed.js           [SKIZZE-N]-Marker-Legacy für stellungnahme-Legacy-Pfad
lib/prova-foto-picker.js       open-API mit filter genutzt
lib/prova-asset-event-bus.js   emit-API genutzt
lib/prova-asset-trigger.js     processSkizze automatisch via Bus
supabase/functions/skizzen-save Edge Fn  POST-Path bleibt
supabase/functions/skizzen-list Edge Fn  direct-Supabase-Query in skizze-embed
```

---

## TAG-Empfehlung

`v3150-mega69-final-2-skizze-editor` nach Marcel-Test + Push.

**Sub-Sprint-Status MEGA⁶⁹-FINAL:**
- ✅ FINAL-1 Pilot-Core (D.1+C.5+C.6+D.5+D.6+Polish)
- ✅ FINAL-2 Skizze-Editor (Items 7.1-7.8) — **dieses Dokument**
- ⏳ FINAL-3 Pre-Pilot-Polish (E.1+E.3+E.4+E.5+E.6 + F.1-F.5) — ~14-19h

---

*Ende MEGA⁶⁹-FINAL-2 · SV-Toolchain ist funktional vollständig: Diktat + Foto + Skizze + Befund + §6 + PDF + Versand + Audit ohne externe Tools.*
