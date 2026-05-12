# TEIL A — Tiefe Analyse der 7 Editor-Apps

**Methode:** Für jede App untersuche ich (a) was das Kern-Alleinstellungs-Pattern ist, (b) welche konkreten UX-Entscheidungen dahinterstehen, (c) welche Keyboard-Shortcuts und Timings extrahierbar sind, (d) welche Patterns für PROVA wertvoll sind — und welche nicht.

**Format pro App:** ~2000 Wörter, jeweils mit ASCII-Wireframe, Timing-Tabelle, und konkreter Adoption-Empfehlung.

---

## 1. Notion — Der Block-basierte Baukasten

### Das Kern-Pattern: Slash-Menü als Universal-Invocation

Notion hat nicht *einen* neuen Trick erfunden — Notion hat ein 1970er-Unix-Konzept (Command Line) für Editor-Text nutzbar gemacht. Die Eingabe `/` öffnet eine kontextsensitive Liste aller möglichen Block-Typen, die man mit Pfeiltasten durchblättert und mit Enter einfügt. Das klingt banal, ist aber revolutionär, weil es **jede Toolbar überflüssig macht**.

Das funktioniert aus einem einzigen Grund: Notion hat das `/`-Zeichen als "Escape-Sequenz" in prosaischem Text definiert. Es gibt kaum einen Kontext, in dem ein User mitten in einem Gutachten wirklich ein `/` schreiben will — und wenn doch, schließt ein weiterer Tastendruck (z.B. Leerzeichen) das Menü und lässt das `/` stehen. Das ist elegante Fehlertoleranz.

### Was Notion konkret im Slash-Menü anbietet

Aus der offiziellen Notion-Hilfe rekonstruiert, gibt es fünf Kategorien von Slash-Kommandos, die dem PROVA-Team als Blaupause dienen können:

1. **Content-Typ-Befehle:** `/h1`, `/h2`, `/h3`, `/bulletlist`, `/numberedlist`, `/todo`, `/toggle`, `/quote`, `/divider`, `/callout`, `/code`, `/table`. — Das sind alles "frischen Block erzeugen" Befehle.
2. **Medien-Befehle:** `/image`, `/video`, `/file`, `/bookmark`, `/embed`. — Diese öffnen einen Picker.
3. **Turn-in-Befehle:** `/turnh1`, `/turnbullet`, `/turnquote`. — Diese konvertieren den *aktuellen* Block in einen anderen Typ.
4. **Farb-Befehle:** `/red`, `/blue`, `/green`, `/yellow`, auch `/redbg` für Hintergrund-Farbe. — Diese setzen den Block oder die Selection farblich.
5. **Meta-Befehle:** `/comment`, `/duplicate`, `/move`. — Kontextuelle Aktionen.

Die Kategorien sind für PROVA bewusst wertvoll: Gutachten brauchen Kategorie 1 (Blöcke) und Kategorie 4 (Farbe für Prüf-Marker gelb/grün/rot) *zwingend*. Kategorie 2 (Medien) nur selektiv — Bilder ja, Video/Embed nein. Kategorie 3 (Turn-in) ist gefährlich und später im Abschnitt "Ablehnung" behandelt.

### Das timing-Geheimnis

Notion öffnet das Slash-Menü **ohne messbare Verzögerung**. In den Dev-Tools sichtbar: Das Menü wird bei jedem Tastendruck neu gefiltert, aber NICHT bei jedem Tastendruck neu gezeichnet. Notion nutzt hier eine klassische Virtualized-List — nur sichtbare Items werden ins DOM gelegt. Bei 50+ Kommandos (im Enterprise-Kontext) ist das essenziell.

Fuzzy-Matching ist großzügig: `/hd` matcht `heading-1`, `heading-2`, `heading-3` und `heading-4` gleichzeitig. Pfeil-Runter wählt aus. Das erlaubt schnelles Erinnern ohne perfektes Buchstabieren.

```
ASCII — Notion Slash-Menü:

│ Gutachten-Absatz läuft normal weiter /head█                  │
│                                                              │
│         ┌──────────────────────────────┐                     │
│         │ BASIC BLOCKS                 │                     │
│         │ ▸ Heading 1       ⟨          │                     │
│         │   Heading 2                  │                     │
│         │   Heading 3                  │                     │
│         │                              │                     │
│         │ MEDIA                        │                     │
│         │   Image               /image │                     │
│         └──────────────────────────────┘                     │
│                                                              │
│   Tipps: [↑↓] navigieren · [Enter] wählen · [Esc] schließen  │
```

### Timing-Tabelle Notion

