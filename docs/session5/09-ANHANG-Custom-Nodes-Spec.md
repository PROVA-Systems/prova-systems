# ANHANG 09 — Custom-Nodes & Marks Spezifikation

**Ziel:** Vollständige technische Spezifikation der 7 PROVA-eigenen TipTap-Extensions. Diese sind unsere Alleinstellungs-Merkmale und gleichzeitig die §407a-relevanten Kernkomponenten.

**Pro Extension:** Schema-Definition, Attribute, HTML-Serialisierung, Keyboard-Binding, Commands, Lifecycle-Events.

---

## Extension 1: `prova-callout` (Prüf-Marker-Block)

**Typ:** Block-Node (ersetzt Paragraph)
**Gruppe:** `block`
**Content:** `inline*`

### Attribute

| Attribut | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `severity` | `'error' \| 'warning' \| 'ok' \| 'info'` | `'info'` | Farbe + Semantik |
| `icon` | string | auto-derived | Unicode-Symbol oder SVG-Ref |

### HTML-Serialisierung

```html
<div class="prova-callout prova-callout--error" data-severity="error" role="note">
  <span class="callout-icon">⚠</span>
  <div class="callout-content">
    Risse in der Nordwand, unmittelbarer Handlungsbedarf.
  </div>
</div>
```

### Commands

```javascript
editor.commands.setCallout({ severity: 'error' })  // Aktuellen Absatz zu Callout
editor.commands.toggleCallout({ severity: 'warning' })  // Toggle
```

### Keyboard-Binding

- Per Slash-Menü: `/mangel`, `/klaeren`, `/ok`, `/hinweis`
- Kein direktes Shortcut (bewusst, zu selten für Shortcut)

### CSS-Klassen-Struktur

```css
.prova-callout { border-left: 4px solid; padding: 12px 16px; border-radius: 4px; margin: 8px 0; }
.prova-callout--error   { border-color: #dc2626; background: #fef2f2; }
.prova-callout--warning { border-color: #ca8a04; background: #fefce8; }
.prova-callout--ok      { border-color: #16a34a; background: #f0fdf4; }
.prova-callout--info    { border-color: #2563eb; background: #eff6ff; }
```

---

## Extension 2: `prova-textbaustein-block` (Locked Baustein)

**Typ:** Block-Node
**Gruppe:** `block`
**Content:** `text*` (aber atomar — nicht editierbar)
**Atom:** `true` (wichtig!)

### Attribute

| Attribut | Typ | Default | Beschreibung |
|----------|-----|---------|--------------|
| `bausteinId` | UUID | null | Referenz auf `document_templates` |
| `version` | integer | 1 | Versions-Pin |
| `einfuegeZeit` | ISO-string | now() | Zeitstempel der Einfügung |
| `source` | string | `'bibliothek'` | `'bibliothek'` / `'foreign-doc'` |

### HTML-Serialisierung

```html
<div class="prova-baustein" 
     data-baustein-id="abc-123" 
     data-version="2" 
     data-locked="true" 
     contenteditable="false">
  <header class="baustein-header">
    <span class="baustein-icon">🔒</span>
    <span class="baustein-name">Standardformulierung Mangelanzeige</span>
    <button class="baustein-swap" aria-label="Austauschen">↻</button>
    <button class="baustein-remove" aria-label="Entfernen">✕</button>
  </header>
  <div class="baustein-content">
    Der Sachverständige stellt fest, dass die vorgenannten Mängel …
  </div>
</div>
```

### Commands

```javascript
editor.commands.insertBaustein({ bausteinId, version })
editor.commands.swapBaustein(nodePos, { newBausteinId, newVersion })
editor.commands.removeBaustein(nodePos)
```

### Audit-Integration

Jede Einfügung logs in `ki_protokoll`:
```json
{
  "wirkung": "baustein_eingefuegt",
  "baustein_id": "abc-123",
  "version": 2,
  "zeichen_anzahl": 487,
  "einfueger_user_id": "sv-uuid",
  "timestamp": "2026-05-12T14:15:22Z"
}
```

