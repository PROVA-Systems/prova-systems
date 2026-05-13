# TEIL B · Thema 4 — §6 Fachurteil: Werkzeuge entdeckbar ohne Toolbar-Wall

**Die Frage (Marcel):** *"§6 Fachurteil: Im Zweifel ein riesiger Fließtext mit Tabellen, Skizzen, Fotos, Zitaten… alle Werkzeuge müssen einfach erreichbar sein, der SV darf gar nicht auf die Idee kommen Excel/Word zu öffnen."*

---

## Umformulierung der Frage

Du willst nicht "alle Werkzeuge erreichbar". Du willst **"das richtige Werkzeug im richtigen Moment sichtbar"**.

Der Unterschied ist groß:
- Toolbar-Wall = alle Werkzeuge immer sichtbar → kognitive Last, UI-Noise
- Contextual Invocation = Werkzeug erscheint wenn Kontext passt → geringe Last, hohe Entdeckbarkeit

Notion AI macht das richtig (Quelle 14 aus Teil A): `/` öffnet Slash-Menu, Selection zeigt Bubble-Menu, Cursor-in-Table zeigt Tabellen-Tools. Das ist das Pattern.

---

## Die 3 Invocation-Patterns für den §6-Editor

### Pattern 1: Slash-Menu ("Ich will etwas einfügen")
Typischer Trigger: Cursor auf leerer Zeile, `/` getippt. Öffnet ein Pop-up mit Kategorien.

**Werkzeuge für PROVA §6:**
- 📊 Tabelle einfügen (mit Presets: Messwerte, Kostenrechnung, Schadenstabelle)
- 🖼️ Foto einfügen (aus Auftrag-Medien, nicht Upload-Dialog)
- ✏️ Skizze einfügen (aus Auftrag-Skizzen)
- 📋 Zitat (aus Fach-Bibliothek, Thema 1 N5)
- 📎 Beleg verlinken (Fragment-Marker, Thema 3)
- 📐 Berechnung (Inline-Rechner, z.B. "3*3 = 9 m²")
- 📄 Vorlage (Textbausteine aus SV-Bibliothek)
- 🤖 KI-Aktion (Klasse D aus Thema 1)

### Pattern 2: Bubble-Menu ("Ich will das hier ändern")
Typischer Trigger: Textauswahl. Erscheint schwebend über Selection.

**Werkzeuge:**
- B I U (Fett, Kursiv, Unterstrichen)
- 📌 Als Fragment markieren (Beweis-Referenz)
- ✨ Formulierung verbessern (KI, Klasse B)
- 🔤 Rechtschreib-Check (LanguageTool)
- ↔️ Als Zitat markieren (ändert Stil)
- 🗑️ Löschen

Das ist **genau** das, was in Session 3 als `prova-bubble-menu` gebaut wurde. Muss jetzt konsequent im §6 eingesetzt werden.

### Pattern 3: Kontext-Sidebar ("Ich arbeite gerade an X, zeig mir alles was dazu passt")
Typischer Trigger: passiv, immer sichtbar rechts.

**Inhalte der Sidebar (kontext­sensitiv basierend auf Cursor-Position / aktuellem Absatz):**
- 📌 Verknüpfte Belege (Fragmente → Fotos/Diktate)
- 📚 Literatur-Vorschläge (Fach-Bibliothek)
- 🔗 Ähnliche Fälle (eigene frühere Gutachten, pgvector-Lookup)
- ⚠️ KI-Warnungen (Konsistenz-Checks, Thema 1 N4)
- 📑 Strukturübersicht (welche Beweisfragen sind beantwortet)

---

## Was NICHT in die obere Toolbar gehört

Die obere Toolbar bleibt **minimal**:
- Speichern (auto, sichtbar nur Status-Indikator)
- Versions-Zurücksprung
- Export-Button (mit Dropdown)
- Mehr-Menü (≡) für selten genutzte Dinge

**Nichts anderes.** Kein B/I/U oben. Kein Font-Picker. Kein Tabellen-Button. Alles über Invocation-Patterns.

---

## Tabellen: das harte Subproblem

Tabellen sind in SV-Gutachten allgegenwärtig:
- Messwerte (Feuchte, Temperatur, Rissbreite)
- Schadenstabelle (Position / Beschreibung / Maß / Kosten)
- Kostenrechnung
- Vergleichs-Tabellen

