# ANHANG 08 — Die 8 kreativen Spezialfragen (beantwortet)

Marcel hat in Session 5 acht Spezialfragen gestellt, die aus den 7 Einzel-Analysen nicht automatisch fallen, sondern eigenständige Architektur-Entscheidungen sind. Hier die Antworten.

---

## Frage 1: Wie soll die Slash-Menü-Taxonomie aussehen? Notions 40+ Items oder reduziert?

**Kurzantwort:** Reduziert auf **12 PROVA-relevante Items in 3 Gruppen** plus dynamisch-kontextuelle Items.

### Die 12 Grund-Items

**Gruppe A — Struktur-Blöcke (4):**
- `/h1` → Überschrift 1
- `/h2` → Überschrift 2
- `/h3` → Überschrift 3
- `/divider` → Trennlinie

**Gruppe B — Inhalt-Blöcke (5):**
- `/liste` → Aufzählung (Bullet)
- `/nummer` → Nummerierung
- `/zitat` → Zitat/Quote
- `/tabelle` → Tabelle 3×3
- `/foto` → Foto einfügen

**Gruppe C — Prüf-Marker (3):**
- `/mangel` → Roter Callout
- `/klaeren` → Gelber Callout
- `/ok` → Grüner Callout

### Plus: Dynamische Items

Je nach Kontext erscheinen zusätzlich:
- Im §6-Modus: `/konjunktiv` (holt KI-Konjunktiv-Vorschlag für markierten Text)
- Wenn Textbausteine verfügbar: `/baustein` (öffnet Baustein-Picker)
- Wenn Fragmente vorhanden: `/fragment` (zeigt Liste)

**Warum nicht mehr?** Notion hat 40+, und trotzdem nutzen User nur ~8 regelmäßig. Die restlichen sind Noise. Bei Gutachten ist die Vielfalt noch geringer — niemand braucht `/video`, `/embed`, `/math` in einem gerichtsfesten Dokument.

**Die Faustregel:** Ein Slash-Item kommt nur rein, wenn ein Bausachverständiger in einem Jahr ≥5× danach fragen würde. `/h1` ja, `/codeblock` nein.

---

## Frage 2: Wie integrieren wir das Slash-Menü mit dem Cmd+K-Palette — Doppelt oder gekoppelt?

**Kurzantwort:** **Gekoppelt mit klarer Rollen-Trennung.**

### Die Aufteilung

**Slash (`/`) = Content-Invocation (was füge ich ein?)**
- Nur Block-Typen und Content-Aktionen
- Nur im Editor-Kontext, nur auf leeren Zeilen
- 12 feste Items + kontextuelle

**Cmd+K = Action-Invocation (was tue ich?)**
- Navigation (Gehe zu §5, Neuer Auftrag)
- KI-Aktionen (Konjunktiv holen, Norm-Zitat suchen)
- Editor-Commands (Focus-Mode an, Fett, Bild ersetzen)
- Export, Speichern, Versenden

### Warum nicht ein Menü für alles?

Notion versucht das — und landet bei einer langen Liste, in der "Einfügen" und "Aktion" vermischt sind. Das ist kognitive Last. Linear trennt bewusst: `/` für Search, `Cmd+K` für Actions. Wir folgen Linear.

### Verbindungs-Punkte

- **Wenn User im Cmd+K "Block einfügen" sucht** → Ergebnis "⇧ Use / for blocks" als Hint.
- **Wenn User im Slash "Export" sucht** → Kein Ergebnis; Hint "Press ⌘K for actions".

Damit lernen User die Trennung, ohne dass sie explizit erklärt wird.

---

## Frage 3: Wie erinnern wir den SV an die 500-Zeichen-Eigenleistung?

**Kurzantwort:** **Aktive Status-Leiste mit progressiver Warnung.**

### Der Zähler