---

## Extension 3: `prova-foto-embed`

**Typ:** Block-Node
**Gruppe:** `block`
**Content:** `text*` (nur für Caption)
**Draggable:** `true`

### Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| `fotoId` | UUID | Referenz auf `document_images` |
| `src` | string | Signed URL (Supabase Storage) |
| `caption` | string | Freitext-Unterschrift |
| `exif` | JSON | `{ datum, uhrzeit, gps, kamera }` |
| `baustellenOrt` | string | Optional: "Nordwand, EG" |
| `width` | number | Ziel-Breite in Content-Spalte |

### HTML-Serialisierung

```html
<figure class="prova-foto" data-foto-id="foto-uuid">
  <img src="https://.../signed-url" alt="Foto" loading="lazy" width="500" />
  <figcaption>
    <span class="foto-caption">Durchfeuchtung an der Nordwand</span>
    <span class="foto-meta">
      📅 2026-05-12 14:38 · 📍 Musterstraße 17, Nordwand EG
    </span>
  </figcaption>
</figure>
```

### Commands

```javascript
editor.commands.insertFoto({ fotoId, src, caption, exif })
editor.commands.updateFotoCaption(nodePos, newCaption)
```

### Pilot-Verhalten

Wenn Foto keine EXIF hat → Warning-Badge: "Meta-Daten fehlen — Gerichts-Tauglichkeit eingeschränkt".

---

## Extension 4: `prova-skizze-embed`

**Typ:** Block-Node
**Gruppe:** `block`
**Content:** leer
**Atom:** `true`

### Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| `skizzeId` | UUID | Referenz auf `skizzen`-Tabelle |
| `svgDataUrl` | string | Inline-SVG oder Supabase-Link |
| `caption` | string | Beschreibung |
| `erstelltAm` | ISO-string | Zeitstempel |

### HTML-Serialisierung

```html
<figure class="prova-skizze" data-skizze-id="sk-uuid" contenteditable="false">
  <div class="skizze-container">
    <svg viewBox="0 0 800 600">...</svg>
  </div>
  <figcaption>
    <span>Schnittzeichnung Nordwand-Aufbau</span>
    <time>2026-05-12 14:45</time>
    <button class="edit-skizze">In skizzen.html bearbeiten</button>
  </figcaption>
</figure>
```

### Besonderheit

Das SVG wird **inline eingebettet** (nicht referenziert), damit Offline-PDF-Export funktioniert. Beim Bearbeiten öffnet sich `skizzen.html?id=…` in neuem Tab; nach Speichern wird Editor neu geladen.

---

## Extension 5: `prova-fragment-marker` (Mark)

**Typ:** Inline-Mark
**Excludes:** andere `prova-fragment-marker` (kein nesting)

### Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| `fragmentId` | UUID | Referenz auf `befund_fragmente` |
| `quelle` | `'diktat' \| 'foto' \| 'skizze' \| 'notiz'` | Typ der Quelle |
| `timestamp` | ISO-string | Erfassungs-Zeitpunkt des Fragments |

### HTML-Serialisierung

```html
<span class="fragment-marker fragment-diktat" 
      data-fragment-id="frag-uuid" 
      data-quelle="diktat" 
      data-timestamp="2026-05-12T14:32:00Z"
      title="Aus Diktat, 2026-05-12 14:32">
  Nordwand zeigt erkennbare Durchfeuchtung
</span>
```

### Commands

```javascript
editor.commands.markAsFragment(fragmentId, quelle, timestamp)
editor.commands.unmarkFragment()
```

### CSS (farbliche Differenzierung)

```css
.fragment-marker { cursor: pointer; border-bottom: 2px dotted; padding: 0 1px; }
.fragment-diktat  { border-color: #8b5cf6; }  /* Violett */
.fragment-foto    { border-color: #0891b2; }  /* Cyan */
.fragment-skizze  { border-color: #16a34a; }  /* Grün */
.fragment-notiz   { border-color: #ca8a04; }  /* Gelb-Ocker */
.fragment-marker:hover { background: rgba(0,0,0,0.05); }
```