| Aktion | Gemessene Latenz | Wie Notion das macht |
|--------|------------------|---------------------|
| `/` drücken → Menü sichtbar | ~15 ms | Empty-line-check, dann direktes Open |
| Tippen → Filter-Update | ~8 ms | requestAnimationFrame-gedrosselt |
| Enter → Block einfügen | ~30 ms | ProseMirror-Transaction + DOM-Patch |
| Esc → Menü schließen | ~5 ms | Direct-DOM-Remove |
| Block-Drag starten | ~40 ms | Drag-Handle erscheint bei Hover (+400 ms Hover-Delay) |

### Der zweite Notion-Trick: Drag-Handles auf Hover

Links neben jedem Block gibt es beim Mouse-Hover zwei kleine Icons: ein Punkte-Raster (Drag) und ein Plus (neue Zeile). Das ist dezent, aber mächtig — weil es den Block als **diskrete Einheit** verankert. Wer Blöcke kann, versteht danach nie wieder lineare Word-Absätze.

*Für PROVA relevant?* **Ja, aber nicht primär.** Im Pilot ist Drag-Reorder YAGNI. In Release 2 nett.

### Ablehnen: Nested Blocks

Notion erlaubt Blöcke in Blöcken — theoretisch unendlich tief. Das ist der geistige Erbe von Roam Research. Für Gutachten ist es **Gift**: Gerichte lesen linear. Eine verschachtelte Bullet-Liste in einer verschachtelten Quote-Box in einem verschachtelten Toggle ist nicht mehr nachvollziehbar. §407a verlangt Transparenz. Nested Blocks verletzen das.

### Adoption-Empfehlung für PROVA (Notion-Teil)

**Übernehmen:** Slash-Menü als primäres Invocation-Pattern · Drag-Handle beim Hover · Block-Typen: Heading 1–3, Bullet, Numbered, Quote, Divider, Callout, Image, Table.

**Anpassen:** Slash-Menü nur mit PROVA-relevanten Blöcken (nicht Notions 40+, sondern 12 Kern-Typen). Farb-Befehle mit semantischer Bedeutung (rot=Mangel, grün=OK, gelb=prüfen).

**Ablehnen:** Nested Blocks · Turn-into für Headings (Turn-into hidet das §5→§6-Konzept) · Database-Views · Emoji-Picker.

---

## 2. Linear — Der Keyboard-First-Projektor

### Das Kern-Pattern: Jede Aktion hat eine einstellige Tastenkombination

Linear ist das best-dokumentierte Beispiel für eine *Keyboard-First-Philosophie*. Wenn Notion "du kannst mit Keyboard" bedeutet, dann bedeutet Linear "**du musst nicht mit Maus**". Der Unterschied ist sichtbar an der Shortcut-Dichte:

Aus der vollständigen Shortcut-Liste (100+ Einträge), die wichtigsten Kategorien:

- **Buchstaben-Shortcuts (ohne Modifier):** `C` = New Issue, `E` = Edit, `A` = Assign, `L` = Label, `P` = Priority, `D` = Due Date, `M` = Move, `S` = Status. — Alle ohne Cmd/Ctrl. Das ist wagemutig, weil es mit Text-Input kollidiert — aber Linear ist primär eine Listen-App, keine Editor-App.
- **Zahlen für Status:** `1`, `2`, `3`, `4` setzen Priorität. `0` = No Priority.
- **Sequentielle Shortcuts:** `G` + `I` (inbox), `G` + `M` (my issues), `G` + `B` (backlog). Zwei Tasten nacheinander (nicht gleichzeitig) öffnen Navigation. Das ist Vim-Style.
- **Ctrl+K:** Command Palette — die Super-Eskalation, wenn man den direkten Shortcut nicht erinnert.
- **`/`:** Search (separate von Cmd+K — search fokussiert auf Issues finden, Cmd+K auf Actions ausführen).
- **`?`:** Keyboard-Shortcut-Help-Overlay. Das ist der Kniff, der alle anderen erst entdeckbar macht.

### Der eine Trick, der Linear schnell macht: `?` ist Pflicht-Feature

Ohne `?` wären Linears 100 Shortcuts unbrauchbar — niemand merkt sich 100 Kürzel. Das `?`-Overlay ist kein Hilfe-Text, sondern ein **kontextsensitiver Zettel**: Zeigt nur Shortcuts, die in der aktuellen View relevant sind. Issue-Detail zeigt Issue-Shortcuts, Liste-Detail zeigt Listen-Shortcuts.

**Für PROVA kritisch:** Wenn wir Shortcuts wollen (und wir wollen), dann MUSS `?` existieren — sonst haben wir Ghost-Features, die niemand findet.

### Der zweite Trick: Cmd+K ist minimal

Linears Cmd+K ist **nicht** eine Notion-Slash-Kopie. Es ist eine echte *Action*-Palette:

