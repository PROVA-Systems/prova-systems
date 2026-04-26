# SPRINT 06 — B1 Einträge-System für Ortstermine

**Tag:** 6 · **Aufwand:** 6-7h · **Phase:** B Produkt-Kern  
**Wichtigkeit:** ⭐⭐⭐ Kern-Feature, von Marcel ausführlich diskutiert (24.04.2026)

---

## Ziel
Ein SV kann beliebig viele Einträge (Diktate + Notizen + Skizzen-Refs) pro Fall erfassen. Alle gerichtsfest chronologiert mit Eintrag-Nummer + Zeitstempel. KI bekommt alle Einträge als Bündel.

---

## Hintergrund (warum so wichtig)

Die jetzige `transkript`-String-Logik in app-logic.js limitiert auf **ein** Diktat. Ein realer SV macht aber:
- Mehrere Diktate pro Termin (zwischen Räumen)
- Notizen statt Diktat (wenn Kunde nervös wird)
- Volltext-Notizen statt Stichpunkte (manche tippen lieber)
- Diktate später ausführlicher als Notizen
- Skizzen mit Marker-Verweisen

Alle Einträge müssen für **§407a-Konformität gerichtsfest chronologiert** sein: Wer hat wann was wo erfasst?

---

## Scope

### Datenmodell (EINTRAEGE-Tabelle, Marcel hat sie schon umbenannt von DIKTATE)

**Felder per Airtable Meta API anlegen:**

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| Primärfeld | Formel | — | `CONCATENATE({fall_az_lookup}, "-E", LPAD({eintrag_nr_string}, 2, "0"))` → "SCH-2026-031-E03" |
| eintrag_nr | Number (Integer) | ✅ | Fortlaufend pro Fall |
| eintrag_nr_string | Formel `{eintrag_nr}&""` | — | Hilfsfeld für LPAD im Primärfeld |
| fall_link | Link zu SCHADENSFAELLE | ✅ | Zuordnung |
| fall_az_lookup | Lookup aus fall_link | — | Aktenzeichen für Primärfeld |
| typ | Single select | ✅ | `diktat` / `notiz` / `skizze` |
| inhalt_text | Long text | — | Transkript bei Diktat, Text bei Notiz |
| inhalt_pseudonymisiert | Long text | — | Für KI-Pfad (Sprint 01 schreibt hier rein) |
| audio | Attachment | — | Nur bei typ=diktat, Opus 16kbps |
| audio_blob_key | Single line text | — | Netlify-Blobs-Key, falls extern |
| skizze_data | Attachment | — | Nur bei typ=skizze (PNG aus Sprint 07) |
| raum | Short text | — | Optional, "Wohnzimmer", "Bad", etc. |
| verknuepft_mit | Link zu EINTRAEGE (self) | — | Optional, Gruppierung mehrerer Einträge |
| erstellt_am | Date+Time | ✅ | Mit Uhrzeit, gerichtsfest |
| sv_email | Email | ✅ | Multi-Tenant |
| sv_at_record_id | Single line text | — | Multi-Tenant Backup |

### Frontend: ortstermin-modus.html komplett überarbeiten

**Bisheriger Tab "Diktat"** → **Neuer Tab "Einträge"**

```
┌─ Einträge zum Fall SCH-2026-031 ──────────────────────────┐
│                                                             │
│  [+ Neues Diktat 🎤]  [+ Neue Notiz ✏️]  [+ Neue Skizze 📐] │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  🎤 #01  Wohnzimmer · 24.04.26 14:03 · 3:42                │
│      "Wohnzimmer Nordseite, Feststellung dunkle..."        │
│      [▶ Abspielen]  [Bearbeiten]  [Verknüpfen ↔]  [🗑]     │
│                                                             │
│  ✏️ #02  Bad · 24.04.26 14:15                              │
│      "Feuchteschaden unten rechts. Rohrleitung lt..."      │
│      [Bearbeiten]  [Verknüpfen ↔]  [🗑]                    │
│                                                             │
│  🎤 #03  Bad · 24.04.26 14:28 · 2:10                       │
│      ↔ verknüpft mit #02                                    │
│      "Zu meinen Notizen in Bad: Feuchtigkeit an..."        │
│                                                             │
│  📐 #04  Bad · 24.04.26 14:35                              │
│      Skizze mit 3 Markern                                   │
│      [Anzeigen]                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  [ KI-Analyse aller Einträge starten 🤖 ]                  │
└─────────────────────────────────────────────────────────────┘
```

### Audio-Aufnahme

