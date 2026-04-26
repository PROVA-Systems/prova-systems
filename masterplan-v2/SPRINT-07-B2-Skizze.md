# SPRINT 07 — B2 Skizzen-Funktion (Tier 1+2)

**Tag:** 7 · **Aufwand:** 5-6h · **Phase:** B Produkt-Kern

---

## Ziel
SV kann direkt in PROVA Grundriss-Skizzen erstellen. Mit Marker-Nummern die zu Einträgen verlinken. Multi-Skizze pro Fall.

---

## Scope

### Canvas-Komponente
**Tier 1 (Pflicht für Pilot):**
- Stift (freihand), Linie (gerade), Kreis, Rechteck
- Marker-Nummern (1, 2, 3, ...) — klick irgendwo → Marker mit auto-Nummer
- Text-Tool für Beschriftungen
- Undo/Redo
- Löschen (Element-Auswahl + Delete)
- Verschieben (Element-Auswahl + Drag)

**Tier 2 (Komfort für Pilot):**
- Hintergrundbild-Upload (z.B. Foto eines bestehenden Grundrisses)
- Nordpfeil-Werkzeug
- Maßstab/Lineal (Pixel-zu-Meter-Verhältnis)
- Farbwahl (5 vordefinierte: schwarz, rot, blau, grün, orange)
- Strichstärke (3 Stufen: dünn/mittel/dick)

### Marker-System
- Klick auf Skizze → Marker mit auto-Nummer
- Pro Marker optional: kurze Beschreibung
- Marker können mit EINTRAEGE-Records verknüpft werden
- Im PDF: "Befund 3.1 bezieht sich auf Pin 2 der Skizze S1"

### Multi-Skizze pro Fall
- Eine Skizze = ein EINTRAEGE-Record mit typ=skizze
- skizze_data als Attachment (PNG-Export aus Canvas)
- skizze_meta als JSON in inhalt_text (Marker-Liste mit Beschreibungen)
- Nummerierung: S1, S2, S3 (eigener Counter pro Fall)

### Daten-Struktur

```json
// in inhalt_text gespeichert
{
  "skizze_id": "S1",
  "marker": [
    {"nr": 1, "x": 120, "y": 340, "beschreibung": "Feuchteschaden Ecke", "verknuepft_mit_eintrag": "rec123"},
    {"nr": 2, "x": 350, "y": 280, "beschreibung": "Riss in Wand", "verknuepft_mit_eintrag": null}
  ],
  "abmessungen": {"breite_px": 800, "hoehe_px": 600, "massstab_meter_pro_px": 0.025}
}
```

---

## Prompt für Claude Code