```
Zeichen: 347  ·  Eigenleistung: 289 ⚠ (Min: 500)  ·  KI: 58 (17%)
                ^^^^^^^^^^^^^^^^^
                orange, bis 500 erreicht
```

**Farb-Progression:**
- 0–200 Zeichen: Grau ("noch im Schreib-Fluss")
- 200–400: Gelb-orange ("fast halbe Marke")
- 400–500: Orange mit kleinem Puls-Animation alle 2s ("bald da")
- ≥500: Grün ✓, Pulsen stoppt ("Regel erfüllt")

### Der "Sperr"-Mechanismus beim Export

Wenn der SV auf Export drückt und Eigenleistung < 500:
- Modal öffnet sich: "Deine Eigenleistung liegt bei 347 Zeichen. §6 verlangt mindestens 500. Du kannst trotzdem exportieren, aber PROVA markiert das Dokument als 'unvollständig nach Regel 11'."
- Zwei Buttons: "Weiter schreiben" (primary) + "Trotzdem exportieren" (grau, kleiner).

Kein harter Block — der SV bleibt Herr der Entscheidung (§407a).

### Der kluge Trick: Baustein-Zeichen NICHT als Eigen zählen

Wenn ein Textbaustein "Standardformulierung Mangelanzeige" eingefügt wird (500 Zeichen), zählen diese NICHT als Eigenleistung. Sie sind in einer dritten Kategorie: "Baustein: 500 (16%)".

Das verhindert Missbrauch, wo SV mit Bausteinen die 500er-Latte erreichen, ohne etwas selbst formuliert zu haben.

---

## Frage 4: Wie handhaben wir Undo/Redo bei KI-Vorschlägen?

**Kurzantwort:** **KI-Vorschläge sind NICHT im Undo-Stack. Accept/Reject sind eigenständige History-Punkte.**

### Das Prinzip

Eine KI-Suggestion entsteht durch User-Aktion ("Cmd+Alt+K"). Sie erscheint als Diff-Mark, nicht als Text-Änderung. **Der Editor-State wurde noch nicht wirklich verändert.**

Erst wenn der User **Accept** klickt, passiert eine echte Text-Änderung — *diese* wird in die History geschrieben.

Redaktioneller Flow:
1. Cmd+Alt+K → Suggestion-Mark erscheint. History unverändert.
2. Accept-Click → Text wird geändert. History: +1 Schritt.
3. Cmd+Z → Zurück zum Stand vor Accept. Suggestion ist nicht mehr sichtbar (war eine transiente UI-Nachricht, kein Content).

Das ist anders als z.B. Notions AI, wo jeder Zeichen-Vorschlag im Undo-Stack landet. Unser Ansatz ist **sauberer für Gerichts-Audit** — Der Editor-State repräsentiert nur finale Entscheidungen, nicht Zwischen-Überlegungen.

### Die Ausnahme: Session-Recovery

Wenn der Browser crasht während eine Suggestion offen ist, wollen wir den Zustand wiederherstellen. Also: Wir persistieren *aktive* Suggestions in `localStorage` (nicht in content_json). Beim Reload werden sie restored.

---

## Frage 5: Dark-Mode — schaltbar, automatisch, oder gar nicht?

**Kurzantwort:** **Schaltbar mit Print-Warning und Default = hell.**

### Warum default hell

Bausachverständige sind Büro-User. Büros haben helle Beleuchtung. Dark-Mode ist eine Coder-Präferenz, nicht eine Gutachter-Präferenz. Studien zeigen: Leseverstand bei Fließtext ist auf hellem Hintergrund höher.

Außerdem: **Der gedruckte Output ist immer hell** (schwarz auf weiß). Wenn ein SV im Dark-Mode schreibt, sieht er nie das finale Format. Das erhöht Ausdruck-Überraschungen.

### Die Schalter-Logik

```
  Settings → Darstellung:
  ◉ Hell (empfohlen für Gutachten)
  ○ Dunkel
  ○ System-abhängig (OS-Setting folgen)
```

