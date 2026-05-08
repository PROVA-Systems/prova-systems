# MEGA³⁹ Phase 3 — Skizzen-Funktion

**Datum:** 2026-05-08 (Nacht)
**Branch:** `mega39-master-consolidation`
**Status:** ✅ Lib + Lambda + Tests + DB-Migration live.

---

## Architektur

```
┌─────────────────────────────────────────────┐
│  skizzen.html (existing SVG-Page, einfach)  │  Tier 1 minimal
│         ↓                                    │
│  lib/skizzen-canvas.js                      │  ← Tier 1 + Tier 2 (NEU)
│         ↓                                    │
│  POST /.netlify/functions/skizze-save       │  ← NEU
│         ↓                                    │
│  eintraege-Tabelle (typ='skizze',           │
│   skizze_nr, skizze_data, skizze_image_url) │  ← Migration 28 NEU
│         +                                    │
│  Storage Bucket sv-files/skizzen/{ws}/{az}/  │
└─────────────────────────────────────────────┘
```

---

## DB — Migration 28 (APPLIED via MCP)

| Step | Migration | Status |
|------|-----------|--------|
| 28a | `ALTER TYPE eintrag_typ ADD VALUE 'skizze'` | ✅ |
| 28b | `eintraege` ADD COLUMN `skizze_data` (JSONB), `skizze_image_url` (TEXT), `skizze_nr` (INTEGER) | ✅ |
| 28b | `idx_eintraege_skizze` Partial-Index | ✅ |

---

## lib/skizzen-canvas.js — Tier 1 + Tier 2

### Tier 1 (Werkzeuge)
- `stift` (mit Pressure-Support für Pencil/S-Pen)
- `linie`, `kreis`, `rechteck`
- `marker` — Auto-Nummer (#1, #2, #3 …) mit roter Pin
- `text`, `radierer`
- Undo/Redo (HISTORY_MAX = 30 Steps)
- Farbwahl + Strichstärke (1-40)

### Tier 2 (Erweitert)
- `setBackgroundImage(url)` — Hintergrundbild für Grundriss-Vorlage
- `setScale(pxPerMeter, northAngle)` — Maßstab + Nordpfeil

### Marker-System
```javascript
const marker = PROVA_SKIZZEN.addMarker(x, y, 'Schimmel-Stelle', 'befund-uuid');
// → { nr: 1, x: 200, y: 150, text: 'Schimmel-Stelle', befund_id: 'befund-uuid' }
```

Marker werden als roter Pin mit Nummer (Inter-Bold, 14px) gerendert.

### Multi-Skizze pro Auftrag
- `skizze_nr = 1, 2, 3 …`
- Persist via IndexedDB-Key `{auftrag_id}-{skizze_nr}`

### Storage-Layer
- **IndexedDB** (offline-first, 500ms debounced auto-save)
- **Supabase** Sync via Lambda `skizze-save` (online)
- Storage-Bucket: `sv-files/skizzen/{workspace_id}/{auftrag_id}/{nr}.png`

### §407a-Doktrin
- Skizze-**Bild** geht NICHT an KI
- Marker-**Texte** + Befund-Cross-Reference gehen in KI-Kontext
- Damit ist Skizze keine "KI-eigenständige Bewertung", sondern SV-Werkzeug

### Touch + Pointer + Pencil-Pressure
```javascript
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'pen' && e.pressure > 0) {
    ctx.lineWidth = lineWidth * (0.5 + e.pressure * 1.5);  // Druck-abhängig
  }
});
```

---

## Lambda `skizze-save`

| Property | Value |
|----------|-------|
| Method | POST |
| Auth | requireAuth |
| Body | `{ auftrag_id, skizze_nr, data, png? }` |
| Workspace | resolved über profiles → workspace_memberships |
| Storage | optional PNG → sv-files Bucket |
| eintraege | INSERT oder UPDATE (UPSERT-Pattern by `auftrag_id+typ+skizze_nr`) |
| Response | `{ eintrag_id, image_url, marker_count }` |

---

## skizzen.html (existing)

Die existierende Page ist SVG-basiert (Tier 1 minimal: Stift / Linie / Rechteck / Maßstab-Select / Speichern). Sie bleibt für leichte Use-Cases.

Für Tier 2 (Pressure / Hintergrundbild / Marker / Multi-Skizze) ist `lib/skizzen-canvas.js` die Empfehlung — Integration in `akte.html` als Tab kommt in **Phase 4** (Einträge-System Skizze-Integration).

---

## Tests

`tests/skizzen/m39-p3-skizzen-canvas.test.js` — **19/19 grün**:
- Tier-1-Tools-Liste komplett (7)
- HISTORY_MAX = 30
- Public API exposed (14 Methoden)
- Pointer-Events (5: down/move/up/cancel/leave)
- Pencil-Pressure
- IndexedDB-Auto-Save 500ms
- exportJSON-Schema (7 Felder)
- §407a-Doktrin-Doku
- Marker mit Auto-Nummer + Pin-Rendering
- Multi-Skizze via skizzeNr
- Undo/Redo Stack-Logic
- clear() löscht strokes + markers
- exportPNG via toDataURL

---

## Acceptance Phase 3

- [x] Migration 28 (ENUM + 3 Spalten + Index) live
- [x] `lib/skizzen-canvas.js` mit Tier 1 + Tier 2
- [x] Touch + Pointer + Pencil-Pressure
- [x] Marker-System mit Auto-Nummer + Befund-Cross-Reference
- [x] Multi-Skizze via skizze_nr
- [x] IndexedDB Auto-Save
- [x] `netlify/functions/skizze-save.js` Lambda
- [x] Storage-Bucket sv-files/skizzen/
- [x] §407a-Doktrin (Bild NICHT an KI)
- [x] 19 Tests grün
- [ ] Browser/Tablet-Manual-Test (Marcel)
- [ ] PDF-Einbettung in F-08/F-15 (kommt mit Phase 4)
- [ ] akte.html-Integration als Tab (kommt mit Phase 4)

*— M³⁹ P3 — 2026-05-08*
