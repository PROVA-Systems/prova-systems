# MEGA³⁹ Phase 8 — Dashboard 5-Widgets + Mahnwesen 3-Stufen

**Datum:** 2026-05-08
**Branch:** `mega39-master-consolidation`
**Status:** ✅ Mahnwesen pre-existing, Dashboard mit 5. Widget erweitert.

---

## Dashboard-KPI-Streifen

**Vorher:** 4 KPIs (Aktive Fälle / Fristen / Rechnungen / Kontingent)
**Nachher (M³⁹ P8):** **5 KPIs** mit neuem KI-Token-Verbrauch-Widget

| # | Widget | Daten-Quelle | Eskalation |
|---|--------|--------------|------------|
| 1 | Aktive Fälle | Lambda list-auftraege | – |
| 2 | Fristen diese Woche | Lambda fristen-list | warning bei >0 |
| 3 | Offene Rechnungen | Lambda list-rechnungen | danger |
| 4 | Kontingent | success-Farbe | – |
| 5 | **KI-Verbrauch (Monat)** NEU | Lambda admin-ki-aggregations?range=month | rot ≥90%, gelb ≥75%, accent default |

KI-Token-Widget zeigt Prozent + Sub-Label (z. B. `42 % · 420.0k / 1000k Token`). Click führt zu einstellungen.html (Tier-Konfiguration sichtbar).

---

## Mahnwesen 3-Stufen (PRE-EXISTING in `netlify/functions/mahnwesen-cron.js`)

| Stufe | Tag | Template | Gebühr | Charakter |
|-------|-----|----------|--------|-----------|
| 1 | +14 nach Fälligkeit | F-05-MAHNUNG-1-FREUNDLICH | 0 € | „Möglicherweise ist Ihre Zahlung bereits unterwegs …" |
| 2 | +21 | F-07-MAHNUNG-2 | 5 € | mit §286 BGB Verzugszinsen |
| 3 | +35 | F-08-MAHNUNG-3-LETZTE | 10 € | Inkasso-Androhung |

**Auth:** X-Cron-Secret-Header (Multi-ENV-Pattern: `PROVA_FRISTEN_CRON_SECRET` / `FRISTEN_CRON_SECRET` / `PROVA_MAHN_CRON_SECRET`).

**Marcel-Manual:** pg_cron Schedule analog Phase 7 — täglich 08:00 UTC.

---

## Tests

`tests/dashboard/m39-p8-dashboard-mahnwesen.test.js` — **12/12 grün**:
- 5 KPI-IDs vorhanden
- 5-Spalten-Grid
- KI-Token-Sub-Label
- Skeleton-Liste erweitert
- loadKiTokenKpi ruft admin-ki-aggregations
- Eskalations-Farben (rot/gelb/accent)
- Auto-Trigger 500ms Delay
- Mahnwesen-Cron 3 Stufen + Tage 14/21/35
- Templates F-05/F-07/F-08
- Gebühren 0€/5€/10€
- X-Cron-Secret-Auth
- Multi-ENV-Pattern

---

## Acceptance Phase 8

- [x] 5 KPI-Widgets im Dashboard
- [x] KI-Token-Loader mit Eskalations-Farben
- [x] Mahnwesen 3-Stufen-Cron pre-existing verifiziert
- [x] 12 Tests grün
- [ ] Marcel-Manual: pg_cron Schedule für mahnwesen-cron

*— M³⁹ P8 — 2026-05-08*
