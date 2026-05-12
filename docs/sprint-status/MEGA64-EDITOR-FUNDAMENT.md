# MEGA⁶⁴ — Editor-Fundament + PROVA-Custom-Nodes

**Datum:** 2026-05-12
**Sprint:** MEGA⁶⁴ — NinjaAI Session 5 Tag 0-14 compressed
**Status:** ✅ COMPLETE (Frontend-Only, kein DB-Change)
**Vorgänger:** MEGA⁶³ (HERZSTÜCK Backend)
**Nachfolger:** MEGA⁶⁵ (Cmd+K + KI-Suggestion + Wikilinks)

---

## TL;DR

§6-Editor auf Notion/Linear-Niveau. Lokales TipTap-Bundle (DSGVO-konform, 134 KB gzipped).
Bubble-Menu, Floating-Menu, Slash-Menu, Focus-Mode + 5 Custom-Nodes (Callout,
Fragment-Marker, Textbaustein-Block, Foto-Embed, Skizze-Embed). FragmentSidebar
verbindet HERZSTÜCK aus MEGA⁶³ mit Editor (Click-Sync bidirektional).
Character-Tracker zeigt KI-Anteil vs. Eigenleistung live.

```
INVOCATION-LAYER:  Slash-Menu  Bubble-Menu  Floating-Menu  Focus-Mode
                                    ↓
EDITOR-CORE:       TipTap + ProseMirror + Bundle 134 KB gzipped
                                    ↓
CUSTOM-NODES:      provaCallout  provaFragmentMarker  provaTextbausteinBlock
                   provaFotoEmbed  provaSkizzeEmbed
                                    ↓
DATEN-LAYER:       documents.content_json + befund_fragmente (MEGA⁶³)
```

---

## Bundle-Strategie (Marcel-Decision)

**`npm install @tiptap/* + @floating-ui/dom` + `esbuild` als devDep.**

- 16 npm-Pakete installiert (alle TipTap-Extensions aus dem Sprint-Prompt + 2 Backwards-Compat-Picks: Underline + TextStyle)
- `scripts/editor-bundle-entry.js` — ESM-Entry-Point mit allen Re-Exports
- `scripts/build-editor-bundle.js` — esbuild-Wrapper, IIFE-Format, exposes `window.TipTapBundle`
- `npm run build:editor` baut → `lib/editor-tiptap-bundle.js`
- Bundle-Size: **421 KB raw / 134 KB gzipped** (Budget 350 KB — **62 % unter Budget**)
- DSGVO ✓ lokal gehostet, KEIN esm.sh/CDN mehr für TipTap

`package.json` Diff:
```json
"dependencies": { +18 @tiptap/* + @floating-ui/dom },
"devDependencies": { +esbuild },
"scripts": { +"build:editor": "node scripts/build-editor-bundle.js" }
```

---

## Items (14 von 14 fertig)

### 2.1 — Bundle-Setup ✅
- `scripts/editor-bundle-entry.js` (Re-Exports inkl. Mark/Node/mergeAttributes für Custom-Extensions)
- `scripts/build-editor-bundle.js` (esbuild + zlib-Gzip-Stats + 350 KB Budget-Check)
- `lib/editor-tiptap-bundle.js` (build-output, committed)

### 2.2 — ProvaEditor erweitern ✅
- `lib/prova-editor.js` umgebaut: `_loadTipTap()` nutzt jetzt `window.TipTapBundle` statt CDN-Imports
- Lazy-Load `<script src="/lib/editor-tiptap-bundle.js">` via `_loadBundleScript()` wenn nicht geladen
- Defensive Extension-Liste (nur einbinden was im Bundle ist)
- Neue API: `mode` (fachurteil/befund/sachverhalt/standard) → CSS-Class `prova-editor--mode-X`
- onUpdate akzeptiert beide Signaturen: Legacy `(html, json)` + MEGA⁶⁴ `(editor)`
- Return-Object hat jetzt `editor` Property (Marcel-Style)
- **Backwards-Compatible:** existing-create()-Aufrufer funktionieren weiter

### 2.3 — Bubble-Menu ✅
- `lib/prova-bubble-menu.{js,css}` — 8 Buttons (B/I/U/S/Link/Liste/Nummer/¶Stil)
- @floating-ui/dom Positioning, fade-in 100ms
- Keyboard: Esc schließt, ←/→ navigiert Buttons
- Touch-Targets 44×44 px auf coarse pointer

### 2.4 — Floating-Menu ✅
- `lib/prova-floating-menu.{js,css}` — +-Button links neben leeren Zeilen
- Klick triggert "/" Insertion → Slash-Menu öffnet sich
- 44×44 px auf Touch

