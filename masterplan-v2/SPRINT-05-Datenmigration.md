# SPRINT 05 — Legacy-Datenmigration-Assistent

**Tag:** 5 · **Aufwand:** 4-5h · **Phase:** A Security-Fundament  
**Detail-Spec:** `05_LEGACY-DATENMIGRATION.md`

---

## Ziel
Ein neuer SV kann seine Bestandsdaten (Kontakte, Altfälle, Altrechnungen, Altdokumente) ohne manuellen Aufwand nach PROVA importieren. Rollback-fähig.

---

## Scope

**Komplett-Umbau** `import-assistent.html` + `import-assistent-logic.js`. Heute schreibt es in localStorage (Bug aus Sprint 04 markiert) — neu schreibt es in Airtable.

**4 Import-Typen:**
1. Kontakte (CSV)
2. Altfälle (CSV + optional PDF-Anhänge)
3. Altrechnungen (CSV)
4. Altdokumente (Bulk-PDF)

**Workflow** (siehe 05_LEGACY-DATENMIGRATION.md für Details):
1. Typ wählen
2. Datei hochladen
3. Preview + Mapping
4. Duplikat-Handling wählen
5. Import starten mit Progress
6. Zusammenfassung mit Rollback-Option (24h)

---

## Prompt für Claude Code

```
PROVA Sprint 05 — Datenmigrations-Assistent (Tag 5)

Pflicht-Lektüre vor Start:
- 05_LEGACY-DATENMIGRATION.md (kompletter Spec)
- 01_UI-PRINZIPIEN.md (für UI-Standards)
- airtable.js (Schreibmuster)
- Bestehender import-assistent.html + import-assistent-logic.js


SCOPE
=====

Commit 1: Datenmodell-Erweiterung
- Neue Felder in 4 Tabellen via Airtable Meta API anlegen:
  - KONTAKTE: import_batch_id (Single line text), import_datum (Date), import_quelle (Single line)
  - SCHADENSFAELLE: import_batch_id, import_datum, import_quelle
  - RECHNUNGEN: import_batch_id, import_datum, import_quelle, status erweitern um "bezahlt_historisch"
- Neue Tabelle IMPORT_BATCHES anlegen:
  - batch_id (Primärfeld, UUID), sv_email, typ, anzahl_records, erstellt_am, 
    rollback_deadline, status (aktiv/zurückgerollt)

Commit 2: import-assistent.html komplett-Rewrite
- 5-Step-Wizard (Step-Indicator oben)
- Step 1: Typ-Auswahl (4 Karten)
- Step 2: File-Upload (Drag & Drop, akzeptiert CSV/ZIP/PDFs je nach Typ)
- Step 3: Preview-Tabelle (erste 5 Zeilen) + Encoding-Selector (UTF-8/ISO-8859-1)
- Step 4: Feld-Mapping (Drag-Drop oder Dropdown CSV-Spalte zu PROVA-Feld)
- Step 5: Duplikat-Handling-Options + Start-Button
- Während Import: Progress-Bar mit Live-Log
- Nach Import: Summary mit Rollback-Button (24h-Timer)

Commit 3: lib/csv-parser.js
- Encoding-Detection via BOM
- Datumsformat-Auto-Detect (DE/ISO/US)
- Robust gegen Quote-Issues, Trailing-Commas

Commit 4: netlify/functions/import-execute.js
- Bekommt: typ, mapping, options, payload (CSV-Inhalt parsed)
- Erstellt IMPORT_BATCH-Record (UUID)
- Iteriert Records, schreibt in Ziel-Tabelle in 50er-Batches
- Dedup-Check je nach Typ (Kontakt: Email, Fall: AZ, Rechnung: rechnungsnummer)
- Returns: stats { imported, skipped_duplicate, errors, batch_id }

Commit 5: netlify/functions/import-rollback.js
- Bekommt: batch_id
- Prüft: rollback_deadline noch nicht erreicht?
- Löscht alle Records mit dieser batch_id aus Ziel-Tabelle
- Updated IMPORT_BATCH.status = 'zurückgerollt'

Commit 6: PDF-Bulk-Upload für Altdokumente
- ZIP entpacken (clientseitig via JSZip)
- Pro PDF: Name-Match mit existierenden AZs (Pattern: "AZ_*.pdf" oder "*_AZ.pdf")
- Bei Match: Anhang an SCHADENSFAELLE-Record
- Bei No-Match: User wählt manuell zu welchem Fall

Commit 7: Sidebar-Link prüfen
- Import-Assistent ist in "Weitere Funktionen" → korrekt
- Tooltip: "Bestandsdaten aus altem System importieren"

Commit 8: Onboarding-Welcome erweitern
- Im onboarding-welcome.html-Flow ein Schritt "Bestandsdaten importieren?" einfügen
- Buttons: "Jetzt importieren" → import-assistent.html | "Später" → weiter

Commit 9: sw.js v208


QUALITÄTSKRITERIEN
==================
- 50 Kontakte CSV importiert in < 30 Sek
- 1000 Kontakte in < 5 Min
- Rollback funktioniert
- UI ist 5-Step-Wizard mit klaren Visuals
- Fehler werden detailliert gezeigt (Zeile + Grund)
- Encoding-Probleme klar gemeldet


TESTS
=====
Test-CSV bereitstellen in tests/fixtures/:
- kontakte-test.csv (50 Zeilen, Umlaute, verschiedene Encodings)
- faelle-test.csv (10 Zeilen)
- rechnungen-test.csv (20 Zeilen)
- dokumente-bulk.zip (10 PDFs mit Name-Pattern)

Playwright-Test tests/07-import.spec.js:
- Login → Import-Assistent → Kontakte-CSV hochladen → Wizard durchklicken → Erfolg
- Rollback funktioniert
- Duplicate-Skip funktioniert


ACCEPTANCE
==========
1. Marcel kann 50-Kontakte-CSV importieren
2. Rollback macht sie wieder weg (innerhalb 24h)
3. PDF-Bulk-Upload mit Namens-Matching funktioniert
4. Onboarding-Welcome zeigt Import-Option an


TAG: v180-datenmigration-done
```

---

## Marcel-Browser-Test (15 Min)

1. Aus Outlook 50 Kontakte als CSV exportieren (oder Test-CSV nehmen)
2. Import-Assistent öffnen → Wizard durchklicken → Import → 50 in KONTAKTE
3. Sofort Rollback → KONTAKTE wieder leer (außer alte)
4. Erneut importieren mit Duplikat → wird übersprungen
5. Onboarding-Welcome in Inkognito → Import-Option sichtbar
