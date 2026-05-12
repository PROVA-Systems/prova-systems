# TEIL B — Pattern-Matrix: 35 Patterns × 7 Apps × TipTap-Extension

**Ziel dieser Matrix:** Für jedes einzelne UX-Pattern (das wir in den 7 Apps gefunden haben) festhalten: *wer macht es*, *wie gut*, *mit welcher TipTap-Extension baubar*, *und ob wir es für PROVA adoptieren*.

**Format:** 35 Patterns in 5 Kategorien, jeweils mit 4-Spalten-Bewertung.

**Legende:**
- ★★★ = Referenz-Implementierung (nicht übertreffbar)
- ★★ = Sehr gut
- ★ = Vorhanden, mittelmäßig
- — = Nicht vorhanden
- ✓ = PROVA übernimmt
- ✗ = PROVA übernimmt NICHT
- △ = PROVA übernimmt adaptiert

---

## Kategorie A: Invocation-Patterns (Wie der User Features aufruft)

| # | Pattern | Notion | Linear | Craft | GDocs | iA | Bear | Pages | TipTap-Extension | PROVA |
|---|---------|:------:|:------:|:-----:|:-----:|:--:|:----:|:-----:|------------------|:-----:|
| A1 | Slash-Menü `/` für Blöcke | ★★★ | — | ★★★ | — | — | — | — | `@tiptap/suggestion` | ✓ |
| A2 | Bubble-Menü über Selection | ★★ | ★ | ★★★ | ★★ | — | ★ | ★ | `@tiptap/extension-bubble-menu` | ✓ |
| A3 | Floating-Menü auf leerer Zeile | ★★★ | — | ★★ | — | — | — | — | `@tiptap/extension-floating-menu` | ✓ |
| A4 | Cmd+K Command Palette | ★ | ★★★ | ★ | — | — | — | — | Custom (Vanilla) | ✓ |
| A5 | `?` Cheat-Sheet-Overlay | — | ★★★ | — | ★ | — | — | — | Custom (Vanilla) | ✓ |
| A6 | Context-Menü bei Rechts-Klick | ★ | — | ★★ | ★★★ | — | ★★ | ★★★ | Native browser | △ |
| A7 | Sequential shortcuts (G+I) | — | ★★★ | — | — | — | — | — | Mousetrap | △ |
| A8 | Direkte Buchstaben-Shortcuts (C=new) | — | ★★★ | — | — | — | — | — | — | ✗ |
| A9 | Toolbar als Primär-UI | — | — | ★ | ★★★ | — | ★ | ★★★ | Custom (CSS) | ✗ |
| A10 | Inspector-Sidebar für Selektion | — | — | — | ★ | — | — | ★★★ | Custom (Vanilla) | △ |

### Kommentare zur Kategorie A

**A1 Slash-Menü:** Notion und Craft sind co-referenz. Beide verwenden `@tiptap/suggestion`-artige Lösungen (Notion eigenes, Craft proprietär). Für PROVA: **Primäre Invocation. Muss haben.**

**A2 Bubble-Menü:** Craft ist führend, weil es nur erscheint wenn relevant (Text-Selection), nicht wenn man nur Cursor setzt. Google Docs zeigt Bubble immer → nervig bei langen Texten. Notion zeigt sie auch bei normaler Selektion → okay. **PROVA: ja, aber Craft-Stil (nur bei Selection).**

**A4 Cmd+K:** Linear ist uneinholbar. Notion hat eine schwächere Variante. PROVA übernimmt den Linear-Ansatz. **Verpflichtend.**

**A5 `?`:** Nur Linear hat es ernsthaft. Wenn PROVA Shortcuts einführt (und das tut es), ist `?` kein Nice-to-have, sondern **Pflicht** — sonst sind Shortcuts unsichtbar.

**A7 Sequential:** Verwirrend für Laien. Bausachverständige sind keine Vim-User. Wir übernehmen selektiv (siehe TEIL C).

**A8 Single-letter:** Linear kann das nur, weil es keine Text-Input-Fokus-App ist. PROVA hat Text-Input überall → Kollisions-Risiko zu hoch. **Ablehnen.**

