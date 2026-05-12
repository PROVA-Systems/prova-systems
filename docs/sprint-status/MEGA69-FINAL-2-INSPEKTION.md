# MEGA⁶⁹-FINAL-2 — Item 7.1 Inspektion + Strategie-Entscheidung

**Datum:** 2026-05-12
**Aufgabe:** Existing Skizze-Code bewerten → Modernisierung vs Neu-Bau entscheiden

---

## Inspizierte Files

### `lib/skizzen-canvas.js` (MEGA³⁹ P3, ~400 LOC)
- **Engine:** HTML5 **Canvas-API (Raster)** — `ctx.beginPath() / ctx.stroke()` etc.
- **Tools:** 7 (stift, linie, kreis, rechteck, marker, text, radierer)
- **Undo/Redo:** 30 Schritte via `ctx.getImageData` Snapshots (Raster-Pixel-Stack)
- **Background-Image:** `drawImage()` flat (kein Layers-System)
- **Save:** IndexedDB offline + auto-save 500ms debounced
- **Pressure-Support:** Apple Pencil via `e.pressure` (gut)
- **Public API:** `setTool/setColor/setLineWidth/addMarker/setBackgroundImage/setScale/exportPNG/exportJSON`

### `lib/extensions/prova-skizze-embed.js` (MEGA⁶⁴ Skelett, 92 LOC)
- TipTap-Custom-Node `provaSkizzeEmbed` (block, atom, selectable)
- Attrs: `skizzeId, svgContent, titel, massstab`
- `insertSkizze`-Command vorhanden
- `onCreate`-Hook dispatched `prova:skizze-open` bei Klick

### `lib/skizzen-embed.js` (MEGA³¹ A4, 103 LOC)
- Inline-Sidebar mit `[SKIZZE-N]`-Marker-Insert-Logic
- `replaceMarkers` PDF-Render-Helper (Node-kompatibel)
- Existing skizzen.html Integration

---

## Entscheidung: **NEU-BAU**

### Begründung
1. **Marcel-Direktive (unverhandelbar):** "SVG zwingend — Canvas ist raster, schlecht für Druck." Existing `skizzen-canvas.js` ist Canvas-API → fundamental nicht-konform.
2. **Layers-System fehlt:** Background ist `drawImage()`-flat, Foto-Overlay Anforderung verlangt echtes SVG-Layer-Modell mit opacity-Toggling.
3. **Vector-Export:** SVG-Engine ist nativ exportierbar als `svg_content`-String (skizzen-Schema), Canvas würde `toDataURL('image/svg+xml')` brauchen → nicht möglich, Canvas ist raster.
4. **Tools-Lücken:** Pfeil, Maß-Tool, Auswahl-Tool, Foto-Overlay-Layer fehlen komplett im existing Code.
5. **Maßstab:** Existing `setScale(px_per_meter, north_angle)` ist setter ohne UI/Tool-Workflow — kompletter Click-2-Modal-Workflow neu.

### Was wir übernehmen
- **Pressure-Pattern** für Apple Pencil (`e.pressure` Verzweigung)
- **IndexedDB-Offline-Save** als optionales Pattern (V2)
- **Marker-Auto-Nummer-System** (`#1, #2, ...`) als Sub-Feature
- **prova-skizze-embed.js** Custom-Node bleibt — wird nur erweitert um Re-Open-Logic
- **`[SKIZZE-N]`-Marker-System** (skizzen-embed.js) bleibt UN-anfassbar — separater Code-Path für stellungnahme.html-Legacy

### Was wir deprecaten (post-Pilot)
- `lib/skizzen-canvas.js` → bleibt als Fallback in skizzen.html bis Pilot-Phase, danach Soft-Deprecate analog `ki-s-stufen.js`

---

## Architektur neu

```
lib/prova-skizze-editor.js        Haupt-Engine SVG-basiert (~600 LOC geplant)
  ├── State                       { tools, currentTool, layers[], history[], massstab, ... }
  ├── SVG-Renderer                createElementNS('http://www.w3.org/2000/svg', ...)
  ├── 9 Tool-Handlers             pointer down/move/up pro Tool
  ├── Undo/Redo                   JSON-Snapshots des State (NICHT Pixel-Snapshots)
  ├── Layers-Manager              foto-layer + zeichnungs-layer
  ├── Maßstab-Manager             { px_per_unit, unit, reference_line }
  ├── Serialize / Deserialize     toSVG() → string · fromSVG(string) → state
  └── Public API                  openModal({auftragId, skizzeId?, onSave})

lib/prova-skizze-editor.css       Tools-Palette + Layers-Panel + Mobile
lib/extensions/prova-skizze-embed.js   ERWEITERN um Re-Open-Event-Subscriber
```

---

## Bundle-Budget
- SVG-Engine: ~15-20 KB minified, ~5-7 KB gzipped (kein Foreign-Dependency)
- CSS: ~3 KB gzipped
- **Total geschätzt: ~10 KB gzipped** — deutlich unter 30 KB Limit, kein Lazy-Load nötig

Falls Engine über 25 KB gzipped wächst (z.B. komplexe Path-Ops) → lazy via dynamic-import bei /skizze Slash.

---

## Recherche-Quellen (für Tool-Auswahl + Maßstab + DSGVO-Filter)
1. **DIN 1356** — Bauzeichnungen Darstellung von Linien (Strichstärken-Konvention für SVs)
2. **DIN 6779** — Kennzeichnungssystematik (Marker-Nummerierung Standard)
3. **BVS-Leitfaden Schadensaufnahme** — Skizzen-Standard
4. **IfS Köln Praxis-Handbuch** — Maßstab-Konventionen (1:50, 1:100 etc.)
5. **ImmoWertV §§4-5** — Maßstabs-Pflichten Wertgutachten
6. **DSGVO Art. 4 Nr. 11** — Einwilligung für Foto-Verwendung (siehe exif_stripped-Filter)
7. **W3C SVG 1.1 Spec** — `<image>`, `<line>`, `<rect>`, `<ellipse>`, `<polyline>`, `<text>`
8. **MDN Pointer Events** — `pointerdown/move/up` + `pointerType`, `pressure`
9. **Excalidraw Patterns** (Open-Source-Vorbild) — Selection-Tool, History-JSON-State
10. **TLDraw Patterns** — Layer-Management, atomic-Edits
11. **PROVA-VISION-MASTER** — 4-Flow-Architektur, Skizze als BUERO-Werkzeug
12. **NinjaAI Session 5** — UNVERHANDELBARE Spec (Tools-Liste, Maßstab, Foto-Overlay, SVG-Export, Mobile)
13. **CLAUDE.md** Marcel-Direktiven (Vanilla-JS, keine CDN-Deps)

---

## Status
✅ Item 7.1 Inspektion ABGESCHLOSSEN — Entscheidung NEU-BAU dokumentiert.
→ Start Item 7.2 SVG-Engine Core.
