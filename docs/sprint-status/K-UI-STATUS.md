# Sprint K-UI — Status-Bericht

**Branch:** `sprint-k-ui-frontend`
**Datum:** 2026-04-27
**Bearbeiter:** Claude Code + Marcel

---

## Zielsetzung

Frontend-Layer für den in Sprint K-FIX gebauten Backend-Stack
(letterhead-resolver, brief-generate Edge-Function, 9 PDFMonkey-
Korrespondenz-Templates K-01..K-09). Items 1-6 autonom abarbeiten.

---

## Bilanz pro Item

### ✅ Item 1 — Profil-Briefkopf-Page (commit 5dd46a8)

**Status:** Funktional komplett.

**Files:**
- `profil-supabase.html` (270 Zeilen, Pattern A volle Page-Width)
- `profil-supabase-logic.js` (240 Zeilen, ESM)

**Features:**
- Stammdaten (name, titel, qualifikation, sachgebiet,
  bestellungsstelle, anschrift, plz_ort, telefon, mobil)
- 3 Briefkopf-Zeilen (`letterhead_config.briefkopf_zeile_1..3`)
- Bank+Steuer (Inhaber, Bank, IBAN, BIC, USt-IdNr, Steuernummer)
- 3 Upload-Cards: Logo, Stempel, Unterschrift
  - max 200 KB, PNG/JPEG only
  - Storage-Bucket `letterheads`, Pfad `<auth.uid()>/<type>.<ext>`
  - Old-File wird vor Upload geloescht (idempotent)
  - letterhead_config-JSONB wird mit Storage-Pfad upgedated
- Save-Bar mit Dirty-Indicator, Verwerfen + Speichern
- Reload mit "Aenderungen verwerfen?"-Confirm

**Marcel-Test (Klick-Liste):**
1. /profil-supabase.html oeffnen
2. Stammdaten ausfuellen, "Speichern" klicken -> grüner Toast
3. Logo hochladen (PNG <200KB) -> Vorschau erscheint
4. Reload -> Logo bleibt sichtbar (Signed URL 1h)
5. "Entfernen" -> Logo weg, button disabled

---

### ✅ Item 2 — kontakte-supabase.html + Logic (commit 6e28eb7)

**Status:** Funktional komplett, parallel zu alter `kontakte.html`.

**Files:**
- `kontakte-supabase.html` (215 Zeilen)
- `kontakte-supabase-logic.js` (220 Zeilen, ESM)

**Features:**
- Toolbar: Suche (debounced 250ms via `search_vector`-textSearch),
  Typ-Filter (person/firma/gericht/behoerde/versicherung),
  "+ Neuer Kontakt"-Button
- Liste: Typ-Badge mit Color-Coding, Display-Name, Meta (PLZ/Ort),
  Email/Tel, Edit-Button
- Empty-State mit CTA "Ersten Kontakt anlegen"
- Modal-Editor (Create + Edit + Delete):
  - Typ, Anrede, Titel, Vor-/Nachname, Firma, Email, Telefon, Mobil,
    Anschrift, PLZ, Ort, Tags (kommagetrennt -> JSONB-Array)
  - Auto-Compute `name = "Vor Nach" || firma`
  - Soft-Delete via `deleted_at`-Timestamp (Auftraege bleiben verlinkt)

**Verwendet:** `lib/data-store.kontakte` (list/getById/create/update/softDelete).

**Alte `kontakte.html` (534 Zeilen, Airtable-Stack) bleibt unangetastet.**

**Marcel-Test:**
1. /kontakte-supabase.html oeffnen
2. "+ Neuer Kontakt": Anrede=Frau, Vorname=Anna, Nachname=Test,
   Email=anna@test.de, Ort=Köln -> Speichern
3. Suche "Anna" -> Eintrag erscheint
4. Eintrag anklicken -> Modal mit Daten, Edit Telefon, Speichern
5. Loeschen -> Confirm -> verschwindet aus Liste

---

### ✅ Item 3 — briefe.html + brief-generate Letterhead-Hookup (commit c3dfeac)

**Status:** Funktional komplett. Backend-Bonus: brief-generate hat
jetzt letterhead-resolver eingehaengt (war bisher TODO K-2.1A offen).

**Files:**
- `briefe.html` (130 Zeilen)
- `briefe-logic.js` (390 Zeilen, ESM mit Templates-Registry)
- `supabase/functions/brief-generate/index.ts` (Hookup-Patch)

**Features:**
- 11 Brief-Cards links, gruppiert nach Auftrag/Termin/Mahnung/Justiz
- Form-Panel rechts, dynamisch pro Template:
  - Bezug-Section: Auftrag-Picker (auto-fuellt auftrag_az + betreff)
    + Brief-Datum
  - Empfaenger-Section: Kontakte-Picker (Autofill aus kontakte-Store)
    + manuelle Felder
  - Inhalt-Section: 2-7 template-spezifische Pflichtfelder
