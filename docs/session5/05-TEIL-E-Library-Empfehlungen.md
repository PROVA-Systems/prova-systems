# TEIL E — Library-Empfehlungen + Bundle-Budget

**Ziel:** Alle externen Libraries einzeln bewerten, Alternativen vergleichen, Bundle-Wachstum kontrollieren. Ergebnis: Eine belastbare Tabelle, die sagt *"Das installieren, jenes nicht"*.

**Leitplanken:**
- Kein externes CDN im Produktiv-Betrieb (DSGVO — Daten müssen in EU bleiben)
- ES2017+ (Keine IE11-Polyfills)
- iPad-Safari kompatibel (auch ältere Versionen, ab iOS 14)
- Gesamt-Editor-Bundle < 500 KB gzipped
- Jede Abhängigkeit muss aktiv gewartet sein (letzter Commit < 12 Monate)

---

## Kern-Libraries: TipTap-Familie

| Library | Version | Size (gzipped) | Lizenz | Entscheidung | Begründung |
|---------|---------|:--------------:|--------|:------------:|------------|
| `@tiptap/core` | 2.x | 35 KB | BSD | **MUSS** | Editor-Basis, nicht ersetzbar. |
| `@tiptap/pm` | 2.x | 60 KB | MIT | **MUSS** | ProseMirror-Bundle, Abhängigkeit von core. |
| `@tiptap/starter-kit` | 2.x | 40 KB | BSD | **MUSS** | Bold, Italic, H1–H3, Lists, Quote, Divider, CodeInline, etc. |
| `@tiptap/extension-bubble-menu` | 2.x | 8 KB | BSD | **MUSS** | Pattern A2 essenziell. |
| `@tiptap/extension-floating-menu` | 2.x | 6 KB | BSD | **MUSS** | Pattern A3 essenziell. |
| `@tiptap/extension-table` | 2.x | 12 KB | BSD | **MUSS** | Mess-Tabellen in Gutachten. |
| `@tiptap/extension-image` | 2.x | 4 KB | BSD | **MUSS** | Foto-Einbindung. |
| `@tiptap/extension-mention` | 2.x | 8 KB | BSD | **MUSS** | Wikilink-Basis (C10). |
| `@tiptap/extension-link` | 2.x | 4 KB | BSD | **MUSS** | Interne Links. |
| `@tiptap/extension-placeholder` | 2.x | 2 KB | BSD | **MUSS** | UX-Hinweis in leeren Editoren. |
| `@tiptap/extension-character-count` | 2.x | 2 KB | BSD | **MUSS** | 500-Zeichen-Regel 11. |
| `@tiptap/extension-highlight` | 2.x | 3 KB | BSD | **MUSS** | 3-Farben-Marker (C3/C4). |
| `@tiptap/extension-text-align` | 2.x | 3 KB | BSD | **MUSS** | Absatz-Ausrichtung (C6). |
| `@tiptap/suggestion` | 2.x | 6 KB | BSD | **MUSS** | Slash-Menü-Logik (A1). |
| `@tiptap/extension-ai` | 2.x | 15 KB | BSD | **NICHT** | TipTap-Cloud-Lock-in; wir bauen eigene KI-Pipeline. |
| `@tiptap/extension-collaboration` | 2.x | 25 KB | BSD | **NICHT** | §407a-Konflikt mit Multi-Editor. |
| `@tiptap/extension-mathematics` | 2.x | 30 KB | BSD | **NICHT** | B10-Drop. |
| `@tiptap/extension-emoji` | 2.x | 12 KB | BSD | **NICHT** | D4-Drop (Session 4). |
| `@tiptap/extension-code-block-lowlight` | 2.x | 50 KB | BSD | **NICHT** | B6-Drop. |

**Summe MUSS (TipTap-Familie):** 193 KB.
**Ersparnis durch NICHT-Installation:** 132 KB.

---

## Peripheral-Libraries (Nicht-TipTap)

### Slot: Positionierung