### 2.5 — Slash-Menu ✅
- `lib/prova-slash-menu.{js,css}` — 12 Items in 3 Gruppen:
  - **Struktur:** /h1 /h2 /h3 /divider
  - **Inhalt:** /liste /nummer /zitat /tabelle /foto
  - **Prüf-Marker:** /mangel /klaeren /ok
- Fuzzy-Match via `.includes()` (12 Items reichen für no FUSE.js)
- Keyboard: ↑/↓ navigiert, Enter aktiviert, Esc schließt
- Vanilla-DOM-Render (kein React)

### 2.6 — Focus-Mode ✅
- `lib/prova-focus-mode.{js,css}` — 3 Stufen zyklisch via ⌘⇧F / Ctrl+Shift+F
- Stufen: off → sentence → paragraph → typewriter → off
- CSS via :focus-within + opacity 200ms transition
- Typewriter-Modus: JS-Scroll auf Cursor-Mitte des Viewports
- Plattform-aware via `ProvaPlatform.isModPressed`
- Live-Region `#prova-focus-live` für Screenreader-Announcement

### 2.7 — prova-callout ✅
- `lib/extensions/prova-callout.{js,css}` — Block-Node mit `severity` (error/warning/ok/info)
- Commands: `setCallout({severity})` / `toggleCallout` / `unsetCallout`
- Slash-Integration: /mangel /klaeren /ok rufen `setCallout({severity:'error/warning/ok'})`

### 2.8 — prova-fragment-marker ✅
- `lib/extensions/prova-fragment-marker.{js,css}` — Inline-Mark mit fragmentId+quelle+timestamp
- Farb-Code: cyan (diktat) / purple (foto) / amber (skizze) / emerald (notiz) / gray (manuell)
- Klick → `CustomEvent('prova:fragment-clicked', {detail:{fragmentId, quelle, source:'editor'}})`

### 2.9 — prova-textbaustein-block ✅
- `lib/extensions/prova-textbaustein-block.{js,css}` — Atomic Block, contenteditable=false
- Lock-Icon 🔒 + Tausch-Button ⇄
- CustomEvent `prova:textbaustein-tausch` für Picker-Logik
- ProseMirror-selectednode-Outline

### 2.10 — FragmentSidebar ✅
- `lib/prova-fragment-sidebar.{js,css}` — Cards aus `befund_fragmente` für aktuellen Auftrag
- Filter: status (alle/roh/geprüft) — gutachten_teil + quelle als Erweiterung später
- Card-Aktionen: ↪ Einfügen (Insert mit prova-fragment-marker), ✓ Geprüft (PATCH status)
- Empty-State mit freundlichem Hinweis
- Supabase-Client via ESM-import on-demand

### 2.11 — Click-Sync ✅
- Bidirektional: Klick auf Marker im Editor → Card flasht in Sidebar
- Klick auf Card → Editor scrollt zu Marker, Marker flasht 800ms
- Single CustomEvent `prova:fragment-clicked` mit `source: 'editor'|'sidebar'`

### 2.12 — Foto/Skizze-Embeds ✅
- `lib/extensions/prova-foto-embed.{js,css}` — `<figure>` mit img + caption (aufnahme/gps/bausteinOrt)
- `lib/extensions/prova-skizze-embed.{js,css}` — `<figure>` mit svgContent + titel + massstab
- Skizze-Klick → `CustomEvent('prova:skizze-open')` für Lightbox/Editor (existing skizzen.html)

### 2.13 — Character-Tracker ✅
- `lib/prova-character-tracker.{js,css}` — Status-Leiste unter Editor
- Zähler: Total / Eigenleistung / KI-Anteil mit %
- Qualitäts-Marker (Pills): Konjunktiv / §-Verweis / Norm-Zitat — werden grün bei Match
- KI-Anteil sammelt Text aus `.prova-fragment-marker`, `.prova-textbaustein-block`, `.prova-ki-suggestion` (letzteres in MEGA⁶⁵)
- Throttle 250 ms

### 2.14 — Integration ✅
- `stellungnahme.html`: Feature-Flag `?editor=mega64` lädt MEGA⁶⁴-Bundle + Scripts on-demand
- Visueller Banner unten rechts wenn Flag aktiv
- Existing-Editor bleibt parallel (Hard-Replace defer MEGA⁶⁶)
- `tools/test-mega64.html`: Demo-Page mit allen Features, Sidebar, Auftrag-ID-Input

---

