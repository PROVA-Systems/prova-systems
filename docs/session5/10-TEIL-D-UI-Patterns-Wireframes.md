# TEIL D — UI-Patterns / Wireframes (ASCII)

8 Wireframes für Schlüssel-Screens. Alle konzeptuell, keine finale Pixel-Arbeit.

---

## D.1 — Fragment-Bühne (NEU, zentral für Thema 3)

Zugang: Nach Asset-Upload → Button "Fragmente extrahieren" → landet hier.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Auftrag 12 O 345/25 · Marcel Müller             [Speichern automatisch] │
│  [Übersicht] [Medien] [▶ Fragmente] [Editor §5] [§6] [Historie] [Akte]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Fragment-Bühne                                    134 Fragmente · 🟢 72 geprüft  │
│  ────────────────────                              12 verworfen · 50 roh │
│                                                                          │
│  Ansicht: ◉ Nach Raum  ○ Nach Quelle  ○ Nach Tag  ○ Nach Zeit          │
│  Filter:  [Suche...           ] 🏷️ [alle Tags ▼] Status: [alle ▼]        │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📍 AUSSEN — WESTFASSADE                                    18 Fragmente │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 "An der Nordwestecke besteht ein diagonaler Riss, ca. 35 cm    │ │
│  │    lang, 0,8–1,2 mm breit."                                        │ │
│  │    🎙️ aus westseite.m4a · 14:32 · 📸 WEST-042 · 🏷️ riss, strukturell│ │
│  │    [✏️ Bearbeiten] [🔗 Verknüpfen] [↕️ Verschieben] [🗑️]             │ │
│  │                                                                     │ │
│  │ 🟢 "Die Risskanten sind scharfkantig, nicht abgerundet."           │ │
│  │    🎙️ aus westseite.m4a · 14:33 · 🏷️ riss, frisch                   │ │
│  │    [✏️] [🔗] [↕️] [🗑️]                                                │ │
│  │                                                                     │ │
│  │ 🟡 "Westfassade zeigt dunkle Verfärbung, evtl. Feuchte." (roh)     │ │
│  │    🎙️ · 14:45 · 🏷️ feuchte?                                          │ │
│  │    [✓ Prüfen & Übernehmen] [✏️] [🗑️ Verwerfen]                       │ │
│  │                                                                     │ │
│  │ [+ 15 weitere anzeigen]                                             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  📍 AUSSEN — NORDFASSADE                                    6 Fragmente  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 "Kein Befund von Auffälligkeit."                                │ │
│  │    ✍️ aus Notiz Tag 2 · 🏷️ kein_befund                               │ │
│  │    [✏️] [🔗] [🗑️]                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  📍 INNEN — WOHNZIMMER EG                                   32 Fragmente │
│  ...                                                                     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [✓ Alle geprüft? Befund-Entwurf generieren →]                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Interaction-Notes:**
- Drag&Drop zwischen Raum-Gruppen (Reklassifikation)
- Multi-Select (Shift+Click) → Bulk-Actions (verwerfen, zusammenlegen, retaggen)
- "Zusammenlegen" öffnet Dialog: zwei Fragmente werden zu einem längeren verschmolzen, Provenance wird als Liste beibehalten
- Status-Ampel: 🟢 geprüft / 🟡 roh / 🔴 KI-Warnung / 🔘 verworfen
- Icon-Legende zeigt immer die Herkunft (🎙️ 📸 ✏️ 📝)

---