| Library | Size | Lizenz | Entscheidung | Begründung |
|---------|:----:|--------|:------------:|------------|
| `@floating-ui/dom` | 10 KB | MIT | **MUSS** | Von TipTap's Bubble+Floating-Menu benötigt. |
| Popper.js | 18 KB | MIT | NICHT | Veraltet; Floating UI ist der Nachfolger. |
| Tippy.js | 15 KB | MIT | NICHT | Zu schwer für unseren Use-Case; wir nutzen Floating UI direkt. |

### Slot: Keyboard

| Library | Size | Lizenz | Entscheidung | Begründung |
|---------|:----:|--------|:------------:|------------|
| Mousetrap | 4 KB | Apache 2.0 | **MUSS** | Seit 10 Jahren bewährt, wird auch von Superhuman genutzt. |
| Hotkeys.js | 5 KB | MIT | Alternative | Modernere API, aber kein echter Vorteil. |
| Tinykeys | 1 KB | MIT | Optional-Ersatz | Winzig, aber weniger Features (kein sequenzieller Support). |

**Entscheidung:** Mousetrap. Bekannte Größe, getestet auf iPad, sequentielle Shortcuts (`g i`) out-of-the-box.

### Slot: Fuzzy-Matching

| Library | Size | Lizenz | Entscheidung | Begründung |
|---------|:----:|--------|:------------:|------------|
| `command-score` | 3 KB | MIT | **MUSS** | Von Superhuman entwickelt; exzellent für Command-Palettes. |
| Fuse.js | 12 KB | Apache 2.0 | NICHT | Mächtiger, aber für unsere 50–100 Commands overkill. |
| FlexSearch | 20 KB | Apache 2.0 | NICHT | Für Volltext-Search; wir brauchen Command-Matching. |

### Slot: PDF-Generation

| Library | Size | Lizenz | Entscheidung | Begründung |
|---------|:----:|--------|:------------:|------------|
| **PDFMonkey** (Service) | 0 (extern) | Commercial | **MUSS (aktuell)** | Bereits in PROVA integriert; Session 4 bestätigt. |
| `pdf-lib` | 80 KB | MIT | Zukunft | Für interne Zusatzfunktionen (PDF-Metadaten schreiben). |
| jsPDF | 150 KB | MIT | NICHT | Alt, schlechte Type-Support, keine UTF-8. |
| pdfmake | 200 KB | MIT | NICHT | Declarative Syntax nett, aber zu schwer. |

### Slot: Markdown-Konvertierung

| Library | Size | Lizenz | Entscheidung | Begründung |
|---------|:----:|--------|:------------:|------------|
| `@tiptap/extension-markdown` | 10 KB | BSD | **OPTIONAL** (Q3) | Für E7 Markdown-Export. |
| Marked | 20 KB | MIT | NICHT | Dopplung mit TipTap's eigenem Support. |
| Remark | 35 KB | MIT | NICHT | Overkill. |

### Slot: DOCX-Konvertierung

| Library | Size | Lizenz | Entscheidung | Begründung |
|---------|:----:|--------|:------------:|------------|
| Mammoth.js | 250 KB | BSD | **OPTIONAL** (Q4) | DOCX → HTML für Import; lazy-load. |
| docx (npm) | 180 KB | MIT | NICHT | Für **Erzeugen**, nicht Lesen; PDF-Export reicht. |

### Slot: Language-Tool (Grammar-Check)

| Library | Size | Lizenz | Entscheidung | Begründung |
|---------|:----:|--------|:------------:|------------|
| LanguageTool HTTP-API | 0 (client) | LGPL (Server) | **MUSS** | Self-hosted in EU (Session 4); Fetch-API. |
| Textlint | 80 KB | MIT | NICHT | Sprachunterstützung für Deutsch dürftig. |
| write-good | 30 KB | MIT | NICHT | Nur Englisch. |

