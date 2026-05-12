# TEIL F — PROVA-Editor Architektur-Vorschlag

**Ziel:** Das finale Synthese-Dokument. Nach 7 App-Analysen, 35 Pattern-Entscheidungen, und der Bundle-Analyse: **Wie sieht der PROVA-§6-Editor konkret aus?**

**Dieses Dokument ist der Bauplan.** Kein Sprachgefühl, keine Philosophie — sondern: welche Module, welche Datenflüsse, welches UI-Layout, welche Keyboard-Maps.

---

## Die drei Ebenen des PROVA-Editors

```
┌─────────────────────────────────────────────────────────────┐
│ Ebene 3: INVOCATION-LAYER                                   │
│   Cmd+K · Slash-Menü · Bubble-Menü · Floating-Menü · `?`     │
│                                                              │
│ Wie User den Editor bedient                                 │
├─────────────────────────────────────────────────────────────┤
│ Ebene 2: EDITOR-CORE                                        │
│   TipTap + ProseMirror · Custom Marks + Nodes · Extensions   │
│                                                              │
│ Was gerade geschrieben/bearbeitet wird                       │
├─────────────────────────────────────────────────────────────┤
│ Ebene 1: DATEN-LAYER                                        │
│   documents (content_json) · befund_fragmente · ki_protokoll │
│                                                              │
│ Was gespeichert ist                                          │
└─────────────────────────────────────────────────────────────┘
```

Jede Ebene ist **austauschbar**:
- Ebene 1 ist Supabase-PostgreSQL (haben wir).
- Ebene 2 ist TipTap (könnte ProseMirror direkt sein).
- Ebene 3 ist Vanilla-JS (könnte React sein, ist es aber nicht).

---

## Das finale UI-Layout des §6-Editors

