# NACHT-PAUSE — Analytics-Tool-Wahl (Tier 10)

**Sprint:** MEGA⁷ U7
**Datum:** 04.05.2026 nacht
**Marcel-Decision-Pflicht:** ja

---

## Was ich gefunden habe

Aktuell hat PROVA keine Analytics — nur Sentry fuer Error-Tracking.

Marcel-Direktive Tier 10: "Plausible/Matomo (DSGVO-konform statt Google) — Marcel-Decision Tool-Wahl"

Da das eine Tool-Wahl-Entscheidung ist + ein Anbieter-Konto-Anlage erfordert + monatliche Kosten verursacht, geht das nicht ohne Marcel-Decision.

---

## Vergleichs-Optionen

### Option A — Plausible Analytics

**Pro:**
- DSGVO-konform out-of-the-box (kein Cookie-Banner noetig)
- EU-Hosting (Hetzner Frankfurt)
- Sehr leichtgewichtig (~1 KB Script)
- Open-Source (selbst-hostbar fuer 0€)
- Klare Pricing-Stages: 9€/Monat fuer 10k Pageviews
- Integration: `<script src="https://plausible.io/js/script.js" data-domain="prova-systems.de" defer></script>`

**Con:**
- Limited Custom-Events (nur 30 Custom-Events im 9€-Plan)
- Keine Funnel-Analyse out-of-the-box (Cockpit-Funnel macht das in PROVA selbst)

**Kosten:**
- Cloud: ab 9€/Monat (10k pageviews)
- Self-Hosted: 0€ (aber Server-Wartung nötig)

### Option B — Matomo Analytics

**Pro:**
- DSGVO-konform mit Cookie-Banner-Integration
- EU-Hosting / Self-Hosted moeglich (Open-Source)
- Heatmaps + Session-Replay (zusaetzliche Kosten)
- Sehr maechtig (Goal-Tracking, A/B-Tests)
- Etabliert in DACH-Region

**Con:**
- Komplexer als Plausible
- Self-Hosted: PHP+MySQL-Stack (PROVA nutzt Node+Postgres — Drift)
- Cloud-Plan teurer: 22€/Monat fuer 50k pageviews
- Schwerer Script (~80KB)

**Kosten:**
- Cloud: ab 22€/Monat (50k pageviews)
- Self-Hosted: 0€ (aber PHP-Server nötig)

### Option C — Umami (Empfehlung mein)

**Pro:**
- DSGVO-konform, kein Cookie-Banner
- Open-Source, Self-Hosted via Docker auf Supabase-Postgres
- Sehr schlank (~2KB Script)
- Modernes Dashboard
- Custom-Events unbegrenzt
- 0€ Self-Hosted moeglich, Cloud ab 9$/Monat

**Con:**
- Noch nicht so etabliert wie Plausible
- Cloud-Hosting in USA (Vercel) — fuer EU-Hosting Self-Host noetig

**Kosten:**
- Cloud: 9$/Monat
- Self-Hosted via Docker: 0€

### Option D — DIY Analytics in PROVA

**Pro:**
- Volle Kontrolle ueber Daten
- Bereits vorhandene `audit_trail`-Tabelle nutzen
- Cockpit-Voll bietet schon viel (KI-Costs, Live-Sessions, Funnel)
- Kosten: 0€

**Con:**
- Kein Pageview-Tracking out-of-the-box (nur Backend-Events)
- Kein Real-time-Visualisierung
- Marcel-Wartungs-Aufwand

---

## Empfehlung

**Plausible Cloud (9€/Monat)** fuer Pre-Pilot-Phase:
1. **Schnellste Implementierung** (1 Script-Tag)
2. **DSGVO-konform out-of-the-box** ohne Cookie-Banner-Refactor
3. **EU-Hosting** (Hetzner Frankfurt) — Subprozessor-AVV einfach
4. **Niedrige Kosten** fuer < 10k Monthly-Visitors
5. **Reicht fuer Pre-Pilot** (Pageview + Top-Pages + Bounce-Rate)

Bei >10k Monthly-Visitors → Self-Hosted-Plausible auf eigenem Hetzner.

---

## Wenn Marcel zustimmt: Implementation-Plan

1. **Marcel:** Plausible-Account anlegen + Domain `prova-systems.de` registrieren
2. **CC (Sprint K-2):** Script-Tag in folgende Pages:
   - Landing (`/`)
   - Pilot-Page (`/pilot.html`)
   - Pricing (`/pricing.html`)
   - **NICHT** in App-Pages (User-Privacy, kein Tracking nach Login)
3. **CC:** Custom-Events fuer kritische Conversions (Sign-up-Klick, Pilot-Checkout-Klick)
4. **CC:** AVV-Liste in `docs/compliance/AVV-LISTE.md` ergaenzen
5. **CC:** Datenschutzerklaerung-Section "Analytics" hinzufuegen
6. **CC:** CSP-`script-src` um `https://plausible.io` erweitern

**Aufwand Sprint K-2:** ~1h (CC) + 15 Min (Marcel)

---

## Wenn Marcel ablehnt

→ DIY-Analytics aus `audit_trail` reicht fuer Pre-Pilot-Phase.
Pageview-Tracking optional via existing `audit-log.js`-Endpoint mit
typ='page.viewed' + Path. Cockpit-Voll-Section `feature-heatmap`
nutzt schon die typ-Daten.

---

*Marcel-Update bitte in dieser Doku als Entscheidung dokumentieren.*
