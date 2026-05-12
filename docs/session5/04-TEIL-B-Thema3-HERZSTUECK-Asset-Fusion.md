# TEIL B · Thema 3 — HERZSTÜCK: Alles fließt zusammen

**Die Frage (Marcel, wörtlich):** *"Ein SV hat typischerweise: 3-7 Diktate, 20-200 Fotos, 2-5 Skizzen, 10-30 handschriftliche Notizen … Was wir brauchen ist: der SV soll seine Eindrücke sammeln, dann mit EINEM Klick sagen 'KI, bau mir daraus die Zusammenfassung der Beobachtungen, IHK-konform, mit Cross-References zu Fotos'."*

**Meine Antwort in einem Satz:** *Du denkst in 2 Ebenen (Assets → Gutachten). Du brauchst 3 Ebenen.*

---

## Die zentrale These: Befund-Fragmente als Zwischen-Schicht

Deine Intuition ist richtig — aber der direkte Sprung von Assets (N Diktate + M Fotos + K Skizzen + L Notizen) zum fertigen Befund-Text hat **drei harte Probleme**:

**Problem 1 — Token-Kollision.**
200 Fotos × 1k Tokens Bildbeschreibung + 7 Diktate × 5k Tokens + Notizen + Skizzen = **~1,5 Mio Tokens Input**. Selbst GPT-5.5 mit 200k Context kriegt das nicht in einem Call. Selbst wenn: Kosten pro Gutachten wären 4-stellig.

**Problem 2 — §407a-Blackbox.**
Wenn KI "direkt von Assets zum Befund" springt, gibt es keine Zwischenebene, an der der SV kontrollieren kann. Der Darmstadt-Fall war genau das: "KI hat was gemacht, ich weiß nicht mehr genau was". Das **MUSS** anders werden.

**Problem 3 — Keine Kuratierung.**
Nicht jedes Foto ist befund­relevant. Nicht jeder Satz in einem Diktat gehört ins Gutachten. Der SV muss **auswählen, priorisieren, kontextualisieren**. Wenn KI alles direkt verwurstet, verliert der SV die redaktionelle Kontrolle (und damit Art. 50 Abs. 4 EU AI Act-Schutz).

**Die Lösung:** Zwischen Assets und Gutachten lebt eine neue Entity — das **Befund-Fragment**.

---

## Das Drei-Ebenen-Modell

```
┌──────────────────────────────────────────────────────────────────┐
│  EBENE 1 — ASSETS (Rohmaterial)                                    │
│  Diktate · Fotos · Skizzen · Notizen · externe Dokumente          │
│  → Was der SV in die Welt trägt und wieder zurückbringt            │
└──────────────────────────────────────────────────────────────────┘
                          ↓ (KI-Extraktion, Ebene A-Klasse aus Thema 1)
┌──────────────────────────────────────────────────────────────────┐
│  EBENE 2 — BEFUND-FRAGMENTE (atomare Beobachtungen)                │
│  Jede mit: Text + Provenance + Ort + Zeit + Tags                   │
│  → Die 150 kleinen Wahrheiten, die ein Gutachten zusammenhalten    │
└──────────────────────────────────────────────────────────────────┘
                          ↓ (SV-Kuratierung + KI-Strukturierung)
┌──────────────────────────────────────────────────────────────────┐
│  EBENE 3 — BEFUND-ENTWURF (zusammenhängender Text)                 │
│  IHK-strukturiert, mit Cross-References zu Fragmenten              │
│  → Der Rohtext, den der SV verfeinert zu seinem Befund             │
└──────────────────────────────────────────────────────────────────┘
                          ↓ (SV-Redaktion + KI-Assistenz aus Thema 1 Klasse B/C)
┌──────────────────────────────────────────────────────────────────┐
│  EBENE 4 — GUTACHTEN (finaler Text, SV-eigenverantwortlich)         │
└──────────────────────────────────────────────────────────────────┘
```

Die Ebene 2 ist der Schlüssel. Sie ist:
- **Granular genug** für Token-Ökonomie (2-3 Sätze pro Fragment)
- **Atomar genug** für Nachweiskette (jedes Fragment hat genau eine Quelle)
- **Strukturiert genug** für Cross-Referencing (pgvector über Fragment-Embeddings)
- **Menschlich genug** für Kuratierung (der SV sieht eine Liste, kann Drag&Drop sortieren, verwerfen, zusammenführen)