```
╔══════════════════════════════════════════════════════════════════════════╗
║ PROVA · §6 Fachurteil · Fall 2026-001234 · Musterstraße 17              ║ ← App-Chrome (dimmed in Focus-Mode)
║ [⌕ Cmd+K]         [§4] [§5] §6 [§7]         [Historie]  [Export]        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║   ┌──────────────────────────────┐   ┌──────────────────────────────┐   ║
║   │ §6 FACHLICHES URTEIL         │   │ BEFUND-FRAGMENTE             │   ║
║   │                              │   │                              │   ║
║   │ Das Objekt zeigt **erhebli-  │   │ ╔═══════════════════════════╗│   ║
║   │ che** Feuchteschäden an der  │   │ ║ 🎤 Diktat 14:32           ║│   ║
║   │ Nordwand (Ref: Anhang 3 —   │   │ ║ "Nordwand hat erkennbare  ║│   ║
║   │ Thermografie). Die Ursache   │   │ ║ Durchfeuchtung..."        ║│   ║
║   │ liegt in mangelhafter Ab-    │   │ ║ [↪ in Editor einfügen]    ║│   ║
║   │ dichtung gem. DIN 18533-1    │   │ ╚═══════════════════════════╝│   ║
║   │ Abs. 5.2.3.                  │   │                              │   ║
║   │                              │   │ ╔═══════════════════════════╗│   ║
║   │ [KI-Vorschlag: "könnte"     │   │ ║ 📸 Foto IMG_0342          ║│   ║
║   │ statt "liegt"] ✓ ✗           │   │ ║ Baustelle Nordwand        ║│   ║
║   │                              │   │ ║ 2026-05-12 14:38          ║│   ║
║   │ Die zeitnahe Sanierung ist   │   │ ║ [↪ Einbetten]              ║│   ║
║   │ geboten. Der Auftraggeber    │   │ ╚═══════════════════════════╝│   ║
║   │ ist hierüber informiert.     │   │                              │   ║
║   │                              │   │ ╔═══════════════════════════╗│   ║
║   │ [Cursor ▌]                   │   │ ║ ✏ Skizze Nordwand-Aufbau  ║│   ║
║   │                              │   │ ║ 2026-05-12 14:45          ║│   ║
║   │                              │   │ ║ [↪ Einbetten]              ║│   ║
║   └──────────────────────────────┘   │ ╚═══════════════════════════╝│   ║
║                                      └──────────────────────────────┘   ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║ Zeichen: 2847  ·  Eigenleistung: 2341 ✓ (Min: 500)  ·  KI: 506 (18%)    ║ ← Status-Leiste
║ Qualitäts-Marker: Konjunktiv ✓ · §-Verweis ✓ · Norm-Zitat ✓               ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Besonderheiten des Layouts:**
1. Kein Primär-Toolbar oben. Formatierung passiert via Bubble-Menü oder Slash.
2. Links: Editor nimmt ~65% Breite, Sidebar ~30%, Divider 5%.
3. Rechts: Kontext-Sidebar (Befund-Fragmente im §6, Entwurfs-Überblick im §5).
4. Unten: Status-Leiste mit 3 lebendigen Zahlen + Qualitäts-Marker.
5. Im Focus-Mode: Obere App-Chrome und untere Status-Leiste auf Opacity 0.15.

---

## Die Keyboard-Map (vollständig)

### Global (überall in der PROVA-App)

| Shortcut | Aktion |
|----------|--------|
| `Cmd+K` | Command Palette öffnen/schließen |
| `?` | Keyboard-Cheat-Sheet |
| `Cmd+Shift+F` | Focus Mode zyklisch (off → sentence → paragraph → typewriter → off) |
| `Esc` | Aktuelles Modal/Menü schließen |
| `Cmd+S` | Explizit speichern (Auto-Save alle 30s läuft parallel) |
| `Cmd+/` | Sidebar togglen |

### Editor-Modus (wenn Focus in `.ProseMirror`)

| Shortcut | Aktion | Kommentar |
|----------|--------|-----------|
| `Cmd+B` | Fett | TipTap Starter-Kit |
| `Cmd+I` | Kursiv | TipTap Starter-Kit |
| `Cmd+U` | Unterstrichen | TipTap Starter-Kit |
| `Cmd+Shift+X` | Durchgestrichen | TipTap Starter-Kit |
| `Cmd+Shift+H` | Highlight gelb | Default-Farbe |
| `Cmd+Alt+1` | H1 | Block-Konvertierung |
| `Cmd+Alt+2` | H2 | |
| `Cmd+Alt+3` | H3 | |
| `Cmd+Alt+0` | Paragraph (normal) | Default-Block |
| `Cmd+Shift+8` | Bullet-Liste | Starter-Kit |
| `Cmd+Shift+7` | Numbered Liste | |
| `Cmd+Shift+9` | Quote-Block | |
| `Cmd+K` | (in Text-Selection) Link einfügen · (leere Zeile) Cmd+K-Palette | Superhuman-Pattern |
| `/` | Slash-Menü (nur auf leerer Zeile) | |
| `[[` | Wikilink-Autocomplete | |
| `@` | Zeitstempel-Referenz (z.B. `@14:32`) | |
| `Tab` | In Listen: verschachteln · In Tabelle: nächste Zelle | |
| `Shift+Tab` | In Listen: entschachteln · In Tabelle: vorige Zelle | |
| `Cmd+Z` | Undo | |
| `Cmd+Shift+Z` | Redo | |

### KI-Kommandos (Editor-Kontext)

| Shortcut | Aktion |
|----------|--------|
| `Cmd+J` (J für Job) | KI-Panel für aktuellen Absatz öffnen |
| `Cmd+Alt+K` | Konjunktiv-Vorschlag für Selection holen |
| `Cmd+Alt+V` | §-Verweis-Vorschlag (aus Beweisbeschluss) |
| `Cmd+Alt+N` | Norm-Zitat-Vorschlag (DIN/EN/VDI) |

Die KI-Shortcuts gehen alle über Alt (Option) — damit sie nicht mit Browser-Shortcuts kollidieren.

---

## Die 6 Custom-Nodes/Marks des PROVA-Editors

Jeder ist eine eigene TipTap-Extension. Hier die Kurz-Spec (Details in ANHANG 09).

### Node 1: `prova-callout`
- Typ: Block-Node
- Attribute: `severity` (`error` / `warning` / `ok` / `info`)
- UI: Gerahmte Box mit Icon links, Text rechts
- Use-Case: Prüf-Marker für Mängel/Klärungsbedarf/OK-Zustand

### Node 2: `prova-textbaustein-block`
- Typ: Block-Node, locked (nicht editierbar)
- Attribute: `bausteinId`, `version`, `einfuegeZeit`
- UI: Text mit Lock-Icon rechts oben, grauer Hintergrund
- Use-Case: Eingefügte Textbausteine bleiben unverändert; nur "Austauschen" oder "Entfernen" möglich

### Node 3: `prova-foto-embed`
- Typ: Block-Node
- Attribute: `fotoId`, `caption`, `exif`, `bausteinOrt`
- UI: Bild + Caption + Meta-Zeile (aus EXIF: Datum, Uhrzeit, GPS)
- Use-Case: Fotos mit gerichtsfester Meta-Information

### Node 4: `prova-skizze-embed`
- Typ: Block-Node
- Attribute: `skizzeId`, `caption`
- UI: SVG-Embed + Caption
- Use-Case: Integration des Skizzen-Editors (skizzen.html, bereits in PROVA)

### Mark 5: `prova-fragment-marker`
- Typ: Inline-Mark
- Attribute: `fragmentId`, `quelle` (diktat/foto/skizze/notiz), `timestamp`
- UI: Kleines Icon + Unterstreichung in Farbe der Quelle
- Use-Case: Jede Text-Passage, die aus einem Befund-Fragment stammt, wird markiert

### Mark 6: `prova-ki-suggestion`
- Typ: Inline-Mark
- Attribute: `suggestionId`, `type` (insert/delete/replace), `original`, `newText`, `providerHash`, `confidence`
- UI: Diff-Darstellung (siehe TEIL C Pattern 8)
- Use-Case: KI-Änderungen als Vorschlag, Accept/Reject pro Suggestion

### Mark 7 (Bonus): `prova-norm-citation`
- Typ: Inline-Mark
- Attribute: `norm` (z.B. "DIN 1053"), `absatz`, `jahr`
- UI: Kursiv + automatische Link-Bildung zur Norm-Datenbank
- Use-Case: Norm-Zitate strukturell erfassen (für IHK-Konformität)

---

## Daten-Fluss: Ein neuer Absatz entsteht

Szenario: Der SV schreibt im §6 den Satz "Die Nordwand zeigt Durchfeuchtung". Hier ist, was passiert:

```
1. Keystroke "D" → TipTap ProseMirror-Transaction → DOM-Patch
   (Latenz: <16 ms, 1 Frame)

2. Nach jeweils 8 Sekunden Pause: onUpdate feuert
   → SaveManager speichert content_json in documents-Tabelle
   → Auto-Save-Icon blinkt 200 ms grün
   (Latenz: DB-Roundtrip ~200 ms)

3. Beim Satzende (Punkt + Leerzeichen):
   → LanguageTool (self-hosted) wird aufgerufen
   → Rechtschreib-/Grammatik-Checks als Decorations angezeigt
   (Latenz: ~80 ms HTTP-Roundtrip intern)

4. Wenn Qualitäts-Marker-Checks greifen (alle 2 Sekunden):
   → Konjunktiv-Scanner prüft den Absatz
   → §-Verweis-Detector sucht im Text
   → Status-Leiste unten aktualisiert die Marker-Zähler
   (Latenz: <50 ms lokaler Scan)

5. Sobald der User `[[` tippt:
   → Wikilink-Suggestion öffnet sich
   → Zeigt Headings, Anhänge, Textbausteine
   (Latenz: <30 ms lokaler Index)

6. Sobald der User Cmd+Alt+K drückt:
   → KI-Edge-Function wird aufgerufen
   → Antwort in <2 s (Ziel)
   → Als prova-ki-suggestion Mark eingefügt
   → Suggesting-Bubble erscheint mit Accept/Reject
   (Latenz: 500–2000 ms je nach KI-Provider)
```

---

## Wie die Komponenten zusammen starten

```javascript
// /public/js/pages/stellungnahme.js (oder ähnlich)
import { ProvaEditor } from '../prova-editor.js'
import { SlashCommand } from '../extensions/prova-slash-command.js'
import { FragmentMarker } from '../extensions/prova-fragment-marker.js'
import { KISuggestion } from '../extensions/prova-ki-suggestion.js'
import { Callout } from '../extensions/prova-callout.js'
import { FocusMode } from '../prova-focus-mode.js'
import { cmdk } from '../prova-command-palette.js'
import { FragmentSidebar } from '../prova-fragment-sidebar.js'
import { initBubbleMenu } from '../prova-bubble-menu.js'
import { registerEditorCommands } from '../commands/editor-commands.js'

// 1. Editor initialisieren
const editor = new ProvaEditor(document.querySelector('#editor'), {
  mode: 'fachurteil',
  extraExtensions: [SlashCommand, FragmentMarker, KISuggestion, Callout],
  onUpdate: (ed) => saveManager.schedule(ed.getJSON()),
})

// 2. UI-Module anhängen
initBubbleMenu(editor.editor)
new FocusMode(editor.editor)
new FragmentSidebar(editor.editor, fragmentStore)

// 3. Commands für Cmd+K registrieren
registerEditorCommands(editor.editor)  // ~30 Commands

// 4. Cheat-Sheet-Binding
import Mousetrap from 'mousetrap'
Mousetrap.bind('?', () => {
  if (document.activeElement.closest('.ProseMirror')) return  // nicht im Editor
  showCheatSheet()
})

// 5. Auto-Save alle 30 Sekunden (Pflicht aus PROVA-Doktrin)
setInterval(() => saveManager.flush(), 30_000)
```

Der gesamte Startup ist **~8 Zeilen echter Logik** + Imports. Keine Framework-Zeremonien.

---

## Der Audit-Trail-Haken (Session 4 Verbindung)

Jede Aktion im Editor muss im `ki_protokoll` und ggf. `audit_log` landen. Wir hängen uns an:

```javascript
editor.on('transaction', ({ editor, transaction }) => {
  // Wenn es eine KI-bezogene Transaktion ist:
  const isKIAction = transaction.getMeta('source') === 'ki'
  if (isKIAction) {
    auditLog.record({
      event: 'ki.suggestion.applied',
      details: transaction.getMeta('kiDetails'),
      timestamp: Date.now(),
    })
  }
  // Wenn es ein manueller Edit ist (>500ms seit letztem):
  if (!isKIAction && Date.now() - lastEditTs > 500) {
    auditLog.record({
      event: 'sv.edit',
      charCount: editor.storage.characterCount.characters(),
      timestamp: Date.now(),
    })
    lastEditTs = Date.now()
  }
})
```

Das ist das Session-4-Audit-Pattern (Two-View), implementiert am Editor-Event-Hook.

---

## Die drei Mobile-Adaptionen

PROVA läuft auf iPad. Der Editor muss touch-tauglich sein. Drei Anpassungen:

### Anpassung 1: Größere Tap-Targets (Craft-Pattern)
```css
@media (pointer: coarse) {
  .prova-bubble-menu button { min-width: 44px; min-height: 44px; padding: 10px; }
  .slash-item { padding: 16px 12px; }  /* doppelter Vertikal-Pad */
  .fragment-marker { padding: 4px 2px; }  /* leichter Tap-Hotspot um den Mark */
}
```

### Anpassung 2: Slash-Menü wird Sheet (statt Dropdown)
```css
@media (max-width: 768px) {
  .prova-slash-menu {
    position: fixed; bottom: 0; left: 0; right: 0;
    max-height: 60vh; overflow-y: auto;
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  .prova-slash-menu.is-open { transform: translateY(0); }
}
```

### Anpassung 3: Cmd+K wird "Action"-Button (Float rechts unten)
```javascript
if (window.matchMedia('(pointer: coarse)').matches) {
  const fab = document.createElement('button')
  fab.className = 'prova-fab-command'
  fab.innerText = '⌘K'
  fab.setAttribute('aria-label', 'Befehle')
  fab.addEventListener('click', () => cmdk.show())
  document.body.appendChild(fab)
}
```

Das sind kleine Mobile-Anpassungen, kein Mobile-Fork. Ein Codebase.

---

## Die eine Architektur-Entscheidung, die alles zusammenhält

**Der Editor-State ist das Dokument. Punkt.**

TipTap speichert den State als `content_json` (ProseMirror-Format). Das wird 1:1 in `documents.content_json` (Supabase) persistiert. Keine Transformation, keine Zwischen-Schicht.

Das hat drei massive Vorteile:
1. **Wiederherstellung ist trivial:** `editor.commands.setContent(docFromDB.content_json)`. Ein Zeile.
2. **Versionierung ist trivial:** Jede `documents_versions`-Row enthält komplettes content_json. Diff per ProseMirror-Diff-Algorithmus.
3. **Export ist trivial:** Zu HTML via `editor.getHTML()`, zu JSON via `editor.getJSON()`, zu Markdown via Extension, zu PDF via PDFMonkey mit HTML-Input.

Der Punkt ist: Wir haben KEIN eigenes Dokument-Format erfunden. Wir nutzen ProseMirror-JSON als kanonisches Format. Das ist **langzeit-stabil** (ProseMirror existiert seit 2015, Format unverändert).

---

*→ Weiter mit `07-TEIL-G-30-Tage-Sprint.md` für die tagesgenaue Umsetzung.*