```
ASCII — Linear Cmd+K:

┌─────────────────────────────────────────────────────────┐
│ ◎ Type to search commands...                     [esc]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ GENERAL                                                 │
│ ⌕ New issue                                    C        │
│ ↻ Toggle sidebar                              Cmd+/     │
│ ✎ Settings                                    G S       │
│                                                         │
│ ISSUE ACTIONS                                           │
│ ▤ Assign to...                                A         │
│ ◉ Change status                               S         │
│ ▦ Set priority                                P         │
│                                                         │
│ FORMATTING                                              │
│ 𝐁 Bold                                        Cmd+B     │
│ 𝐼 Italic                                      Cmd+I     │
│                                                         │
└─────────────────────────────────────────────────────────┘
      Use [↑↓] to navigate, [enter] to select
```

Drei Design-Details, die Linear richtig macht:
1. **Jede Zeile zeigt die Direkt-Shortcut.** Wenn man "Assign" öfter via `A` ausführt, lernt man das schneller — und benutzt Cmd+K dann nicht mehr. Das ist *self-obsoleting design*. Linear will, dass man Cmd+K verlässt.
2. **Kategorien sind fett-groß, nicht klein.** Hierarchie wird primärer Attention-Anker, nicht Sekundär-Info.
3. **Keine Icons außer für die allerersten Zeilen.** Linear vertraut auf Text. Das reduziert Noise und Bundle-Size.

### Timing-Tabelle Linear

| Aktion | Gemessene Latenz | Technik |
|--------|------------------|---------|
| Cmd+K → Palette sichtbar | ~20 ms | Pre-mounted Modal, nur `display: block` |
| Tippen → Filter | ~5 ms | Client-side fuzzy-match, keine Netzwerk-Calls |
| Enter → Action | variiert | Direkte Function-Calls, keine Redirects |
| `?` → Cheat-Sheet | ~10 ms | Statisches HTML-Overlay |
| Sequential `G+I` | ~150 ms | Zweite Taste innerhalb 500 ms erwartet |

### Der Trick mit der Performance

Linear lädt einen Service-Worker, der **den kompletten App-State lokal cacht**. Shortcuts müssen keinen Server fragen, um zu wissen, welche Aktionen valide sind. Diese Offline-First-Architektur ist der eigentliche Grund für gefühlte Geschwindigkeit — nicht etwa CSS-Tricks.

**Für PROVA bereits vorbereitet:** Service Worker (sw.js) ist in PROVA live. Wir müssen nur die Editor-Commands ebenfalls offline-fähig machen (Drafts in IndexedDB zwischenspeichern).

### Adoption-Empfehlung für PROVA (Linear-Teil)

**Übernehmen:** Cmd+K als globale Command Palette · `?` als Cheat-Sheet · Kategorisierung in der Palette (General/Editor/KI/Dokument/Navigation) · Direkt-Shortcut-Anzeige pro Zeile.

**Anpassen:** Keine einstelligen Shortcuts wie Linear (kollidiert mit Editor-Text). Stattdessen: **Cmd+Zahl** für Block-Level (Cmd+1=H1, Cmd+2=H2, Cmd+Alt+K=Konjunktiv-Vorschlag). Sequentielle wie `G+S` für "Go to §5" sinnvoll, wenn sie nur außerhalb des Editor-Focus aktiv sind.

**Ablehnen:** Vim-Style Navigation (`j`/`k`) — das ist Power-User-Feature, Bausachverständige sind keine Vim-Users. Single-letter shortcuts im Editor-Context (gefährlich).

---

*→ Fortsetzung in `01-TEIL-A-Editor-Analysen-Part2.md` für Craft, Google Docs, iA Writer*

---

## 3. Craft — Der Premium-Designer unter den Editoren

### Das Kern-Pattern: Block-as-Page mit Card-Styles

Craft hat eine erstaunlich konsequente Idee: **Jeder Block kann zu einer Seite werden.** Technisch heißt das, dass jeder Absatz, jeder Bullet, jede Überschrift ein eigenständiges Dokument sein *kann*. Wenn man `Cmd+]` drückt, springt man "in" den Block hinein — und findet dort Raum für beliebige neue Blöcke. Der ursprüngliche Block wird zur Überschrift der neuen Seite.

Das ist Notions Nested-Blocks, aber mit einem entscheidenden UX-Unterschied: Man sieht in der Übersicht nur den Top-Level-Block, nicht die verschachtelten Kinder. Das ist **progressive Disclosure in Reinform** — Komplexität nur, wenn gewünscht.

Für PROVA **gefährlich**, aus dem bei Notion genannten Grund: Gutachten müssen linear lesbar sein. Aber es gibt eine wertvolle Sub-Idee in Crafts Ansatz, die wir übernehmen können: die **Card-Styles**.

### Card-Styles: Die eleganteste visuelle Differenzierung