Aus Session 3 vermute ich, dass der aktuelle Editor Tabellen schwach unterstützt.

### Die Entscheidung: TipTap als Editor-Basis (BUY statt BUILD)

**Pro TipTap (Quelle 13 Teil A):**
- ProseMirror-basiert, battle-tested für dokument-zentrische Apps (Notion-Style)
- Tables-Extension produktionsreif seit Jahren
- Slash-Menu, Bubble-Menu als Erst-Klass-Plugins
- Collaboration-Extension verfügbar (Y.js) falls später Multi-User-Edit kommt
- MIT-Lizenz, dependency-free Core
- Self-hostable (kein SaaS-Zwang)

**Contra TipTap:**
- Framework-Layer (aber: headless, kann mit Vanilla JS integriert werden)
- Bundle-Größe ~150-200 KB (aber: nur auf §6-Screen geladen, Split-bundle)
- Lernkurve für Custom-Extensions (2-3 Tage)

**Build-Alternative:**
Selbst-gebauter contenteditable-Editor mit eigener Table-Logik. Schätzung für MVP-Qualität: **12-16 Wochen**. Für Notion-Qualität: **6-12 Monate** (Resize, Merge-Zellen, Cursor-Handling, Undo, Auswahl über Tabellen-Grenzen etc.).

**Empfehlung:** TipTap als Ausnahme von "Vanilla-JS only". Begründung: Editor ist so zentral, dass schlechte Qualität das Produkt killt. Keine andere Drittpartei-Dependency in UI-Code außer TipTap.

---

## Discoverability — wie SV die Werkzeuge findet

Ein Werkzeug, das keiner kennt, hilft keinem. Drei Mechanismen:

**1. First-Run-Tour (einmalig, überspringbar)**
Beim ersten §6-Screen-Aufruf: 3-4 Tooltips, die die 3 Patterns zeigen ("Tippe / für Einfügen", "Markiere Text für Formatierung", "Rechts siehst du Belege zum aktuellen Absatz").

**2. Placeholder-Text**
Leerer Editor zeigt: "Tippe / um Einzufügen, schreibe los, oder ziehe ein Fragment aus der Sidebar."

**3. Keyboard-Hints**
Nach 2 Minuten Schreiben (wenn SV im Flow ist), falls `/` noch nie benutzt: subtiler Hint in der Statusleiste: "Tipp: / öffnet das Einfüge-Menü."

**4. Command-Palette (Cmd+K)**
Alles, was über Slash-Menu/Bubble-Menu/Sidebar erreichbar ist, ist auch via Cmd+K-Command-Palette erreichbar. Power-User-Shortcut, lässt sich durchsuchen. Referenz: Session-3-`prova-command-palette-ext`.

---

## Das Excel-Versuchungs-Problem (Marcels eigentliche Angst)

> *"...der SV darf gar nicht auf die Idee kommen Excel/Word zu öffnen."*

Die 4 häufigsten Excel-Trigger in SV-Workflows:

**Trigger 1: Messwert-Tabelle mit Berechnung**
"Ich muss 20 Messwerte erfassen und Mittelwert/StdAbw rechnen."
→ PROVA muss: Tabellen mit Inline-Formeln haben. TipTap hat das nicht nativ, aber: Custom-Extension möglich. Alternative leichte Version: Tabelle mit `=AVERAGE(A1:A20)`-Syntax, die im Hintergrund berechnet wird.

**Trigger 2: Kostenrechnung**
"Ich muss 15 Positionen à Einzelpreis × Menge summieren."
→ Dediziertes Slash-Befehl "Kosten­tabelle" mit Preset (Spalten: Pos, Bezeichnung, Menge, Einheit, Einzelpreis, Gesamt, MwSt). Auto-Summe.

**Trigger 3: Komplexe Schadenstabelle mit Fotos pro Zeile**
"Ich habe 40 Mängel und jedem soll ein Foto angehängt sein."
→ Slash-Befehl "Schadens­tabelle" mit speziellen Tabellen-Typ, der Foto-Zellen unterstützt. Tablet-freundlich: Foto in Zelle droppen.

