# Launch-Day-Plan Pilot-Welle 1 (MEGA²⁵ Phase 7)

**Stand:** 2026-05-09
**Geplantes Launch-Datum:** **Montag 2026-05-12**
**Welle 1:** 3-4 SVs aus Marcel's IHK-Netzwerk

---

## Pre-Launch-Tag (So 2026-05-11)

### Vormittag (8:00-12:00)

```
08:00 — Final System-Check
       ☐ git status: clean working tree
       ☐ git log: alle MEGA²³+²⁴+²⁵ Commits drin
       ☐ npm test: 1763+ grün
       ☐ Push + Tag v286-pilot-launch-ready

09:00 — Sentry + Monitoring
       ☐ /sentry-test triggern
       ☐ Test-Alert in Email
       ☐ UptimeRobot 5 Monitore aktivieren
       ☐ Plausible Snippets verifizieren

10:00 — Production-Deploy-Check
       ☐ Netlify-Build: erfolgreich?
       ☐ sw.js v286 in Production?
       ☐ Browser-Hard-Refresh: alle Pages laden

11:00 — Stripe-Final-Check
       ☐ FOUNDING-30 Coupon aktiv
       ☐ Test-Subscription mit Test-Card 4242 4242 4242 4242
       ☐ Webhook-Health: keine fails letzte 24h
       ☐ Customer-Portal-URL parat

12:00 — Mittagspause
```

### Nachmittag (12:00-18:00)

```
13:00 — Outreach-Vorbereitung
       ☐ 3-4 Pilot-SVs aus IHK-Netzwerk auswählen
       ☐ Email-Template 1 (Cold-Outreach) personalisiert
       ☐ Calendly-Link für 30-Min-Demo-Calls vorbereitet

15:00 — Final-Smoke-Test im Browser (Chrome + Firefox)
       ☐ Signup-Flow End-to-End
       ☐ Welcome-Wizard 4-Step
       ☐ Demo-Akte ansehen
       ☐ Mode A: Diktat + KI-Hilfe + PDF
       ☐ Mode B: TipTap-Save
       ☐ Mode C: Vorlage hochladen (Desktop only)
       ☐ Beweisbeschluss-PDF Upload (Mode A)
       ☐ Foto-Upload + KI-Analyse
       ☐ Logout + Re-Login

17:00 — Mobile-Test (iOS Safari + Android Chrome)
       ☐ Welcome-Wizard mobile
       ☐ Diktat-Aufnahme mobile (kritisch für Vor-Ort)
       ☐ Mode-C-Mobile-Fallback (Toast erscheint)

18:00 — Tagesende
       ☐ Marcel: Outlook auf Office-Modus
       ☐ Backups verifiziert
```

### Abend (18:00-22:00)

```
19:00 — Pilot-FAQ-Final-Review
       ☐ docs/strategie/PILOT-FAQ.md durchlesen
       ☐ docs/strategie/EMAIL-TEMPLATES.md
       ☐ docs/strategie/ONBOARDING-MATERIALS.md
       ☐ Pilot-Member-Tracking-Sheet bereit

20:00 — Mental-Prep + Energy-Bar
       ☐ Schlafen früh (für 6:00 Start morgen)
       ☐ Phone neben Bett (Critical-Alerts)
```

---

## Launch-Day Mo 2026-05-12

### Phase 1: Soft-Launch-Welle 1 (06:00-12:00)

```
06:00 — Marcel wakes up + Coffee

06:30 — System-Check (15 Min)
       ☐ UptimeRobot: alle 5 grün
       ☐ Sentry: 0 neue Errors über Nacht
       ☐ Stripe: Webhook-Health
       ☐ Admin-Cockpit: alle 8 Tabs öffnen

07:00 — Email-Personalisierung (1h)
       ☐ Template 1 für SV #1: [Name, Region, Spezialisierung]
       ☐ Template 1 für SV #2: ...
       ☐ Template 1 für SV #3: ...
       ☐ Template 1 für SV #4: ...

08:00 — Email-Versand (Welle 1)
       ☐ SV #1 versendet (08:00)
       ☐ SV #2 versendet (08:15)
       ☐ SV #3 versendet (08:30)
       ☐ SV #4 versendet (08:45)
       
       Staggered-Send: gibt Marcel Zeit zwischen Replies

09:00 — Aktiv-Monitoring (3h)
       ☐ Email-Inbox alle 15 Min
       ☐ Sentry-Dashboard offen
       ☐ Stripe-Dashboard offen
       ☐ Admin-Cockpit Live (Pilot-Pipeline-Tab)

12:00 — Mittagspause (30 Min)
```

### Phase 2: Onboarding-Calls (12:00-18:00)

```
12:30 — Erste Replies durchgehen
       ☐ Antworten kategorisieren: Interesse / Skip / Frage
       ☐ Calendly-Slots versenden für 30-Min-Calls

14:00 — Onboarding-Call SV #1 (30 Min)
       ☐ Demo durch Welcome-Wizard
       ☐ Erste Akte gemeinsam erstellen
       ☐ Q&A
       ☐ Slack/WhatsApp-Channel-Invite

15:00 — Onboarding-Call SV #2 (falls geplant)
16:00 — Onboarding-Call SV #3 (falls geplant)
17:00 — Onboarding-Call SV #4 (falls geplant)

18:00 — Tagesende-Review
       ☐ Tracking-Sheet aktualisieren
       ☐ Bug-Reports notieren
       ☐ Hotfix-Backlog aktualisieren
```