### Integration mit Sidebar

Klick auf Marker → `FragmentSidebar._scrollToSidebar(fragmentId)` (siehe TEIL C Pattern 7).

---

## Extension 6: `prova-ki-suggestion` (Mark)

**Typ:** Inline-Mark
**Excludes:** andere `prova-ki-suggestion`

### Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| `suggestionId` | UUID | Unique Identifier |
| `type` | `'insert' \| 'delete' \| 'replace'` | Vorschlags-Typ |
| `original` | string | Originaler Text (für replace/delete) |
| `newText` | string | Vorgeschlagener Text (für insert/replace) |
| `providerHash` | string | SHA256-Hash des KI-Providers (kein Klarname!) |
| `confidence` | number | 0.0 – 1.0 |
| `createdAt` | ISO-string | Zeitstempel |

### HTML-Serialisierung (Beispiel replace)

```html
<span class="ki-suggestion ki-replace" 
      data-suggestion-id="sug-uuid"
      data-type="replace"
      data-original="liegt"
      data-new-text="könnte liegen">
  liegt
</span>
```

Beim Accept wird der komplette span-Inhalt durch `data-new-text` ersetzt und Mark entfernt.

### Visuelle Darstellung

- `type='insert'`: Grüner Hintergrund (#bbf7d0)
- `type='delete'`: Durchgestrichen, rot (#fecaca)
- `type='replace'`: Gelber Unterstrich + dashed border

### Accept/Reject-Flow

Popover erscheint bei Click auf den Mark:
```
┌────────────────────────────────┐
│ KI-Vorschlag                   │
│                                │
│ Original: "liegt"              │
│ Vorschlag: "könnte liegen"     │
│ Konfidenz: 87%                 │
│                                │
│ [✓ Übernehmen] [✗ Ablehnen]   │
│                                │
│ ⓘ KI-Modell: sha256:a3f4b2…   │
└────────────────────────────────┘
```

---

## Extension 7: `prova-norm-citation` (Mark)

**Typ:** Inline-Mark
**Excludes:** —

### Attribute

| Attribut | Typ | Beschreibung |
|----------|-----|--------------|
| `norm` | string | z.B. "DIN 18533-1" |
| `absatz` | string | z.B. "5.2.3" |
| `jahr` | string | z.B. "2017-07" (Jahrgang) |
| `quellenLink` | string | URL zur Norm-Datenbank (optional) |

### HTML-Serialisierung

```html
<cite class="prova-norm" 
      data-norm="DIN 18533-1" 
      data-absatz="5.2.3"
      data-jahr="2017-07">
  DIN 18533-1:2017-07, Abschnitt 5.2.3
</cite>
```

### Commands

```javascript
editor.commands.setNormCitation({ norm: 'DIN 18533-1', absatz: '5.2.3', jahr: '2017-07' })
```

### Slash-Menü-Integration

`/norm` → Öffnet Norm-Picker (Autocomplete auf DIN/EN/VDI-Liste).

### DIN-1505-konform

Die HTML-Rendering-Regel folgt DIN 1505 Teil 2 (Zitierweise):
- Norm-Nummer kursiv
- Doppelpunkt vor Jahrgang
- "Abschnitt" bei Unterkapiteln

---

## Gemeinsame Lifecycle-Events

Alle 7 Extensions haben folgende Event-Hooks (ProseMirror/TipTap-Standard):

```javascript
// Im Extension-Register (z.B. in addProseMirrorPlugins)
this.editor.on('transaction', ({ editor, transaction }) => {
  transaction.steps.forEach(step => {
    if (step.mark?.type.name === this.name) {
      // Unsere Extension ist betroffen
      auditLog.record({
        event: `node.${this.name}.changed`,
        stepType: step.constructor.name,
        timestamp: Date.now(),
      })
    }
  })
})
```

So sind alle Änderungen an Custom-Nodes automatisch im Audit-Trail (Session 4 Thema 2).

---

## Schema-Test-Matrix

| Extension | Insert | Update | Delete | Undo | Redo | Copy/Paste | Print |
|-----------|:------:|:------:|:------:|:----:|:----:|:----------:|:-----:|
| prova-callout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| prova-textbaustein-block | ✓ | ⚠ nur swap/remove | ✓ | ✓ | ✓ | ⚠ neuer ID | ✓ |
| prova-foto-embed | ✓ | ✓ (nur caption) | ✓ | ✓ | ✓ | ✓ | ✓ |
| prova-skizze-embed | ✓ | ⚠ externe Editor | ✓ | ✓ | ✓ | ✓ | ✓ |
| prova-fragment-marker | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (mit ID) | ✓ |
| prova-ki-suggestion | ✓ | ✗ (nur accept/reject) | ✓ (reject) | ✗ History-excluded | ✗ | ⚠ verliert providerHash | ✗ (filter beim Print) |
| prova-norm-citation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Besonderheit ki-suggestion:** Nicht in Undo-Stack (TEIL C Falle 3). Nicht im Print-Output (Print filtert Marks).

---

## Ordner-Struktur der Extension-Files

```
/public/js/extensions/
├── prova-callout.js              (~120 LOC)
├── prova-textbaustein-block.js   (~180 LOC — inkl. swap-Dialog)
├── prova-foto-embed.js           (~150 LOC — inkl. EXIF-Parser)
├── prova-skizze-embed.js         (~80 LOC — dünner Wrapper)
├── prova-fragment-marker.js      (~90 LOC)
├── prova-ki-suggestion.js        (~200 LOC — komplexeste)
├── prova-norm-citation.js        (~100 LOC)
└── index.js                      (zentraler Export)
```

**Gesamt:** ~920 LOC für alle 7 Extensions. Gut testbar, klein gehalten.

---

## Tests pro Extension (Mindestanzahl)

Jede Extension braucht:
- **1 Unit-Test** für Attribute-Parse (HTML → JSON → HTML Round-Trip)
- **1 Unit-Test** für Commands (setCallout, insertFoto, etc.)
- **1 E2E-Test** für User-Flow (via Playwright)

Gesamt: 7 × 3 = **21 Tests** nur für die Extensions. Plus ~15 Tests für Command-Palette, Slash-Menü, Focus-Mode, Fragment-Sidebar. **Ziel: ~36 Tests vor Go-Live.**

---

## Datenmodell-Ergänzungen für Supabase

Keine neuen Tabellen nötig — alle Extensions speichern nur in `documents.content_json`. Ausnahme: `befund_fragmente` (bereits in Session 4 definiert) wird referenziert.

Neue Spalten in bestehenden Tabellen:
- `documents.zeichen_eigen_count` (int, berechnet nach jeder Save-Operation)
- `documents.zeichen_ki_count` (int)
- `documents.zeichen_baustein_count` (int)
- `ki_protokoll.wirkung` ← bereits aus Session 4: jetzt erweitert um `'baustein_eingefuegt'`, `'fragment_markiert'`, `'norm_zitiert'`, `'callout_gesetzt'`

---

## Zusammenfassung

Diese 7 Custom-Extensions sind die **Alleinstellungs-Identität** des PROVA-Editors. Andere Editoren haben Slash-Menüs, aber niemand hat:
- Locked Textbausteine mit Version-Pin
- Fragment-Marker mit bidirektionaler Sidebar
- KI-Suggestions im Diff-Mode mit Provider-Hash (statt -Name)
- Norm-Citations DIN-1505-konform
- Prüf-Marker mit fester 4-farbiger Semantik

In Summe: **~920 LOC Eigenkapital**, das NIEMAND klonen kann, weil es unsere Gutachter-Doktrin codiert. Das ist Session 5's verborgenes Investitions-Ergebnis.

---

*Ende der Spezifikation. Alle Dokumente dieser Session sind fertig.*

*Marcel, dir und dem Co-Founder-Claude: Viel Erfolg beim MEGA⁶³-Sprint. — NinjaAI, Session 5.*