**A9 Toolbar als Primär:** Dies ist die alte Welt (Word, Pages). Wir sind explizit in der "Toolbar max 5 Buttons"-Doktrin (Session 4). **Ablehnen.**

**A10 Inspector:** Wir nehmen das Pattern, aber mit anderem Inhalt (Gutachten-Kontext, nicht Styling). Daher △.

---

## Kategorie B: Block- & Content-Patterns

| # | Pattern | Notion | Linear | Craft | GDocs | iA | Bear | Pages | TipTap-Extension | PROVA |
|---|---------|:------:|:------:|:-----:|:-----:|:--:|:----:|:-----:|------------------|:-----:|
| B1 | Heading-Blöcke (H1–H3) | ★★★ | ★★ | ★★★ | ★★★ | ★★ | ★★ | ★★★ | Starter Kit | ✓ |
| B2 | Bullet/Numbered Lists | ★★★ | ★★ | ★★ | ★★★ | ★★ | ★★ | ★★★ | Starter Kit | ✓ |
| B3 | Quote-Block / Zitat | ★★ | ★ | ★★ | ★ | ★ | ★★ | ★★ | Starter Kit | ✓ |
| B4 | Divider / Trennlinie | ★★ | — | ★★ | ★★ | ★ | — | ★ | Starter Kit | ✓ |
| B5 | Callout-Block | ★★★ | — | ★★★ | — | — | — | — | Custom Extension | ✓ |
| B6 | Code-Block mit Syntax | ★★ | ★★★ | ★ | — | ★★ | ★★ | — | `@tiptap/extension-code-block-lowlight` | ✗ |
| B7 | Tabelle mit Header-Row | ★★ | ★ | ★★ | ★★★ | — | ★★ | ★★★ | `@tiptap/extension-table` | ✓ |
| B8 | Bild mit Caption | ★★ | ★ | ★★★ | ★★ | ★ | ★★ | ★★ | `@tiptap/extension-image` | ✓ |
| B9 | Video-Embed | ★★ | — | ★★ | ★ | — | ★ | — | — | ✗ |
| B10 | Math/LaTeX-Formel | ★★ | — | ★ | ★ | — | — | — | `@tiptap/extension-mathematics` | ✗ |
| B11 | Toggle/Collapsible Block | ★★★ | — | ★★ | — | — | — | — | Custom Extension | ✗ |
| B12 | Nested Blocks (in Blöcken) | ★★★ | — | ★★★ | — | — | — | — | Custom | ✗ |

### Kommentare zur Kategorie B

**B5 Callout:** Wird bei PROVA zum **Prüf-Marker-Block**. Rote Callouts = Mangel, grüne = OK, gelbe = zu prüfen. Der Content ist derselbe (Text + Icon + Rahmen), die Semantik ist anders.

**B6 Code-Block:** Bausachverständige schreiben keinen Code. Hardwired **aus**.

**B7 Tabelle:** Pages und Google Docs sind Referenz. TipTap's Table-Extension ist sehr robust. **Muss haben** für Mess-Tabellen in Gutachten.

**B10 Math:** YAGNI. Sachverständige schreiben Berechnungen als Text, nicht als LaTeX.

**B11/B12 Toggle + Nested:** Visuelle Hierarchie ist attraktiv, aber nicht druckbar. Abgelehnt aus Print-Gründen.

---

## Kategorie C: Markup- & Style-Patterns