---

## Was ist ein Befund-Fragment? (Datenmodell)

```
befund_fragmente {
  id: uuid
  auftrag_id: uuid
  
  -- Provenance (§407a-kritisch)
  quelle_typ: enum (diktat, foto, skizze, notiz, manuell, ki_zusammenführung)
  quelle_asset_id: uuid          -- FK auf fotos/audio_dateien/skizzen/notizen
  quelle_startzeit_ms: int NULL  -- bei Diktat: Stelle im Audio
  quelle_koordinaten: json NULL  -- bei Foto: Bounding-Box wenn relevant
  
  -- Inhalt
  text: text                      -- "An der Nordwestecke ist ein diagonaler Riss ca. 35cm lang"
  tags: text[]                    -- ['außen', 'riss', 'westfassade', 'strukturell']
  raumbezug: text NULL            -- "Wohnzimmer EG"
  gutachten_teil: enum            -- befund, fachurteil, sachverhalt, NULL
  
  -- Struktur (wird vom SV gesetzt)
  beweisfrage_bezug: int[] NULL   -- zu welchen Beweisfragen gehört es?
  reihenfolge: int                 -- Position im strukturierten Befund
  
  -- Vector für Cross-Referencing
  embedding: vector(1536)
  
  -- Status
  status: enum (roh, gepruft, verworfen, zusammengelegt_in:uuid)
  ki_generiert: bool               -- true = von KI extrahiert, SV hat bestätigt
  ki_protokoll_id: uuid NULL
  
  created_at, updated_at
}
```

**Das Feld `status`** macht Kuratierung möglich: SV kann Fragmente verwerfen oder zusammenführen.

**Das Feld `ki_generiert`** stellt die §407a-Offenlegung sicher.

**Das Feld `quelle_*`** ist die Nachweiskette: bei jedem Fragment ist klar, woher es kommt.

---

## Der Pipeline-Flow (Ebene 1 → Ebene 2)

### Schritt A: Asset hochgeladen
SV lädt Diktat, Foto, Skizze, Notiz hoch. Nichts passiert mit KI — Assets sind nur gespeichert.

### Schritt B: SV klickt "Fragmente extrahieren"
Ein Button, nicht automatisch (Kontrolle beim SV). Auf dem Screen "Alle Assets" oder pro-Asset-individuell.

### Schritt C: Edge Function `asset-to-fragments-v1`
Pro Asset-Typ:
- **Diktat**: Whisper-Transkript wird in 2-3-Satz-Chunks gesplittet, jeder Chunk → Fragment. Startzeit übernommen für Audio-Rücksprung.
- **Foto**: Vision-Model beschreibt das Foto → 1-3 Fragmente (Übersichts-Satz + ggf. Detail-Sätze wenn bemerkenswert).
- **Skizze**: OCR + Vision → Fragmente pro Annotation. Pro Beschriftung ein Fragment.
- **Notiz**: OCR (Handschrift) → Sätze werden zu Fragmenten.

Jedes Fragment bekommt:
- Embedding (via OpenAI text-embedding-3-small, 1536 dim)
- Auto-Tags (via LLM-Classification, aus erlaubtem Vokabular)
- Raumbezug-Vorschlag (wenn aus Diktat/Foto-EXIF extrahierbar)

### Schritt D: SV landet auf "Fragment-Bühne" (neue Seite, siehe Wireframe)
Liste aller Fragmente, gruppiert nach Quelle ODER nach Raum/Tag (SV kann umschalten).
SV kuratiert: verwerfen, zusammenführen, Tags ändern, Raumbezug korrigieren.

### Schritt E: SV klickt "Befund-Entwurf generieren"
Edge Function `fragments-to-befund-v1`:
- Nimmt kuratierte Fragmente
- Gruppiert nach `raumbezug` + `gutachten_teil` + `beweisfrage_bezug`
- Erstellt strukturierten Entwurf: "Außenbefund / Nordwestfassade: [zusammengeführte Fragmente]"
- Jede Aussage im Entwurf hat Inline-Verweis auf Fragment-ID (für Cross-Reference)
- Result: Markdown/Rich-Text-Block, der ins §5/§6-Kapitel gezogen werden kann

