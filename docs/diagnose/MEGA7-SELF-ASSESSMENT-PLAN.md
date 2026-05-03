# MEGA⁷ — Self-Assessment + Plan

**Datum:** 04.05.2026 nacht
**Modus:** SELF-SCOPING (Quality > Quantity)
**Vorgaenger-Tag:** v211-compliance-pilot-ready-done

---

## 1. Realitaets-Check pro Tier

| Tier | Stand | Was machbar ohne Browser/Live-Test |
|---|---|---|
| **1. Mobile-App Perfektion** | mobile-polish.css/js auf 10 Pages, manifest.json, offline.html. Lighthouse 95+ unmessbar ohne Browser. | PWA-Foundations: Splash-Icons-Plan + Service-Worker-Offline-Verbesserung + manifest.json-Polish + Mobile-Critical-CSS-Inline. NICHT: Lighthouse-Verifikation. |
| **2. Admin-Cockpit World-Class** | 12/12 Sektionen funktional (admin/voll.html). Real-time WebSocket + Notifications-Panel = invasiver Refactor. | Polish: Filter+Search per Tab + CSV-Export + Keyboard-Shortcut (cmd+k) + Bulk-Selection-Pattern. NICHT: Real-time-WebSocket (Live-Test pflicht). |
| **3. Landing/Public-Pages Polish** | pilot.html professional, pricing.html mit Founding-Banner. Cookie-Consent + Cancellation-Survey-Modal fehlen. | Cancellation-Survey + Cookie-Consent + FAQ-Search-Polish. |
| **4. Airtable-Migration vollstaendig** | Storage-Router live + 4/14 Functions migriert. 10 weitere als Backlog. | 4-6 weitere Functions. NICHT: stripe-webhook (kritisch ohne Live-Test). |
| **5. KI-Features Polish** | KI-Pipeline solid + Pseudonymisierung + Cost-Tracking basic. | Confidence-Scores + History-View — aber Frontend-Refactor. **MEGA⁸**. |
| **6. PDF-Generation Polish** | F-04/F-09/F-15/F-19/F-20/F-21/F-22 Liquid done. 22 Templates total. | Restliche 15 Templates auf 4-Teile = ~15 × 500-800 LOC. **MEGA⁸** (zu viel). |
| **7. Upload-System Polish** | foto-upload Function gelöscht in M1c. Frontend nutzt Cloudinary (?). | Foto-Upload-Helper-Lib mit EXIF-Strip ohne Browser-Test riskant. **MEGA⁸**. |
| **8. Security Hardening** | M1c Rate-Limit + zod + Sentry. CSP existiert. | CSP-Audit + Rate-Limit-Coverage-Sweep + Dependency-Audit-Script. Gut machbar. |
| **9. Observability** | Sentry live. Status-Page fehlt. | Status-Page-Template (statisch) + Uptime-Monitor-Script. Synthetic-Tests = Browser-Pflicht **MEGA⁸**. |
| **10. Analytics** | Keine Analytics. Plausible vs. Matomo = Marcel-Decision. | NACHT-PAUSE-File fuer Marcel-Decision. |
| **11. Test-Coverage** | 209/209 grün. E2E mit Playwright = Browser-Pflicht. | +50-80 Unit-Tests in bestehenden Folders machbar. |
| **12. Final Polish** | 404 + offline existieren. 500/maintenance fehlen. | Error-Pages-Library + Empty-State-Pattern + Skeleton-Components. |

---

## 2. Mein Plan (Self-Scoping)

**Variante D — Eigene Wahl basierend auf Realitaets-Check:**

| Sprint | Tier | Fokus | Aufwand |
|---|---|---|---|
| **U1** | Tier 4 | 5 weitere Functions Storage-Router (low-risk read-heavy) | 2h |
| **U2** | Tier 8 | CSP-Audit + Rate-Limit-Coverage + Dependency-Audit-Script | 1.5h |
| **U3** | Tier 12 | Error-Pages (500 + maintenance) + Empty-State-Lib + Skeleton-Component | 1.5h |
| **U4** | Tier 3 | Cancellation-Survey-Modal + Cookie-Consent + FAQ-Polish | 1.5h |
| **U5** | Tier 11 | Tests +50 (Migration + Security + UI-Components) | 1h |
| **U6** | Tier 2 partial | Cockpit-Polish: CSV-Export per Tab + Keyboard-Shortcut + Filter-Pattern | 1.5h |
| **U7** | Tier 9 | Status-Page-Template (statisch) + Uptime-Monitor-Script | 1h |
| **U8** | Final | Master-Sync + Tag v212 | 30min |

**Total geschaetzt:** ~10h. Realistisch fuer 8-12h-Fenster.

---

## 3. Was BLEIBT fuer MEGA⁸ (transparent)

### Tier 1 (Mobile)
- Lighthouse 95+ Verifikation (Marcel-Browser-Test)
- iOS Safari Visual-Tests
- Tablet-Layout 768-1024 finetuning
- Mobile-Onboarding-Tour-Polish
- App-Icon-PNG-Versionen (statt SVG)

### Tier 2 (Cockpit Voll)
- Real-time WebSocket-Updates (Supabase Realtime)
- Notifications-Panel (Bell-Icon mit Badge)
- Drilldown von KPIs zu Detail-Views
- Audit-Trail mit Diff-View

### Tier 5 (KI Polish)
- KI-Confidence-Scores transparent
- KI-History pro Akte
- KI-Edit-Suggestions (autosuggest)

### Tier 6 (PDF voll)
- 15 weitere Templates auf IHK-SVO 4-Teile
- PDF-Preview im Browser

### Tier 7 (Upload)
- Foto-Upload-Helper mit EXIF-Strip + Resize
- Multi-File-Upload mit Progress

### Tier 9 (Observability voll)
- Synthetic-Tests mit Playwright (Browser-Pflicht)
- Performance-Budgets (Lighthouse CI)

### Tier 10 (Analytics)
- Marcel-Decision Plausible vs. Matomo (NACHT-PAUSE-File diese Nacht)

### Tier 11 (E2E)
- Playwright-E2E-Tests (Browser-Pflicht)
- Visual-Regression-Tests
- Performance-Tests

### Tier 12 voll
- WCAG 2.1 AA-Compliance-Sweep (Audit erfordert Tools)
- Loading-States in alle Components
- Form-Validation mit Live-Feedback ueberall

---

## 4. NACHT-PAUSE-Triggers

Diese Nacht moegliche Show-Stopper:
1. **Marcel-Decision noetig:** Plausible vs. Matomo (Tier 10) → NACHT-PAUSE-File
2. **DB-Schema-Aenderung noetig:** Cookie-Consent-Tabelle? → ohne Schema mit localStorage loesen
3. **Drittanbieter-API nicht erreichbar:** unwahrscheinlich

---

## 5. Quality-Bar pro Sprint

- **U1 Migration:** Pattern aus Q3 nutzen, 0 Production-Breaking-Changes (default airtable-Path)
- **U2 Security:** konkret messbar (Rate-Limit-Coverage-Report)
- **U3 Error-Pages:** Visual-Polish-Standard wie 404.html (existing)
- **U4 Cancellation:** Modal mit zod-Validation + audit_trail-Eintrag
- **U5 Tests:** 100% pass-Rate, sonst Skip + Backlog
- **U6 Cockpit:** keine Live-Tests = nur Code-Polish
- **U7 Status-Page:** statisches HTML, kein Live-Server-Polling
- **U8 Final:** Tag erst wenn alle Quality-Checks gruen

---

*Self-Assessment-Stand 04.05.2026 nacht. Plan-Start: U1.*
