# TEIL B · Thema 7 (Bonus) — Externe Dokumente einlesen

**Die Frage (Marcel):** *"Der Beweisbeschluss ist externes PDF. Vorhergehende Gutachten, Gegen-Gutachten … wie helfen wir dem SV, diese schnell zu verstehen, zu durchdringen und mit seinem eigenen Gutachten zu verweben?"*

---

## Direkte Antwort

**Ja, das ist möglich. Ja, es ist wertvoll. Nein, es ist kein Pilot-Feature.** Ich plädiere für Q4 2026 / Q1 2027 — aber das Fundament kann jetzt gelegt werden.

---

## Was ist gemeint — die 4 Dokumenten­klassen

1. **Beweisbeschluss** (Gericht → SV). Strukturiert, kurz, definiert die Beweisfragen. 1-5 Seiten.
2. **Akten-Auszüge** (Klageschrift, Klageerwiderung, Schriftsätze). Lang (10-100 Seiten), unstrukturiert.
3. **Vor-Gutachten / Gegen-Gutachten** (andere SV). Strukturiert aber lang (20-200 Seiten), mit Befunden und Würdigungen.
4. **Technische Unterlagen** (Baupläne, Zeichnungen, Messprotokolle Dritter). Gemischt, oft als Scans.

Unterschiedliche Dokumente, unterschiedliche Extraktions-Aufgaben.

---

## Die 3 Wertebenen pro Dokument

Für jedes hochgeladene externe Dokument kann PROVA 3 Dinge tun:

### Wert-Ebene 1 — Strukturelle Erkennung (einfach, erlaubt)
- Seiten­zählung, Überschriften-Erkennung (Gliederung)
- Datum, Az., Parteien auto-extrahieren
- Signatur-Seite identifizieren
- Anhang-Bereich vs. Haupttext trennen

→ Pur mechanisch, kein §407a-Problem. **Klasse A (Konvertierung)** aus Thema 1.

### Wert-Ebene 2 — Inhaltliche Extraktion (mittel, mit Vorsicht)
- Bei Beweisbeschluss: die einzelnen Beweisfragen als Liste extrahieren → **automatisch in PROVAs Beweisfragen-Tabelle einfügen** (nach SV-Bestätigung)
- Bei Vor-Gutachten: die zentralen Befunde und Würdigungen extrahieren → als "externe Bezugspunkte" in PROVA ablegen
- Bei Akten: relevante Zeugen­namen, Daten, Orte extrahieren → als Stammdaten-Kandidaten

→ Mittlere Risiko-Klasse. Auto-Fill nur mit SV-Bestätigung. **Klasse B (Vorschlag)** aus Thema 1.

### Wert-Ebene 3 — Argumentative Analyse (XL, Grauzone)
- "Was sind die Kernaussagen des Gegen-Gutachtens, zu denen dein Befund widerspricht?"
- "Welche Beweisfragen werden im Vor-Gutachten nicht vollständig beantwortet?"
- "Wo fehlen Belegstellen in der Klageschrift?"

→ **Das ist schon Rechts-/Sach­auseinandersetzung.** Grenzwertig für §407a — dem SV darf Analyse nicht abgenommen werden.

**Empfehlung:** Ebene 3 baut *kein* automatisches Urteil, sondern strukturiert nur (Tabelle der Kernaussagen, farbliche Markierung von widersprüchlichen Passagen). Der SV zieht die Schluss­folgerung.

---

## Technik: wie extrahieren wir?

### Für digitale PDFs (Text-Layer vorhanden)
- `pdf.js` oder `pdf-parse` für Text-Extraktion
- LLM-Extraktion der strukturierten Felder (Az., Datum, Parteien) via JSON-Schema-Output
- LLM-Extraktion der Beweisfragen (Finde alle Sätze, die mit "Es wird Beweis erhoben über..." beginnen und liste die Fragen)

### Für gescannte PDFs (Bild-Layer)
- OCR: Tesseract (open source, self-hosted) für Basis-Qualität, ODER
- Azure Document Intelligence / AWS Textract (Quelle 12 Teil A) für bessere Qualität — aber: **nicht Azure US** sondern Frankfurt-Region
- Self-Host-Alternative: `marker-pdf` (open source, basiert auf Transformer-Modellen, DSGVO-safe)

### Für Baupläne / Zeichnungen
- Vision-Models (GPT-4o, Claude 3.7)
- Spezielle Prompts: "Beschreibe in 3 Sätzen was du auf diesem Bauplan siehst"
- KEIN Auto-Import in den Befund — nur als Anhang + Beschreibungs­vorschlag

### Pipeline (Edge Function `external-doc-analyze-v1`)

```
Upload → Typ-Erkennung (Beweisbeschluss / Gutachten / Akte / Technisch)
       → Wert-Ebene 1 (strukturell)
       → Wert-Ebene 2 (inhaltlich, mit JSON-Schema-Output)
       → Speicherung in neue Tabelle `externe_dokumente`
       → UI-Vorschlag: "Wir haben 5 Beweisfragen gefunden. Übernehmen?"
```

---

## Datenmodell

