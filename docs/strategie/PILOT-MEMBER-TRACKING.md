# PROVA Pilot-Member-Tracking (MEGA²⁵ Phase 4)

**Stand:** 2026-05-09
**Zweck:** Marcel-Sheet für Pilot-SV-Status während 90-Tage-Trial

---

## Tracking-Sheet-Struktur (Google Sheets oder Tally)

### Header-Spalten

| # | Vorname | Nachname | Email | IHK-Region | Spezialisierung | Signup | Persona | Mode-Bevorzugung | NPS | Status |
|---|---------|----------|-------|------------|-----------------|--------|---------|------------------|-----|--------|
| 1 | | | | | | | | | | |
| ... |

### Funnel-Spalten (Aktivität)

| Welcome-Wizard | Erste Akte | Erste KI-Hilfe | Erstes PDF | 7d aktiv | 14d aktiv | 30d aktiv | 60d aktiv | 90d Conversion |
|----------------|------------|----------------|------------|----------|-----------|-----------|-----------|----------------|
| ✅/❌/⏳ | ✅/❌/⏳ | ✅/❌/⏳ | ✅/❌/⏳ | ✅/❌/⏳ | ✅/❌/⏳ | ✅/❌/⏳ | ✅/❌/⏳ | Bezahlt/Cancelled |

### Feedback-Spalten

| Top-Feature | Top-Pain | Feature-Request | Marcel-Note | Bug-Reports |
|-------------|----------|-----------------|-------------|-------------|
| | | | | |

---

## KPI-Dashboard

### Funnel-Metriken (Zielwerte)

| Metrik | Ziel | Critical-Threshold |
|---|---|---|
| Welcome-Wizard-Completion | ≥ 90% | 75% |
| Erste-Akte-in-7d | ≥ 70% | 50% |
| Erstes-PDF-in-14d | ≥ 60% | 40% |
| 30d-aktiv | ≥ 60% | 40% |
| 60d-aktiv | ≥ 50% | 30% |
| 90d-Conversion (Founding bleibt) | 100% | 80% |

### Pricing-Validation

- **Erwartet:** 10/10 Founding-Member zahlen 125€/Monat lifetime
- **Akzeptabel:** 8-9/10 (Churn-Rate < 20%)
- **Kritisch:** ≤ 7/10 (Indikator für Pricing-Model-Issue)

### NPS-Zielwerte

- **Promoter (9-10):** ≥ 60% nach 30 Tagen
- **Passive (7-8):** ≤ 30%
- **Detractor (0-6):** ≤ 10% (sofortige Rückfrage + Marcel-Call)

---

## Status-Codes

| Code | Bedeutung |
|---|---|
| `INVITED` | Cold-Outreach-Email versendet, kein Signup |
| `SIGNED_UP` | Account erstellt, kein Wizard-Done |
| `ONBOARDED` | Welcome-Wizard durch |
| `ACTIVE_LIGHT` | Erste Akte erstellt, < 5 Akten |
| `ACTIVE_HEAVY` | ≥ 5 Akten erstellt |
| `STALLED` | 14d ohne Login |
| `CHURN_RISK` | 30d ohne Login + < 5 Akten |
| `CHURNED` | Cancelled vor Tag 90 |
| `CONVERTED` | Tag-90-Stripe-Charge erfolgreich |

---

## Personas (zur Segmentierung)

| Persona | Profil | Erwartete Mode-Bevorzugung |
|---|---|---|
| **Solo-Klassisch** | 30+ Jahre SV, ≤ 30 Fälle/Monat, Word-affin | Mode C (eigene Vorlagen) |
| **Solo-Modern** | 5-15 Jahre SV, KI-aufgeschlossen | Mode A (Templates) oder B (Editor) |
| **Team-SV** | Bürobetrieb mit Mitarbeiter | Mode A + Team-Tier-Interesse |
| **Quereinsteiger** | < 5 Jahre SV, Tech-affin | Mode A oder B, hoher KI-Nutzungsgrad |

---

## Marcel's Wöchentliche-Review-Checkliste

### Montag (15 Min)
- [ ] Sentry-Dashboard letzte 7d durchgehen
- [ ] Stripe-Dashboard: Subscription-Status checken
- [ ] Tracking-Sheet: aktive User vs. inaktive
- [ ] CHURN_RISK-Status für 14d-inaktive setzen

### Mittwoch (10 Min)
- [ ] Bug-Report-Inbox checken
- [ ] Feature-Requests in Backlog priorisieren
- [ ] Email-Reply-Backlog leeren

### Freitag (15 Min)
- [ ] NPS-Updates eintragen
- [ ] CONVERTED/CHURNED-Status setzen
- [ ] Wochenzusammenfassung in CHANGELOG-MASTER

---

## Outreach-Pipeline-Stati

```
INVITED → SIGNED_UP → ONBOARDED → ACTIVE_* ↘
                                            CONVERTED (Tag 90)
                                            ↗
                       STALLED → CHURN_RISK ─→ CHURNED
```

---

## Eskalations-Pfade

### Bug-Severity
- **CRITICAL:** Datenverlust-Risiko → Marcel-WhatsApp + Hotfix < 4h
- **HIGH:** Kernfunktion kaputt → Email + Hotfix < 24h
- **MEDIUM:** Workaround verfügbar → Backlog für nächsten Sprint
- **LOW:** Nice-to-have → Quartalsweise-Review

### Pilot-SV-Issues
- **CHURN_RISK:** Marcel-Call innerhalb 48h
- **CHURNED:** Exit-Interview (10 Min) + Survey
- **NPS ≤ 6:** Marcel-Call innerhalb 24h

---

## Tools-Empfehlungen

| Zweck | Tool | Backup |
|---|---|---|
| Tracking-Sheet | Google Sheets | Notion |
| Survey-Form | Tally.so | Google Form |
| Bug-Tracker | Sentry | Email-Inbox |
| Communication | Slack | WhatsApp |
| Calls | Calendly + Zoom/Meet | Email-Coordinated |

---

*MEGA²⁵ Pilot-Member-Tracking — Marcel-Sheet bereit für Pilot-Launch.*
