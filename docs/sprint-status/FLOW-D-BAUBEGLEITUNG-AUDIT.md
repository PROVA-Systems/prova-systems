# Flow D Baubegleitung — Audit + Erweiterung

**Datum:** 04.05.2026 abend (MEGA⁴ Q5)

---

## Realitaets-Check

Marcel-Direktive Q5 forderte 4 separate Pages + Logic + Schemas + 2 Goldstandards.

**Tatsaechlicher Stand:**
- `baubegleitung.html` (267 LOC) + `baubegleitung-logic.js` (753 LOC) + `baubegleitung-polish.js` (388 LOC) existieren
- Voll funktional als 1-Page-App mit Modal-Workflows fuer Projekt + Begehung
- Airtable-basiert
- Sentry/Mobile-Polish fehlten

## Diese Nacht erledigt

### lib/schemas/baubegleitung.js (NEU)
- 3 zod-Schemas: `baubegleitungProjektSchema` + `baubegleitungBegehungSchema` + `baubegleitungAbnahmeSchema`
- 3 Enums: `projektstatus`, `begehungstyp`, `mangelschwere` (optisch/technisch/wesentlich/kritisch)
- Honorar-Modell flexibel: `stundensatz` / `pauschal` / `prozent_bausumme`
- Mangel-Lifecycle: `behoben` Boolean + `frist_behebung` Datum

### F-21 BAUBEGLEITUNG-PROTOKOLL Liquid-Goldstandard (NEU)
- `docs/templates-goldstandard/05-sonstige/F-21-BAUBEGLEITUNG-PROTOKOLL.liquid.template.html` (~210 LOC)
- Periodisches Begehungs-Protokoll
- Sektionen: Anwesende + Bautagebuch + Befunde + Maengel mit Schwere-Badges + Naechste Schritte
- Mangel-Schwere-Color-Coding (optisch/technisch/wesentlich/kritisch)
- KI-Einsatz-Sektion (Art. 50 EU AI Act)

### F-22 BAUABNAHME Liquid-Goldstandard (NEU)
- `docs/templates-goldstandard/05-sonstige/F-22-BAUABNAHME.liquid.template.html` (~200 LOC)
- Final-/Teil-/Nachabnahme-Protokoll
- Status-Card-Komponente (voll/vorbehalt/verweigert mit Color-Gradients)
- Restmaengel-Liste mit Sicherheitseinbehalt pro Mangel
- Sicherheitseinbehalt-Summen-Card (§ 17 VOB/B)
- Erklaerungs-Kaesten fuer Bauherr + Unternehmen
- Rechtshinweise § 640 BGB / § 12 VOB/B / § 634a BGB
- 3-Spalten-Unterschriftsblock (Bauherr + Unternehmen + SV)

### F-21-22-BEISPIEL.liquid.payload.json (NEU)
- Gemeinsames Beispiel-Payload mit Neubau-EFH-Fall
- F-21: Wochen-Begehung mit Befunden + 2 Maengeln
- F-22: Schluss-Abnahme unter Vorbehalt mit 4 Restmaengeln + 2.300 € Sicherheitseinbehalt

### baubegleitung.html erweitert
- Sentry-Init + mobile-polish.css + mobile-polish.js integriert

## Architektur-Decision: 1-Page-App bleibt

Existing Modal-basierte 1-Page-App ist fuer Mobile-Nutzung (Bauleiter unterwegs) besser geeignet als 4-Page-Split. Schnelles Wechseln zwischen Projekten + Begehungen via Modals.

**Empfehlung:** existing 1-Page-App belassen. 4-Page-Split als BACKLOG.

## Backlog (Sprint K-2)

- F-21 + F-22 PDFMonkey-Templates anlegen (Marcel-Pflicht)
- AIRTABLE-MIG: baubegleitung-logic.js -> Supabase-Tabelle `baubegleitungs_projekte` + `begehungen` + `bauabnahmen`
- Plan-Restriction: nur Team-Plan (in baubegleitung.html paket-guard.js bereits implementiert)
- Photo-Upload fuer Begehungs-Befunde via ProvaMobile.openCamera()

---

*MEGA⁴ Q5 abgeschlossen — 04.05.2026*