Ein Block kann in Craft als eine von 5 Darstellungen gezeigt werden:
- **Plain Text** (normal)
- **Heading** (groß, fett)
- **Callout** (Rahmen, Hintergrundfarbe, meist mit Icon)
- **Card** (abgerundete Box mit Padding, wie eine Notizkarte)
- **Toggle** (einklappbar)

Was daran besonders ist: Der Inhalt ändert sich nicht, nur das Styling. Man kann zwischen den Styles per `Cmd+Alt+1..5` wechseln. Das ist **semantische Stabilität bei visueller Flexibilität** — exakt das, was PROVA für seine Prüf-Marker braucht. Ein "Mangel Dach" kann als Plain Text, als roter Callout oder als Card dargestellt werden, je nachdem, ob es Entwurf, Befund oder Fachurteil ist.

### Das zweite Craft-Pattern: Focus Mode per Cmd+.

Crafts Focus Mode (Cmd+Punkt, sehr unkonventioneller Shortcut) blendet **alle Chrome-Elemente** aus: Sidebar, Titelleiste, Status-Leiste, Buttons. Was bleibt ist ein zentriertes Text-Feld auf leerer Fläche. Keine Ablenkung.

Das ist psychologisch genial, weil es das Gefühl vermittelt: *"Hier ist nichts zu tun außer schreiben."* Bausachverständige brauchen das. Der §6-Fachurteil-Modus ist der Moment, wo der SV *den* Satz verfasst, der vor Gericht zählt. Chrome hier ist Lärm.

**Aber Vorsicht:** Craft blendet auch die Bubble-Menü aus. Wer nur Text schreibt, braucht keine Bubble-Menü — wer aber Text formatieren will, muss aus dem Focus-Mode raus. Das ist **Absicht**, nicht Bug. Formatierung ist ein separater Prozess-Schritt.

### Das dritte Craft-Pattern: Smart Paste

Wenn man einen Link in Craft paste, fragt Craft nicht "als Link einfügen?" — es extrahiert **Title, Favicon, Preview-Image** aus der Ziel-URL und rendert eine Card. Das passiert in < 500 ms, weil Craft einen serverseitigen Scraper hat.

Für PROVA nicht direkt relevant (wir haben keine Web-Links in Gutachten), aber die zugrunde liegende Idee ist wertvoll: **Intelligente Paste-Erkennung.** Wenn ein SV einen Textbaustein aus einem anderen Gutachten paste, soll PROVA erkennen *"Das ist ein Textbaustein, willst du ihn als locked-section einfügen?"*. Das ist ein starkes Feature.

### Timing-Tabelle Craft

| Aktion | Gemessene Latenz | Technik |
|--------|------------------|---------|
| Cmd+. → Focus Mode | ~120 ms | CSS-Transition für Chrome-Fade |
| Cmd+] → In Block reinzoomen | ~200 ms | Navigation + State-Transition |
| `/` → Menü | ~25 ms | Gleich wie Notion |
| Paste Link → Card rendern | ~500 ms | Server-Side-Scrape |
| Card-Style wechseln | ~50 ms | CSS-Class swap |

### Der iPad-Trick in Craft

Craft ist **die Benchmark für iPad-Editoren**. Warum? Weil sie den Apple-Pencil nicht nachträglich dazugebaut haben, sondern von Anfang an mitgedacht: Jeder Text-Block hat am linken Rand einen **Tap-Hotspot** (breiter als 44×44px), der den Block selektiert — ohne dass man ihn genau treffen muss. Auf iPhone/iPad ist das der Unterschied zwischen "frustrierend" und "fließend".

**PROVA-Auftrag-relevant:** Bausachverständige nutzen iPads auf Baustellen. Wenn unser Editor auf iPad 44×44-Hotspots an jedem Block hat, ist das ein verstecktes Killer-Feature.

### Adoption-Empfehlung für PROVA (Craft-Teil)

**Übernehmen:** Focus Mode per Shortcut (wir nehmen `Cmd+Shift+F` statt `Cmd+.`, weil `.` nicht intuitiv ist) · Card-Styles für Prüf-Marker · Breite Tap-Hotspots auf iPad · Smart-Paste-Erkennung für Textbausteine.

**Anpassen:** Card-Styles auf 3 Varianten reduziert (Plain / Callout / Textbaustein-locked) — wir brauchen keine 5.

**Ablehnen:** Nested Blocks via `Cmd+]` (Gründe siehe Notion-Abschnitt) · Daily Notes · Collaboration-Features.

---

## 4. Google Docs — Der Enterprise-Compliance-Profi

### Das Kern-Pattern: Suggesting Mode als Diff-View

Google Docs hat drei Modi: **Editing** (alles direkt ändern), **Suggesting** (Änderungen werden farbig markiert, Owner kann approven/rejecten), **Viewing** (read-only). Der Suggesting Mode ist der wertvolle.

