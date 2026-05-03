# MEGA⁸ — Self-Assessment + Plan

**Datum:** 04.05.2026 nacht
**Vorgaenger-Tag:** v212-perfektion-tier-3-4-8-9-11-12-done
**Modus:** SELF-SCOPING CONTINUE (Quality > Quantity)

---

## Realitaets-Check pro offenem Tier (aus MEGA⁷-Backlog)

| Tier | Stand nach MEGA⁷ | Was machbar OHNE Browser/Live-Test |
|---|---|---|
| **Tier 2 voll (Cockpit)** | 12/12 Sektionen + CSV+Shortcuts (U6). Real-time/Drilldown/Notifications/Dark-Mode/Diff-View/Bulk/Mobile/Charts pending. | **MAX:** Real-time-WebSocket-Code (Supabase Realtime ist API-basiert, deployed-läuft), Drilldown-Modals (Frontend-Component), Notifications-Panel (UI), Dark/Light-Toggle (CSS-Variables), Bulk-Operations-Multi-Select. **Skip:** WebSocket-Live-Test (Marcel-Browser), Visual-Polish-Audit. |
| **Tier 5 voll (KI)** | KI-Pipeline + Pseudonymisierung + Cost-Tracking basic. | **MAX:** lib/ki-prompts/ Templates-JSON, Konjunktiv-II-Engine-Verbesserung (Pre/Post-Filter), Cost-Tracking-Aggregation, Anthropic-Fallback-Pattern, KI-History-Page (akte/ki-history.html), Confidence-Score-Backend-Logic. **Skip:** Edit-Suggestions UI (Browser-Test-Pflicht für autosuggest UX). |
| **Tier 6 voll (PDFs)** | F-04/F-09/F-15/F-19/F-20/F-21/F-22 Liquid done. F-10 bis F-18 + F-01/F-02/F-03/F-05-08 als Demo-HTML. | **MAX:** 5 weitere Liquid-Goldstandards (F-10 bis F-14, Pattern aus F-09 reuse). **Skip:** PDFMonkey-Push (Marcel-Manual), Bulk-PDF (Marcel-Live-Test), PDF-Preview im Browser (Browser-Pflicht). |
| **Tier 7 voll (Upload)** | foto-upload Function geloescht in M1c. Existing in akte.html. | **MAX:** lib/foto-upload-v2.js Helper mit EXIF-Strip-Logic + File-Type-Validation. **Skip:** Drag-Drop-UX-Test, Multi-File-Progress-Visual, Resume-Test (alles Browser-Pflicht). |
| **Tier 12 Migration** | Empty-State-Library + Error-Pages done (U3). Migration in Pages pending. | **MAX:** Empty-States in 5 Pages, Toast-Notifications in 5+ existing Pages, Form-Validation-Layer als Lib (lib/form-validate.js), WCAG-Code-Audit-Doku. |

---

## Mein Plan (Self-Scoping)

**Variante: 4 Tiers in höchster Quality + 1 Tier partial**

| Sprint | Tier | Fokus | Aufwand |
|---|---|---|---|
| **V1** | Tier 2 voll | Real-time + Drilldown + Notifications + Dark/Light + Bulk + Mobile | 3-4h |
| **V2** | Tier 12 Migration | Empty-States in 5 Pages + Toast-Migration + form-validate.js + WCAG-Audit | 2-3h |
| **V3** | Tier 5 voll | Prompts-Templates + Konjunktiv-Engine + Cost-Tracking + Fallback + History + Confidence | 3-4h |
| **V4** | Tier 6 partial | 5 Liquid-Goldstandards (F-10 bis F-14) | 2h |
| **V5** | Final | Master-Sync + Tag v213 | 30min |

**Total geschaetzt:** ~11-13h. Realistisch in 8-12h-Fenster.

**MEGA⁹-Backlog (transparent):**
- Tier 6 (10 weitere Goldstandards: F-01/02/03/05/06/07/08/16/17/18, ~5h)
- Tier 7 voll (Foto-Upload Visual-Tests Browser-Pflicht, ~4h)
- Browser-Pflicht-Tasks aus Tier 1/2/9/11/12 (alle Visual-Tests)
- Marcel-Decisions: Analytics-Tool-Wahl, Live-WebSocket-Test, PDFMonkey-Pushes

---

## NACHT-PAUSE-Triggers (möglich)

1. WebSocket-Architektur-Decision: Supabase Realtime vs. Custom (gehe ich von Supabase Realtime aus, Marcel kann reverten)
2. Konjunktiv-II-Engine: aggressiv vs. konservativ (gehe ich von konservativ aus)
3. Anthropic-Fallback: API-Key-Pflicht (Marcel-Manual fuer ENV)

---

## Quality-Bar pro Sprint

- **V1 Cockpit:** Code-Quality, 0 Production-Breaking, additiv-only
- **V2 Migration:** alle 5 Pages testbar mit existing CSS, kein Visual-Refactor
- **V3 KI:** Backend-Logic + Tests, kein Browser-Pflicht für Confidence-Display
- **V4 PDFs:** Pattern-Reuse F-09, Mock-Payload-JSONs pro Template
- **V5 Final:** Tag erst wenn alle Quality-Checks gruen

---

*Self-Assessment-Stand 04.05.2026 nacht. Plan-Start: V1.*