Default: **Hell.** Nicht "System-abhängig" — das ist fahrlässig bei professionellem Software-Einsatz.

### Die Warning

Wenn User auf Dark stellt, einmaliges Toast:
> *"Dark-Mode aktiv. Hinweis: Der PDF-Export bleibt immer in hellem Format (Norm für Gutachten)."*

Nicht blockierend, aber informierend.

### Der Sonderfall: `prefers-color-scheme` Auto-Detection

Wenn der User zum ersten Mal die App öffnet und sein OS auf Dark steht, fragen wir NICHT automatisch "Dark-Mode aktivieren?". Wir beleiben hell und zeigen in den Settings einen Hint.

Begründung: Die OS-Dark-Setting ist meist für andere Apps (Chat, Browser), nicht für Arbeits-Software. Wir optieren bewusst für Opt-in statt Opt-out.

---

## Frage 6: Wie zeigen wir dem SV, dass die KI Transparenz-Pflicht erfüllt?

**Kurzantwort:** **Ein "Transparenz-Badge" im Status-Bar + Detail-Popover.**

### Das Status-Bar-Pattern

Unten rechts in der Status-Leiste:
```
🛡 DSGVO · EU-only · ⓘ KI-Transparenz: 3 Aktionen protokolliert
```

Klick öffnet einen Popover:

```
╔══════════════════════════════════════════════════╗
║ Transparenz-Protokoll (letzte Aktionen)         ║
╠══════════════════════════════════════════════════╣
║ 14:32  Konjunktiv-Vorschlag erhalten            ║
║        ∟ 2 Zeichen eingefügt                    ║
║                                                  ║
║ 14:28  Norm-Zitat vorgeschlagen                 ║
║        ∟ Abgelehnt                              ║
║                                                  ║
║ 14:15  Textbaustein "Mangel-Standard" eingefügt ║
║        ∟ 487 Zeichen                            ║
║                                                  ║
║ Vollständiges Protokoll im Audit-Trail          ║
╚══════════════════════════════════════════════════╝
```

Dieses Mini-Log ist eine **Beruhigungs-UI**. Der SV sieht jederzeit, dass PROVA mitschreibt — und kann den Eintrag im Audit-Trail detailliert einsehen.

### Auf keinen Fall

- **Kein Banner** wie "KI ist aktiv!". Das ist nervig und nicht rechtlich erforderlich.
- **Kein Provider-Name.** Wir zeigen nie "OpenAI", "Anthropic" oder "Cloudflare Workers AI". Nur "KI" oder "KI-Modell-Hash xyz" (Session-4-Regel).

### Die eine Visuell-Identität

Alle KI-Elemente tragen ein konsistentes Icon (magic-wand oder sparkles ✨). Dieses Icon ist im:
- Bubble-Menü neben KI-Aktionen
- Cmd+K-Palette für KI-Commands
- Status-Bar-Badge
- Suggesting-Mark-Tooltip

So lernt der SV: "wenn Sparkles, dann KI, dann dokumentiert."

---

## Frage 7: Print-Preview — inline im Editor oder separater Modus?

**Kurzantwort:** **Separater Modus (Cmd+P), aber mit WYSIWYG-Editor als Default.**

### Der WYSIWYG-Default

Wie in TEIL A Section 4 erklärt: Google Docs zeigt das Editier-Feld im realen Papier-Format. Wir tun das auch. Das Editor-Feld hat:
- A4-Breite (595pt ≈ 210mm)
- 2.5cm Ränder
- Seitenumbrüche als graue Linien sichtbar
- Header/Footer-Bereich markiert (nicht editierbar)

Das heißt: **Der Schreib-Zustand ist bereits nah am Print-Zustand.**

### Der Print-Preview-Modus