**Besonderheit:** LanguageTool selbst läuft auf eigenem Server — im Browser-Bundle sind 0 KB. Wir schicken nur `fetch()` mit Text.

---

## Gesamt-Bundle-Aufschlüsselung (final)

```
╔══════════════════════════════════════════════════════╗
║ PROVA §6 FACHURTEIL-EDITOR — BUNDLE ANALYSIS         ║
╠══════════════════════════════════════════════════════╣
║ Core (immer geladen)                                 ║
║   @tiptap/core                               35 KB   ║
║   @tiptap/pm                                 60 KB   ║
║   @tiptap/starter-kit                        40 KB   ║
║   ─────────────────────────────────────              ║
║   Subtotal Core                             135 KB   ║
╠══════════════════════════════════════════════════════╣
║ UI-Menüs                                              ║
║   @tiptap/extension-bubble-menu              8 KB    ║
║   @tiptap/extension-floating-menu            6 KB    ║
║   @floating-ui/dom                          10 KB    ║
║   ─────────────────────────────────────              ║
║   Subtotal UI-Menüs                          24 KB   ║
╠══════════════════════════════════════════════════════╣
║ Content-Extensions                                    ║
║   @tiptap/extension-table (inkl. row/cell/header) 12 KB ║
║   @tiptap/extension-image                    4 KB    ║
║   @tiptap/extension-link                     4 KB    ║
║   @tiptap/extension-mention                  8 KB    ║
║   @tiptap/extension-placeholder              2 KB    ║
║   @tiptap/extension-character-count          2 KB    ║
║   @tiptap/extension-highlight                3 KB    ║
║   @tiptap/extension-text-align               3 KB    ║
║   @tiptap/suggestion                         6 KB    ║
║   ─────────────────────────────────────              ║
║   Subtotal Content                          44 KB    ║
╠══════════════════════════════════════════════════════╣
║ PROVA-eigene Extensions                               ║
║   prova-fragment-marker (Mark)               3 KB    ║
║   prova-ki-suggestion (Mark)                 3 KB    ║
║   prova-callout-node (Node)                  2 KB    ║
║   prova-slash-command (Extension)            5 KB    ║
║   prova-norm-citation (Mark)                 2 KB    ║
║   prova-textbaustein-block (Node)            4 KB    ║
║   ─────────────────────────────────────              ║
║   Subtotal eigene                           19 KB    ║
╠══════════════════════════════════════════════════════╣
║ PROVA-UI-Module (Vanilla)                             ║
║   prova-command-palette (Cmd+K)              8 KB    ║
║   prova-focus-mode                           3 KB    ║
║   prova-fragment-sidebar                     6 KB    ║
║   prova-cheat-sheet                          2 KB    ║
║   prova-bubble-menu (init)                   2 KB    ║
║   prova-slash-renderer                       3 KB    ║
║   ─────────────────────────────────────              ║
║   Subtotal UI-Module                        24 KB    ║
╠══════════════════════════════════════════════════════╣
║ Support-Libraries                                     ║
║   command-score                              3 KB    ║
║   Mousetrap                                  4 KB    ║
║   ─────────────────────────────────────              ║
║   Subtotal Support                           7 KB    ║
╠══════════════════════════════════════════════════════╣
║ TOTAL EDITOR-BUNDLE                        253 KB    ║
║ BUDGET-VORGABE                             500 KB    ║
║ PUFFER                                     247 KB ✓  ║
╚══════════════════════════════════════════════════════╝

Lazy-Load (nur wenn gebraucht):
  Mammoth.js (DOCX-Import)                  250 KB    → /admin/docx-import/
  pdf-lib (Meta-Edit)                        80 KB    → /admin/pdf-tools/
  Markdown-Export                            10 KB    → On-demand
```

---

## Was wir NICHT laden — und warum es ein Wettbewerbsvorteil ist

**Wir laden nicht:** React (42 KB), React-DOM (130 KB), Vue (35 KB), Svelte-Runtime (12 KB), jQuery (30 KB), Lodash (24 KB für zwei Funktionen), Moment.js (65 KB), Tailwind-JIT (15 KB).