- Listen-Felder (parteien_liste, unterlagen_liste): Textarea ->
  Array (eine Zeile = ein Eintrag)
- Generate -> `supabase.functions.invoke('brief-generate', ...)` ->
  Result-Card mit PDF-Link + Akte-Link
- URL-Params: `?template=KEY&auftrag=AZ` -> Pre-Select + Pre-Fill

**Backend-Patch:**
- `brief-generate/index.ts`: `resolveLetterhead()` + 
  `mergeLetterheadIntoVariables()` eingehaengt (analog pdf-generate).
  Damit fliessen sv_logo_url, sv_stempel_url, sv_unterschrift_url
  automatisch in jeden Brief.

**Marcel-Test:**
1. /briefe.html -> Card "Auftragsbestaetigung" anklicken
2. Auftrag-Picker: einen aktiven Auftrag waehlen -> az + betreff fuellen sich
3. Kontakte-Picker: einen Kontakt waehlen -> Empfaenger-Felder fuellen sich
4. Leistungsbeschreibung manuell ergaenzen
5. "PDF generieren" -> Result-Card mit Link, PDF oeffnen ->
   muss Stempel + Unterschrift + Briefkopf-Zeilen enthalten

**Voraussetzung:** Item 1 muss gelaufen sein
(`users.letterhead_config` muss gefuellt sein, sonst keine Bilder).

---

### ⚠️ Item 4 — akte.html minimal-invasiv erweitert (commit b59a43b)

**Status:** Teilweise — Brief-Schnell-Buttons drin, Korrespondenz-Liste
und Auftraggeber-Link bewusst verschoben.

**Files:** `akte.html` (1 Patch, +27 Zeilen)

**Geliefert:**
- Right-Col bekommt 5 Brief-Schnell-Buttons (Auftragsbestaetigung,
  Terminbestaetigung, Unterlagen anfordern, Gutachten uebergeben,
  Mahnung 1) + "Alle 11 Vorlagen"-Link
- Buttons leiten auf `briefe.html?template=KEY&auftrag=AZ` ->
  Pre-Select + Pre-Fill via URL-Params (siehe Item 3)
- Pure HTML/JS, KEINE Supabase-Calls in akte.html

**NICHT geliefert (mit Begruendung):**
- **Korrespondenz-Liste** unter dem Brief-Block: Wuerde Supabase-Query
  `dokumente.listForAuftrag(...)` brauchen. akte.html laeuft noch im
  Hybrid-Auth-Stack (`prova-fetch-auth.js` + Legacy `auth-guard.js`).
  Mischung mit Supabase-ESM-Imports = riskant fuer alte Page.
  CLAUDE.md sagt explizit: "Bestehende 11 Auftragstyp-Pages NICHT
  umbauen (kommt erst in K-1.4)".
- **Auftraggeber-Link zu kontakte-supabase.html:** akte.html hat keine
  `kontakt_id`-Reference im alten Airtable-Datenmodell. Erst nach
  K-1.4 Page-Refactor sinnvoll.

**Empfehlung:** Beide Punkte in K-1.4 mit dem Page-Refactor erledigen,
wenn akte.html komplett auf Supabase-Stack umgestellt wird.

---

### ⚠️ Item 5 — 5 von 6 Top-Templates Stempel-Retrofit (commit 2d36d4d)

**Status:** 5/6 retrofittet. F-01 ist Platzhalter-Datei (nicht
patchbar).

**Retrofittet:**
- ✅ `02-bestaetigungen/PROVA-BRIEF.template.html` (DIN 5008)
  - Briefkopf: sv_logo_url-Slot links + Briefkopf-Zeilen 1-3
  - Signatur: sv_unterschrift_url ueber Name, sv_stempel_url unter Funktion
- ✅ `04-gutachten/F-09-KURZGUTACHTEN.template.html`
- ✅ `04-gutachten/F-10-BEWEISSICHERUNG.template.html`
- ✅ `04-gutachten/F-15-GERICHTSGUTACHTEN.template.html`
  - Diese drei nutzen identische Master-Schablone:
    - unterschrift-block: sv_unterschrift_url-Slot
    - Demo-Werte (Marcel Mustermann, Köln, 20.04.2026) -> Liquid-defaults
    - "(Rundstempel)"-Text durch sv_stempel_url-Conditional ersetzt
- ✅ `04-gutachten/F-19-WERTGUTACHTEN.template.html` (war teil-Liquid)
  - Stempel + Unterschrift-Slots mit gleicher Konvention