```
externe_dokumente {
  id: uuid
  auftrag_id: uuid
  datei_id: uuid               -- FK auf dateien (Supabase Storage)
  typ: enum (beweisbeschluss, vor_gutachten, gegen_gutachten, akte, 
             bauplan, messprotokoll, sonstiges)
  seiten_anzahl: int
  
  -- Strukturelle Metadaten (Ebene 1)
  az: text
  gericht: text
  datum: date
  parteien: json
  signatur_seite: int
  
  -- Inhaltliche Extraktion (Ebene 2, Entwürfe)
  extrahierte_beweisfragen: json  -- Array, bei Beweisbeschluss
  extrahierte_befunde: json        -- Array, bei Vor-Gutachten
  extrahierte_zeugen: json
  
  -- Status der Extraktion
  extraktion_status: enum (pending, running, done, failed)
  sv_bestaetigt: bool              -- SV hat Inhalt validiert
  
  -- Volltext für Suche
  volltext: text                    -- OCR-Output
  embedding: vector(1536)           -- für Cross-Referencing
  
  created_at, updated_at
}
```

---

## UI — der "Akte-Tab" im Auftrags-Detail

Ein neuer Tab im Auftragsdetail:

```
┌──────────────────────────────────────────────────────┐
│  Auftrag 12 O 345/25                                  │
│  [Übersicht] [Medien] [Editor] [Historie] [▶ Akte]    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Hochgeladene externe Dokumente                       │
│  ─────────────────────────────────                    │
│                                                       │
│  📄 Beweisbeschluss_AG-Muster.pdf (3 Seiten)          │
│     ✓ Analysiert · 5 Beweisfragen erkannt             │
│     [Details ansehen] [In PROVA übernehmen]           │
│                                                       │
│  📄 Vorgutachten_Dr-Schmidt.pdf (47 Seiten)           │
│     ✓ Analysiert · 12 Befunde extrahiert              │
│     [Details ansehen] [Gegenüberstellung öffnen]      │
│                                                       │
│  📄 Klageschrift_Meier.pdf (23 Seiten)                │
│     ⏳ Wird analysiert...                              │
│                                                       │
│  [+ Externes Dokument hochladen]                      │
└──────────────────────────────────────────────────────┘
```

### Gegenüberstellung-Modus (Split-View für Vor-Gutachten)

Wenn der SV ein Vor-/Gegen-Gutachten in seinem eigenen Befund verweben will:

```
┌──────────────────────────────────┬──────────────────────────────┐
│  VORGUTACHTEN Dr. Schmidt         │  DEIN BEFUND §5               │
│                                   │                               │
│  Befund 4: "Die Rissbreite beträgt│ Cursor hier  ▌                │
│  zwischen 0,5 und 1,0 mm und ist  │                               │
│  als nicht strukturell zu werten."│ [Übernehmen als Zitat →]      │
│                                   │ [Widerspruch dokumentieren →] │
│  [Widerspricht dem?]              │                               │
└──────────────────────────────────┴──────────────────────────────┘
```

Der SV kann Passagen aus dem Vor-Gutachten auswählen und:
- Als Zitat übernehmen (mit korrekter DIN-1505-Quellenangabe)
- Einen Widerspruchs-Vermerk anlegen (mit Begründung)
- In die Cross-Reference-Liste aufnehmen

---

## Warum das NICHT im Pilot ist

1. **Qualitäts-Kalibrierung.** Extraktion aus realen Gerichts-PDFs ist schwer. Wir brauchen 50-100 reale Test-Dokumente von Marcel/Claude für Kalibrierung. Das dauert.
2. **Juristische Absicherung.** Insbesondere Ebene 3 (argumentative Analyse) braucht Legal-Review.
3. **Datenschutz.** Externe Dokumente enthalten oft Daten Dritter. Die Datenschutz-Konzepte (Auftrags­verarbeitung, Löschfristen, Zweck­bindung) brauchen vor Live-Gang eine eigene DSFA.
4. **Produkt-Prio.** Thema 3 (HERZSTÜCK) > Thema 7. Erst muss das interne Asset-Handling brillieren.

---

## Roadmap-Vorschlag

| Phase | Zeit | Inhalt |
|---|---|---|
| Fundament | Q1 2026 (parallel zu Pilot) | Neue Tabelle `externe_dokumente`, einfacher Upload-Pfad, Volltext-OCR, Storage in pgvector |
| Ebene 1 | Q2 2026 | Strukturelle Extraktion (Az., Datum, Parteien, Beweisfragen-Kandidaten) |
| Ebene 2 | Q3 2026 | Inhaltliche Extraktion mit SV-Bestätigung, "Akte-Tab" in Auftrags-UI |
| Ebene 3 | Q4 2026 / Q1 2027 | Gegenüberstellungs-Modus, Widerspruchs-Assistent |

---

## Das strategische Argument

Kein anderer SV-Workflow-Anbieter kann das heute. DATEV Anwalt classic fokussiert auf Anwaltsseite. MS-Word-Workflows haben null Verständnis für Dokument-Semantik. 

Wenn PROVA in Q4 2026 sagen kann: *"Du lädst den Beweisbeschluss hoch, und das System hat schon alle 5 Beweisfragen als Struktur angelegt — du fängst nicht bei Null an"*, dann ist das der **zweite Moat** nach dem HERZSTÜCK.

Aber ein Moat muss solide gebaut sein, nicht hastig. Deshalb: **Fundament ja, Full-Feature Q4 2026.**

---

## Konkrete Schritte (Teil F)

1. Migration: Tabelle `externe_dokumente` + RLS
2. Edge Function `external-doc-ingest-v1` (Upload + OCR + pgvector)
3. Edge Function `external-doc-analyze-v1` (JSON-Schema-Extraktion pro Dokument-Typ)
4. UI: "Akte-Tab" im Auftragsdetail
5. Worker-Job für async-Extraktion
6. Gegenüberstellungs-Split-View (späte Phase)

Aufwand: **XL**, gestaffelt über 3-4 Quartale.
