# MEGA³⁶ B2 — PDFMonkey-UUIDs Verify

**Datum:** 2026-05-08
**Status:** Static-Verify (kein API-Call — PDFMONKEY_API_KEY in Sandbox nicht verfügbar).
**Marcel-Manual:** API-Verify-Anleitung am Ende.

---

## Live-DB-Inhalt (verifiziert via Supabase MCP)

| pdfmonkey_template_id | pdfmonkey_template_name | typ | Anzahl-Refs |
|---|---|---|---|
| F-04 | F-04-KURZSTELLUNGNAHME | kurzstellungnahme_pdf | 1 |
| F-06 | F-06-MAHNUNG-1 | mahnung_1 | 1 |
| F-07 | F-07-MAHNUNG-2 | mahnung_2 | 1 |
| F-08 | F-08-MAHNUNG-3-LETZTE | mahnung_3 | 1 |
| F-09 | F-09-KURZGUTACHTEN | gutachten_pdf | 1 |
| F-10 | F-10-BEWEISSICHERUNG | beweissicherung_pdf | 1 |
| K-01 | PROVA-BRIEF | auftragsbestaetigung | 1 |
| K-02 | PROVA-BRIEF | termin_bestaetigung | 1 |
| K-03 | PROVA-BRIEF | termin_bestaetigung | 1 |
| K-04 | PROVA-BRIEF | brief | 1 |
| K-05 | PROVA-BRIEF | anschreiben | 1 |
| K-07 | PROVA-BRIEF | brief | 1 |
| K-08 | PROVA-BRIEF | brief | 1 |
| K-09 | PROVA-BRIEF | brief | 1 |

**Distinct PDFMonkey-Templates:** 7
- F-04, F-06, F-07, F-08, F-09, F-10 (je eigenes Template)
- PROVA-BRIEF (8× geshared für K-01..K-05 + K-07..K-09)

---

## Marcel-Manual: API-Verify

```bash
# Voraussetzung: PDFMONKEY_API_KEY in Marcel's lokaler Shell
PDFMONKEY_API_KEY="$(cat ~/.pdfmonkey-key)"
curl -H "Authorization: Bearer $PDFMONKEY_API_KEY" \
  https://api.pdfmonkey.io/api/v1/document_template_cards \
  | jq '.document_template_cards[] | {identifier, status, body_html_length: (.body_html | length)}'
```

**Erwartete Identifier:**
- `F-04-KURZSTELLUNGNAHME`
- `F-06-MAHNUNG-1`
- `F-07-MAHNUNG-2`
- `F-08-MAHNUNG-3-LETZTE`
- `F-09-KURZGUTACHTEN`
- `F-10-BEWEISSICHERUNG`
- `PROVA-BRIEF`

**Falls einer fehlt:** `docs/templates-goldstandard/`-Repo enthält die HTML-Templates — Marcel kann sie via PDFMonkey-Dashboard hochladen.

---

## Doku-Verify-Test (Static)

Tests/migration/migration-24-dokument-templates.test.js (M³⁶ W5.3) deckt Static-Verify-Pfade. B2 ergänzt MCP-Verify gegen Live-DB als Sanity-Check ohne API-Call.

*— M³⁷ B2 — 2026-05-08*