## Self-Scoping-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Build-Tool | **esbuild** | leichtgewichtig, kein Config-File nötig, 887ms Build-Zeit |
| Bundle-Format | **IIFE** mit `window.TipTapBundle` | Atomarer Script-Tag-Load, kein ESM-Loader nötig, einfaches Caching durch SW |
| StarterKit | Default + zusätzlich Underline + TextStyle | Existing prova-editor.js referenzierte beide → Backwards-Compat |
| Color / FontFamily | NICHT im Bundle | Marcel: "KEINE bunten Gutachten" (Anti-Pattern). Defensive-Removal aus create() |
| Mention-Extension | NICHT installiert | Marcel: "kommt MEGA⁶⁵ für Wikilinks" |
| Slash-Render | **Vanilla-DOM**, eigenes Modul (KEIN @tiptap/extension-mention) | Marcel: "KEIN React. KEIN Premium-Template" |
| Focus-Modes | CSS via `:focus-within` + opacity-transition | `:has()` ist überkomplex bei nested Nodes; `:focus-within` + JS-Class robust |
| Slash-Fuzzy | `.includes()` | 12 Items, FUSE.js overkill |
| Click-Sync | CustomEvent `prova:fragment-clicked` mit `source`-Discriminator | DOM-loose-coupling, kein Direct-Coupling zwischen Marker und Sidebar |
| Cache-Strategie | Bundle wird vom Service-Worker gecached (sw.js APP_SHELL) | gleicher Cache-Layer wie alle anderen Assets |
| Migration-Pfad | **Feature-Flag in stellungnahme.html, kein Hard-Replace** | Marcel-Decision — Pilot-Risiko-Minimierung |
| Reuse | quality-markers.js, sv-eigenleistung-validator.js bleiben unangetastet | Eigene CharacterTracker konsolidiert das Pattern; legacy-libs deprecated in MEGA⁶⁶ |

---

## Test-Ergebnisse

### Bundle-Size
- Raw: **419.9 KB**
- Gzipped: **134.3 KB** ✓ (Budget 350 KB, 62 % unter Budget)
- Build-Zeit: ~150 ms (incremental)

### Syntax-Check (`node --check`)
12 von 12 neuen JS-Files: ✓ alle grün
```
✓ lib/prova-editor.js
✓ lib/prova-bubble-menu.js
✓ lib/prova-floating-menu.js
✓ lib/prova-slash-menu.js
✓ lib/prova-focus-mode.js
✓ lib/extensions/prova-callout.js
✓ lib/extensions/prova-fragment-marker.js
✓ lib/extensions/prova-textbaustein-block.js
✓ lib/extensions/prova-foto-embed.js
✓ lib/extensions/prova-skizze-embed.js
✓ lib/prova-fragment-sidebar.js
✓ lib/prova-character-tracker.js
```

### Test-Page
`tools/test-mega64.html` lädt alle Module + zeigt Editor mit Beispiel-Content.

### Latenz / iPad-Tests
**DEFER auf Marcel-Test** — wir können Latenz erst messen wenn die Page live ist. Bundle-Größe + Vanilla-JS-Strategie liefern Voraussetzungen für 60 ms (kein React-Diffing).

---

## Marcel-Test (10 Min)

```
1. F12 → Application → Service Workers → Unregister
2. Reload — sw.js muss v3060-mega64 zeigen
3. /tools/test-mega64.html oeffnen

4. Slash-Menu testen:
   - "/" tippen → 12 Items in 3 Gruppen erscheinen
   - "h" tippen → filtert auf h1/h2/h3
   - Enter wählt aus → Heading-Block entsteht

5. Bubble-Menu:
   - Text markieren → Bubble mit 8 Buttons erscheint
   - Bold/Italic/Underline klicken → Format ändert sich
   - Esc schließt → Bubble weg

6. Floating-Menu:
   - Leere Zeile → +-Button links erscheint
   - Klick → "/" wird eingefügt → Slash-Menu öffnet

7. Focus-Mode:
   - ⌘⇧F (Mac) / Ctrl+Shift+F (Win): zykelt off → sentence → paragraph → typewriter
   - Bei "typewriter": Cursor scrollt automatisch in Bildschirm-Mitte

8. Callouts:
   - /mangel → roter Callout
   - /klaeren → gelber Callout
   - /ok → grüner Callout

9. FragmentSidebar:
   - auftrag_id (UUID) eingeben → Klick "Sidebar laden"
   - Fragmente erscheinen rechts mit Filter-Buttons
   - "↪ Einfügen" fügt Text mit Marker in Editor ein
   - Klick auf Marker → Card flasht in Sidebar
   - Klick auf Card → Editor scrollt zu Marker

10. CharacterTracker:
    - Zähler unter Editor zeigt Total/Eigenleistung/KI-Anteil
    - Schreibe "könnte" → Konjunktiv-Pill wird grün
    - Schreibe "§ 6" → §-Verweis-Pill wird grün
    - Schreibe "DIN 18014" → Norm-Zitat-Pill wird grün

11. stellungnahme.html?editor=mega64
    - Banner unten rechts: "MEGA⁶⁴ Editor aktiv"
    - Console: "[MEGA⁶⁴] Editor-Fundament geladen"
    - Existing Editor bleibt unverändert (kein Hard-Replace)
```

