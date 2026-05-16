# MEGA⁸² A.4 — §§-Notation-Audit

**Stand:** 2026-05-16 · Branch: `feat/mega82-verkauf-ready`

## Status

**Original-Bug `§§\s?\d+-§\d+` (z.B. `§§1-§7`):** ✅ **bereits 0 Treffer in gesamtem Repo.**
Wahrscheinlich in einem früheren Sprint behoben (vor MEGA82-Audit).

**Standard `§§ \d+–\d+` (mit Gedankenstrich U+2013):** Marcel-Direktive für künftige UI-Texte.

---

## Bindestrich → Gedankenstrich-Cleanup (Phase A.4)

| File | Stelle | Status |
|---|---|---|
| `demo.html` Z.80 | `§§ 1-5` → `§§ 1–5` | ✅ patched |
| `wertgutachten-logic.js` Z.762 | `§§ 194-199 BauGB` → `§§ 194–199 BauGB` | ✅ patched |

## Verbleibend (Backend/Lib/Tests/Templates — DEFER MEGA83)

Diese Stellen nutzen weiterhin Bindestrich, weil sie als String in Audit-Logs, Test-Assertions, oder Liquid-Templates landen wo der Gedankenstrich Tooling-Risiko bedeutet:

| File | Treffer | Begründung Defer |
|---|---|---|
| `lib/wertgutachten-verfahren.js` | 6× `§§22-39 ImmoWertV` etc. | `rechtsgrundlage`-String wird in Tests assertet (`a2-multi-verfahren.test.js`). Replace bricht Tests. |
| `lib/auftrags-schema.js` | 1× `BGB §§634-639` | Schema-Constant, bricht JSONB-Schema-Sync. |
| `netlify/functions/lib/prova-fachwissen.js` | 5× ImmoWertV/BelWertV/BewG §§-Refs | Backend-Liste für RAG, Match-Sensitiv. |
| `netlify/functions/ki-proxy.js` Z.414 | Kommentar `§§ 1-7` | ki-proxy ist auf CLAUDE.md NIE-WRAPPEN-Liste. |
| `docs/templates-goldstandard/F-19-WERTGUTACHTEN.liquid.template.html` | 3× | PDFMonkey-Template, Replace im Liquid-Template-Sprint. |
| `tests/templates-liquid/f-19-wertgutachten.test.js` | 1× | Test-Assertion. |
| `tests/flow-b/a2-multi-verfahren.test.js` | 4× | Test-Assertion. |
| `lib/auftrags-schema.js`, andere `docs/` | weitere Treffer | Reine Doku/Backend. |

**MEGA83-Sub-Task:** Backend-§§-Sweep + Test-Anpassungen koordiniert.

---

## Standard für künftige Code-Reviews

✅ `§§ 1–5` (Doppel-§ + Leerzeichen + Gedankenstrich U+2013 + Zahl + Leerzeichen + Gesetz)
✅ `§§ 194–199 BauGB`
✅ `§§ 22–39 ImmoWertV`

❌ `§§1-§7` (Original-Bug)
❌ `§§ 1-5` (Bindestrich statt Gedankenstrich)
❌ `§§1–5` (kein Leerzeichen nach §§)
❌ `§§ 1 – 5` (zu viele Leerzeichen)

In `WORDING-STANDARDS.md` (Phase D.2) referenzieren.