```javascript
const recorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000  // Faktor 8-10 kleiner als default
});
```

### Storage

- Audio → Netlify Blobs (neue Function `eintrag-audio-upload.js`)
- Referenz in EINTRAEGE.audio (als Attachment) und audio_blob_key
- Bei Skizzen → siehe Sprint 07 (B2 Skizzen-Funktion)

### KI-Analyse anpassen

`sammleDaten()` in app-logic.js:
- Nicht mehr `transkript: window.transcriptText`
- Sondern `eintraege: [{nr, typ, raum, text}, ...]` aus Airtable laden

`ki-proxy.js` Prompt-Template:
- `{transkript}`-Placeholder durch `{eintraege_chronologisch}`-Block ersetzen
- Format: "Eintrag #1 (diktat, Wohnzimmer, 14:03): ...\n\nEintrag #2 (notiz, Bad, 14:15): ...\n\n..."
- KI weiß: alle Einträge sind gleichwertig, alle zusammen = Fall-Kontext
- Hint-Logik: Wenn KI eine Information vermisst → als `hinweise[]` in Response, nicht erfinden

### PDF-Template-Erweiterung

Neuer Anhang im Gutachten-PDF: **"Erfassungs-Chronologie"**
- Liste aller Einträge
- Format: "Eintrag #X (Typ, Datum Uhrzeit, Raum) - kurze Inhalt-Vorschau"
- Hinweis: "Vollständige Originale gespeichert in der Akte SCH-2026-031"

### Legacy-Migration

