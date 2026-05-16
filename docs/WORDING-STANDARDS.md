# PROVA Wording-Standards (UI-User-facing)

**Stand:** 2026-05-16 (MEGA⁸²)
**Verbindlich:** Diese Standards gelten für ALLE User-facing Strings in HTML/JS-Files am Repo-Root.
**Ausgenommen:** Tech-Identifier (Error-Codes, Service-IDs), interne Kommentare, PDFMonkey-Liquid-Templates.

---

## PDF-Generierung

✅ **„PDF erstellen"** — Primary-Button-Action ("PDF wird erstellt…" beim Spinner)
✅ **„PDF-Generator"** — Service-Status / Tech-Bezeichnung (z.B. Status-Page)
✅ **„PDF-Generierung"** — Heading / Section-Title
✅ **„PDF herunterladen"** — Download-Action nach Erstellung
✅ **„PDF-Vorlage"** — Template-Bezeichnung im UI
✅ **„Gutachten exportieren"** — Alternativ-Wording im Akte-Workflow
✅ **„PDF-Fehler:"** — Error-Prefix bei fehlgeschlagener Generierung

❌ **„PDFMonkey"** — externer Service-Name, NICHT in User-UI
❌ **„PDF generieren"** — bevorzugt „erstellen" (positiver, weniger technisch)
❌ **„Generieren via PDFMonkey…"** — Service-Name + Tech-Bezeichnung doppelt fail

**Ausnahmen wo PDFMonkey OK:**
- Tech-Identifier wie `NO_PDFMONKEY` (Error-Code in Logs)
- Service-IDs wie `pdfmonkey-api` (Endpoint-Namen)
- Liquid-Templates in `docs/templates-goldstandard/` (interne PDFMonkey-Variablen)
- ENV-Variablen wie `PDFMONKEY_API_KEY`
- Kommentare in netlify/functions/

---

## KI-Werkzeuge

✅ **„KI-Hilfe"** — Helfer-Funktion
✅ **„KI-Vorschlag"** — Output einer KI-Funktion
✅ **„KI-Strukturierung"** — Diktat-Strukturierung
✅ **„KI-gestützt"** — Adjektiv für Pipeline-Schritte
✅ **„KI-Werkzeuge"** — Sammelbegriff (Settings-Tab)
✅ **„Inline-KI-Vorschläge"** — Editor-Auto-Trigger (MEGA80)

❌ **„GPT"**, **„OpenAI"**, **„Whisper"**, **„Claude"** — Modell-Namen NIE in User-UI
❌ **„AI"** auf Deutsch — wir nutzen "KI" durchgehend

**Ausnahmen wo Modell-Namen OK:**
- § 407a-Compliance-Texte (rechtlich Pflicht)
- EU AI Act Art. 50 Disclosure (rechtlich Pflicht)
- Internal-Logs in `ki_protokoll` (Audit-Trail)
- Settings → Erweitert → Modell-Info-Section (für Power-User)

---

## §§-Notation (Gesetzes-Verweise)

✅ **„§ 407a ZPO"** — § mit Leerzeichen, dann Nummer
✅ **„§§ 1–5 IHK-SVO"** — Doppel-§ + Leerzeichen + Gedankenstrich U+2013
✅ **„BGB §§ 634–639"** — Gesetz vor §§ ist auch OK
✅ **„§§ 22–28 ImmoWertV"**

❌ **„§§1-§7"** — Original-Bug (Doppel-§ + Bindestrich + § + Zahl)
❌ **„§§ 1-5"** — Bindestrich statt Gedankenstrich
❌ **„§§1–5"** — kein Leerzeichen nach §§
❌ **„§§ 1 – 5"** — zu viele Leerzeichen

Siehe `docs/AUDIT-PARAGRAPHEN-NOTATION.md` für Defer-Liste Backend/Tests.

---

## Compliance-Texte

✅ **„§ 407a ZPO"** — Voll-Zitation
✅ **„Sachverständigen-Anzeigepflicht"** — Deutsch-Begriff für §407a Abs.&nbsp;3
✅ **„LG Darmstadt 10.11.2025 (Az.&nbsp;19&nbsp;O&nbsp;527/16)"** — Standard-Zitation
✅ **„Beschluss"** statt „Urteil" beim LG-Darmstadt (formell korrekt)
✅ **„EU AI Act Art.&nbsp;50"** — KI-Verordnung

---

## Statusangaben

✅ **„Entwurf"**, **„Aktiv"**, **„Zur Freigabe"**, **„Abgeschlossen"**, **„Archiviert"**
✅ **„Neu"** bei Phase 1 (Auftrag gerade angelegt)
✅ **„Ortstermin"** in Phase 2 (Flow A)
✅ **„In Bearbeitung"** in Phase 3 (Analyse)

❌ „In Arbeit" (gibt zwei Phasen-States, mehrdeutig)
❌ „Done" / „Fertig" — bevorzugt „Abgeschlossen"
❌ „Cancelled" — bevorzugt „Storniert"

---

## Datums + Zeit

✅ **„14.05.2026"** — DD.MM.YYYY Standard
✅ **„14. Mai 2026"** — Lang-Form für Compliance-Texte / Headers
✅ **„07:30 Uhr"** — Zeit mit Suffix
✅ **„vor 5 Min"** / **„vor 3 Std"** — Relative-Time (Bell, Activity-Stream)

❌ „2026-05-14" — ISO-Format nur in Tech-Kontexten (Logs, JSONB)
❌ „05/14/2026" — US-Format NIE