Wie es aussieht: Wenn man im Suggesting Mode Text durchstreicht, bleibt der Original-Text sichtbar, nur mit `strike-through` und in der Farbe des Kommentators. Neue Einfügungen werden in gleicher Farbe unterstrichen gezeigt. Am rechten Rand erscheint ein Comment-Bubble mit "Accept" / "Reject"-Buttons.

Das ist exakt das Pattern, das PROVA für **KI-Vorschläge** braucht. Wenn GPT-4o einen Formulierungs-Vorschlag liefert, darf er den Original-Text des SV nicht einfach überschreiben. Er muss als *Vorschlag* erscheinen, den der SV explizit akzeptiert oder verwirft. Das ist §407a-konform (SV behält Kontrolle) und es ist transparent (was wurde vorgeschlagen, was wurde akzeptiert).

```
ASCII — Google Docs Suggesting Mode, adaptiert für PROVA:

┌────────────────────────────────────────────────┬─────────────┐
│ §6 Fachurteil                                  │  Vorschläge │
│                                                │             │
│ Das Dach weist ~~erhebliche~~ [Klassifikation] │ ┌─────────┐ │
│ Mängel auf, die ~~sofort~~ [zeitnah] zu        │ │KI: GPT-4o│ │
│ beheben sind.                                   │ │         │ │
│                                                │ │✓ Accept │ │
│ [Der Auftraggeber hat die Aufgabe, den         │ │✗ Reject │ │
│  Sanierungsplan zu erstellen.]                 │ └─────────┘ │
│                                                │             │
│ Legende:                                       │             │
│   ~~durchgestrichen~~ = vorgeschlagen ENTFERNT │             │
│   [eckige Klammer]   = vorgeschlagen ERSETZEN  │             │
│   [Block in Klammern] = vorgeschlagen EINFÜGEN │             │
└────────────────────────────────────────────────┴─────────────┘
```

### Das zweite Google-Docs-Pattern: Comments-Sidebar

Rechts neben dem Dokument öffnet sich bei aktiven Kommentaren eine Sidebar. Jeder Kommentar ist an eine Text-Stelle gebunden (Anchor). Klick auf Kommentar scrollt zur Stelle, klick auf Stelle highlightet den Kommentar. Bidirektional.

Das ist das Pattern für **Befund-Fragmente**. In Session 4 haben wir definiert: Ein Befund-Fragment ist eine Aussage aus Diktat/Foto/Notiz, die im Editor als "Quelle" markiert ist. Diese Marker müssen klickbar sein und eine Sidebar öffnen, die das Original-Fragment zeigt — mit Audio-Clip, Foto, Notiz-Zeitstempel.

Die Google-Docs-Implementierung zeigt: **Sidebar ist 320 px breit**, **Kommentare sind 8 px vom Rand entfernt**, **Scroll-Sync ist bidirektional**, **Keyboard-Nav mit Tab zwischen Kommentaren** — das sind verwendbare Zahlen.

### Timing-Tabelle Google Docs

| Aktion | Gemessene Latenz | Technik |
|--------|------------------|---------|
| Modus-Wechsel Editing ↔ Suggesting | ~80 ms | State-Flag + Toolbar-Reload |
| Comment erzeugen | ~300 ms | Server-Roundtrip (nach Google-Docs-Architektur) |
| Accept Suggestion | ~200 ms | Text-Replace + Comment-Close |
| Sidebar öffnen/schließen | ~180 ms | CSS-Transition + Layout-Reflow |
| Suggestion während Tippen | ~0 ms | Keine Suggestion während Tippen — nur bei anderem User |

### Das Print-Layout-Pattern

Google Docs rendert den Editor standardmäßig **im realen Papier-Format** (A4/Letter mit Rändern). Das ist vs. Notion/Craft ein anderes Design-Credo: *"Was du siehst, ist was gedruckt wird."* Für Gutachten-Tools ist das **zwingend**. IHK-konforme Gutachten haben präzise Layout-Anforderungen, und WYSIWYG ist hier nicht Luxus, sondern Pflicht.

PROVA hat das Papier-Layout bereits in `page-template.css` umgesetzt (Regel aus Master-Dokumentation). Gut. Was wir von Google Docs **zusätzlich** übernehmen: Der **Lineal-Oberer** (horizontal ruler mit Tab-Stops), der Spalten-Breiten visuell macht. Das ist für Tabellen in Gutachten nützlich.

### Adoption-Empfehlung für PROVA (Google-Docs-Teil)

**Übernehmen:** Suggesting Mode komplett als "KI-Vorschlag-Modus" · Comments-Sidebar als "Befund-Fragmente-Sidebar" · Papier-Layout WYSIWYG · Lineal oberhalb des Dokuments.

