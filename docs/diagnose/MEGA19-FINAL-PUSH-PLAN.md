# MEGA¹⁹ — FINAL-PUSH ZUM PILOT-LAUNCH Plan

**Datum:** 2026-05-08
**Vorgaenger-Tag:** v226-pdf-service-tier6 (MEGA¹⁸)
**Modus:** Pilot-Launch-Vorbereitung (heute Nacht)

---

## 1. Vorab-Status (Marcel-Setup-Pflichten erledigt)

✅ Migrations 07/08/09 in Supabase angewendet
✅ ALLE 4 PDFMonkey-Templates aktiv (MODE_C_GENERIC + F-01 + F-23 + F-25)
✅ ENV `PDFMONKEY_*_TEMPLATE_ID`s gesetzt
✅ ENV `PDF_SERVICE=pdfmonkey` gesetzt
✅ 56 commits ahead von origin/main, 385 Tests gruen

## 2. Marcel-Direktive (gekuerzt am Prompt-Ende)

PRIO 1 — 3 fehlende Tier-6 PDFs (60 Min):
- F-07-MAHNUNG-1 (höflich, 14 Tage, ohne Verzugszinsen)
- F-08-MAHNUNG-3-LETZTMALIG (§ 288 BGB, Inkasso, 7 Tage)
- F-24-AKTENAUSZUG (NEU, chronologisch, MIT EU AI Act Box)

PRIO 2 — Tier 4 Airtable-Quick-Cleanup (45 Min):
- Audit-Doc + Top 5 lauteste Functions
- Quick-Fixes (kein Voll-Migration, das ist MEGA²¹)
- Frontend Error-Suppression

PRIO 3 — Onboarding-Wizard (45 Min):
- DB-based Trigger via user_workflow_settings
- A11y: Esc/Click-outside/Focus-Trap
- Mobile-responsive
- Backdrop-Blur

**Note:** lib/onboarding-trigger.js EXISTIERT bereits aus MEGA¹⁷-W61.
Ich erweitere statt neu zu bauen (DB-Trigger + A11y-Verbesserungen).

PRIO 4 — Browser-Smoke-Tests-Plan: in Final-Report aufnehmen

PRIO 5 (Marcel-Erwaehnung, aber OFFEN gelassen): Tier 2 Cockpit-Final
(Saved-Views + Diff-View + Universal Search). **Bewusst NICHT in MEGA¹⁹**
— Token-Realismus, das ist 1-2 eigene Sprints.

## 3. Capacity-Estimate

| Tier | Tasks | Token | Confidence |
|---|---|---:|---:|
| **PRIMARY** | W74-W80 (3 PDFs + Onboarding-Erweiterung + Airtable + Final) | ~75k | 80% |
| STRETCH | + Tier 2 Cockpit Saved-Views | +25k | 25% |
| ULTIMATE | + Cockpit Diff-View + Universal Search | +35k | 8% |

**Decision:** PRIMARY confirmed. Cockpit-Tier-2 wandert ehrlich nach MEGA²⁰.

## 4. Anti-Patterns vermieden

- KEIN cp+sed bei den 3 PDFs
- KEINE komplette Airtable-Migration in MEGA¹⁹ (das ist MEGA²¹)
- Onboarding-Wizard wird ERWEITERT, nicht ersetzt (existing aus MEGA¹⁷)

## 5. Implementation-Reihenfolge

1. **W75-W77**: 3 PDFs (jede individuell, mit Tests)
2. **W78**: Onboarding-Erweiterung (DB-Trigger + A11y)
3. **W79**: Airtable-Quick-Cleanup
4. **W80**: Final-Report + sw.js v278→v279

---

*Plan-Stand 2026-05-08. Start W75: F-07-MAHNUNG-1.*
