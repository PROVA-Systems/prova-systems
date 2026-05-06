# Monitoring-Checklist (MEGA²⁵ Phase 7)

**Stand:** 2026-05-09
**Scope:** Monitoring-Stack vor + während Pilot-Phase

---

## 4-Layer-Monitoring-Stack

### Layer 1: Uptime-Monitoring (UptimeRobot)

**Setup pflicht (free-tier reicht):**

| Monitor | URL | Interval | Alert |
|---|---|---|---|
| Frontend | https://prova-systems.de | 5 min | Email |
| App-Shell | https://app.prova-systems.de | 5 min | Email |
| Health-Lambda | https://app.prova-systems.de/.netlify/functions/health | 5 min | Email |
| Sentry-Test | https://app.prova-systems.de/.netlify/functions/sentry-test?secret=XXX | 30 min | Email |
| Stripe-Webhook | https://app.prova-systems.de/.netlify/functions/stripe-webhook | 5 min (HEAD) | Email |

**Marcel-Action:**
1. UptimeRobot.com Account erstellen (kostenlos bis 50 Monitore)
2. 5 Monitore wie oben anlegen
3. Email-Alert auf marcel.schreiber891@gmail.com
4. SMS-Alert für Critical (optional, kostet extra)

---

### Layer 2: Error-Tracking (Sentry)

**Bereits konfiguriert (M3-Sprint):**

| Komponente | Status | Verify |
|---|---|---|
| Browser-SDK | ✅ in app shell | `lib/sentry-init.js` aktiv |
| Edge-Functions-SDK | ✅ in lib/sentry-wrap | netlify/functions/lib/sentry-wrap.js |
| EU-Region | ✅ Frankfurt | DSN ist EU-DSN |
| AVV-Subprozessor | ✅ | docs/legal/avv.html |
| Test-Endpoint | ✅ /sentry-test | mit PROVA_SENTRY_TEST_SECRET |

**Pflicht-Verify vor Pilot:**
1. Sentry-Dashboard öffnen
2. Test-Trigger: `curl https://app.prova-systems.de/.netlify/functions/sentry-test?secret=XXX`
3. Test-Error innerhalb 30 Sekunden in Sentry sichtbar?
4. Browser-Test: prova-systems.de → DevTools-Console → `Sentry.captureMessage('test')` → in Sentry sichtbar?

**Alert-Rules (in Sentry-Dashboard):**

| Rule | Threshold | Channel |
|---|---|---|
| New Error in Production | Sofort | Email |
| Error-Rate > 10/min | Sofort | Email + Slack |
| Performance-Degradation > 5s p95 | 1h Window | Email |
| Issue ≥ 100 events | Sofort | Email |

---

### Layer 3: Privacy-First-Analytics (Plausible)

**Setup:**
1. plausible.io Account erstellen
2. Site hinzufügen: prova-systems.de
3. Snippet einbauen in:
   - `index.html` (Landing)
   - `pricing.html`
   - `pilot.html`
   - `app.html` (Shell)

**Snippet-Code:**
```html
<script defer data-domain="prova-systems.de" src="https://plausible.io/js/script.js"></script>
```

**Goals zu tracken:**

| Goal | Type | Konversion |
|---|---|---|
| `Pilot-Signup` | Page-View `/onboarding` | Sign-Up |
| `First-Akte` | Custom-Event | Akte erstellt |
| `First-PDF` | Custom-Event | PDF generiert |
| `Subscription-Started` | Page-View `/checkout-success` | Stripe-Conversion |

**JS-Trigger für Custom-Events:**
```js
// In app.html oder akte-logic.js:
plausible('First-Akte', {props: {persona: 'solo'}});
```

---

### Layer 4: Business-Metriken (Admin-Cockpit)

**Bereits implementiert:**

| Tab | Metrik | Status |
|---|---|---|
| Übersicht | Total-Users + Active-Users | ✅ |
| Finanzen | Stripe-MRR + Churn | ✅ |
| KI & Workflow | Token-Cost + Foto-Usage + Diktat-Min | ✅ (Backend pending) |
| Pipeline | Funnel von SIGNED_UP zu CONVERTED | ✅ |
| Health | UptimeRobot + Sentry-Status | ✅ |
| Settings | ENV-Status + Feature-Flags | ✅ (Backend pending) |

**Pflicht-Verify nach jeder Welle:**
- Marcel öffnet Admin-Cockpit täglich (in den ersten 7 Tagen)
- Wöchentlich: Charts mit MoM-Vergleich

---

## Daily-Health-Check (Marcel — 5 Min/Tag)

```
☐ UptimeRobot: alle 5 Monitore grün
☐ Sentry: 0 neue Critical-Errors letzte 24h
☐ Stripe-Dashboard: keine fehlgeschlagenen Webhooks
☐ Admin-Cockpit Übersicht: Total-Users-Wachstum
☐ Plausible: Daily-Visitors > 0 (Trend?)
☐ Email-Inbox: Pilot-SV-Bug-Reports?
```

---

## Weekly-Review (Marcel — 30 Min/Woche)

```
☐ NPS-Score sammeln (Day-7-Email-Antworten)
☐ Top-3 Bug-Reports identifizieren
☐ Top-3 Feature-Requests priorisieren
☐ Stripe MRR-Trend
☐ Conversion-Funnel-Analyse (% Welcome-Wizard, % Erste-Akte)
☐ Sentry-Issues-Backlog leeren oder ignorieren
☐ Sprint-Planning für nächste Woche
☐ CHANGELOG-MASTER.md Wochenzusammenfassung
```

---

## Alert-Eskalation

### CRITICAL (sofortige Aktion)
- Sentry-Alert: New Critical-Error
- UptimeRobot-Alert: Frontend-Down
- Stripe: Webhook-Signature-Failures

**Response:** Marcel-WhatsApp + sofortige Diagnose

### HIGH (innerhalb 4h)
- Sentry-Alert: Performance-Degradation
- UptimeRobot-Alert: Lambda-Down
- Stripe: Subscription-Cancellation > 3 in 24h

**Response:** Email-Notification, Hotfix-Sprint planen

### MEDIUM (innerhalb 24h)
- Sentry: ≥ 100 Events einer Issue
- Plausible: Visitor-Drop > 50%
- Admin-Cockpit: Health-Status auf "Degraded"

**Response:** Backlog-Item, nächster Sprint

---

## Monitoring-Tool-Kosten

| Tool | Tier | Monat |
|---|---|---|
| UptimeRobot | Free (50 monitors, 5min) | 0 € |
| Sentry | Free (5K events, 1 user) | 0 € |
| Plausible | Hobby (10K pageviews) | 9 €/mo |
| Stripe | Pay-per-use | 0 € (Subscription-Fee%) |
| Total | | ~9 €/mo |

**Skalierung post-Pilot:**
- Sentry Team-Plan ab 100K events → 26€/mo
- Plausible Pro ab 100K pageviews → 19€/mo

---

## Marcel-Pre-Pilot-Verify-Checkliste

- [ ] UptimeRobot: 5 Monitore aktiv
- [ ] Sentry: Test-Event in Dashboard sichtbar
- [ ] Plausible: Snippet in 4 Pages eingebaut
- [ ] Stripe: Webhook-Health-Check letzte 24h
- [ ] Admin-Cockpit: alle 8 Tabs öffnen sich
- [ ] Email: marcel.schreiber891@gmail.com bekommt Test-Alert von UptimeRobot

Wenn alle ✅ → **Monitoring ready für Pilot-Launch**.

---

*MEGA²⁵ Phase 7 — Monitoring-Stack ready.*