## D.2 — §5 Befund-Editor mit Marker & Belege-Sidebar

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Auftrag 12 O 345/25 · §5 Befund                   [Speichern automatisch]│
│  [...] [Fragmente] [▶ §5] [§6] [...]                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ [Undo] [Redo]                         [Drucken] [Export] [≡ Mehr]        │
├──────────────────────────────────────────────────────────────────────────┤
│                                             │                             │
│  §5 FESTSTELLUNGEN                          │   📌 Verknüpfte Belege     │
│                                             │   ──────────────────────    │
│  5.1 Allgemein                              │                             │
│  Die Ortsbesichtigung fand am 12.05.2026    │   🎙️ westseite.m4a        │
│  bei trockenem Wetter und einer Außentem-   │      Aufnahme 14:32-14:35  │
│  peratur von 18°C statt. [🔗F1]             │      "An der Nordwest..."  │
│                                             │      [▶ Anhören]           │
│  5.2 Außenbefund                            │                             │
│  5.2.1 Westfassade                          │   📸 WEST-042.jpg          │
│  An der Nordwestecke des Gebäudes befindet  │      Aufnahme 12.05. 14:35 │
│  sich ein diagonaler Riss, ca. 35 cm lang,  │      [🔍 Groß anzeigen]    │
│  mit einer Breite von 0,8 bis 1,2 mm. [🔗F2]│                             │
│                                             │   📄 Fragment F2 Details    │
│  Die Risskanten sind scharfkantig▌          │      Tags: riss, strukturell│
│  |                                          │      Quelle: 🎙️ 14:32       │
│  │  ┌──────────────────────┐               │      Raum: Westfassade      │
│  │  │ ✨ Verbessern         │ (Bubble bei  │      Status: 🟢 Geprüft    │
│  │  │ B I U                 │  Selection)   │                             │
│  │  │ 📌 Als Fragment       │               │   📚 Literatur-Tipps       │
│  │  │ 🔤 Rechtschreibung    │               │   ──────────────────────   │
│  │  └──────────────────────┘               │                             │
│                                             │   DIN 1053-100 Mauerwerk   │
│  ❓ /                                        │   (Fachbibliothek)         │
│  ┌──────────────────────────────────┐      │   [→ Zitieren]             │
│  │ Einfügen...                       │      │                             │
│  │ 📊 Tabelle (Messwerte)            │      │   🔗 Ähnliche Fälle        │
│  │ 🖼️ Foto aus Medien                │      │   ──────────────────────   │
│  │ ✏️ Skizze aus Medien              │      │                             │
│  │ 📋 Zitat aus Bibliothek           │      │   Auftrag 2023-AX-12       │
│  │ 📎 Fragment-Marker                │      │   (ähnlicher Riss-Befund)  │
│  │ 📐 Inline-Berechnung              │      │   [→ Vergleichen]          │
│  │ 📄 Vorlage                        │      │                             │
│  │ 🤖 KI-Aktion                      │      │                             │
│  └──────────────────────────────────┘      │                             │
│                                             │                             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Interaction-Notes:**
- Selection öffnet Bubble-Menu 3px über Selection-Top
- `/` öffnet Slash-Menu an Cursor-Position
- Sidebar zeigt kontext­sensitiv Belege zum aktuellen Absatz
- Klick auf Marker [🔗F2] in Text → scrollt Sidebar zum Fragment
- Drag Fragment aus Sidebar in Editor → erzeugt automatisch Marker

---

## D.3 — §6 Fachurteil-Editor (erweitert)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  §6 Beantwortung der Beweisfragen                                        │
├──────────────────────────────────────────────────────────────────────────┤
│ [Undo] [Redo]                         [Drucken] [Export] [≡ Mehr]        │
├──────────────────────────────────────────────────────────────────────────┤
│                                             │                             │
│  ⚠️ Beweisfrage 1 von 3 beantwortet         │   📑 Struktur               │
│                                             │   ──────────────────────    │
│  Zu Frage 1:                                │   ✓ Zu Frage 1              │
│  "Ist am streitgegenständlichen Gebäude..."│   ⚠️ Zu Frage 2 (leer)      │
│                                             │   ⚠️ Zu Frage 3 (leer)      │
│  Nach Durchsicht der vorliegenden Feststel- │                             │
│  lungen [🔗F2, F3, F5] ist festzustellen,   │   ⚠️ KI-Hinweis             │
│  dass der beschriebene Riss als strukturell │   ──────────────────────    │
│  zu werten ist. [🔗F2]                       │                             │
│                                             │   "In §5.2 hast du die      │
│  Insbesondere die scharfkantige Risskanten- │   Risskanten als 'nicht     │
│  ausprägung [🔗F2] und die Breite von über  │   abgerundet' beschrieben. │
│  0,5 mm [🔗F3] deuten auf eine aktive       │   Willst du das hier auf    │
│  Bewegung hin.                              │   'frisch' schlussfolgern?" │
│                                             │   [→ Bezug herstellen]      │
│  Demnach ist Frage 1 zu bejahen.▌           │                             │
│                                             │   📌 Verknüpfte Belege     │
│                                             │   ──────────────────────    │
│                                             │   [Details zur Selektion]   │
│                                             │                             │
│                                             │   📚 Literatur             │
│                                             │   ──────────────────────    │
│                                             │   DIN 1053-100              │
│                                             │   BVS Optische Bau-Forensik │
│                                             │                             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Interaction-Notes:**
- Beweisfragen-Navigation oben: "⚠️ Beweisfrage 1 von 3" → zeigt Progress
- Struktur-Sidebar wird automatisch angezeigt, zeigt welche Beweisfragen beantwortet sind
- KI-Hinweis-Sidebar (passiv) meldet Konsistenzprobleme — kein Eingriff, nur Hinweis
- Marker wie in §5, aber zusätzlich optisch unterschieden für "Befund-Referenz" vs. "Fremd-Zitat"