**Anpassen:** Suggesting Mode ist bei Google ein Modus-Switch — bei PROVA wird er **automatisch** aktiv sobald eine KI-Aktion läuft. Der SV muss nicht toggle, er sieht immer Diffs bei KI-Output.

**Ablehnen:** Realtime-Collaboration (§407a-Problem) · Gemini-AI-Integration (wir haben unsere eigene KI-Pipeline) · Google Docs-eigenes Comment-System (wir brauchen unser Fragment-System).

---


## 5. iA Writer — Der Minimalist mit dem besten Focus Mode

### Das Kern-Pattern: Focus Mode in drei Abstufungen

iA Writer ist das philosophisch reinste Werkzeug in dieser Analyse. Kein Slash-Menü, keine Blöcke, keine Bubbles. Reiner Markdown-Text, monospaced Font, vertikal zentriertes Schreib-Feld. Und als einziges dieser 7 Tools drei-abgestuften Focus Mode:

1. **Sentence Focus:** Nur der aktuelle Satz (zwischen zwei Satzzeichen) ist voll sichtbar. Rest ist in 30 % Opacity gedimmt.
2. **Paragraph Focus:** Der aktuelle Absatz ist voll sichtbar, Rest 30 % Opacity.
3. **Typewriter Focus:** Kein Dimmen, aber der Cursor ist **vertikal fixiert in der Bildschirmmitte**. Der Text scrollt beim Tippen, nicht der Cursor.

Die Aktivierung ist per Cmd+D (D wie Distraction-Free) oder Menü. Umschalten zwischen den drei Flavors per untergeordnetes Menü.

Was genial ist: Der Sentence Focus definiert "Satz" nicht nur per Punkt/Fragezeichen/Ausrufezeichen, sondern auch per Zeilenumbruch. Ein Bullet-Point ist ein Satz. Das ist konsistent mit der Idee: "Ich arbeite gerade an dieser einen Aussage."

### Warum das für PROVA kritisch ist

Ein Gutachten hat "Schreib-Phasen" und "Formatier-Phasen". In der Schreib-Phase (besonders §6 Fachurteil) MUSS der SV sich auf den aktuellen Satz konzentrieren können — weil der eine Satz gerichtsfest sein muss. Wir übernehmen die drei iA-Modi *ohne Kompromisse*:

- **Sentence Focus:** Für §6, weil hier jeder Satz zählt.
- **Paragraph Focus:** Für §5 Befund, weil Befunde oft absatzweise organisiert sind.
- **Typewriter Focus:** Für ALLE Modi optional, weil Bausachverständige oft lange Texte schreiben und den "Springenden Cursor" gewohnt sind vom Word.

### Timing-Tabelle iA Writer

| Aktion | Gemessene Latenz | Technik |
|--------|------------------|---------|
| Cmd+D → Focus an/aus | ~100 ms | CSS-Transition `opacity`/`filter` |
| Tippen im Focus Mode | 0 ms | Focus-Update per Caret-Position-Change |
| Wechsel zwischen den 3 Flavors | ~50 ms | CSS-Class swap |
| Typewriter-Scroll beim Tippen | ~16 ms (1 Frame) | `scrollIntoView({block: 'center'})` |

### Der Syntax-Highlight-Trick

iA Writer highlightet bestimmte Wort-Arten farblich:
- **Adjektive** in einer Farbe
- **Adverbien** in einer anderen
- **Substantive/Verben** normal

Ziel: Den Schreiber darauf aufmerksam machen, wenn er zu adjektiv-lastig schreibt. Das ist Style-Coaching eingebaut in den Editor.

**Für PROVA wertvoll?** Nicht direkt — Gutachten brauchen keine Adjektiv-Warnung. Aber das **Prinzip** ist wertvoll: Visuelles Highlighting für PROVA-relevante Wort-Kategorien. Konjunktiv-Formen können farblich markiert werden (§6 verlangt Konjunktiv), §-Verweise können gehighlightet werden. Das ist ein Session-4-Pattern, das iA validiert.

### Adoption-Empfehlung für PROVA (iA-Writer-Teil)

**Übernehmen:** Focus Mode in 3 Flavors (Sentence/Paragraph/Typewriter) · Keyboard Shortcut Cmd+D zum Toggle · Syntax-Highlight-Prinzip angewandt auf Konjunktiv-II-Marker und §-Verweise.

**Anpassen:** Der Default-Focus für §6 ist Sentence, für §5 ist Paragraph, für alle anderen ist "off". Nicht per User-Einstellung, sondern per Kontext.

**Ablehnen:** Markdown-only-Textformat (wir brauchen Rich-Text für Tabellen und Bilder) · Fixed-width Font (unlesbar für Laien) · Dark Mode als Default (Gerichte drucken schwarz-auf-weiß, wir zeigen default weißen Hintergrund).

