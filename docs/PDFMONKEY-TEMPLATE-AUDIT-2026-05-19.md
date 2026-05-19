# PDFmonkey-Template-Audit 2026-05-19

Generiert via `tools/pdfmonkey-bulk-patch.js --audit`

## Summary

- **37** Templates total (davon **0** KI-Templates F-04/F-09/F-15/F-19/KI-*)
- **0** haben bereits Logo, **37** brauchen Logo-Inject
- **20** haben EU AI Act Erwähnung, **0** KI-Templates brauchen EU-Disclosure-Box
- **0** enthalten noch gpt-4o (sollte 0 sein nach Patch)
- **0** nutzen Inter/JetBrains Mono (Design-System v1.0 konform)
- **0** nutzen veraltete Fonts (Source Serif/Helvetica/Arial/Montserrat)

## Recommended Actions

- **Run** `node tools/pdfmonkey-bulk-patch.js --execute --inject-logo` to add logo to 37 Templates

## Per-Template Detail

| Template | Type | Logo | EU-Box | gpt-4o | Font | Actions |
|---|---|---|---|---|---|---|
| Fotodoku | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-13 – ELEMENTARSCHADEN | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-09 – KURZGUTACHTEN | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-03 – Stundenrechnung | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-16 – ERGAENZUNG | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-04 – Kurzstellungnahme | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-12 – FEUCHTE/SCHIMMEL | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-14 – BAUMAENGEL | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-10 – BEWEISSICHERUNG | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-11 – BRANDSCHADEN | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-05 – Gutschrift/Storno | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-19 –WERTGUTACHTEN  | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-07 – 2. Mahnung | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-15 – GERICHTSGUTACHTEN | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-17 – SCHIEDSGUTACHTEN | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-18 – BAUABNAHME | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-02 – Pauschalrechnung | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-01 – JVEG Gerichtsrechnung | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-06 – 1. Mahnung | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA Gutachten TEAM | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA Gutachten SOLO | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA – F-08 – 3. Mahnung (Letzte) | - | ✗ | — | ✓ | ? | inject-logo |
| PROVA Brief | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-09-auftragsablehnung | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-03-termin-mehrparteien | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-06a-zahlungserinnerung | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-02-termin-ag | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-08-befangenheits-anzeige | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-04-anforderung-unterlagen | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-05-uebergabe-gutachten | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-01-auftragsbestaetigung | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-06c-mahnung-3 | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-06b-mahnung-2 | - | ✗ | — | ✓ | ? | inject-logo |
| prova-k-07-akteneinsicht | - | ✗ | — | ✓ | ? | inject-logo |
| F-25 HONORARTABELLE | - | ✗ | — | ✓ | ? | inject-logo |
| F-23 SACHVERSTAENDIGENKOSTEN | - | ✗ | — | ✓ | ? | inject-logo |
| MODE_C_GENERIC | - | ✗ | — | ✓ | ? | inject-logo |

## Legende

- ✓ vorhanden / OK
- ✗ fehlt — Inject-Recommended
- (M) Marker vorhanden aber Block nicht expandiert
- — nicht relevant (Non-KI-Template)
- ❗ Patch erforderlich