---

## D.4 — Historie-Tab (Audit Two-View)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Auftrag 12 O 345/25 · Historie                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Filter: [Alle] [Nur KI] [Nur Dokumente] [Nur Status]                    │
│  Zeitraum: [12.05.2026 ▼] bis [heute ▼]           [Suche...          🔍] │
│                                                                          │
│  ──────────────────────────── Heute, 12. Mai 2026 ────────────────────  │
│                                                                          │
│  🟢 15:32  Marcel        Gutachten als PDF exportiert                   │
│                          SHA256: a3f2e9b1c4...8d7f                       │
│                          Zertifikat beigefügt (Variante: Kompakt)        │
│                          [Details]                                       │
│                                                                          │
│  📎 15:31  Marcel        Anhang "messprotokoll.pdf" hinzugefügt          │
│                          (1,2 MB, 8 Seiten)                              │
│                                                                          │
│  🤖 14:15–14:25  KI      Editor-Session §6 Fachurteil                    │
│           Marcel         47 KI-Aktionen                                  │
│                          23 ✓ akzeptiert · 15 ✎ bearbeitet · 9 ✗ abgelehnt│
│                          [▼ Details anzeigen]                            │
│                                                                          │
│  📸 13:45  Marcel        8 Fotos hochgeladen aus "Westfassade.zip"       │
│                          fotos: WEST-038 bis WEST-045                    │
│                          Auto-Extraktion: 16 Befund-Fragmente             │
│                          [→ Zu Fragmenten]                               │
│                                                                          │
│  🎙️ 13:44  Marcel        Diktat "westseite.m4a" hochgeladen             │
│                          Dauer 4:32 Min. · Transkribiert                 │
│                          Auto-Extraktion: 22 Befund-Fragmente             │
│                          [▶ Anhören] [→ Zu Fragmenten]                   │
│                                                                          │
│  ──────────────────────── Gestern, 11. Mai 2026 ─────────────────────   │
│                                                                          │
│  🔧 17:02  Marcel        Status auf "In Bearbeitung" geändert            │
│                          (vorher: "Neu angelegt")                        │
│                                                                          │
│  🆕 16:58  Marcel        Auftrag 12 O 345/25 erstellt                    │
│                                                                          │
│  ──────────────────────────────────────────────────────────────────── │
│  [📥 Vollständiges Log als CSV exportieren]                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## D.5 — Versand-Dialog (Stufe 2: Platform-Share)

```
                    ┌────────────────────────────────────────┐
                    │  Gutachten freigeben                    │
                    │                                         │
                    │  ● Sicheren Link erstellen (Empfohlen)  │
                    │  ○ Nur herunterladen (ohne Versand)     │
                    │  ○ Als ZIP für beA-Upload (Anwalt)      │
                    │                                         │
                    │  Empfänger E-Mail(s):                   │
                    │  ┌────────────────────────────────────┐│
                    │  │ ra.meier@kanzlei-xy.de              ││
                    │  │ + Empfänger hinzufügen              ││
                    │  └────────────────────────────────────┘│
                    │                                         │
                    │  Passwort:                              │
                    │  ┌─────────────────────────┐ [🔄 Neu]  │
                    │  │ ••••••••••                │           │
                    │  └─────────────────────────┘           │
                    │  ⓘ Gib dem Empfänger das Passwort       │
                    │    telefonisch oder per SMS durch       │
                    │                                         │
                    │  Ablauf:  [30 Tage ▼]                   │
                    │  Max. Zugriffe:  [5 ▼]                  │
                    │                                         │
                    │  Inhalt:                                │
                    │  ☑ Gutachten PDF                        │
                    │  ☑ Zertifikat (PROVA-Audit)             │
                    │  ☑ Anlagen (8 Dateien, 12 MB)           │
                    │  ☐ Detail-Historie (100+ Seiten)        │
                    │                                         │
                    │  [Abbrechen]  [Link erstellen & Mail]   │
                    └────────────────────────────────────────┘
```

---