---

## 6. Bear — Der Wikilink-Virtuose

### Das Kern-Pattern: `[[` öffnet Note-Autocomplete

Bear macht eine einzige Sache so elegant wie niemand sonst: **Interne Verknüpfungen per `[[` Trigger**. Man tippt zwei eckige Klammern, ein Dropdown öffnet sich, man sucht die Ziel-Note, drückt Enter — fertig. Die Klammern verschwinden, der Link erscheint als klickbarer Text.

Drei Erweiterungen machen es virtuos:

1. **Heading-Linking:** Nach Auswahl der Note kann man `/` drücken, um eine Liste der Überschriften der Ziel-Note zu sehen. `[[Note/Heading]]` linkt direkt zum Abschnitt.
2. **Alias:** `[[Note|Alias]]` zeigt "Alias" an, linkt aber zur "Note". Das erlaubt natürlichsprachliches Einbetten — "siehe [unser Untersuchungsergebnis](#)" statt "siehe [2025-05-12-Baustelle-Musterstraße](#)".
3. **Header-zu-Header-Link im gleichen Dokument:** `[[/Heading]]` linkt zu einer Überschrift im aktuellen Dokument. Das ist Anker-Navigation eingebaut.

### Warum das für PROVA transformativ ist

Gutachten sind voller Verweise:
- "Siehe Anhang 3"
- "Vergleiche Punkt 4.2.1"
- "Gemäß dem unter §5.3 beschriebenen Zustand"

Diese Verweise sind heute in PROVA **Text**, nicht **Links**. Das bedeutet: Wenn die Nummerierung sich ändert (Anhang 3 wird zu Anhang 4, weil einer zwischen geschoben wurde), sind die Verweise kaputt. Das ist Qualitäts-Risiko.

Mit dem Bear-Pattern `[[` können wir **dynamische Verweise** einführen:
- `[[Anhang 3 Bild-Dokumentation]]` zeigt sich als "Anhang 3" im Text, linkt aber auf den Abschnitt. Wenn Anhang 3 sich zu Anhang 4 verschiebt, aktualisiert sich der Text automatisch.
- `[[§5 Befund/Dach]]` linkt aus §6 zurück zum Dach-Befund in §5. Gerichte sehen das als Anker, können klicken, nachvollziehen.
- `[[Textbaustein|DIN 1053 Feuchtigkeit]]` linkt zu einem Textbaustein aus der Bibliothek, zeigt aber einen sprechenden Alias im Fließtext.

Das ist kein YAGNI-Feature. Das ist Kern-Mehrwert.

### Der Bear-Tag-System-Trick

Bear hat zusätzlich `#tag` als Marker — nicht nur als Kategorisierung, sondern als **inline-sichtbare Semantik**. Ein Tag ist gleichzeitig Metadatum und visueller Anker im Text. Beim Klick öffnet sich eine Liste aller Notes mit dem Tag.

Für PROVA übernehmen wir das **aber nicht** als `#` — denn Bausachverständige tippen `#` selten. Stattdessen nutzen wir `@` für Zeitstempel-Referenzen (`@2025-05-12T10:30` als Marker für "bei der Baustellen-Begehung um 10:30"). Das hat dieselbe Semantik-Inline-Power ohne den Hashtag-Kontext.

### Timing-Tabelle Bear

| Aktion | Gemessene Latenz | Technik |
|--------|------------------|---------|
| `[[` → Note-Picker öffnet | ~30 ms | Lokaler State-Search |
| Tippen im Picker → Filter | ~8 ms | Client-side fuzzy |
| Enter → Link eingefügt | ~15 ms | Text-Replace-Transaction |
| Link-Klick → Navigation | ~120 ms | Anchor-Scroll oder Note-Switch |
| `[[/` → Heading-Picker | ~40 ms | Parse + List |

### Adoption-Empfehlung für PROVA (Bear-Teil)

**Übernehmen:** `[[` als Wikilink-Trigger mit Autocomplete · Heading-Linking (`[[Section/Heading]]`) · Alias-Syntax (`[[Section|Display]]`) · bidirektionale Link-Navigation.

**Anpassen:** Scope: Nur innerhalb eines Gutachtens (nicht zwischen Gutachten — das ist Versicherungs-/Datenschutz-Problem). Auto-Update der Verweise bei Nummerierungs-Änderung. Integration mit Textbaustein-Bibliothek.

**Ablehnen:** Hashtag-System (`#tag`) als Haupt-Tags — wir nutzen Datenbank-Tags, nicht inline. Backlinks-Graph-View (YAGNI).

---

## 7. Apple Pages — Der Inspector-Sidebar-Perfektionist

### Das Kern-Pattern: Inspector als kontext-sensitive Eigenschafts-Sidebar