**NICHT retrofittet:**
- ❌ `01-rechnungen/F-01-JVEG-GERICHTSRECHNUNG.template.html`
  Erste Zeile: `cd C:\PROVA-Systems\...` -> ist ein PowerShell-
  Setup-Skript-Artefakt, KEIN echtes Template. Echtes JVEG-Template
  lebt nur in PDFMonkey (Phase 3 lt. Roadmap-Doku im File).
  **Marcel-Aufgabe:** Goldstandard-File neu anlegen oder direkt in
  PDFMonkey patchen.

**Marcel-Aufgabe (alle 5):** Bulk-Patch der 5 retrofitteten Files
nach PDFMonkey via PowerShell (UUIDs in `_shared/templates.ts`):
- PROVA-BRIEF: `BAD1170B-C2BC-4EE7-ACBB-CCBD15B892C7`
- F-09 KURZGUTACHTEN: `BA076019-40E8-41CB-B2AE-08D3A77289DA`
- F-10 BEWEISSICHERUNG: `6FF656D3-9807-4F59-9305-1338D5D1AD9A`
- F-15 GERICHTSGUTACHTEN: `36E140DC-DD17-432F-B237-910C6462736E`
- F-19 WERTGUTACHTEN: `29064D98-FD12-4135-9D44-F49CCF9819C6`

---

### ✅ Item 6 — nav.js + sw.js Integration (commit 0d20191)

**Status:** Komplett.

**nav.js:**
- BUERO: "Briefe & Vorlagen" -> "Briefe" (`briefvorlagen.html` ->
  `briefe.html`)
- BUERO: "Kontakte" zeigt jetzt auf `kontakte-supabase.html`
  (alte `kontakte.html` bleibt erreichbar, aber nicht mehr verlinkt)
- SYSTEM: erstes Item neu = "Profil & Briefkopf"
  (`profil-supabase.html`)

**sw.js:**
- CACHE_VERSION v237 -> v238 (Pflicht-Bump bei Frontend-Files)
- APP_SHELL erweitert um 6 K-UI-Files:
  `/profil-supabase.html`, `/profil-supabase-logic.js`,
  `/kontakte-supabase.html`, `/kontakte-supabase-logic.js`,
  `/briefe.html`, `/briefe-logic.js`

---

## Sprint-Bilanz

| Item | Status | Commit | Zeit |
|------|--------|--------|------|
| 1 Profil-Briefkopf | ✅ Voll | 5dd46a8 | ~1h |
| 2 Kontakte | ✅ Voll | 6e28eb7 | ~1h |
| 3 Briefe + Backend-Hookup | ✅ Voll | c3dfeac | ~1.5h |
| 4 akte.html | ⚠️ Teil (Brief-Buttons) | b59a43b | ~10min |
| 5 Template-Retrofit | ⚠️ 5/6 (F-01 Blocker) | 2d36d4d | ~30min |
| 6 nav.js + sw.js | ✅ Voll | 0d20191 | ~10min |

**Total: 6 Commits auf `sprint-k-ui-frontend`, alle gepusht.**

---

## Was Marcel jetzt machen muss

### Pflicht (vor Cutover):
1. **PDFMonkey Bulk-Patch** der 5 retrofitteten Templates (siehe Item 5).
2. **F-01 JVEG-Rechnung Goldstandard-File** neu anlegen (oder direkt
   PDFMonkey-Template manuell mit Stempel-Slots versehen).
3. **Profil-Page testen** (Item 1 Klick-Liste oben).
4. **Bei Erfolg:** Logo + Stempel + Unterschrift hochladen.

### Nice-to-have (kann auf K-1.4 warten):
1. akte.html Korrespondenz-Liste (Item 4 Rest).
2. Sidebar-Counts fuer "Kontakte" auf neue Page anpassen
   (gegen `kontakte`-Tabelle statt Airtable).
3. Old `kontakte.html` und `briefvorlagen.html` deprecaten -> nach
   Cutover-Phase 5 cleanup.

---

## Bekannte Risiken / Limitierungen

1. **Bilder-Upload braucht echten Browser** — `file://` haben kein
   `supabase.storage` Zugriff. Lokal Tests muessen ueber
   Netlify-Dev-Server laufen.
2. **Signed URLs sind 1h gueltig** — bei langen Sessions kann
   Logo-Vorschau ablaufen. Reload behebt es.
3. **`brief-generate` 503-Fehler:** wenn ein Template-Key noch
   `<TODO_PDFMONKEY_UUID_*>` haette, weist Edge-Function darauf hin.
   Aktuell sind alle 11 echte UUIDs (Pre-Flight-Commit 6f649f5).
4. **search_vector** in `kontakte`-Tabelle muss DB-seitig existieren
   (sollte aus K-1.0 da sein). Bei Fehler "column search_vector does
   not exist" -> Migration fehlt.

---

## Tag-Empfehlung

Nach Marcel-Verifikation aller Klick-Listen:
`v320-k-ui-frontend` (semver-passend nach v300-supabase-foundation).