## D.6 — Empfänger-Landing-Page

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          PROVA Gutachten-Portal                          │
│                                                                          │
│                   ────────────────────────────────────                   │
│                                                                          │
│                   Gutachten im Verfahren 12 O 345/25                     │
│                   Sachverständiger: Marcel Müller                        │
│                   Ausgestellt am: 12. Mai 2026                           │
│                                                                          │
│                   ────────────────────────────────────                   │
│                                                                          │
│                   🔒 Dieser Bereich ist passwortgeschützt                 │
│                                                                          │
│                   Bitte geben Sie das Passwort ein,                      │
│                   das Sie vom Absender erhalten haben:                   │
│                                                                          │
│                   ┌───────────────────────────┐                          │
│                   │ ••••••••••                │                          │
│                   └───────────────────────────┘                          │
│                                                                          │
│                   [Öffnen]                                               │
│                                                                          │
│                   Gültig bis 11.06.2026                                  │
│                                                                          │
│                   Probleme? Kontaktieren Sie den Absender.               │
│                                                                          │
│                                                                          │
│                   ──────────────────────────────                         │
│                   Daten gehostet in Deutschland (Frankfurt)              │
│                   TLS-verschlüsselt · DSGVO-konform                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## D.7 — Akte-Tab (externe Dokumente)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Auftrag 12 O 345/25 · Akte (externe Dokumente)                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [+ Externes Dokument hochladen]                                         │
│                                                                          │
│  📄 Beweisbeschluss_AG-Muster.pdf  (3 Seiten · 245 KB · 11.05.2026)     │
│     ────────────────────────────────────────────────────────            │
│     ✓ Analyse abgeschlossen                                              │
│     Az.: 12 O 345/25 · Gericht: AG Muster · Datum: 10.05.2026           │
│     5 Beweisfragen erkannt:                                              │
│       1. "Ist am streitgegenständlichen Gebäude..."                      │
│       2. "Welche Ursache hat..."                                         │
│       3. "Welche Kosten..."                                              │
│       4. "Ist die Mängelbeseitigung..."                                  │
│       5. "Bis zu welchem Grad..."                                        │
│     [→ In PROVA übernehmen]  [Details]  [PDF öffnen]                     │
│                                                                          │
│  📄 Vorgutachten_Dr-Schmidt.pdf  (47 Seiten · 4,2 MB · 12.05.2026)      │
│     ────────────────────────────────────────────────────────            │
│     ✓ Analyse abgeschlossen                                              │
│     SV: Dr. Klaus Schmidt · Datum: 03.04.2025                           │
│     12 zentrale Befunde extrahiert                                       │
│     3 Fachurteile identifiziert                                          │
│     [→ Gegenüberstellung öffnen]  [Details]  [PDF öffnen]                │
│                                                                          │
│  📄 Klageschrift_Meier.pdf  (23 Seiten · 1,1 MB · 12.05.2026)           │
│     ────────────────────────────────────────────────────────            │
│     ⏳ Analyse läuft (voraussichtlich noch 20 Sek.)                      │
│     [Abbrechen]                                                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## D.8 — Command-Palette (Cmd+K) — universell

```
                ┌─────────────────────────────────────────────────┐
                │  ⌘K  Befehl suchen...                            │
                │       ▼                                          │
                │  ┌─────────────────────────────────────────────┐ │
                │  │ tabelle                                      │ │
                │  └─────────────────────────────────────────────┘ │
                │                                                  │
                │  Einfügen                                        │
                │   📊 Tabelle einfügen (Messwerte)               │
                │   📊 Tabelle einfügen (Kosten)                  │
                │   📊 Tabelle einfügen (Schäden mit Fotos)       │
                │                                                  │
                │  Bearbeiten                                      │
                │   📊 Zeile hinzufügen ↵                         │
                │   📊 Spalte hinzufügen ⇧↵                       │
                │                                                  │
                │  Export                                          │
                │   📊 Als Excel exportieren                       │
                │                                                  │
                │  [↑↓ Navigation]  [↵ Auswählen]  [Esc Schließen] │
                └─────────────────────────────────────────────────┘
```

Alle Commands der App sind hier durchsuchbar. Aufgerufen via `Cmd+K` / `Ctrl+K`. Ergänzt die drei Invocation-Patterns aus Thema 4.

---

## Zusammenfassende Design-Prinzipien

1. **Sidebar-Panels sind kontext­sensitiv**, nicht statisch.
2. **Bubble-Menu, Slash-Menu, Cmd+K** sind die drei primären Invocation-Patterns.
3. **Icons kommunizieren Provenance** (🎙️ 📸 ✏️ 📝).
4. **Status ist immer als Ampel sichtbar** (🟢 🟡 🔴).
5. **KI-Aktionen sind immer mit 🤖 markiert**, nie versteckt.
6. **Deutsche Begriffe** durchgehend (PROVA-Regel 1).
7. **Keine Provider-Namen** im UI (PROVA-Regel 10).
8. **Körpergröße ≥ 15px, Touch-Targets ≥ 44px** (PROVA-Regel für SV 50+).