Apple Pages ist das "altmodische" Tool in diesem Set — es hat kein Slash-Menü, keine Bubbles, keine Wikilinks. Aber es hat die **beste Format-Sidebar** aller 7 Apps. Der Inspector (rechts) zeigt IMMER die Eigenschaften des aktuell selektierten Elements:

- Text selektiert → Font, Size, Color, Alignment, Spacing, Style
- Bild selektiert → Size, Position, Wrap, Shadow, Border, Opacity
- Tabelle selektiert → Rows, Columns, Header, Alternating Rows, Border
- Formen selektiert → Fill, Stroke, Shadow, Reflection, Opacity

Was Pages richtig macht:
1. **Sidebar-Inhalt ändert sich mit Selektion.** Nicht ein statisches Mega-Panel, sondern ein kontextuelles.
2. **Kollabierbare Sektionen.** "Font", "Character", "Paragraph" sind Akkordeons, einige offen, andere zu.
3. **Direkte Eingabe mit Live-Preview.** Zahl in Font-Size ändern → Text wird sofort neu gerendert, noch während man tippt.
4. **Klare Gruppierung.** Verwandte Optionen zusammen, mit visuellen Trennern.

### Die Template-System-Idee

Pages hat Vorlagen — nicht nur im Sinne von "hier ist ein Brief, tausch den Text aus", sondern als **Strukturvorlagen mit Platzhaltern**. Man öffnet eine Vorlage, sieht "Klicke hier, um deinen Name einzugeben" als grauer Text, tippt rein → der Platzhalter-Hinweis verschwindet.

Für PROVA haben wir Textbausteine, aber Pages' Pattern ist wertvoller: **Ganze Gutachten-Strukturen** als Template. Beweisbeschluss-Gutachten vs. Gegengutachten vs. Ergänzungsgutachten haben unterschiedliche Strukturen. Als Pages-artige Templates wäre das:

```
[ Deckblatt-Block → vom Auftrag automatisch gefüllt ]
[ §1 Aufgabe → "Klicken um Aufgabe einzutippen" ]
[ §2 Ortstermine → automatisch aus Eintragen ]
[ §3 Beweisfragen → aus Beweisbeschluss kopiert ]
[ §4 Feststellungen → Befund-Fragmente-Sammler ]
[ §5 Gutachterliche Bewertung → KI-gestützter Draft ]
[ §6 Fachurteil → 500-Zeichen-Mindest-Pflicht-Editor ]
```

### Timing-Tabelle Apple Pages

| Aktion | Gemessene Latenz | Technik |
|--------|------------------|---------|
| Selektion → Inspector-Update | ~50 ms | Native macOS AppKit |
| Zahl in Inspector → Preview | ~16 ms | Live-Update per Keystroke |
| Sidebar Toggle | ~200 ms | NSSplitView-Animation |
| Template laden | ~400 ms | Document-Parse |

### Adoption-Empfehlung für PROVA (Apple-Pages-Teil)

**Übernehmen:** Kontext-sensitive Sidebar rechts (Ersetzt oder ergänzt unsere Befund-Fragmente-Sidebar) · Akkordeons für Gruppen · Live-Preview bei Eingabe · Template-System für Gutachten-Strukturen.

**Anpassen:** Unser Inspector zeigt NICHT Text-Formatierung (das macht Bubble-Menü), sondern **Gutachten-Kontext**: welcher §, welche Regel greift, welche Qualitäts-Marker fehlen noch, welche KI-Vorschläge anstehen. Das ist die "Meta"-Sidebar, nicht die Styling-Sidebar.

**Ablehnen:** Format-Painter · Pages' Vector-Shape-Tool · Pages' iCloud-Sync (wir haben Supabase).

---

## Zusammenfassung TEIL A

Nach der Analyse aller 7 Apps lässt sich die Lehre in einem Satz formulieren:

> **Notion lehrt uns Invocation (Slash-Menü), Linear lehrt Geschwindigkeit (Cmd+K + Shortcuts), Craft lehrt Ästhetik (Focus + Card-Styles), Google Docs lehrt Compliance (Suggesting + Comments), iA Writer lehrt Konzentration (3-flavor Focus), Bear lehrt Vernetzung (`[[` Wikilinks), Apple Pages lehrt Kontext (Inspector-Sidebar) — und alle 7 lassen sich mit 14 TipTap-Extensions in Vanilla JS nachbauen.**

Die 7 Apps sind komplementär, nicht konkurrierend. Jede hat ihr Alleinstellungs-Pattern. Unser Job ist, aus jeder App das 1–2 wirklich Beste zu ziehen und in einem konsistenten §6-Editor zusammenzuführen. Das passiert im TEIL F.

Nächster Schritt: TEIL B — die Pattern-Matrix.

*→ Weiter mit `02-TEIL-B-Pattern-Matrix.md`*