Beim Druck auf Cmd+P (oder Klick "Export → Vorschau"):
- Editor-Chrome wird vollständig ausgeblendet
- Seitenumbrüche werden richtig berechnet (inkl. Witwen/Waisen-Regeln)
- Fußzeilen mit Seitenzahlen erscheinen
- Anti-Austausch-Header ab Seite 2 gerendert
- User sieht `Vorschau Seite 1 von 8`

Navigation: Pfeiltasten blättern, `Esc` verlässt.

### Warum getrennt?

Weil der Editier-Zustand Interaktivität braucht (Bubble-Menü, Cursors, etc.), der Print-Zustand nicht. Sie haben **unterschiedliche CSS-Anforderungen**. Dieselbe View für beide wäre ein Kompromiss.

---

## Frage 8: Wie realisieren wir "Nur 5 Toolbar-Buttons" konkret?

**Kurzantwort:** **Gar keine feste Toolbar. 5 Actions sind *verschieden verteilt* je Kontext.**

### Die Session-4-Doktrin re-interpretiert

Session 4 sagt: "Die obere Toolbar darf maximal 5 Buttons haben." Jetzt, nach der Pattern-Analyse, ist die *bessere* Interpretation:

**Es gibt keine feste Toolbar. Es gibt 5 Modus-spezifische Aktions-Slots.**

Modus 1: **Dokument-Navigation (oben)**
```
[⌕ Cmd+K]  [§5]  [§6]  [§7]  [Historie]
```

Modus 2: **Text-Selection (Bubble-Menü, max 5 Gruppen von Buttons)**
```
[B I U S]  [🟡 🟢 🔴]  [🔗 link]  [💬 comment]  [✨ KI]
```

Modus 3: **Empty-Line (Floating-Menü, EIN Button)**
```
[+]  ← Öffnet Slash-Menü
```

Modus 4: **Mobile (FAB unten rechts, EIN Button)**
```
[⌘K]  ← Öffnet Command Palette
```

Modus 5: **Inspektor-Sidebar (rechts, Unterteilung, nicht Buttons)**
```
Aktuell: §6 Fachurteil
▸ Eigenleistung: 347/500 Zeichen
▸ Qualitäts-Marker: 2/3
▸ Offene KI-Vorschläge: 1
▸ Textbausteine verfügbar: 8
```

### Die Summe über alle Modi

Wenn wir alle sichtbaren "Aktions-Elemente" zählen:
- Top: 5 (Nav)
- Bubble (nur bei Selection): 5 Gruppen = ~12 Einzel-Buttons
- Floating (nur auf leerer Zeile): 1
- Mobile-FAB: 1

Im **einzelnen Sicht-Zustand** sind es nie mehr als 5 Haupt-Aktionen. Das ist die Doktrin eingehalten.

### Der Wachhund

In `page-template.css` legen wir fest:
```css
.prova-toolbar-permanent { 
  /* Maximal 5 Direct-Children erlaubt */
}
.prova-toolbar-permanent > *:nth-child(n+6) {
  /* Fallback: Debug-Hinweis wenn Regel gebrochen */
  outline: 3px solid red;
  content: 'TOOLBAR-RULE VIOLATION: max 5 buttons';
}
```

Das ist ein visuelles Lint — Dev sieht sofort, wenn er übersteigert.

---

## Schlussbemerkung zu den 8 Fragen

Alle 8 Antworten teilen ein gemeinsames Muster:

> **Die Antwort ist fast nie "alles oder nichts". Sie ist "das Richtige im richtigen Kontext".**

Slash vs. Cmd+K → nicht beide blind, sondern Rollen-Trennung.
Dark-Mode → nicht verboten, aber nicht default.
Zeichen-Tracker → nicht blockierend, aber warnend.
KI-Transparenz → nicht in-your-face, aber jederzeit einsehbar.

Diese Nuancen machen Editor-Software zur *erwachsenen* Editor-Software.

---

*→ Letzter Anhang: `09-ANHANG-Custom-Nodes-Spec.md`*
