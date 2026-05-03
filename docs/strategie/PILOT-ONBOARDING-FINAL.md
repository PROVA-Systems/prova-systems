# PROVA Pilot-Onboarding — Final-Plan

**Stand:** 04.05.2026 (MEGA⁶ S4)
**Zielgruppe:** Solo + Team-SVs in Founding-Pilot-Phase

---

## Pilot-Reise (90 Tage)

```
Tag 0     Tag 1     Tag 3     Tag 7     Tag 14    Tag 30    Tag 60    Tag 88
  │         │         │         │         │         │         │         │
  │         │         │         │         │         │         │         │
Marcel-   Login-    Engagement- Check-in   NPS-     Roadmap-  Stripe-   Final-
Einladung Welcome   Reminder    Mail       Frage    Mitsprache Reminder Founder-
+         + Demo-   (kein       (3 Fragen) (1-10)   (Statistik (90T-     Mail
Stripe-   Fall      Login/      via Email           +Wuensche) Trial-
Checkout  Setup     Akte)                                       Ende)
```

---

## Touchpoints im Detail

### Tag 0 — Marcel-Einladung (Manual)

**Was:** Marcel sendet persoenliche Einladungs-Email an 5 ausgewählte SVs.

**Voraussetzung:** Pilot-Slot in Stripe FOUNDING-99 reserviert (max 10 Slots).

**Marcel-Action:**
- Email-Template aus `PILOT-LAUNCH-BRIEFING.md` Abschnitt 3
- Persoenliche Anpassung pro Empfaenger
- Stripe-Checkout-Link mit `?coupon=FOUNDING-99&trial=90d`

### Tag 1 — Login-Welcome + Demo-Fall

**Was:**
- Stripe-Webhook `checkout.session.completed` triggert Welcome-Email (Resend)
- Email enthaelt Login-Link + Demo-Fall-Hinweis
- App: Bei erstem Login wird Demo-Fall `SCH-DEMO-001` geladen

**Erwartung:** Pilot probiert KI-Features in der Demo-Akte aus.

**Marcel-Monitoring:**
- Admin-Cockpit Tab "Live-Sessions" zeigt Login
- Audit-Trail-Event `auth.signup` + `auth.login`

### Tag 2 — "Brauchen Sie Hilfe beim ersten Login?" (auto)

**Trigger:** Falls KEIN Login bis Tag 2.
**Template:** `email-templates/onboarding/trial-day-2-no-login.html`
**Make.com:** Scenario `prova-onboarding-day-2-check`

### Tag 3 — "Lassen Sie mich Ihnen die erste Akte zeigen" (auto)

**Trigger:** Login passiert, aber KEINE eigene Akte angelegt.
**Template:** `email-templates/onboarding/trial-day-3-no-akte.html`

### Tag 7 — Wochen-Check-In

**Trigger:** 7 Tage nach Sign-Up
**Template:** `email-templates/onboarding/trial-day-7-checkin.html`
**3 Fragen:**
1. Was klappt schon gut?
2. Was nervt dich an?
3. Können wir 5 Min telefonieren?

**Marcel-Action:** Antworten in Memory dokumentieren + Roadmap-Anpassung

### Tag 14 — NPS-Frage

**Trigger:** 14 Tage nach Sign-Up
**Template:** `email-templates/onboarding/trial-day-14-twoweek.html`
**Frage:** "Würden Sie PROVA an Kollegen empfehlen? (1-10)"

**Marcel-Action:**
- Promoter (9-10): um Testimonial bitten
- Passive (7-8): Feedback zu fehlenden Features einholen
- Detractor (0-6): persoenliches Telefonat (Churn-Praevention!)

### Tag 30 — 1-Monats-Reflexion

**Template:** `email-templates/onboarding/trial-day-30-onemonth.html`
**Inhalt:**
- Statistik: Anzahl angelegte Akten + geschätzte Zeitersparnis
- Roadmap-Mitsprache (welche Features wuenscht der Pilot?)

### Tag 60 — Mid-Trial-Check

**Template:** `email-templates/onboarding/trial-day-60-midtrial.html`
**Inhalt:** Erinnerung dass in 30 Tagen Founding-99 anfaengt + Customer-Portal-Link

### Tag 88 — Final-Founder-Email

**Template:** `email-templates/onboarding/trial-day-88-final.html`
**Trigger:** 2 Tage vor Trial-Ende
**Inhalt:**
- Persoenliche Marcel-Email
- Rückblick auf 88 Tage Pilot
- Stripe-Update-Card-Link
- Bestätigung dass FOUNDING-99 jetzt aktiv wird

---

## Eskalations-Pfade

### Pilot meldet Bug
1. Email an `kontakt@prova-systems.de` → Marcel direkt
2. Marcel triagiert in Sentry-Dashboard
3. Hot-Fix oder Geplant in Sprint K-2-Plan
4. Pilot wird ueber Bug-Status informiert (Email)

### Pilot droht zu kuendigen
1. Pilot erwaehnt Kuendigung in Email/Survey
2. Marcel-Telefon innerhalb 24h
3. Bei Bedarf: 30-Tage-Verlaengerung Trial
4. Bei Kuendigung: Cancellation-Survey-Modal (Reason-Capture für `admin-churn`)

### Technische Stoerung (App nicht erreichbar)
1. Sentry-Alert (Push-Notification, ab MEGA⁶ S1 Cockpit-Tab)
2. Marcel pruefst Admin-Cockpit Tab "System-Health"
3. Bei Pilot-Affekt: Email-Notification + Status-Update auf prova-systems.de/status (nice-to-have)

---

## KPIs (Marcel-Daily-Routine)

Aus Admin-Cockpit Voll-Version (`admin/voll.html`):

| Tab | Was Marcel täglich prüft |
|---|---|
| Live-Sessions | Wer ist gestern online gewesen? |
| Pilot-Liste | Status pro Pilot (Trial-Tag, Akten-Count) |
| Time-Tracking | Avg-Dauer pro Akte — verbessert sich? |
| Funnel | Drop-off zwischen Sign-Up und 1. Akte? |
| Errors | Neue Frontend-Errors letzte 24h? |
| Push-Alerts | Kritische Events letzte 24h? |

**Daily-Routine:** ~10 Min/Tag.

---

## Erfolgs-Kriterien (Tag 90)

- ✅ **8/10 Pilot-Slots besetzt** (Founding-Coupon-Cap)
- ✅ **Conversion ≥ 60%** (8 von 10 zahlen weiter nach 90T)
- ✅ **NPS ≥ 40** (von Day-14-Antworten)
- ✅ **0 kritische DSGVO-Vorfaelle**
- ✅ **< 5% Sentry-Errors/Session**
- ✅ **Mind. 50 abgeschlossene Auftraege** kumulativ

Bei Erreichen: **Public-Launch-Phase** vorbereiten.

---

*Onboarding-Plan-Stand 04.05.2026 — MEGA⁶ S4.*
