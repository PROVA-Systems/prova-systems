# PROVA Systems · pdf-templates/

**Goldstandard-Backup fuer PDFMonkey-Liquid-Templates.**

Dieser Ordner enthaelt die Master-HTML-Dateien fuer alle Mode-C-relevanten
PDFMonkey-Templates. Wird in PDFMonkey-UI gepflegt — aber jede Aenderung
muss hier auch committed werden, damit Repo-History den Stand widerspiegelt.

---

## Templates

| File | Zweck | PDFMonkey-Identifier | Status |
|---|---|---|---|
| `MODE_C_GENERIC.template.html` | Wrapper-Template fuer User-HTML aus Mode-C-Vorlagen | `MODE_C_GENERIC` | MEGA¹⁸ NEU |
| `F-01-JVEG-RECHNUNG.template.html` | Sachverstaendigen-Rechnung nach JVEG | `F-01-JVEG-RECHNUNG` | MEGA¹⁸ NEU (ueberarbeitet) |
| `F-23-SACHVERSTAENDIGENKOSTEN.template.html` | Detaillierte Kostenrechnung fuer Gerichtsverfahren | `F-23-SACHVERSTAENDIGENKOSTEN` | MEGA¹⁸ NEU |
| `F-25-HONORARTABELLE.template.html` | Uebersicht Stundensaetze + Pauschalen | `F-25-HONORARTABELLE` | MEGA¹⁸ NEU |

**Tier-6-PDFs noch offen (MEGA¹⁹+):**
- F-07-MAHNUNG-2 (existiert in `docs/templates-goldstandard/`, ueberarbeitung anstehend)
- F-08-MAHNUNG-3-LETZTE (analog)
- F-24-AKTENAUSZUG (NEU)

---

## Naming-Konflikt-Note (MEGA¹⁸ W64-Decision)

Marcel-Direktive nannte F-16/F-17/F-18 fuer SV-Kosten/Aktenauszug/Honorartabelle.
Diese F-Nummern sind in `docs/templates-goldstandard/04-gutachten/` bereits vergeben
fuer Ergaenzung/Schiedsgutachten/Bauabnahme.

Resolution: Neue Templates verwenden **F-23/F-24/F-25**.

---

## Marcel-Pflicht vor Pilot-Launch

1. **PDFMonkey Pro-Plan** aktivieren (15€/mo)
2. Pro Template:
   - In PDFMonkey UI neues Template anlegen
   - HTML-Code aus diesem Ordner kopieren (gesamten Inhalt)
   - Sample-Payload aus zugehoeriger `.payload.example.json` als Test-Data
   - Template-UUID kopieren
3. Netlify-ENV setzen:
   - `PDFMONKEY_API_KEY` (existing)
   - `PDFMONKEY_MODE_C_TEMPLATE_ID` (NEU, fuer MODE_C_GENERIC)
4. Optional weitere Template-IDs als ENV (fuer kuenftige Direkt-Calls):
   - `PDFMONKEY_F01_TEMPLATE_ID`
   - `PDFMONKEY_F23_TEMPLATE_ID`
   - `PDFMONKEY_F25_TEMPLATE_ID`

---

## Workflow Aktualisierung Template

1. Template in diesem Ordner editieren
2. `node --check` (kein Pflicht da HTML, aber Pre-Post-Test-Pattern)
3. Tests in `tests/pdf/f-XX.test.js` laufen lassen
4. Commit in Repo
5. PDFMonkey-UI: gleichen HTML-Code paste in Template
6. Test-Render mit Sample-Payload in PDFMonkey
7. Bei Erfolg: Status auf "ACTIVE" in PDFMonkey

---

*Stand: MEGA¹⁸ (2026-05-08). Triple-Mode-Pilot-Launch-Vorbereitung.*