| # | Pattern | Notion | Linear | Craft | GDocs | iA | Bear | Pages | TipTap-Extension | PROVA |
|---|---------|:------:|:------:|:-----:|:-----:|:--:|:----:|:-----:|------------------|:-----:|
| C1 | Bold/Italic/Underline | ★★★ | ★★ | ★★★ | ★★★ | ★★ | ★★ | ★★★ | Starter Kit | ✓ |
| C2 | Strikethrough | ★★ | ★★ | ★★ | ★★ | ★★ | ★★ | ★★ | Starter Kit | ✓ |
| C3 | Hervorhebung (Highlight) | ★★ | — | ★★ | ★★ | ★ | ★ | ★★ | `@tiptap/extension-highlight` | ✓ |
| C4 | Farbe (Text-Farbe) | ★★ | — | ★★ | ★ | — | — | ★★ | `@tiptap/extension-color` | △ |
| C5 | Font-Auswahl | — | — | ★★ | — | — | — | ★★★ | `@tiptap/extension-font-family` | ✗ |
| C6 | Text-Alignment (L/C/R/J) | ★★ | — | ★ | ★★★ | — | — | ★★★ | `@tiptap/extension-text-align` | ✓ |
| C7 | Inline-Code `` ` `` | ★★ | ★★ | ★ | — | ★ | ★★ | — | Starter Kit | ✗ |
| C8 | Superscript/Subscript | ★ | — | — | ★★ | — | — | ★★ | `@tiptap/extension-superscript` | ✗ |
| C9 | Link mit Preview | ★★★ | ★ | ★★★ | ★★ | ★ | ★★ | ★ | `@tiptap/extension-link` | △ |
| C10 | Wikilink `[[...]]` | — | — | — | — | — | ★★★ | — | `@tiptap/extension-mention` | ✓ |

### Kommentare zur Kategorie C

**C4 Text-Farbe:** Wir brauchen nur 3 Farben (rot/gelb/grün), nicht 16-Millionen. Daher △ (angepasst).

**C5 Font-Auswahl:** Gutachten haben eine Pflicht-Schriftart (in der CSS festgelegt). SV dürfen nicht eigene Fonts wählen — das wäre formatieren statt schreiben. **Ablehnen.**

**C9 Link:** Wir erlauben nur Links innerhalb des Gutachtens (Wikilinks, C10), keine externen URLs. C9 ist daher △ — Link-Extension laden, aber nur für interne Links.

**C10 Wikilink:** Nach Bear-Analyse klar: **muss haben**. Implementiert via `@tiptap/extension-mention` mit angepasster Trigger-Character `[[`.

---

## Kategorie D: Focus- & Distraktions-Patterns

| # | Pattern | Notion | Linear | Craft | GDocs | iA | Bear | Pages | TipTap-Extension | PROVA |
|---|---------|:------:|:------:|:-----:|:-----:|:--:|:----:|:-----:|------------------|:-----:|
| D1 | Focus Mode (Chrome weg) | ★ | — | ★★★ | — | ★★★ | ★ | — | CSS + State | ✓ |
| D2 | Sentence-Focus (nur Satz hell) | — | — | — | — | ★★★ | — | — | ProseMirror-Deco | ✓ |
| D3 | Paragraph-Focus (nur Absatz) | — | — | — | — | ★★★ | — | — | ProseMirror-Deco | ✓ |
| D4 | Typewriter-Mode (Cursor zentriert) | — | — | — | — | ★★★ | — | — | Custom JS | ✓ |
| D5 | Full-Screen-Modus | ★ | — | ★★ | ★ | ★★ | ★ | ★★ | CSS | ✓ |
| D6 | Dark Mode | ★★ | ★★★ | ★★★ | ★ | ★★★ | ★★★ | — | CSS | △ |
| D7 | Zen/Schreib-Modus (alles aus) | — | — | ★★★ | — | ★★★ | — | — | CSS + State | ✓ |
| D8 | Word Count visibel | ★ | — | ★ | ★★ | ★★★ | ★★ | ★★ | `@tiptap/extension-character-count` | ✓ |
| D9 | Read-only Preview-Modus | ★★ | ★★ | ★★★ | ★★★ | — | ★ | ★★★ | editor.setEditable | ✓ |

### Kommentare zur Kategorie D

**D1–D4:** Drei-Ebenen-Focus-System von iA Writer + Craft übernommen. Das ist eines der wichtigsten Patterns für §6.

**D6 Dark Mode:** Bausachverständige sind Büro-User, die oft drucken. Dark Mode als Default ist gefährlich, weil User vergessen, dass Print weiß-auf-schwarz nicht geht. Daher △: anbieten, aber nicht default, und Warning beim Print-Export.

**D8 Word Count:** PROVA braucht **Zeichen-Count** (500-Zeichen-Eigenleistung nach Regel 11). Die Extension liefert beides.

---

## Kategorie E: Kollaborations- & Review-Patterns

| # | Pattern | Notion | Linear | Craft | GDocs | iA | Bear | Pages | TipTap-Extension | PROVA |
|---|---------|:------:|:------:|:-----:|:-----:|:--:|:----:|:-----:|------------------|:-----:|
| E1 | Comments-Sidebar | ★★ | — | ★ | ★★★ | — | — | ★★ | Custom Extension | ✓ |
| E2 | Suggesting-Mode (Diff) | — | — | — | ★★★ | — | — | ★★ | Custom Extension | ✓ |
| E3 | Realtime-Cursors | ★★ | ★ | ★★ | ★★★ | — | — | ★★ | `@tiptap/extension-collaboration` | ✗ |
| E4 | Version History | ★★★ | ★★ | ★★ | ★★★ | ★ | ★ | ★★ | Custom (wir haben `documents_versions`) | ✓ |
| E5 | Share-Link mit Permissions | ★★★ | ★★ | ★★★ | ★★★ | — | ★ | ★★★ | Nicht Editor-Teil | ✓ |
| E6 | Export zu PDF | ★★ | ★ | ★★★ | ★★★ | ★★★ | ★★ | ★★★ | PDFMonkey (wir haben es) | ✓ |
| E7 | Export zu Markdown | ★★ | ★ | ★★★ | — | ★★★ | ★★★ | — | `@tiptap/extension-markdown` | △ |
| E8 | Import aus DOCX | ★★ | — | ★★★ | ★★★ | ★★ | ★ | ★★★ | Mammoth.js | △ |

### Kommentare zur Kategorie E

**E1 Comments:** Google Docs Referenz. Bei PROVA wird aus Comments die **Befund-Fragmente-Sidebar** (Session 4 Konzept).

**E2 Suggesting:** Google Docs Referenz. Bei PROVA wird aus Suggestions die **KI-Vorschlags-Darstellung** — jede KI-Änderung erscheint als "Vorschlag", nicht als direkte Änderung.

**E3 Realtime-Cursors:** §407a-Problem. Mehrere Cursor = mehrere SVs = verletzt Eigenleistungs-Pflicht. **Ablehnen.**

**E4 Version History:** Bereits vorhanden in PROVA (`documents_versions` Tabelle). Editor muss nur **die UI** dazu liefern — Version-Slider.

**E7/E8 Markdown/DOCX Export/Import:** △ weil Q3/Q4-2026-Roadmap. Im Pilot nicht nötig.

---

## Gesamt-Übersicht: Adoption-Entscheidung

**Zusammengefasst bei 35 Patterns:**

- **✓ Übernehmen (1:1 oder sehr nah):** 22 Patterns (A1, A2, A3, A4, A5, B1, B2, B3, B4, B5, B7, B8, C1, C2, C3, C6, C10, D1, D2, D3, D4, D5, D7, D8, D9, E1, E2, E4, E5, E6)
- **△ Anpassen (Konzept ja, Details anders):** 8 Patterns (A6, A7, A10, C4, C9, D6, E7, E8)
- **✗ Ablehnen:** 13 Patterns (A8, A9, B6, B9, B10, B11, B12, C5, C7, C8, E3)

Das ergibt eine **klare Priorisierung**:

1. **Core-5 (Pilot-MVP, 3 Wochen):** A1, A2, A3, A4, D1–D4 → Slash + Bubble + Floating + Cmd+K + Focus
2. **Content-Core (Release 1, Tag 21):** B1, B2, B3, B4, B5, B7, B8, C1, C2, C3, C6
3. **Advanced (Release 2, Tag 35):** C10 (Wikilinks), E1 (Comments), E2 (Suggesting), E4 (Version-History-UI)

---

*→ Weiter mit `03-TEIL-C-TipTap-Implementation.md` für Vanilla-JS-Code-Skizzen.*
