# 🏗️ PROVA Architektur-Blueprint v1.1

**Status:** Master-Referenz · gültig ab 23.04.2026  
**Geltungsbereich:** Solo-Tarif · Team kommt eigenständig später  
**Vorgänger:** Blueprint v1.0 (Session 2)  
**Diese Version integriert:** alle Klärungen aus Session 3 (Stufenmodell, KI-Modi, Bibliotheken, Bienenkönigin, Aktenzeichen, Datensicherheit, Onboarding)

---

## 🎯 Leitidee in einem Satz

> Es gibt **einen** Einstiegspunkt („+ Fall aufmachen"), **eine** Zentrale (die Akte) und **klare Phasen** mit jeweils einem Werkzeug pro Phase. Jede Information findet ihren richtigen Platz automatisch — wie eine Bienenkönigin die alle Wege kennt.

---

## 📐 Vier tragende Prinzipien

### Prinzip 1 — Akte ist das Nervensystem

Alles dreht sich um die `akte.html?az=SCH-XXXX-XXX`. Sie ist:
- **Anker-Seite** für jeden konkreten Fall
- **Phasen-Anzeige** (sehen wo wir sind)
- **Aktions-Hub** (nächsten Schritt starten)
- **Gedächtnis** (alle Eingaben des Falls sichtbar)

### Prinzip 2 — Eine Aktion pro Phase

Jede Phase hat **eine** primäre Aktion mit **einer** dedizierten Seite:

| Phase | Aktion | Seite |
|---|---|---|
| 1 — Auftrag erfassen | Stammdaten anlegen | `neuer-fall.html` |
| 2 — Ortstermin & Erfassung | Diktieren/Fotografieren/Messen/Skizzieren | `ortstermin-modus.html?az=` |
| 3 — KI-Strukturhilfe + §6 | Strukturieren + persönliches Fachurteil | `ki-analyse.html?az=` |
| 4 — Freigabe | Prüfen, PDF rendern | `freigabe.html?az=` |
| 5 — Abschluss | Rechnung, Versand | `rechnungen.html?az=` |

Keine Wizards, keine Schritt-Logik. Jede Seite hat einen Zweck.

### Prinzip 3 — Atomares Speichern

Jede Eingabe in jedem Feld wird **sofort** in Airtable geschrieben:
- **On-Blur** (rausklicken aus Feld) → PATCH zu Airtable
- **30-Sek-Interval** für lange Eingaben (Diktat-Text)
- **Status-Indikator** oben rechts: „Gespeichert vor 3 Sek"
- **Kein** „Am-Ende-alles-speichern"-Button mehr
- **Sicherer Edge-Case:** beforeunload-Handler speichert pending Eingaben

### Prinzip 4 — Bienenkönigin-Datenfluss

Eine Information, die **einmal** erfasst wird, fließt automatisch an alle Stellen wo sie gebraucht wird. Beispiel:

```
Beweisbeschluss-PDF Upload
        ↓
 KI-Extraktion findet AZ Gericht + §411-Frist
        ↓
SV bestätigt einmal mit Klick
        ↓
PARALLELE PIPELINES:
 ├── SCHADENSFAELLE.auftraggeber_az = "19 O 4711/24"
 ├── SCHADENSFAELLE.Abgabefrist = 2026-05-20
 ├── TERMINE.create (typ='§411-Frist', erinnerung_24h, erinnerung_2h)
 ├── AUDIT_TRAIL.create (KI extrahiert, SV bestätigt mit ts)
 ├── Push-Reminder eingeplant
 ├── Akte-Phasen-Leiste zeigt Frist neben Phase 4
 └── Dashboard-Widget "Anstehende Fristen" aktualisiert
```

---

## 🚦 Rote Linien — was die KI darf und nicht darf

### Was die KI darf (Hilfsfunktionen)

| Funktion | Beispiel |
|---|---|
| **Strukturieren** | Diktat-Rohtext in §1-§5 Gliederung sortieren |
| **Konjunktiv-II-Check** | "Es ist Schimmel" → Vorschlag: "Es liegt nahe, dass es sich um Schimmel handelt" |
| **Normen-Vorschlag** | Bei Feuchte 85% rF → DIN 4108-2 vorschlagen |
| **Rechtschreib-/Grammatik-Check** | Marker für Fehler |
| **Foto-Beschreibung** | "Foto 3: Dunkle Verfärbung Wand-Decke-Ecke, ca. 30×40 cm" — beschreibend, nicht bewertend |
| **Diktat-Transkription** | Whisper-Sprache zu Text |
| **Messwerte-Zuordnung** | "85% rF aus Diktat erkannt → Feld f-feuchte vorschlagen" |
| **PDF-Extraktion** | Aus Beweisbeschluss: AZ, Beweisfragen, Fristen extrahieren |
| **Vollständigkeits-Check** | "§3 Befund: keine Raumangabe gefunden" |

### Was die KI NICHT darf (rote Linie)

| Verboten | Warum |
|---|---|
| **Bewertung schreiben** ("Es liegt ein erheblicher Mangel vor") | §407a Abs. 1 ZPO: Persönliche Erstattungspflicht |
| **§6 Fachurteil** generieren | §10 IHK-SVO: Nur SV persönlich, nicht delegierbar |
| **Schadensursachen kausal benennen** ("Ursache ist mangelnde Lüftung") | Fachliche Würdigung = SV-Aufgabe |
| **Sanierungs-Empfehlungen** als Aussage | Ist Bewertung, nicht Beschreibung |
| **Haftungs-/Verschuldensaussagen** | Rechtliche Würdigung |
| **Direkte Kausalsätze ohne Konjunktiv II** | Pflicht: "es liegt nahe, dass..." statt "es ist..." |

---

## 🎨 KI-Hilfen-Modi (universelles Pattern)

Die KI bietet ihre Hilfen in **drei Modi**, jeweils klar getrennt:

### Modus 1 — Passive Sidebar-Vorschläge (während SV tippt)

Während SV tippt, analysiert KI alle 3 Sek. den Text. Findet sie passende Normen/Bausteine, erscheinen sie **rechts am Rand**. Stumm. Klick = einfügt an Cursor-Position. Nicht-störend wenn ignoriert.

### Modus 2 — Slash-Befehle (gezielt inline)

SV tippt mitten im Text:
- `/norm` → öffnet kleines Suchfeld mit Normen
- `/baustein` → öffnet Suchfeld mit Textbausteinen (laenge=mittel)
- `/floskel` → öffnet Suchfeld mit Floskeln (laenge=kurz)
- `/§` → öffnet Suchfeld mit §-Verweisen (Typ=§Recht)

Wie Notion/Linear/GitHub.

### Modus 3 — Modal-Suche (Recherche)

Toolbar-Button [📚] öffnet großes Modal mit Volltextsuche, Filtern (Typ, Schadensart), Details-Ansicht, "Eigene anlegen". Für gründliche Recherche.

---

## 🗺️ Sitemap

### NEU
| Seite | Zweck | Sprint |
|---|---|---|
| `fall-aufmachen.html` | Einstiegspunkt: 3 Zonen (Heute/Offene/Neu) | S3 |
| `neuer-fall.html` | 3-Stufen-Formular für Stammdaten | S3 |
| `ki-analyse.html` | KI-Strukturhilfe + §6 Fachurteil | S5 |

### UMGEBAUT
| Seite | Was ändert sich | Sprint |
|---|---|---|
| `akte.html` | Komplettüberarbeitung: Phasen-Leiste mit CTA | S4 |
| `ortstermin-modus.html` | `?az=`-Pflicht-Param + Tab "Skizze" | S5 |
| `nav.js` (Sidebar) | Akkordeon "Meine Fälle" | S6 |

### BLEIBT IDENTISCH
`dashboard.html` (Tier-1-Widgets fest), `archiv.html`, `freigabe.html`, `rechnungen.html`, `briefvorlagen.html`, `kontakte.html`, `termine.html`, `normen.html`, `textbausteine.html`, alle Werkzeug-Seiten.

### TOT (Redirect oder Weglassen)
- **`app.html`** → Redirect zu `fall-aufmachen.html` (für Bestands-Bookmarks)
- **`app-starter.html`, `app-pro.html`, `app-enterprise.html`** → bereits Redirects in `netlify.toml`
- **Bescheinigungen** → Sidebar-Link entfernen (kommt in K3+ nach Pilotkunden)
- **Jahresbericht** → nur Bug-Fix, Vollausbau nach Pilotkunden

---

## 🔗 URL-Struktur (verbindlich)

```
/                            → index.html (Marketing)
/dashboard.html              → Zentrale (5 Pflicht-Widgets fest verdrahtet)
/fall-aufmachen.html         → Einstiegspunkt — alle Wege beginnen hier
/neuer-fall.html             → Stammdaten-Formular (3 Stufen)
/akte.html?az=SCH-...        → Nervensystem für einen konkreten Fall
/ortstermin-modus.html?az=…  → Diktat/Foto/Messung/Notiz/Skizze (PFLICHT-Param!)
/ki-analyse.html?az=…        → KI-Strukturhilfe + §6 Fachurteil
/freigabe.html?az=…          → Prüfen + PDF-Rendering
/rechnungen.html?az=…        → Rechnung zum Fall
/archiv.html                 → Vollansicht aller Fälle (Filter, Suche)

# Werkzeuge bleiben unverändert
/normen.html · /textbausteine.html · /jveg.html · /positionen.html
/kontakte.html · /briefvorlagen.html · /termine.html

# Legacy → Redirect 301
/app.html                    → /fall-aufmachen.html
/app-starter.html            → /fall-aufmachen.html (in netlify.toml)
/app-pro.html                → /fall-aufmachen.html (in netlify.toml)
/app-enterprise.html         → /fall-aufmachen.html (in netlify.toml)
```

---

## 🖼️ Wireframes — Seite für Seite

### Sidebar (alle Seiten)

```
┌────────────────────────────────────────┐
│  PROVA · Solo                          │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  [ + Fall aufmachen ]   ⌘N       │ │  ← einziger Aktion-Button
│  └──────────────────────────────────┘ │
│                                        │
│  🔎 Schnellsuche                  ⌘K  │
│                                        │
│  ── ARBEIT ───                        │
│  ⊞  Zentrale                          │
│  📂 Meine Fälle                  7 ▾  │  ← Akkordeon
│     ────────────────────────         │
│     ● SCH-2026-031                    │  ← Aktiver Fall fett
│       Gennerstr. 33 · Phase 2         │
│     ○ SCH-2026-029                    │
│       Hauptstr. 12 · Phase 3          │
│     ○ SCH-2026-027                    │
│       Am Markt 5 · Phase 4            │
│     ────────────────────────         │
│     → Alle 7 anzeigen                 │
│  📅 Kalender                          │
│                                        │
│  ── WERKZEUGE ─────                   │
│  📚 Normen                            │
│  📝 Textbausteine                     │
│  🗂  Positionen & Preise              │
│  ⚖️  JVEG-Rechner                     │
│                                        │
│  ── DOKUMENTE ─────                   │
│  💶 Rechnungen                        │
│  ✉️  Briefe & Vorlagen                │
│  📣 Mahnwesen                         │
│                                        │
│  ── BÜRO ─────                        │
│  👥 Kontakte                          │
│  📥 Daten importieren                 │
│                                        │
│  ⚙️  Einstellungen                     │
│  ❓  Hilfe                             │
│  🚪 Abmelden                          │
└────────────────────────────────────────┘
```

**Wegfall:** `Ortstermin` (kommt über Akte), `Zur Freigabe` (kommt über Akte), `Schnellrechnung` (Stub), `E-Rechnung` (ist Funktion innerhalb `rechnungen.html`), `Bescheinigungen` (kommt später), `Jahresbericht` (kommt später).

---

### `fall-aufmachen.html`

```
┌────────────────────────────────────────────────────┐
│  Fall aufmachen                                    │
│                                                    │
│  ┌─── Heute anstehend ─────────────────────────┐ │
│  │  📅 14:00  SCH-2026-031                      │ │
│  │           Gennerstraße 33, 50354 Hürth        │ │
│  │           Schimmelbefall · ARAG               │ │
│  │                              [ Öffnen → ]    │ │
│  │  📅 16:30  SCH-2026-029                       │ │
│  │           Hauptstr. 12, 50667 Köln            │ │
│  │           Brandschaden · LG Köln              │ │
│  │                              [ Öffnen → ]    │ │
│  └────────────────────────────────────────────────┘ │
│                                                    │
│  ┌─── Offene Fälle (7) ──────────────────────┐ │
│  │  🔎 [Fall suchen…]                          │ │
│  │                                              │ │
│  │  SCH-2026-027  Am Markt 5  ·  Phase 4       │ │
│  │  SCH-2026-023  Poststr. 9  ·  Phase 3       │ │
│  │  SCH-2026-020  Kiefernw. 14·  Phase 2       │ │
│  │  SCH-2026-019  Hauptweg 5  ·  Phase 4       │ │
│  │  SCH-2026-015  Birkenallee 3 · Phase 3      │ │
│  │                            → Alle anzeigen  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌─── Neuer Fall ───────────────────────────────┐ │
│  │  [ + Neuen Fall komplett anlegen ]           │ │
│  │  Auftragstyp, Adresse, Schadensart           │ │
│  │  ca. 2 Minuten                               │ │
│  └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

**Daten-Quellen:**
- Heute: `TERMINE` (filter: heute, sv_email)
- Offene: `SCHADENSFAELLE` (Status != Abgeschlossen, sv_email)
- Klick → `akte.html?az=...`

---

### `neuer-fall.html` — 3-Stufen-Formular

#### Stufe 1: Auftragstyp wählen

```
┌─── 1. Auftragstyp wählen ─────────────────┐
│                                              │
│  Karten-Grid mit 6 Optionen:                │
│                                              │
│  ⚖️  Gerichtsgutachten                       │
│      Beweisbeschluss vom Gericht.            │
│      §1–§6 Struktur, JVEG-Abrechnung.        │
│                                              │
│  🏢  Versicherungsgutachten                  │
│      Auftrag von Versicherung.               │
│      Kompaktes Format, freies Honorar.       │
│                                              │
│  👤  Privatgutachten                         │
│      Auftrag von Privatperson.               │
│                                              │
│  📐  Beweissicherung                         │
│      §485 ZPO selbständiges Verfahren.       │
│                                              │
│  ⏱️  Beratung/Stellungnahme                  │
│      Kürzeres Format, kein Vollgutachten.    │
│                                              │
│  🏗  Baubegleitung                           │
│      Mehrtermin-Logik, eigene Phase-Struktur.│
│                                              │
└──────────────────────────────────────────────┘
```

#### Stufe 2: Optionaler PDF-Upload

```
┌─── 2. Dokumente hochladen (optional) ──┐
│                                          │
│  Sie haben Dokumente vom Auftraggeber?  │
│  PROVA liest sie aus und füllt das       │
│  Formular automatisch.                   │
│                                          │
│  [📥 Beweisbeschluss / Schadensmeldung   │
│      / Auftrag hochladen]                │
│                                          │
│  → Oder Schritt überspringen            │
└──────────────────────────────────────────┘
```

Bei Upload: KI extrahiert AZ, Fristen, Parteien. Jeder Fund wird **einzeln zur Bestätigung** angezeigt mit Quellenangabe (PDF-Seite + Original-Auszug). Nur was bestätigt ist, wird übernommen → **Haftung beim SV**.

#### Stufe 3a: Gemeinsame Stammdaten (immer)

```
┌─── 3a. Auftraggeber & Schadensort ──────────┐
│  ○ Gespeichert vor 3 Sek.                   │
│                                              │
│  Auftraggeber-Name *  [_______________]      │
│  Email                [_______________]      │
│  Telefon              [_______________]      │
│  [ Aus Kontakten wählen ▾ ]                  │
│                                              │
│  Schadensort:                                │
│  Straße/Nr *          [_______________]      │
│  PLZ / Ort *          [_____] [_________]   │
│  Gebäudetyp           [Einfamilienhaus ▾]    │
│  Baujahr              [____]                 │
│  Etage / Lage         [_______________]      │
│                                              │
│  Schadensart *        [● Schimmelbefall ▾]  │
│  Schadensdatum        [21.04.2026]           │
│  Ortstermin           [TT.MM.JJJJ] (opt.)    │
└──────────────────────────────────────────────┘
```

#### Stufe 3b: Typ-spezifische Felder (conditional)

**Bei Gerichtsgutachten:**
```
┌─── 3b. Gerichtsgutachten-Details ───────────┐
│  Gericht *            [_______________]      │
│  AZ Gericht *         [19 O 4711/24]         │
│  Beweisbeschluss-Datum * [TT.MM.JJJJ]        │
│  Beweisfragen         [Textarea]             │
│  §411-Frist (auto)    [berechnet aus B.Datum]│
│                                              │
│  ⚠️  §407a-Anzeige sofort erforderlich       │
└──────────────────────────────────────────────┘
```

**Bei Versicherungsgutachten:**
```
┌─── 3b. Versicherungs-Details ───────────────┐
│  Versicherung *       [_______________]      │
│  Schadensnummer *     [_______________]      │
│  Policennummer        [_______________]      │
│  Sachbearbeiter       [_______________]      │
│  Selbstbehalt €       [______]               │
└──────────────────────────────────────────────┘
```

**Bei Privatgutachten:**
```
┌─── 3b. Privatgutachten-Details ─────────────┐
│  ☑ Auftraggeber ist Verbraucher (§312g BGB) │
│      → Widerrufsbelehrung erforderlich       │
│  Honorar-Vereinbarung [________]             │
└──────────────────────────────────────────────┘
```

(Analog für Beweissicherung, Beratung, Baubegleitung)

---

### `akte.html` (Nervensystem)

```
┌─────────────────────────────────────────────────────┐
│  ← Zurück  Akte SCH-2026-031                        │
│                                                     │
│  Schimmelbefall · Gennerstraße 33, 50354 Hürth      │
│  Auftraggeber: ARAG · AZ: 4711234/24                │
│  Geschädigter: Familie Müller                       │
│  Angelegt: 21.04.2026 · Status: In Bearbeitung      │
│                                                     │
│  ┌─── Phasen-Fortschritt ────────────────────────┐ │
│  │ ✅ 1  Auftrag erfasst         21.04.26 10:15  │ │
│  │                                                │ │
│  │ ⚠️  §407a-Anzeige fehlt!  SOFORT erforderlich│ │
│  │     [ §407a-Anzeige erstellen ]               │ │
│  │                                                │ │
│  │ ⏳ 2  Ortstermin & Erfassung                  │ │
│  │     [ Ortstermin starten → ]                   │ │
│  │     📷 0 Fotos · 🎤 0 Diktate · ✏️ 0 Skizzen │ │
│  │                                                │ │
│  │ ⭕ 3  KI-Strukturhilfe & §6 Fachurteil       │ │
│  │     (gesperrt — Phase 2 zuerst)               │ │
│  │                                                │ │
│  │ ⭕ 4  Freigabe & PDF                          │ │
│  │     ⚠️ §411-Abgabefrist: 20.05.26 (in 23T)   │ │
│  │                                                │ │
│  │ ⭕ 5  Rechnung & Abschluss                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─── Werkzeuge im Kontext ──────────────────────┐ │
│  │ [ + Diktat anhängen ]                          │ │
│  │ [ + Foto hochladen ]                           │ │
│  │ [ + Skizze anlegen ]                           │ │
│  │ [ + Brief schreiben ]                          │ │
│  │ [ Stammdaten bearbeiten ]                      │ │
│  │ [ §407a Anzeige ] (nur bei Gerichtsgutachten) │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─── Diktat-Verlauf ────────────────────────────┐ │
│  │ Noch keine Diktate. Phase 2 starten →          │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─── Anhänge ──────────────────────────────────┐ │
│  │ 📷 Fotos (0) · ✏️ Skizzen (0) · 📄 Doks (0)  │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

### `ortstermin-modus.html` mit Skizze-Tab

```
┌─────────────────────────────────────────────────────┐
│  ← Zur Akte zurück                                  │
│                                                     │
│  Ortstermin · SCH-2026-031                          │
│  Schimmelbefall · Gennerstr. 33, Hürth              │
│                                                     │
│  ○ Gespeichert vor 3 Sek.        [ Beenden ]        │
│                                                     │
│  ┌─── Tabs ─────────────────────────────────────┐ │
│  │ 📷 Fotos · 🎤 Diktat · 📏 Messung ·           │ │
│  │ 📝 Notizen · ✏️ Skizze                       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  [Tab-Inhalt aktiv: Default = 📷 Fotos]             │
└─────────────────────────────────────────────────────┘
```

#### Skizze-Tab

```
┌─────────────────────────────────────────────────────┐
│ Skizzen (3)                                         │
│ [ S1: Wohnzimmer ▼ ] [ + Neue Skizze ]             │
│                                                     │
│ ┌─── Werkzeuge ──────────────────────────────────┐ │
│ │ ✏️  📐  ⭕  ▭  📍  🖍  🧭  📏              │ │
│ │ ↶ ↷ 🗑 ✋   🎨[●●●●]  Strich:[━━━]         │ │
│ └────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─── Hintergrund ──────────────────────────────┐  │
│ │ ○ Leer  ● Foto laden  ○ Vorlage Grundriss    │  │
│ └────────────────────────────────────────────────┘  │
│                                                     │
│ ┌─── Zeichenfläche ────────────────────────────┐  │
│ │     ┌────────────────┐                        │  │
│ │     │ Wohnzimmer (N) │  ← Nordpfeil          │  │
│ │     │      ●1        │                        │  │
│ │     │   ●2  ●3       │                        │  │
│ │     └────────────────┘                        │  │
│ └────────────────────────────────────────────────┘  │
│                                                     │
│ ┌─── Marker-Beschriftungen ────────────────────┐  │
│ │ ●1: [Schimmel Ecke Außenwand Nord, 30cm Ø]   │  │
│ │ ●2: [Wassereintritt Sockelleiste]             │  │
│ │ ●3: [Riss vertikal, 1,5mm]                    │  │
│ └────────────────────────────────────────────────┘  │
│                                                     │
│ Skizze: S1_wohnzimmer.png · Auto-gespeichert        │
└─────────────────────────────────────────────────────┘
```

**Werkzeug-Set:** signature_pad als Basis (~8KB, MIT-Lizenz). Tier 1 + 2 (Stift, Linie, Kreis, Rechteck, Pin-Marker, Text, Undo/Redo, Hintergrundbild, Nordpfeil, Maßstab). Mehrere Skizzen pro Fall via `+ Neue Skizze`.

---

### `ki-analyse.html`

```
┌─────────────────────────────────────────────────────┐
│  ← Zur Akte zurück                                  │
│  KI-Strukturhilfe · SCH-2026-031 · Phase 3 von 5    │
│                                                     │
│  ┌─── Datengrundlage ────────────────────────────┐ │
│  │ 📷 14 Fotos · 🎤 3 Diktate · 📏 6 Messungen   │ │
│  │ ✏️ 2 Skizzen · Letztes Diktat: vor 2 Tagen    │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  [ Diktat strukturieren & prüfen ]                  │
│                                                     │
│  ┌─── Strukturhilfe §1-§5 ───────────────────────┐ │
│  │ §1 Auftrag           [ ✏️ ]                   │ │
│  │ §2 Anknüpfungstatsachen [ ✏️ ]                │ │
│  │ §3 Befund            [ ✏️ ]                   │ │
│  │ §4 Bewertung *       [ ✏️ ]                   │ │
│  │ §5 Zusammenfassung   [ ✏️ ]                   │ │
│  │                                                │ │
│  │ * KI macht keine Bewertung — nur Struktur-    │ │
│  │   vorschläge aus dem Diktat. SV formuliert.   │ │
│  │                                                │ │
│  │ 🤖 STRUKTURVORSCHLAG · vom SV zu prüfen       │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─── §6 Fachurteil (SV-eigenhändig) ────────────┐ │
│  │ [Großes Textareafeld - frei tippen/diktieren] │ │
│  │                                                │ │
│  │ Aktuell: 0 / 500 Zeichen                      │ │
│  │                                                │ │
│  │ Hilfsmittel (auf Wunsch):                      │ │
│  │ [📚 Norm einfügen ▾] [📝 Baustein] [💬 Floskel]│ │
│  │ [🔍 Konjunktiv-II prüfen] [✏️ Recht]          │ │
│  │                                                │ │
│  │ ┌─── Sidebar: Erkannte Normen ───┐            │ │
│  │ │ 💡 Passt vermutlich:           │            │ │
│  │ │ DIN 4108-2 [Einfügen ↵]       │            │ │
│  │ │ WTA 6-1-01/D [Einfügen ↵]     │            │ │
│  │ │ → Bibliothek öffnen            │            │ │
│  │ └────────────────────────────────┘            │ │
│  │                                                │ │
│  │ [ ✓ Geprüft & als Eigenleistung übernehmen → ]│ │
│  │   → schreibt timestamp + sv_email in AUDIT     │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│             [ Zur Freigabe → ]                      │
└─────────────────────────────────────────────────────┘
```

**§6-Audit-Trail:** Klick auf "Geprüft" schreibt in AUDIT_TRAIL: timestamp, sv_email, sv_validiert=true, output_laenge, aenderungsquote zu KI-Vorschlag (für IHK-Verteidigung bei Anfechtung).

---

## 🐝 Bienenkönigin-Datenfluss (vollständig)

```
┌─────────────────────────────────────────┐
│      SCHADENSFAELLE (Akte = Königin)    │
│  prova_aktenzeichen, sv_email,          │
│  Stammdaten, Status, Phase, Fristen     │
└─────────────────────────────────────────┘
      │           │            │           │
   ┌──┘           │            │           └────┐
   ↓              ↓            ↓                ↓
TERMINE       DIKTATE       BRIEFE         RECHNUNGEN
(Fristen,     (S6-NEU)     (gesendet)     (mit AZ)
 Termine)
   │
   │      ┌────────────────────┐
   │      │   AUDIT_TRAIL      │
   │      │  (alle Aktionen,   │
   │      │   KI-Nutzungen,    │
   │      │   §407a-Anzeigen)  │
   │      └────────────────────┘
   ↓
PUSH-Notify       
(Kalender-Erinnerungen)
```

**Jede Information bekommt ihren Platz** + ist mit `prova_aktenzeichen` als zentralem Schlüssel verknüpft.

---

## 📚 Bibliotheken — universelles Konzept

### Die 4 Bibliotheken die PROVA nutzt

| # | Bibliothek | Tabelle | Slash | Verwaltung |
|---|---|---|---|---|
| 1 | **Normen** (DIN/WTA/§-Recht) | NORMEN | `/norm`, `/§` | `normen.html` |
| 2 | **Textbausteine + Floskeln** (laenge=kurz/mittel/lang) | TEXTBAUSTEINE_CUSTOM | `/baustein`, `/floskel` | `textbausteine.html` |
| 3 | **Positionen & Preise** | POSITIONEN_DATENBANK | — | `positionen.html` |
| 4 | **Kontakte** | KONTAKTE | (Dropdown) | `kontakte.html` |

### Konsolidierung K3
- `NORMEN_DB` aus `normen-logic.js` und `stellungnahme-logic.js` (3-fach hartcodiert) → entfernen
- Beide Stellen lesen live aus Airtable `NORMEN`-Tabelle
- Update einer Norm in Airtable = überall sofort aktualisiert
- Neues Feld `Typ` in NORMEN: `DIN | WTA | VOB | § Recht | Eigene` für Filter

### Floskeln-Implementierung
- Neue Spalte `laenge` in TEXTBAUSTEINE_CUSTOM (Single Select: kurz/mittel/lang)
- 40-50 Seed-Floskeln werden mit `laenge=kurz` angelegt (siehe `FLOSKELN-SEED-DATEN.md`)
- Slash `/floskel` filtert auf `laenge=kurz`, `/baustein` auf `laenge=mittel`

---

## 🗄️ Airtable-Schema-Änderungen (S3)

### Neue Tabelle: `DIKTATE`

| Feld | Typ | Beispiel |
|---|---|---|
| `name` | Single line text (Primary) | "D-2026-031-1" |
| `fall_az` | Single line text | `SCH-2026-031` |
| `sv_email` | Email | (Pflicht!) |
| `typ` | Single Select | Ortstermin, Nachtrag, Korrektur, Recherche-Ergänzung |
| `text_volltext` | Long Text | "Schaden ist Kondensat..." |
| `text_revidiert_von` | Single line text | bei Korrektur: Ref auf Original |
| `aufgenommen_am` | Date and time | 2026-04-21 10:23 |
| `dauer_sekunden` | Number | 87 |
| `transkription_modell` | Single line text | `whisper-large-v3` |
| `audio_url` | URL | (optional) |
| `erstellt_am` | Created time | (auto) |

**WICHTIG:** Tabelle muss in `airtable.js` `ALLOWED_TABLES`-Whitelist eingetragen werden mit `userField: 'sv_email'`.

### Neue Felder in SCHADENSFAELLE

| Feld | Typ | Default |
|---|---|---|
| `phase_aktuell` | Number | 1 |
| `phase_2_completed_at` | Date and time | leer |
| `phase_3_completed_at` | Date and time | leer |
| `phase_4_completed_at` | Date and time | leer |
| `phase_5_completed_at` | Date and time | leer |
| `prova_aktenzeichen` | Single line text | leer (Migration: aus `Aktenzeichen`) |
| `auftraggeber_az` | Single line text | leer (Migration: aus `Auftrags_Nr`+`Schadensnummer_Versicherung`) |
| `policennummer` | Single line text | leer (Migration: aus `Polizzennummer`+`Versicherungsschein_Nr`) |
| `frist_quelle` | Long text | leer (Audit für KI-extrahierte Fristen) |
| `frist_bestaetigt_ts` | Date and time | leer (Haftungs-Übernahme) |

### Neues Feld in SACHVERSTEANDIGE
- `dashboard_config` (Long Text JSON)

### Neues Feld in TEXTBAUSTEINE_CUSTOM
- `laenge` (Single Select: kurz/mittel/lang)

---

## 🛤️ Migrationsplan für Bestandsfälle

| Bestand | Migration |
|---|---|
| Status `Neuer Auftrag` | `phase_aktuell=1`, CTA "Stammdaten vervollständigen" |
| Status `In Bearbeitung` mit Diktaten | `phase_aktuell=3`, CTA "KI-Analyse starten" |
| Status `In Bearbeitung` ohne Diktate | `phase_aktuell=2`, CTA "Ortstermin starten" |
| Status `Entwurf fertig` | `phase_aktuell=4`, CTA "Zur Freigabe" |
| Status `Abgeschlossen` | `phase_aktuell=5`, kein CTA |

**Ausführung:** Migration-Skript in S4 als Node.js-Snippet, Marcel führt es einmalig aus.

---

## 📊 Dashboard — 5 Pflicht-Widgets (fest verdrahtet, nicht konfigurierbar)

### Tier 1 — fest verdrahtet, in dieser Reihenfolge

1. **🚨 Kritisches** — was JETZT erledigt werden muss (§407a-Pflicht, Fristen <3 Tage)
2. **📅 Heute** — Termine + Fristen heute
3. **📂 Aktive Fälle** — Top 5 zuletzt bearbeitete
4. **⏰ Anstehende Fristen** — Vorschau 14 Tage
5. **📊 Diese Woche** — Anzahl Fotos, Diktate, abgeschl. Fälle, Rechnungen

### Tier 2 — kommt später (K3+) als konfigurierbar

Offene Rechnungen, Monats-KPIs, Letzte Diktate, Foto-Galerie, KI-Tipps, Norm des Tages, Persönliche Stats

---

## 🔒 Datensicherheit (Sprint S-Sicher, Pflicht vor Pilotkunden)

| # | Aufgabe | Priorität |
|---|---|---|
| 1 | localStorage-Reduktion: Kontakte/Bausteine/Fälle in Airtable | 🔴 kritisch |
| 2 | KI-Pseudonymisierung verifizieren + ggf. nachbauen | 🔴 kritisch (DSGVO!) |
| 3 | PDF-URLs absichern (Bearer-Token oder Signed-URLs) | 🟠 hoch |
| 4 | Audit-Trail-Completeness-Check | 🟠 hoch |
| 5 | Backup-Strategie dokumentieren | 🟠 hoch |
| 6 | Auto-Logout nach 60 Min Inaktivität | 🟡 medium |
| 7 | Multi-Tenant-Audit (alle Queries mit sv_email) | 🔴 kritisch |

→ siehe `SPRINT-S-SICHER.md` und `SPRINT-S-AUDIT.md`

---

## 🎓 Onboarding für 50-60-jährige SVs

### Schicht 1 — Grundzugänglichkeit (Pflicht in S1.5)
- Default-Schriftgröße 16px
- AA-Kontrast (besser AAA)
- Klickflächen min. 44×44px
- Font-Size-Toggle nutzt existierendes `app_fontsize`-Feld

### Schicht 2 — Erstlogin-Wizard (Sprint K2-Onboarding)
5 Schritte: Willkommen → Profil-Daten → Schriftgröße → E-Mail-Verbindung → Erster Test-Fall

### Schicht 3 — Erste-Schritte-Checkliste auf Dashboard
Persistentes Widget mit 7 Punkten, verschwindet automatisch wenn alle ✅

### Schicht 4 — Kontext-Hilfe überall
- Feld-Tooltips (kleines ❓): erklären NUR PROVA-spezifische Funktionen, NIE Fachbegriffe
- Erklär-Bereiche oben auf Seite (einklappbar)
- Live-Hilfe-Button unten rechts (immer sichtbar)
- Leer-Zustände mit Anleitung statt "keine Einträge"

### Schicht 5 — Demo-Fall zum Üben
SCH-DEMO-001 vorgefertigt, gelb markiert, "Demo zurücksetzen"-Button

---

## 📅 Sprint-Reihenfolge

| # | Sprint | Inhalt | Aufwand | Vor Pilotkunden? |
|---|---|---|---|---|
| 1 | **S-AUDIT** | Sicherheits-Audit (NUR LESEN) | 2-3 Std | ✅ Pflicht (zuerst!) |
| 2 | **IMPORT-FIX** | Import schreibt in Airtable statt localStorage | 2 Std | ✅ Pflicht |
| 3 | **S-SICHER** | Sicherheitslücken aus Audit fixen + E2E-Tests | 12-15 Std | ✅ Pflicht |
| 4 | **S3** | fall-aufmachen.html + neuer-fall.html | 4-6 Std | ✅ Pflicht |
| 5 | **S4** | akte.html Umbau (Phasen-Leiste + CTA) | 3-4 Std | ✅ Pflicht |
| 6 | **S5** | ki-analyse.html + ortstermin-modus + Skizze | 6-8 Std | ✅ Pflicht |
| 7 | **S6** | Sidebar-Akkordeon + DIKTATE-Tabelle | 3-4 Std | ✅ Pflicht |
| 8 | **K2-Onboarding** | Wizard + Checkliste + Demo-Fall | 9 Std | ✅ Pflicht |
| 9 | **K2-KI-Hilfen** | Slash-Befehle, Sidebar-Vorschläge, Modal | 6 Std | optional |
| 10 | **K3** | PDF-Extraktion + Bescheinigungen + AZ-Migration | 12 Std | nach Pilot |

---

## ✅ Was diese Version v1.1 gegenüber v1.0 ergänzt

1. **Bienenkönigin-Datenfluss** als 4. tragendes Prinzip
2. **Rote Linien KI** als eigenes Kapitel
3. **3-Modi-KI-Hilfen** (Sidebar passiv + Slash + Modal)
4. **3-Stufen-Formular** für `neuer-fall.html` mit typ-spezifischen Feldern
5. **Skizze-Tab** in `ortstermin-modus.html` mit signature_pad
6. **Bibliotheken-Konzept** universell mit Slash-Befehlen
7. **Aktenzeichen-Klarheit** (3 Felder)
8. **Datensicherheit-Sprint** S-Sicher + S-Audit
9. **Onboarding-Schichten** für ältere SVs (Tooltips erklären keine Fachbegriffe!)
10. **Floskeln** als laenge=kurz in TEXTBAUSTEINE_CUSTOM
11. **§6-Audit-Trail-Klick** für Haftungs-Beweisbarkeit
12. **PDF-Upload + KI-Extraktion** mit Quellen-Bestätigung
13. **Frist-Pipeline** 5-fach (Akte/Termine/Dashboard/Push/Sidebar)
14. **Dashboard fest verdrahtet** Tier 1, Konfiguration später

---

## 📝 Master-Referenz Status

Dieses Dokument ist **die einzige Quelle der Wahrheit** für PROVA-Architektur ab 23.04.2026.

Bei Widersprüchen zu früheren Dokumenten gilt diese Version.

Änderungen werden als v1.2, v1.3 etc. dokumentiert.