```
PROVA Sprint 07 — B2 Skizzen-Funktion (Tag 7)

Pflicht-Lektüre vor Start:
- 02_WORKFLOWS.md (Skizze als gleichwertiger Eintrags-Typ)
- 01_UI-PRINZIPIEN.md (Touch-Targets, Empty States)
- Bestehende ortstermin-modus.html nach Sprint 06
- prova-eintraege.js (aus Sprint 06)


SCOPE
=====

Block A — Canvas-Komponente prova-skizze.js

A1: Canvas-Setup (Vanilla, kein Framework)
- HTML5 Canvas mit Touch + Mouse Support
- Tool-Palette links (Stift, Linie, Kreis, Rechteck, Marker, Text, Undo/Redo, Löschen)
- Optionen-Bar oben (Farbe, Strichstärke, Hintergrundbild)
- Marker-Nummern auto-incrementing pro Skizze

A2: Tier 1 Werkzeuge implementieren
- Stift: mousedown/mousemove/mouseup für Pfade
- Linie: zwei Klicks
- Kreis: Klick + Drag für Radius
- Rechteck: Klick + Drag für Größe
- Marker: Klick erstellt Marker mit auto-Nummer + Modal für Beschreibung
- Text: Klick + Eingabe-Modal

A3: Tier 2 Werkzeuge
- Hintergrundbild: Upload, scaliert ins Canvas
- Nordpfeil-Tool: Vordefinierte SVG-Form an Klick-Position
- Maßstab: Zwei Punkte klicken + Eingabe der echten Distanz in Metern
- Farbwahl: 5 Buttons (schwarz/rot/blau/grün/orange)
- Strichstärke: 3 Buttons (1px/3px/5px)

A4: Undo/Redo
- Stack-basiert (Aktionen werden gepusht)
- Max 50 Schritte (RAM-Limit)

A5: Touch-Optimierung für Tablets
- pointerEvents (statt mousemove)
- min Touch-Target 44px für Tool-Buttons

Block B — Skizze-Speichern + EINTRAEGE-Integration

B1: prova-skizze.js Export
- exportPNG(): Canvas → PNG-Blob
- exportMeta(): Marker-Liste als JSON
- Beim Klick "Speichern":
  - PNG → eintrag-create mit typ=skizze, skizze_data=PNG, inhalt_text=JSON
  - eintrag_nr automatisch (höchster pro Fall +1)
  - Skizze-ID auch automatisch (S1, S2, S3) in Metadaten

B2: Marker-zu-Eintrag-Verknüpfung
- Im Skizze-Edit-Modus: Klick auf Marker → Modal "Mit Eintrag verknüpfen"
- Dropdown mit allen Einträgen des Falls
- Speichert in marker.verknuepft_mit_eintrag

Block C — Akte-View für Skizzen

C1: Skizze als eigener Block in akte.html
- Listen-Ansicht: alle Skizzen des Falls (S1, S2, S3) als Mini-Thumbnails
- Klick → Lightbox mit Vollansicht + Marker-Liste rechts daneben
- Marker-Klick in Lightbox → springt zum verknüpften Eintrag in der Akte

Block D — PDF-Integration

D1: PDFMonkey-Template-Erweiterung
- Im Gutachten-PDF: nach §3 Daten ein neuer Abschnitt "Skizzen"
- Pro Skizze: Vollbild + Marker-Beschreibungen-Liste
- Im §6 Fachurteil: Verweise auf Pins in Skizzen

D2: Verweis-Format
- "Pin 2 der Skizze S1 zeigt die Schadensquelle (siehe auch Eintrag #3)"

Block E — sw.js v210


QUALITÄTSKRITERIEN
==================
- Touch-friendly auf Tablets (min 44px Tool-Buttons)
- PNG-Export < 500 KB pro Skizze (komprimiert)
- Undo/Redo zuverlässig
- Marker-Nummern bleiben konsistent
- KI strukturiert nicht (nur SV markiert)


TESTS
=====
Manuell:
1. Ortstermin-Modus → Tab Einträge → "+ Neue Skizze"
2. Stift: zeichne ein Rechteck (Wohnzimmer)
3. Marker: 3 Markierungen setzen
4. Marker 1 mit Eintrag #1 verknüpfen
5. Speichern → erscheint als Eintrag #4 (typ=skizze)
6. Akte öffnen → Skizze sichtbar in Skizzen-Block
7. Klick auf Marker 1 → springt zu Eintrag #1


ACCEPTANCE
==========
1. Tier 1 + Tier 2 Werkzeuge funktional
2. Multi-Skizze pro Fall (S1, S2, S3)
3. Marker-Verknüpfung funktioniert
4. PDF-Anhang mit Skizze + Marker-Liste
5. Touch-bedienbar auf Tablet


TAG: v180-skizze-done
```

---

## Marcel-Browser-Test (15 Min)

1. Skizze mit allen Tier-1-Werkzeugen testen
2. 3 Marker setzen, mit Einträgen verknüpfen
3. Skizze speichern → erscheint als #N+1 in Eintragsliste
4. Auf Tablet (oder DevTools-Touch-Modus): Tool-Buttons gut tippbar
5. Gutachten generieren → PDF zeigt Skizze + Marker-Beschreibungen