### Phase 3: 24h-Watch (18:00-08:00 next day)

```
18:00-22:00 — Email-Inbox alle 30 Min
22:00 — Phone-Alerts an für Critical
06:00+1 — Nächster Tag-Start
```

---

## Tag +1 (Di 2026-05-13)

```
07:00 — Day-1-Check-In-Email (Template 3) an alle 4 SVs
08:00 — System-Check (UptimeRobot + Sentry + Stripe)
09:00 — Reply-Backlog leeren
10:00 — Bug-Triage (falls Reports)
11:00 — Hotfix-Sprint falls nötig
14:00 — Tracking-Sheet Update
17:00 — Tag-Review
```

---

## Tag +7 (Mo 2026-05-19) — Welle 2 Trigger

```
☐ NPS-Befragung Welle 1 (Template 4)
☐ Bug-Stand: keine Critical?
☐ Conversion-Funnel: ≥ 70% haben Erste-Akte?

→ JA: Welle 2 starten (3-4 weitere SVs)
→ NEIN: Hotfix-Sprint, Welle 2 verschieben
```

---

## Tag +14 (Mo 2026-05-26) — Welle 3 Trigger

```
☐ Welle 1 + 2 Aggregat-NPS
☐ Stable-Status verifiziert?
☐ Founding-Spots noch frei?

→ JA: Welle 3 starten (2-3 finale SVs, Founding-10 voll)
→ NEIN: Stop, Iteration-Sprint
```

---

## Notfall-Pläne

### Critical-Bug während Phase 1
1. Sofort-Email an alle Pilot-SVs (Hotfix-Template 6)
2. Rollback nach docs/ops/ROLLBACK-PLAN-PILOT.md
3. Marcel-WhatsApp-Update für aktive Calls
4. Status-Page auf prova-systems.de/status (falls existiert)

### Email-Versand-Failure
1. SMTP-Status prüfen (Netlify-Logs)
2. Manueller Fallback via gmail.com
3. Slack/WhatsApp als Alternative

### Stripe-Checkout-Down
1. Sofort: Stripe-Dashboard checken
2. Fallback: SVs warten lassen, Welle pausieren
3. Stripe-Support kontaktieren

### Marcel-unavailable (medizinischer Notfall)
1. Auto-Reply auf Email aktivieren
2. Slack/WhatsApp-Status auf "unavailable"
3. UptimeRobot-Alerts auf Backup-Email
4. Zurück: Pilot-SVs informieren via Welcome-Email-Update

---

## Marcel-Action-Items für Launch-Day

### Tag-Vor-Launch (So 2026-05-11)
- [ ] Push + Tag v286-pilot-launch-ready
- [ ] /sentry-test grün
- [ ] UptimeRobot 5 Monitore aktiv
- [ ] Plausible-Snippets eingebaut
- [ ] 3-4 Pilot-SVs ausgewählt
- [ ] Calendly-Link bereit
- [ ] Email-Templates personalisiert

### Launch-Day (Mo 2026-05-12)
- [ ] 4h Sleep ➞ 06:00 wach
- [ ] Email-Versand 08:00-09:00 staggered
- [ ] 4h aktiv-Monitoring 09:00-13:00
- [ ] 4-5h Onboarding-Calls 14:00-18:00
- [ ] Tracking-Sheet Update 18:00
- [ ] Phone-Alerts an 22:00

### Tag +1 (Di 2026-05-13)
- [ ] Day-1-Check-In-Email
- [ ] Bug-Triage falls nötig
- [ ] System-Check
- [ ] Reply-Backlog

---

## Erfolg-Metriken (Welle 1)

### Hard-Metrics (24h post-Launch)
- 4/4 Email-Versand erfolgreich (kein Bounce)
- ≥ 3/4 Antworten innerhalb 24h
- ≥ 2/4 Welcome-Wizard durch
- 0 Critical-Bugs

### Soft-Metrics (Tag +7)
- ≥ 3/4 ACTIVE_LIGHT-Status
- ≥ 1/4 ACTIVE_HEAVY-Status
- ≥ 70% NPS-Antwortrate
- 1+ Erfolgsgeschichte (Marcel-Quote-fähig)

### Stretch-Goals (Tag +14)
- 4/4 ONBOARDED (Welcome-Wizard durch)
- ≥ 3/4 Erste-Akte erstellt
- Welle 2 wird gestartet
- Critical-Bugs: 0
- High-Bugs: ≤ 2 (gefixt innerhalb 24h)

---

## Welcome-Quote für Marcel (Mo 2026-05-12 morgens)

> "Ich bin 30 Jahre Sachverständiger. PROVA ist die App, die ich vor 20 Jahren gebraucht hätte. Heute baue ich sie für die nächste Generation von SVs. Welle 1 läuft. Lass los." — Marcel

---

*MEGA²⁵ Phase 7 — Launch-Day-Plan bereit. Mo 2026-05-12 GO!*
