# TEIL D — Entscheidungs-Matrix: 1:1 adopt / adapt / drop

**Zweck:** Alle 35 Patterns aus TEIL B noch einmal tabellarisch, aber diesmal *mit Begründung* für jede Entscheidung. Das ist die Arbeits-Tabelle für die Sprint-Planung. Jeder Eintrag ist so formuliert, dass Marcel oder ein Dev sofort verstehen: "Warum machen wir das so?"

**Kategorisierung:**
- **1:1** = Übernehmen wie in der Vorlage. Keine Anpassung nötig, keine Gründe gegen 1:1-Copy.
- **ADAPT** = Konzept übernehmen, aber PROVA-spezifisch ändern (meist wegen §407a, DSGVO oder Gutachten-Kontext).
- **DROP** = Nicht übernehmen. YAGNI, Widerspruch zu Doktrin, oder Bundle-Kosten zu hoch.

---

## ENTSCHEIDUNGS-TABELLE

| # | Pattern | Entscheidung | Begründung (ein Satz) |
|---|---------|:------------:|----------------------|
| A1 | Slash-Menü `/` | **1:1** | Das beste Invocation-Pattern der Editor-Welt, kein Grund anders zu machen. |
| A2 | Bubble-Menü (Craft-Stil) | **1:1** | Nur bei Text-Selection, nicht bei Cursor-Click — Craft ist Referenz. |
| A3 | Floating-Menü auf leerer Zeile | **1:1** | Einfacher Plus-Button, der das Slash-Menü öffnet. |
| A4 | Cmd+K Command Palette | **ADAPT** | Linears Design 1:1 übernommen, aber Command-Liste ist PROVA-spezifisch (KI-Aktionen, Gutachten-Nav). |
| A5 | `?` Cheat-Sheet | **1:1** | Linears Overlay-Stil, gleiche Shortcut-Taste, nur unsere Commands. |
| A6 | Rechts-Klick-Menü | **ADAPT** | Nur für nicht-text Elemente (Tabellen, Bilder). Im Text-Kontext stört es die Bubble-Menü. |
| A7 | Sequential Shortcuts (G+I) | **DROP** | Nur für Power-User sinnvoll; Bausachverständige sind keine Vim-User. |
| A8 | Single-letter Shortcuts (C, A, S) | **DROP** | Kollision mit Text-Input; Linear kann das nur, weil es Listen-App ist. |
| A9 | Primär-Toolbar oben | **DROP** | Widerspricht Toolbar-max-5-Regel aus Session 4. |
| A10 | Inspector-Sidebar | **ADAPT** | Konzept übernommen (kontext-sensitiv), aber Inhalt ist Gutachten-Meta, nicht Styling. |
| B1 | Heading H1–H3 | **1:1** | Standard-Block, vom Starter-Kit geliefert. |
| B2 | Bullet/Numbered Lists | **1:1** | Standard-Block, vom Starter-Kit geliefert. |
| B3 | Quote/Zitat | **1:1** | Standard-Block, aber in Gutachten für wörtliche Zitate (z.B. aus Beweisbeschluss) wertvoll. |
| B4 | Divider/Trennlinie | **1:1** | Für visuelle Gliederung zwischen §-Blöcken. |
| B5 | Callout (rot/gelb/grün) | **ADAPT** | Notion-Callout als Basis, aber mit fester 3-Farben-Palette als Prüf-Marker. |
| B6 | Code-Block | **DROP** | Bausachverständige schreiben keinen Code. |
| B7 | Tabelle mit Header-Row | **1:1** | Pages-Qualität anstreben; TipTap-Table-Extension kann das. |
| B8 | Bild mit Caption | **ADAPT** | Basis-Image-Extension + Foto-Metadaten (EXIF, Zeitstempel, Baustellen-Ort). |
| B9 | Video-Embed | **DROP** | Gutachten sind gedruckte Dokumente; Video im PDF = Video-Symbol, kein Content. |
| B10 | Math/LaTeX | **DROP** | SVs schreiben Berechnungen als Text, nicht LaTeX. YAGNI. |
| B11 | Toggle/Collapsible | **DROP** | Print kennt kein "expanded" — ungeeignet für PDF-Export. |
| B12 | Nested Blocks | **DROP** | Verletzt §407a-Nachvollziehbarkeit; flache Struktur gewinnt. |
| C1 | Bold/Italic/Underline | **1:1** | Standard-Markup. |
| C2 | Strikethrough | **1:1** | Für Korrekturen innerhalb des Editors sinnvoll. |
| C3 | Highlight (gelb) | **ADAPT** | Nicht nur gelb, sondern rot/gelb/grün — als Marker-Konzept. |
| C4 | Text-Farbe | **ADAPT** | Nur 3 semantische Farben (rot=Mangel, grün=OK, gelb=Prüfung), keine Farb-Picker-Flut. |
| C5 | Font-Auswahl | **DROP** | Gutachten haben Pflicht-Schriftart; SV darf nicht eigene Fonts wählen. |
| C6 | Text-Alignment | **1:1** | Links/Mitte/Rechts/Blocksatz — Standard. |
| C7 | Inline-Code `` ` `` | **DROP** | Passt zu B6 — nicht relevant für Gutachten. |
| C8 | Superscript/Subscript | **DROP** | Selten gebraucht, +8 KB nicht wert. |
| C9 | Link mit Preview | **ADAPT** | Externe URLs mit Preview — nein (DSGVO-Cors); interne Wikilinks — ja. |
| C10 | Wikilink `[[...]]` | **1:1** | Bear ist Referenz; mit aliases + heading-linking ein Killer-Feature. |
| D1 | Focus Mode (Chrome weg) | **1:1** | Craft-Shortcut Cmd+Shift+F (statt Cmd+.), sonst identisch. |
| D2 | Sentence Focus | **1:1** | iA-Writer 1:1; hilfreich besonders in §6. |
| D3 | Paragraph Focus | **1:1** | iA-Writer 1:1; Default-Modus für §5 Befunde. |
| D4 | Typewriter Mode | **1:1** | iA-Writer 1:1; optional, aber beliebt bei Word-Migranten. |
| D5 | Full-Screen-Modus | **1:1** | `requestFullscreen()` vom Browser, CSS für Editor-Expansion. |
| D6 | Dark Mode | **ADAPT** | Anbieten, aber Warning beim Print-Export ("Hintergrund wird weiß gedruckt"). |
| D7 | Zen-Modus | **1:1** | Kombination aus Focus + Full-Screen. |
| D8 | Character Count | **ADAPT** | Standard-Count PLUS 500-Zeichen-Eigenleistungs-Tracker für §6. |
| D9 | Read-only Preview | **1:1** | `editor.setEditable(false)` — trivial. |
| E1 | Comments-Sidebar | **ADAPT** | Google-Docs-UI-Pattern, aber Inhalt sind **Befund-Fragmente**, nicht Kommentare. |
| E2 | Suggesting-Mode | **ADAPT** | Pattern 1:1, aber automatisch aktiv bei KI-Operationen (kein Modus-Switch). |
| E3 | Realtime-Cursors | **DROP** | §407a verbietet mehrfache Autorenschaft im Gutachten. |
| E4 | Version History | **1:1** | Wir haben `documents_versions`-Tabelle; UI als Version-Slider. |
| E5 | Share-Link | **1:1** | Session-4-Versand-Strategie (Stufe 2, Q2 2026). |
| E6 | PDF-Export | **1:1** | PDFMonkey bereits in PROVA integriert. |
| E7 | Markdown-Export | **ADAPT** | Q3 2026 — nice-to-have, nicht Pilot. |
| E8 | DOCX-Import | **ADAPT** | Q3 2026 — für Import alter Gutachten aus Word; Mammoth.js geeignet. |

---

## Zusammenfassung der Entscheidungen

| Entscheidung | Anzahl | Anteil |
|--------------|:------:|:------:|
| 1:1 übernehmen | 22 | 45 % |
| ADAPT (angepasst) | 13 | 27 % |
| DROP (abgelehnt) | 13 | 27 % |

**Interpretation:** 72 % der Patterns werden übernommen (45 % direkt + 27 % angepasst). Das ist gesunde Proportion — wir nehmen das Beste aus 7 Apps, passen es an unseren Kontext an, und weisen 1/4 bewusst ab. Der Unterschied zu "alles Notion nachbauen" ist *diese 27 % DROP* — genau das sind die Patterns, die Gutachten-Tools von Notes-Tools unterscheiden.

---

## Die 7 wichtigsten DROP-Entscheidungen (und die Gefahr, sie doch zu bauen)

**DROP 1 — Nested Blocks (B11, B12).** Der Entwickler-Drang, "alles Notion kann, müssen wir auch" ist hier stark. Gegenwehr: Ein Gutachten darf NIE einen Toggle-Block enthalten, der im PDF-Export zu "[kollabiert]" wird. Das ist Gerichts-Suizid.

**DROP 2 — Single-Letter-Shortcuts (A8).** Die Versuchung: "Bausachverständige wollen schnell arbeiten." Die Wahrheit: Bausachverständige wollen PROVA nicht auswendig lernen. Ein-Buchstaben-Shortcuts ohne Modifier kollidieren mit 90 % der Text-Eingabe.

**DROP 3 — Realtime-Cursors (E3).** Die Versuchung: "Alle modernen Editoren haben das." Die Wahrheit: §407a ZPO. Ein Gutachten ist Werk eines einzelnen SV. Co-Editing verwässert juristisch.

**DROP 4 — Math/LaTeX (B10).** Die Versuchung: "Manche Gutachten brauchen Formeln." Die Wahrheit: Text mit "x = (a² + b²)^0.5" ist gerichtsfest lesbar. LaTeX ist Nerd-Snobismus.

**DROP 5 — Font-Auswahl (C5).** Die Versuchung: "User-Personalisierung ist modern." Die Wahrheit: Ein SV, der seinen Comic-Sans-Gutachten einreicht, ruiniert seinen Ruf und unseren. Pflicht-Font = Qualitäts-Anker.

**DROP 6 — Emoji-Picker (bereits in Session 4 Thema 1).** Die Versuchung: "Notion hat es." Die Wahrheit: Gutachten mit 🚨 für "Alarm" ist peinlich. Spart 15 KB.

**DROP 7 — Daily Notes (Craft). ** Die Versuchung: "Bausachverständige führen Tagebücher." Die Wahrheit: Dafür gibt es das `eintraege.html` System in PROVA. Editor ≠ Tagebuch.

---

## Die 5 wichtigsten ADAPT-Entscheidungen (und was das Anpassen bedeutet)

**ADAPT 1 — Command Palette Commands.** Linear hat "Assign to Me", "Change Status". Wir haben "Konjunktiv vorschlagen", "Textbaustein einfügen", "§407a-Hinweis ergänzen". Die Engine ist gleich, die Liste ist komplett anders.

**ADAPT 2 — Callouts als Prüf-Marker.** Notion hat Callouts mit beliebigen Farben/Icons. Wir sperren auf 3 Farben + 3 Icons (rot=Mangel, gelb=klären, grün=ok). Das erzwingt Semantik.

**ADAPT 3 — Comments-Sidebar als Fragment-Sidebar.** Google Docs hat Kommentare von Usern. Wir haben Befund-Fragmente aus Diktat/Foto/Skizze/Notiz. Gleiches UI, komplett andere Datenquelle.

**ADAPT 4 — Suggesting-Mode automatisch.** Google Docs braucht Modus-Switch. Wir triggern Suggesting automatisch bei jeder KI-Aktion. SV muss nie "Suggesting Mode an" klicken — KI schreibt **immer** als Vorschlag.

**ADAPT 5 — Character Count als Eigenleistungs-Tracker.** Standard-Extension zählt Zeichen. Wir zählen Zeichen **und** unterscheiden: wie viele sind vom SV selbst, wie viele aus KI-Vorschlag (jetzt akzeptiert), wie viele aus Textbaustein. Regel 11 (500 Zeichen eigen) braucht diesen Differenzierungs-Tracker.

---

## Wie wir mit Framework-Lock-in umgehen

Eine latente Sorge: Wenn wir 14 TipTap-Extensions laden, wie abhängig sind wir? Antwort in vier Punkten:

1. **TipTap ist BSD-lizenziert und Open Source.** Selbst wenn ueberdosis (die Firma) morgen schließt, können wir weitermachen. ProseMirror (der eigentliche Editor-Kern) ist seit 2015 stabil.
2. **Unsere Custom-Extensions sind standalone.** `prova-fragment-marker`, `prova-ki-suggestion`, `prova-slash-command` — alle in `/public/js/extensions/`. Wenn TipTap hypothetisch wegfiele, migrieren wir zu direktem ProseMirror (Mehraufwand ~2 Wochen, nicht 2 Monate).
3. **Kein TipTap-Cloud-Lock-in.** Wir nutzen NICHT `@tiptap/extension-ai`, nicht `@tiptap/extension-collaboration`, nicht ihr Notion-like-Template. Keine JWT-Auth zu ihren Servern, keine Paid-Features. Alles läuft in unserer Supabase.
4. **Bundle-Splitting möglich.** Wir können jede Extension dynamisch laden (`import()`), wenn Bundle-Size kritisch wird. Das ist noch nicht nötig, aber als Option vorhanden.

---

## Die eine Kern-Entscheidung, die TEIL D zusammenfasst

> **Wir adoptieren großzügig, aber wir sind zu jeder Ablehnung bereit.**

Die 13 DROPs sind nicht "wir können das nicht bauen". Sie sind "wir wollen das nicht bauen, weil es gegen unsere Gutachten-Doktrin spricht". Das ist der Unterschied zwischen einem Werkzeug-Kasten und einer Produkt-Vision.

---

*→ Weiter mit `05-TEIL-E-Library-Empfehlungen.md` für die Bundle-Analyse.*
