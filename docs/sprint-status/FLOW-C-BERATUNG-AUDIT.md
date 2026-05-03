# Flow C Beratung — Audit + Erweiterung

**Datum:** 04.05.2026 abend (MEGA⁴ Q4)
**Status:** Existing Code + neue Schemas + F-20 Goldstandard erstellt

---

## Realitaets-Check

Marcel-Direktive Q4 forderte 3 separate Pages (beratung-neu/akte/list) + Logic + Schema + F-20.

**Tatsaechlicher Stand:**
- `beratung.html` (303 LOC) existiert als **1-Page-Wizard** mit 3 Phasen (Auftragsannahme + Beratungstermin + Abschluss)
- `beratung-logic.js` (622 LOC) existiert voll funktional
- Noch Airtable-basiert (Flow='C' in SCHADENSFAELLE)
- Sentry-Init + Mobile-Polish fehlten

## Diese Nacht erledigt

### lib/schemas/beratung.js (NEU)
- 3 zod-Schemas: `beratungAuftragSchema` + `beratungProtokollSchema` + `beratungAbschlussSchema`
- 3 Enums: `beratungstyp`, `beratungsthemenkategorie`, `beratungsstatus`
- Strikte Validation (Email + Telefon + Datum-Format + Stundensatz-Grenzen)

### F-20 BERATUNGSPROTOKOLL Liquid-Goldstandard (NEU)
- `docs/templates-goldstandard/05-sonstige/F-20-BERATUNGSPROTOKOLL.liquid.template.html` (~150 LOC)
- 4 Sektionen: Anlass + Besprochene Punkte + Empfehlungen mit Prioritaets-Badges + Folge-Aktionen-Tabelle
- Honorar-Card-Komponente (Brutto-Anzeige)
- KI-Box mit Art. 50 EU AI Act Verantwortungsklausel
- Beispiel-Payload mit Kaufberatung-Bestand-Fall

### beratung.html erweitert
- `lib/sentry-init.js` Script eingebunden
- `lib/mobile-polish.css` + `lib/mobile-polish.js` integriert

## Architektur-Decision: 1-Page-Wizard bleibt

Die Marcel-Direktive forderte 3 separate Pages — das existing 1-Page-Wizard-Konzept ist aber besser fuer Solo-SVs:
- weniger Page-Hops = schnellerer Workflow
- 3 Phasen via Wizard-Steps in einer Page klarer
- Mobile-Tauglichkeit hoeher

**Empfehlung:** existing 1-Page-Wizard belassen. 3-Page-Split als BACKLOG falls Pilot-Feedback es erfordert.

## Backlog (Sprint K-2)

- AIRTABLE-MIG: beratung-logic.js Flow='C' -> Supabase-Tabelle `beratungen`
- F-20 PDFMonkey-Template anlegen (Marcel-Pflicht)
- 3-Page-Split falls Pilot-Feedback es erfordert
- Beratungs-spezifische Tests in tests/

---

*MEGA⁴ Q4 abgeschlossen — 04.05.2026*