**Trigger 4: Chart / Diagramm**
"Ich will den Feuchte-Verlauf als Kurve zeigen."
→ Für Pilot: nur Import von Screenshots aus externem Tool. Später: Integration mit einem leichten Chart-Builder (Chart.js als Web Component). Oder: Lass den SV weiter Excel benutzen, aber biete "Excel-Datei einbetten"-Import (Screenshot + Datei als Anhang).

**Die Word-Versuchung** ist leichter zu lösen: wenn §6-Editor gut ist (TipTap + Slash-Menu + Sidebar), gibt es keinen Grund mehr, Word zu öffnen.

---

## Die Werkzeug-Matrix (vollständig)

Alle Werkzeuge, die im §6-Editor verfügbar sein sollen, nach Invocation-Pattern:

| Werkzeug | Slash | Bubble | Sidebar | Cmd+K | Kontext-Toolbar (wenn Cursor drin) |
|---|:-:|:-:|:-:|:-:|:-:|
| Tabelle einfügen | ✓ | | | ✓ | |
| Tabellen-Ops (Zeile +/-, Spalte +/-) | | | | ✓ | ✓ (wenn Cursor in Tabelle) |
| Foto einfügen (aus Auftrag) | ✓ | | | ✓ | |
| Skizze einfügen | ✓ | | | ✓ | |
| Fragment-Marker setzen | ✓ | ✓ | | ✓ | |
| Verknüpfte Belege anzeigen | | | ✓ permanent | | |
| Formulierung verbessern (KI) | | ✓ bei Selection | | ✓ | |
| Rechtschreibung | passive underline | ✓ | | ✓ | |
| Zitat aus Bibliothek | ✓ | | ✓ Vorschläge | ✓ | |
| Ähnliche Fälle (pgvector) | | | ✓ | ✓ | |
| Inline-Berechnung | ✓ | | | ✓ | |
| Heading-Struktur (H1-H4) | ✓ | ✓ | Struktur-Outline | ✓ | |
| Liste/Nummerierung | ✓ | ✓ | | ✓ | |
| Fett/Kursiv/Unterstrichen | | ✓ | | ✓ | |
| Bild zuschneiden/drehen | | | | | ✓ (wenn Bild selektiert) |
| Fußnote | ✓ | ✓ | | ✓ | |
| Export (PDF, Word) | | | | ✓ | (top-bar) |
| Undo/Redo | | | | ✓ | (top-bar) |

Gesamt: 18 Werkzeuge. 0 davon müssen permanent sichtbar in einer Toolbar-Wall sein.

---

## Density-Toggle — kontroverse Überlegung

Ein Knopf oben rechts: "Komfort / Kompakt" (45px vs. 32px Zeilenhöhe, 15px vs. 13px Text).

**Pro:** Jüngere SV lieben Kompakt, ältere brauchen Komfort. Ein Schalter pro SV, gespeichert.

**Contra:** Noch eine Option. Scope creep.

**Empfehlung:** **Default Komfort (wie in Session 3 entschieden), Kompakt als opt-in im User-Settings.** Nicht im Editor-Header, damit's nicht aufdringlich ist. Hidden-Feature für Power-User.

---

## Konkrete Schritte (Teil F)

1. TipTap-Integration als neuer Editor-Core für §6 (und später §5)
2. Custom-Extensions: Fragment-Marker, Inline-Formel, Foto-aus-Medien, Skizze-aus-Medien
3. Slash-Menu mit 10-12 Einträgen (siehe Matrix)
4. Bubble-Menu mit 7-8 Einträgen (aus Session 3, erweitert)
5. Kontext-Sidebar mit 5 Tabs (Belege, Literatur, Ähnliche Fälle, KI-Warnungen, Struktur)
6. Command-Palette-Extension mit allen Werkzeugen als Commands
7. Tabellen-Presets (Messwerte, Kosten, Schadenstabelle mit Fotos)
8. First-Run-Tour (einmalig, überspringbar)

Gesamt-Aufwand: **L** (ca. 3-4 Wochen für kompletten §6-Editor, ohne TipTap-Lernkurve).

---

## Die eine Sache, die nicht verhandelbar ist

**Die obere Toolbar darf maximal 5 Buttons haben.** Wenn die Design-Versuchung kommt, mehr reinzunehmen — widerstehen. Jeder zusätzliche Button ist ein Geständnis, dass das Invocation-System nicht gut genug ist.