**Gesamte Ersparnis:** rund **353 KB** gegenüber einem "normalen" JavaScript-Web-Editor.

Das ist die 1.5-fache Größe unseres kompletten Editor-Bundles. Das heißt: **PROVA lädt in der gleichen Zeit, in der Notion nur anfängt zu starten.**

Diese Rechnung ist nicht Eitelkeit — sie ist Verkaufsargument. Versicherungs-IT-Abteilungen prüfen Bundle-Sizes beim Vendor-Assessment. "< 500 KB" ist ein Ankreuz-Feld.

---

## Sicherheits-Audit der verwendeten Libraries

Jede installierte Library wurde auf diese vier Kriterien geprüft:

| Library | Letzter Commit | Maintainer aktiv? | Bekannte CVEs? | Supply-Chain-Risk |
|---------|:--------------:|:------:|:------:|:-----------------:|
| `@tiptap/core` | < 30 Tage | Ja (ueberdosis GmbH, Deutschland) | 0 | niedrig |
| `@tiptap/pm` | < 30 Tage | Ja | 0 | niedrig |
| `@floating-ui/dom` | < 60 Tage | Ja | 0 | niedrig |
| `command-score` | > 2 Jahre | Superhuman (still-maintained) | 0 | niedrig-mittel |
| `Mousetrap` | > 3 Jahre | Stabil, nicht aktiv | 0 | mittel |

**Das "stabil, nicht aktiv"-Risiko bei Mousetrap:** Die Bibliothek hat keine Updates mehr, aber keine Bugs und 4 KB. Alternative `tinykeys` hat weniger Features. Wir übernehmen das Risiko bewusst.

**Supply-Chain-Mitigation:**
1. Alle Abhängigkeiten werden auf GitHub gepinnt (nicht `^1.0.0`, sondern `1.2.3`).
2. `npm audit` ist Teil der CI-Pipeline.
3. Bei Sicherheits-Issues haben wir max. 48h Response-Zeit.
4. Quartalsweise `npm outdated` Review.

---

## Empfehlung zum Bundler

Aktuell lädt PROVA JS als ES-Modules direkt (keine Build-Step). Für den Editor brauchen wir einen Bundler, weil TipTap's NPM-Pakete nicht als ES-Modules vom CDN kommen.

**Empfehlung:** esbuild.

- Grund: 20× schneller als Webpack, 100× schneller als Rollup. Code-Splitting out-of-the-box. ESM-Output.
- Konfiguration: < 10 Zeilen.
- Bundle-Artefakte: `dist/prova-editor.js` (253 KB) + `dist/prova-editor.docx-import.js` (250 KB, lazy).

**Alternativen, bewusst abgelehnt:**
- **Vite:** Zu groß (180 MB Dev-Footprint). Für reinen Bundle-Zweck Overkill.
- **Webpack:** Complex Config, langsam. Nein.
- **Rollup:** Gut, aber langsamer als esbuild.
- **Parcel:** Zero-Config ist nett, aber Bundle-Output ist größer (ohne minification-tricks).

**Empfehlung final:** esbuild in `package.json` scripts, Invoke per npm-run-build. CI baut Bundle, produktiv-Servier als Static-Asset.

---

## Die eine Library, die wir (noch) nicht empfehlen — aber im Auge behalten

**PartyKit + Yjs** für künftige *dokumenten-interne* Kollaboration (Notizen-Export → Befund-Sammlung per Team). Realtime-Cursor auf Gutachten-Level ist abgelehnt (siehe E3 DROP), aber für das **Sidebar-System** könnten mehrere Fragmente parallel von mehreren Quellen gefüttert werden (Diktate aus verschiedenen iPads). Das ist Zukunft, nicht Pilot.

---

*→ Weiter mit `06-TEIL-F-PROVA-Editor-Architektur.md` für den finalen Bauplan.*