### Schritt F: SV redigiert, bearbeitet, finalisiert
Ebene 3 → Ebene 4 ist **die SV-Hoheit** (mit KI-Hilfe aus Thema 1 Klasse B/C).

---

## Das Marker-System (Cross-Reference in beide Richtungen)

Im Editor auf Ebene 3/4 erscheinen **Marker**:

```
Im Text:                                  Sidebar:
┌──────────────────────────────┐        ┌───────────────────────┐
│ An der Nordwestecke des       │        │ 📌 Verknüpfte Belege   │
│ Gebäudes besteht ein diago-   │        │ ─────────────────────  │
│ naler Riss, Länge ca. 35 cm,  │        │ 📸 Foto WEST-042      │
│ Breite 0,8–1,2 mm. [🔗1]      │        │    (vom 12.05.2025)    │
│                               │◀──────▶│ 🎙️ Diktat 14:32       │
│ Die Risskanten sind scharf-   │        │    (westseite.m4a)     │
│ kantig und nicht abgerundet,  │        │ ✍️ Notiz "Tag 2"      │
│ was auf eine junge Entstehung │        │    (handschriftlich)   │
│ hindeutet. [🔗2]              │        │                        │
└──────────────────────────────┘        └───────────────────────┘
```

Marker [🔗1] im Text → Klick öffnet das Foto + Audio-Stelle + Notiz-Scan.
Sidebar zeigt je nach Cursor-Position die relevanten Belege.

**Technisch:** Marker sind TipTap-Custom-Nodes (oder im Vanilla-Ansatz: `<span data-fragment-id="uuid" class="pr-fragment-marker">…</span>`). Beim Export als PDF werden Marker zu Fußnoten ("siehe Anlage 12, Foto 042, Aufnahme 12:32:15").

Das ist **BVS-Richtlinie Dokumentation & Revisionierbarkeit 2011 in Code** (siehe Quelle 6 in Teil A).

---

## Token-Ökonomie (das praktische Problem)

Für einen Auftrag mit:
- 5 Diktate à 10 Min → ~15k Wörter → ~20k Tokens
- 100 Fotos à 1-Satz-Caption → 10k Tokens (nur Captions, Bilder nicht im Text-Context!)
- 30 Notizen à 2 Sätze → 2k Tokens
- 3 Skizzen à 5 Annotationen → 0,5k Tokens

**Ebene 1 → Ebene 2 (Fragment-Extraktion):** 
Pro Asset einzeln, parallel. Diktat: 1 Call. Foto: 1 Call (Vision). Skizze: 1 Call. 
→ ~110 API-Calls, ~50k total Input-Tokens, ~15k Output. 
Kosten bei aktuellen Raten: **2–4 €** pro Auftrag.

**Ebene 2 → Ebene 3 (Befund-Entwurf):**
Pro Beweisfrage/Gutachten-Abschnitt einzeln. Context: nur die gruppierten Fragmente (meist 10-30), das sind ~2k Tokens Input.
→ ~5-10 Calls für großes Gutachten, ~20k total Input, ~10k Output.
Kosten: **1–2 €** pro Auftrag.

**Gesamt pro Auftrag: ~3–6 € KI-Kosten.** 
Bei SV-Stundensatz 100-200 €/h und ersparten 5+ Stunden: **ROI >300×**.

**Ohne die Zwischen-Ebene 2** wärst du bei 1,5 Mio Input-Tokens → 40–80 € pro Auftrag, und du könntest die Provider-Context-Limits nicht einhalten.

---

## Cross-Referencing via pgvector (concrete usage)

Nach Fragment-Erstellung haben wir alle mit Embedding. Dann:

### Use-Case 1: "Ähnliche Fragmente finden"
SV markiert ein Fragment "Riss in Westfassade", KI sucht ähnliche in anderen Befunden desselben SV (mit Einwilligung + Pseudonymisierung).

```sql
SELECT text, auftrag_id, similarity
FROM befund_fragmente
WHERE sv_id = current_user_sv_id()
  AND auftrag_id != :current_auftrag
ORDER BY embedding <=> :selected_embedding
LIMIT 5;
```

→ SV sieht: "Du hast 2023-08 im Auftrag ABC einen ähnlichen Riss bewertet. Damals hast du auf 'Setzungsriss, nicht strukturell' entschieden."