Bestehende Fälle haben `transkript`-String. Migration-Function `migrate-transkript-to-eintraege.js`:
- Iteriert alle SCHADENSFAELLE mit nicht-leerem transkript
- Erstellt für jeden einen einzelnen EINTRAEGE-Record (#1, typ=diktat, inhalt_text=transkript)
- Räumt nicht den ursprünglichen transkript-Field auf (Backup)

---

## Prompt für Claude Code

```
PROVA Sprint 06 — B1 Einträge-System (Tag 6) — Kern-Feature

Pflicht-Lektüre vor Start:
- 02_WORKFLOWS.md (Eintrags-Logik)
- 03_SYSTEM-ARCHITEKTUR.md (Datenfluss Diktat-Aufnahme)
- 01_UI-PRINZIPIEN.md (Empty States, Primär-Aktion, Touch-Targets)
- ortstermin-modus.html komplett
- app-logic.js Funktion sammleDaten()
- ki-proxy.js Prompt-Templates


KRITISCHE REGEL
===============
"Einträge sind gleichwertig" — keine Sonder-Logik für Diktat-vs-Notiz, KI bekommt alle als Bündel. 
Verknüpfung optional. (Marcel-Entscheidung 24.04.2026)


SCOPE
=====

Block A — Datenmodell (Airtable Meta API)

A1: EINTRAEGE-Tabellenfelder per Airtable Meta API anlegen
- Felder gemäß Spec oben
- Primärfeld als Formel
- Validierung: einmal record erstellen, einmal löschen

A2: Migration-Function migrate-transkript-to-eintraege.js
- One-Shot per Marcel-Trigger via Admin-Panel oder Curl
- Iteriert alle SCHADENSFAELLE
- Erstellt EINTRAEGE-Record je vorhandenem transkript
- Logging in console + AUDIT_TRAIL

Block B — Backend

B1: netlify/functions/eintrag-create.js
- POST mit { fall_id, typ, inhalt_text?, audio_base64?, raum?, verknuepft_mit? }
- JWT-Pflicht
- Höchste eintrag_nr für fall_id ermitteln, +1
- Bei Audio: nach Netlify Blobs uploaden, blob_key zurück, parallel an Whisper schicken
- Whisper-Result: inhalt_text setzen
- Pseudonymisierung (aus Sprint 01) auf inhalt_text → inhalt_pseudonymisiert
- INSERT EINTRAEGE
- Response: { eintrag_nr, record_id, transkript, blob_key }

B2: netlify/functions/eintrag-list.js
- GET mit { fall_id }
- JWT-Pflicht + sv_email-Filter
- Sortiert nach eintrag_nr ASC
- Returns: array

B3: netlify/functions/eintrag-update.js
- PATCH mit { record_id, inhalt_text?, raum?, verknuepft_mit? }
- Audio-Update nicht erlaubt (Audit-Trail-Schutz!)
- Audit-Trail-Eintrag mit altem + neuem Wert

B4: netlify/functions/eintrag-delete.js
- DELETE mit { record_id }
- Audit-Trail-Eintrag mit Inhalt-Hash (für Forensik)
- Audio-Blob in Netlify Blobs auch löschen

B5: ki-proxy.js Prompt-Erweiterung
- Neuer Modus "analyse_eintraege"
- Input: { fall_id, eintraege: [...] }
- Output: { strukturierte_analyse, hinweise: [{eintrag_nr, problem, vorschlag}] }
- Hinweise-Format: "In Eintrag #2 fehlt die Angabe zur Feuchte-Messung. Vor §3.2 erwähnen?"

Block C — Frontend

C1: ortstermin-modus.html komplett überarbeiten
- Tab "Einträge" (statt "Diktat")
- Liste alle Einträge des Falls (geladen via eintrag-list)
- 3 Buttons: Diktat / Notiz / Skizze
- Empty State: "Noch keine Einträge — Beginnen Sie mit einem Diktat oder einer Notiz"

C2: Diktat-Modal
- MediaRecorder mit Opus 16kbps
- Live-Wellenform (optional, sieht professionell aus)
- Stop-Button → eintrag-create
- Während Whisper-Transkription: Skelett-Loading
- Optional: Raum-Feld (Freitext, kann leer)

C3: Notiz-Modal
- Textarea (resizable, beliebig lang!)
- Optional: Raum-Feld
- Speichern → eintrag-create

C4: Eintrag-Edit-Modal
- Inline-Edit für inhalt_text und raum
- Audio-Player für Diktate (HTML5 audio mit blob_key-Source)

C5: Verknüpfen-UI
- Klick "Verknüpfen ↔" → Dropdown mit anderen Einträgen
- Updates verknuepft_mit-Feld
- Visualisierung: kleines ↔ und Vorschau-Text

C6: app-logic.js sammleDaten() umbauen
- Statt window.transcriptText → window.aktuelleEintraege als Array
- Per eintrag-list lädt vor sammleDaten

Block D — KI-Integration

D1: ki-proxy.js für analyse_eintraege Modus
- Pseudonymisierung an inhalt_text aller Einträge
- Prompt-Template mit eintraege_chronologisch-Block
- Response strukturieren mit hinweise[]

D2: Frontend-Anzeige der Hinweise
- Im Akte-View nach KI-Analyse: separater Block "💡 KI-Hinweise"
- Klick auf Hinweis → springt zum Eintrag

Block E — PDF-Erweiterung

E1: PDFMonkey-Template-Update für Anhang "Erfassungs-Chronologie"
- Neuer Section nach §6 Fachurteil
- Iteriert alle Einträge des Falls

Block F — sw.js v209

QUALITÄTSKRITERIEN
==================
- Empty State pro UI-Pinprick (Linear-Stil)
- Touch-Targets min 44px
- Audio Opus 16kbps + Mono (klein)
- KI sieht Einträge chronologisch
- Hinweise-System funktioniert (KI fordert fehlende Infos an)
- Migration ist idempotent (mehrfaches Ausführen kein Problem)
- Alte transkript-Strings bleiben als Backup

TESTS
=====
Manueller End-to-End:
1. Neuer Fall anlegen
2. Ortstermin-Modus → Diktat #1 (30 Sek): "Wohnzimmer, dunkle Verfärbung Decke"
3. Notiz #2 (Text): "Bad: Rohrleitung lt. Bewohner vor 3 Wochen geflickt"
4. Diktat #3 (40 Sek): "Zu Bad-Notiz: Feuchte-Messung 18% direkt unter Anschluss"
5. Verknüpfen #2 mit #3
6. KI-Analyse → erwartet 3 Einträge im Prompt
7. Akte → Anhang "Erfassungs-Chronologie" mit 3 Einträgen

ACCEPTANCE
==========
1. EINTRAEGE-Tabelle hat alle Felder
2. 3 Eintrags-Typen erfassbar
3. Liste zeigt chronologisch
4. KI kriegt alle als Bündel
5. PDF-Anhang erscheint
6. Audio < 2 MB für 10 Min
7. Migration alter transkript-Strings funktioniert

TAG: v180-eintraege-done
```

---

## Marcel-Browser-Test (20 Min)

Vollständiger Real-World-Durchlauf wie oben in "Tests" beschrieben. Zusätzlich:
- Notiz mit 2000 Zeichen → wird gespeichert (Long-Text)
- Migration alter Fall mit transkript-String → entsteht ein EINTRAEGE-Record #1
- Audio-Datei in Airtable: < 2 MB für 10 Min
