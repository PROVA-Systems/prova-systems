# SPRINT 08 — B3 Bibliothek-Pattern universal

**Tag:** 8 · **Aufwand:** 6-7h · **Phase:** B Produkt-Kern

---

## Ziel
Überall wo der SV Text schreibt, hat er 1-Klick-Zugriff auf Normen, Textbausteine, Floskeln, §-Verweise, Kontakte, Positionen — über eine **gleiche Toolbar-Komponente**. Das ist der Effizienz-Multiplikator.

---

## Scope

### Universal-Toolbar `prova-bibliothek-toolbar.js`

Eine Komponente, in 7 Seiten eingesetzt, je nach Kontext mit anderen Buttons:

| Seite | Buttons |
|---|---|
| `freigabe.html` (§6 Fachurteil) | Norm, Baustein, Floskel, §-Verweis |
| `ortstermin-modus.html` (Notiz-Editor) | Baustein, Floskel |
| `briefvorlagen.html` (Brief-Editor) | Baustein, Floskel, Kontakt |
| `stellungnahme.html` | Norm, Baustein, Floskel, §-Verweis |
| `rechnungen.html` (Positionen) | Position, Kontakt |
| `schnelle-rechnung.html` | Position, Kontakt |
| `kostenermittlung.html` | Position |

### UX-Pattern

```
[ Editor mit Cursor ]
└─ Toolbar unten ─────────────────────────────────┐
   [📚 Norm] [📝 Baustein] [💬 Floskel] [⚖️ §]   │
   [👤 Kontakt] [💶 Position]                     │
└──────────────────────────────────────────────────┘

Klick auf [📚 Norm]:
└─ Search-Popover öffnet sich ────────────────────┐
   [🔎 DIN 4108_______________________]           │
   ─ Vorschläge (Live-Filter, max 8) ────────────│
   ⭐ DIN 4108 Wärmeschutz (deine Favoriten)     │
   ⭐ DIN 4108-2 Mindestanforderungen             │
      DIN 4108-3 Klimabedingter Feuchteschutz    │
      DIN 4108-7 Luftdichtheit                   │
   ──────────────────────────────────────────────│
   [ Neue Norm hinzufügen ]                       │
└──────────────────────────────────────────────────┘

Klick auf Vorschlag → fügt Text an Cursor-Position ein.
```

### Kategorien-Erweiterung

**TEXTBAUSTEINE** muss um Kategorie "floskel" erweitert werden (existiert wahrscheinlich nicht).  
**NORMEN** muss eine Kategorie "§-Verweis" haben (für ZPO §407a, §411, BGB §312g, etc.).

### Favoriten-System

Pro User: Set von favorit_ids (in SV-Settings als Array).  
Beim Öffnen der Suche: Favoriten zuerst (mit ⭐), dann Rest.

### Verwaltungs-Seiten

`normen.html`, `textbausteine.html`, `positionen.html`, `kontakte.html` werden um:
- Favoriten-Toggle (Stern-Icon)
- CRUD-Funktionalität (falls noch nicht da)
- Bulk-Import-Möglichkeit

---

## Prompt für Claude Code