---

## Bekannte Lücken / TODOs

| Item | Sprint | Begründung |
|---|---|---|
| Cmd+K Modal (Action-Invocation) | MEGA⁶⁵ | Slash = Content, Cmd+K = Action — Linears Pattern |
| @tiptap/extension-mention für Wikilinks | MEGA⁶⁵ | Bundle-Erweiterung in MEGA⁶⁵ |
| KI-Suggestion-Layer (Inline-Vorschläge) | MEGA⁶⁵ | KI-Stream + Diff-Anzeige |
| Hard-Replace stellungnahme.html Editor | MEGA⁶⁶ | Nach Pilot-Feedback aus Feature-Flag-Test |
| iPad-Safari Latenz-Test | Pre-Pilot | Marcel-Hardware-Test mit echtem Diktat-Workflow |
| Foto-Picker für /foto | MEGA⁶⁴.1 (klein) oder MEGA⁶⁶ | Aktuell Stub-Alert; echte Picker-Komponente kann existing foto-upload-v2.js wiederverwenden |
| Skizzen-Lightbox/Inline-Edit | MEGA⁶⁵ | CustomEvent `prova:skizze-open` ist da, Listener fehlt |
| Reuse existing-libs (quality-markers, sv-eigenleistung-validator) | MEGA⁶⁶ | CharacterTracker hat eigene Implementation; Migration zum Reuse später |
| KI-Funktions-Garantie Tests (Regel 15) | Pre-Pilot | Aktuell node --check + Smoke-Demo |

---

## File-Liste

### NEU
```
scripts/
  editor-bundle-entry.js
  build-editor-bundle.js

lib/
  editor-tiptap-bundle.js        (build-output, 421 KB raw)
  prova-bubble-menu.{js,css}
  prova-floating-menu.{js,css}
  prova-slash-menu.{js,css}
  prova-focus-mode.{js,css}
  prova-fragment-sidebar.{js,css}
  prova-character-tracker.{js,css}

lib/extensions/
  prova-callout.{js,css}
  prova-fragment-marker.{js,css}
  prova-textbaustein-block.{js,css}
  prova-foto-embed.{js,css}
  prova-skizze-embed.{js,css}

tools/test-mega64.html
docs/sprint-status/MEGA64-EDITOR-FUNDAMENT.md  (dieses)
```

### GEÄNDERT
```
lib/prova-editor.js              CDN-Imports → Bundle-Loader + mode-API + onUpdate-Dual-Signatur
package.json                     +18 npm-deps, +esbuild devDep, +build:editor script
stellungnahme.html               +Feature-Flag-Block ?editor=mega64 am Ende
sw.js                            CACHE_VERSION → prova-v3060-mega64-editor-fundament
```

### NICHT GEÄNDERT (existing, bleibt für Migration)
```
lib/editor-tiptap.js             High-Level-Wrapper (Save-Manager) — Phase 2 MEGA⁶⁶
lib/quality-markers.js           bleibt, CharacterTracker hat eigene Implementation
lib/sv-eigenleistung-validator.js bleibt
lib/cmd-k-modal.js               bleibt für MEGA⁶⁵-Integration
lib/skizzen-embed.js             bleibt parallel zu prova-skizze-embed.js
```

---

## Sicherheit + Compliance

- **DSGVO** ✓ — TipTap-Bundle lokal, kein CDN-Load mehr
- **§407a-Anbindung** ✓ — prova-fragment-marker zeigt KI-Quelle visuell + speichert fragmentId
- **KI-Anteil-Transparenz** ✓ — CharacterTracker rechnet Eigenleistung live
- **Vanilla-JS** ✓ — kein React/Vue/jQuery eingeführt
- **60ms-Latenz-Doktrin** vorbereitet (Bundle klein + Vanilla, echter Test bei Pilot)
- **Plattform-Awareness** ✓ — ⌘ auf Mac, Ctrl auf Win via ProvaPlatform (MEGA⁶²)

---

## Acceptance

| Kriterium | Status |
|---|---|
| 14 Items geliefert | ✅ |
| Bundle < 350 KB gzipped | ✅ 134 KB |
| 12 neue JS-Files Syntax-grün | ✅ |
| stellungnahme.html Feature-Flag | ✅ |
| Test-Page tools/test-mega64.html | ✅ |
| sw.js v3060-mega64 | ✅ |
| Sprint-Doku (dieses) | ✅ |
| iPad-Test / 60ms-Latenz | ⏳ Marcel-Test |

---

## TAG-Empfehlung

`v3060-mega64-editor-fundament` nach Marcel-Smoke-Test + Push-Freigabe.

---

*Ende MEGA⁶⁴ — bereit für Marcel-Test + MEGA⁶⁵ (Cmd+K + KI-Suggestion + Wikilinks).*
