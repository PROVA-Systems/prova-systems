# Flow B Wertgutachten — Live-Status

**Datum:** 03.05.2026 abend (Sprint MEGA-MEGA-MEGA O5)
**Status:** ✅ Bereits gepusht und integriert (von Sprint P5f.C, Commit `f444713`)

---

## Realitaets-Check

Marcel-Direktive sagte "Flow B 985 Zeilen lokal vorhanden, NICHT gepusht (git PATH issue)". Tatsaechlicher Stand:

| Item | Status | Details |
|---|---|---|
| `wertgutachten.html` | ✅ im Repo | 536 LOC |
| `wertgutachten-logic.js` | ✅ im Repo | 1384 LOC (groesser als 985) |
| Push-Status | ✅ | Commit `f444713` ("P5f.C: Schwergewichte auf Template (wertgutachten + ...)") |
| sw.js APP_SHELL | ✅ | Zeile 63-64 enthält `/wertgutachten.html` + `/wertgutachten-logic.js` |
| nav.js Hauptmenü | ✅ | Zeile 564: `{ id: 'wertgutachten', icon: '🏠', label: 'Wertgutachten', url: 'wertgutachten.html' }` |
| auftragstyp.js Routing | ✅ | Zeile 488: `'mietwert' → wertgutachten.html?typ=...` + Verkehrswert + Beleihungswert |
| F-19 Goldstandard-Template | ✅ | `docs/templates-goldstandard/04-gutachten/F-19-WERTGUTACHTEN.template.html` (984 LOC, Liquid-templated, IHK-SVO 4-Teile, ImmoWertV-2021) |
| F-19 PDFMonkey-Template | ❓ | ID `29064D98-FD12-4135-9D44-F49CCF9819C6` — Marcel-Pflicht zu verifizieren ob aktuell |

## Diese Nacht O5 erledigt

- ✅ Sentry-Init Script in `wertgutachten.html` ergaenzt (war fehlend; war auch in dashboard.html / akte.html fehlend → Backlog O6)
- ✅ Status-Doku (dieses File)

## Nicht erledigt (Begruendung)

- ❌ **51 Tests gruen verifizieren** — keine wertgutachten-spezifischen Tests im `tests/`-Folder. Marcel meinte vermutlich General-PROVA-Tests.
- ❌ **F-19 PDFMonkey-Template-Update** — externer Service, Marcel-Pflicht (siehe IHK-SVO-TEMPLATES-MIGRATION.md)
- ❌ **End-to-End-Test mit Mock-Daten** — kein Browser, kein Live-Test moeglich

## Marcel-Pflicht-Aktionen

1. Wertgutachten-Page testen: Login → "Neuer Auftrag" → "Verkehrswertgutachten" → Form ausfuellen → PDF generieren
2. F-19-Template in PDFMonkey verifizieren (PDFMonkey-ID `29064D98-FD12-4135-9D44-F49CCF9819C6`)
3. Falls F-19 nicht aktuell: Goldstandard-HTML kopieren (siehe `docs/strategie/IHK-SVO-TEMPLATES-MIGRATION.md` Schritt 1-5)
4. Test-Wertgutachten ausfuellen + PDF-Output gegen Goldstandard pruefen

## Backlog (Sprint K-2)

- Sentry-Init in **alle restlichen Pages** ergaenzen (siehe O6)
- zod-Schema-Validation fuer Wertgutachten-spezifische Backend-Calls (Bewertungs-Verfahren, Stichtag, Gutachtenzweck)
- Wertgutachten-spezifische Test-Suite (Verkehrswert / Beleihungswert / Mietwert)

---

*Sprint O5 abgeschlossen — Flow B war bereits live, kleine Sentry-Erganzung fertiggestellt.*