```
PROVA Sprint 08 — B3 Bibliothek-Pattern (Tag 8)

Pflicht-Lektüre vor Start:
- 01_UI-PRINZIPIEN.md (Keyboard-Shortcuts, Spacing)
- 02_WORKFLOWS.md (Freistehende Werkzeuge)
- bestehende textbausteine.html, normen.html, kontakte.html, positionen.html


SCOPE
=====

Block A — Datenmodell

A1: TEXTBAUSTEINE-Kategorien erweitern
- Single-Select-Feld 'kategorie' um 'floskel' erweitern
- Default-Floskeln einpflegen via Migrations-Script:
  - "Wir bedanken uns für das entgegengebrachte Vertrauen."
  - "Mit freundlichen Grüßen"
  - "Hochachtungsvoll"
  - 5-10 Standard-Floskeln

A2: NORMEN-Kategorien erweitern
- Kategorie '§-Verweis' hinzufügen
- Default-Verweise via Migration:
  - §407a ZPO mit Kurz-Erläuterung
  - §411 ZPO Frist
  - §312g BGB Verbraucher-Widerruf
  - §485 ZPO Beweissicherung
  - §286/288 BGB Verzug

A3: SACHVERSTAENDIGE.favoriten als Long-Text-Feld (JSON-Array)
- {"normen": ["rec1", "rec2"], "bausteine": ["rec3"], "kontakte": [...]}

Block B — Toolbar-Komponente

B1: prova-bibliothek-toolbar.js
- export window.PROVA_BIBLIOTHEK.attach(editorElement, kategorien, options)
- Erstellt Toolbar als Sibling unterhalb des Editors
- Buttons je nach kategorien-Array
- Klick öffnet Search-Popover (positioniert relativ zur Toolbar)
- Search-Input mit debounced Filter (200ms)
- Live-Suchergebnisse via API (cached pro Session)
- Klick auf Ergebnis: insertAtCursor(editorElement, text)
- Optional: Stern-Toggle für Favoriten-Markierung

B2: lib/bibliothek-cache.js
- LRU-Cache pro Kategorie (max 500 Einträge)
- TTL 5 Min
- Re-Fetch wenn user CRUD ausführt

B3: Keyboard-Shortcut
- Ctrl+B im Editor → öffnet Bausteine-Search
- Ctrl+N → Normen-Search
- Esc → schließt Popover

Block C — Einbindung in 7 Seiten

C1: freigabe.html § 6 Editor
- nach Editor: PROVA_BIBLIOTHEK.attach(editor, ['norm', 'baustein', 'floskel', 'paragraf'])

C2: ortstermin-modus.html Notiz-Editor
- nach Notiz-Textarea: PROVA_BIBLIOTHEK.attach(editor, ['baustein', 'floskel'])

C3: briefvorlagen.html Brief-Editor
- attach(editor, ['baustein', 'floskel', 'kontakt'])
- Kontakt-Insert: vollständige Adresse als Empfänger-Block

C4: stellungnahme.html
- attach(editor, ['norm', 'baustein', 'floskel', 'paragraf'])

C5: rechnungen.html Positions-Liste
- Positions-Tabelle: pro Zeile [Position]-Button → Search → fügt Position-Row hinzu
- attach(positionsForm, ['position', 'kontakt'])

C6: schnelle-rechnung.html
- attach(positionsForm, ['position', 'kontakt'])

C7: kostenermittlung.html
- attach(form, ['position'])

Block D — Verwaltungs-Seiten ergänzen

D1: normen.html
- Stern-Toggle pro Eintrag
- "+ Neue Norm" Button mit Modal (Name, Kategorie, Inhalt)

D2: textbausteine.html
- gleiche Logik
- Kategorien-Filter (alle / einleitung / fachurteil / abschluss / floskel)

D3: positionen.html (falls existiert) oder neu erstellen
- pro User: Positions-Liste (eigene)
- Felder: bezeichnung, einheit, einzelpreis, default_menge

D4: kontakte.html
- Stern-Toggle für oft genutzte Kontakte

Block E — sw.js v211


QUALITÄTSKRITERIEN
==================
- Toolbar ist nicht aufdringlich (klein, dezent, nicht als Wall-of-Buttons)
- Search-Popover positioniert intelligent (nicht außerhalb Viewport)
- Live-Suche < 100ms gefühlt
- Favoriten oben mit Stern
- Konsistente Tastenkürzel (Ctrl+B/N/F immer gleich)
- Auf Mobile: Search-Popover Vollbild


TESTS
=====
End-to-End:
1. Stellungnahme schreiben
2. Toolbar zeigt 4 Buttons (Norm/Baustein/Floskel/§)
3. Klick "📚 Norm" → "DIN 4108" tippen → Vorschlag → einfügen
4. Stern auf Vorschlag setzen → Refresh → Stern bleibt, oben
5. Ctrl+B → Bausteine-Popover → tippen → einfügen
6. Esc → schließt


ACCEPTANCE
==========
1. Toolbar in 7 Seiten eingebunden
2. Live-Suche funktional
3. Favoriten-System persistent
4. Floskel-Kategorie existiert
5. §-Verweise als eigene Kategorie
6. Tastenkürzel funktional


TAG: v180-bibliothek-done
```

---

## Marcel-Browser-Test (15 Min)

1. Stellungnahme öffnen → Toolbar sichtbar
2. Norm einfügen → Floskel einfügen → Baustein einfügen
3. Auf 3 Einträge Stern setzen → Refresh → Sterne bleiben, oben
4. Brief verfassen → Kontakt einfügen → Adresse korrekt eingefügt
5. Rechnung → Position einfügen → Tabellen-Row korrekt befüllt
6. Mobile: Suche öffnet Vollbild