Das ist **kein Auto-Fill**. Das ist Gedächtnis. Und es ist §407a-konform, weil der SV entscheidet.

### Use-Case 2: Konsistenz-Check (Thema 1, N4)
Fragmente in "Befund" und Fragmente in "Fachurteil" werden cross-gechecked. Bei hoher semantischer Ähnlichkeit, aber gegenteiligem Tag → Warnhinweis.

### Use-Case 3: Literatur-/Urteils-Suche (Thema 1, N5)
Fachbibliothek (BVS-Standpunkte, BGH-Urteile, DIN-Normen) auch als Embeddings in `wissen_diagnostik`. Fragment ähnelt einer Bibliotheks-Passage → Zitier-Vorschlag.

---

## UI-Flows (3 Kern-Screens, details in Teil D)

### Screen A: "Assets & Fragmente" (NEU)
Eine Art Kanban-Board: links Assets (Diktate, Fotos, Skizzen, Notizen), rechts Fragmente, gruppiert nach Raum/Tag.

### Screen B: "Befund-Bühne" (erweitert §5)
Der §5-Befund-Screen zeigt links die Fragmente (als Chips), rechts den Editor. Drag-from-Sidebar-to-Editor erzeugt Marker-Referenz.

### Screen C: "Fachurteil mit Beleg-Panel" (erweitert §6)
Der §6-Editor mit rechtem Beleg-Panel, kontextsensitiv (zeigt Belege des aktuellen Absatzes).

Alle drei in Teil D mit Wireframes.

---

## Was Technology-Stack betrifft

- **Edge Functions (neu):** `asset-to-fragments-v1`, `fragments-to-befund-v1`, `fragment-similarity-v1`
- **Pro Asset-Typ eine Subfunktion:** `extract-from-audio`, `extract-from-photo`, `extract-from-sketch`, `extract-from-note`
- **Modellauswahl:** 
  - Audio: Whisper (bereits da)
  - Vision: GPT-4o-Vision oder Claude 3.7 Sonnet Vision (beide OK, Kosten-Entscheid)
  - Embedding: OpenAI text-embedding-3-small (1536 dim, 0.02$/M tok, EU-verfügbar via Azure OpenAI Frankfurt)
  - Text-zu-Text: GPT-5.5 oder Claude 4.5 (je nach Pricing)
- **Datenbank:** neue Tabelle `befund_fragmente` mit pgvector-Column + Trigger für audit_trail
- **Keine Framework-Addition:** alles Vanilla JS + ein neuer Web Component `<prova-fragment-board>` und `<prova-fragment-editor>`

---

## Der wichtigste Architektur-Grundsatz für Thema 3

> *Zwischen Chaos (Assets) und Ordnung (Gutachten) liegt die Granularität (Fragmente).*

Der SV denkt nicht linear "alles sofort zum Gutachten". Der SV denkt iterativ:
1. Beobachten (Assets entstehen)
2. Ordnen (Fragmente kuratieren)
3. Strukturieren (Entwurf bauen)
4. Verfeinern (Gutachten finalisieren)

Wenn PROVA diese vier Schritte **als native Arbeits­modi** unterstützt — nicht als erzwungene Pipeline, sondern als angebotene Struktur — dann ist das das Alleinstellungs­merkmal.

DATEV kann das nicht. Word kann das nicht. Keine jetzige SV-Software kann das.

**Das ist der Moat.**

---

## Konkrete Schritte (Verweis auf Teil F)

1. Migration: neue Tabelle `befund_fragmente` + RLS
2. Edge Function `asset-to-fragments-v1` (per Asset-Typ je eine Sub-Function)
3. Fragment-Bühne-UI (neuer Screen)
4. Edge Function `fragments-to-befund-v1`
5. Marker-System im §5/§6-Editor (TipTap Custom Node ODER Vanilla Span)
6. pgvector-Similarity API-Endpoint
7. UI für "Verknüpfte Belege" Sidebar

Aufwand-Gesamt: **XL** (2-3 Monate Solo-Dev, 1-1,5 Monate mit Team).
Aber: das ist der **#1-Feature**. Ohne Thema 3 ist PROVA "besseres Word".
Mit Thema 3 ist PROVA "erste SV-native KI-Plattform".
