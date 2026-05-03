# Pilot-Einladung Workflow

**Stand:** 03.05.2026 (Sprint Catch-Up C2)
**Eigentümer:** Marcel Schreiber
**Ziel:** 10 Founding-Member in 4-6 Wochen gewinnen

---

## In Kürze

```
1. Marcel identifiziert SV (Kriterien unten)
   ↓
2. Marcel sendet persönliche Einladung (Vorlage in email-templates/founding/pilot-einladung.html)
   ↓
3. SV klickt Link → /pilot → registriert sich → wird zur Pilot-Page redirected
   ↓
4. SV klickt "Founding-Member werden" → Stripe-Checkout
   ↓ (automatisch ab hier)
5. Webhook: trial_started → workspace.abo_status='trial'
   → audit_trail: stripe.pilot.trial_started
   → Welcome-Email (Folge-Sprint Cron-Worker, aktuell manuell)
   ↓
6. Tag 87: trial_will_end Webhook
   → Reminder-Email (automatisch nach Cron-Worker-Setup)
   ↓
7. Tag 90: erste Belastung 99€
   → workspace.abo_status='aktiv'
   → audit_trail: stripe.pilot.founding_paid
```

---

## Pilot-SV-Identifikation: Kriterien

### Hard-Kriterien (Pflicht)
- ✅ **öffentlich bestellt und vereidigter Sachverständiger** (ö.b.u.v. SV) für Bauschäden
- ✅ Mindestens 5 Gutachten/Monat (sonst kein Test-Volumen)
- ✅ Bereit 4-6 Wochen aktiv zu testen + Feedback geben

### Soft-Kriterien (Bonus)
- ⭐ Aktive Online-Präsenz (LinkedIn, eigene Website) — späteres Referenz-Logo
- ⭐ Tech-Affinität — wird PROVA-UX bedienen können ohne IT-Hilfe
- ⭐ Solo oder kleines Team (1-3 SVs) — Solo-Plan-Zielgruppe
- ⭐ DSGVO-Bewusstsein — versteht warum Pseudonymisierung wichtig ist
- ⭐ Empfehlbar an Kollegen — Pilot-Multiplikator

### Anti-Kriterien (NICHT einladen)
- ❌ Riesen-Büro (10+ SVs) — Solo-Plan passt nicht
- ❌ Ausschließlich 60+-Seiten-Komplexgutachten — PROVA fokussiert Standardfälle
- ❌ Kein eigener Computer/Internet — PWA-Nutzung nicht möglich
- ❌ Aggressive Negativ-Reviewer (Tendenz „alles kostenlos für ewig")

---

## Wo finde ich Pilot-Kandidaten?

### Quellen (sortiert nach Conversion-Erwartung)

1. **IHK Sachverständigen-Listen**
   - `https://svv.ihk.de/` — bundesweite öbuv-Liste
   - filtern nach „Bauschäden", „Schäden an Gebäuden"
   - Direkt-Anruf vor Email = höhere Conversion

2. **BVS Bundesverband Mitgliederverzeichnis**
   - Mitglieder haben Verbands-Affinität → eher offen für innovative Tools
   - LinkedIn-Connection statt Cold-Email

3. **LinkedIn**
   - Suchbegriffe: "Bausachverständiger" + "Bauschaden" + "öffentlich bestellt"
   - Connection-Request mit kurzer Notiz (NICHT direkt Pilot pitchen)
   - Nach Connect-Accept: Pilot-Email senden

4. **Lokale Sachverständigenkammern** (regional)
   - bspw. Sachverständigenkammer Bayern, NRW
   - kleinere Communities, persönlicher Ansatz

5. **Empfehlungen aus Erst-Pilots** (ab Pilot 2)
   - Founding-Member-Empfehlungen sind Gold wert
   - „Mein Kollege X testet PROVA, könnte das auch was für Sie sein?"

---

## Einladungs-Email schreiben

### Template
`email-templates/founding/pilot-einladung.html` als Ausgangspunkt.

### Personalisierungs-Pflicht
- ❌ Nicht-personalisierte Massenmail = sofort gelöscht
- ✅ Mindestens 1 Satz aus dem öffentlichen Profil zitieren ("Habe Ihren Artikel zu Schimmelschäden gelesen")
- ✅ Konkrete Schadensart erwähnen wenn aus Profil ablesbar

### Versand-Kanal
- **Empfohlen:** Direkte Email aus `marcel.schreiber@prova-systems.de`-Postfach (NICHT Mass-Mail-Tool)
- Persönlich, plain-text-fallback enthalten
- Rate: max 5 Einladungen/Tag (sonst Spam-Filter triggern)
- Follow-up nach 5 Tagen wenn keine Antwort: einmalig

---

## Pilot-Signup-Link generieren

### Standard-Link
```
https://app.prova-systems.de/pilot
```

Funktioniert für alle SVs. Pilot-Page macht:
1. Login-Check (zwingend)
2. Stripe-Checkout-Request mit `pilot_program=true`
3. Pre-Flight Coupon-Plätze prüfen
4. Stripe-Hosted-Checkout-Redirect

### Tracking-Parameter (optional)
Marcel kann individuelle Tracking-Codes anhängen wenn er pro SV verfolgen will:
```
https://app.prova-systems.de/pilot?source=ihk&sv=001
```

(Aktuell wird das NICHT serverseitig getrackt — Folge-Sprint via UTM-Logging.)

---

## Was nach Signup passiert (automatisch)

### Stripe-Checkout-Flow
1. SV klickt "Founding-Member werden"
2. PROVA prüft Coupon-Plätze (10/10 max)
3. Stripe-Checkout-Page öffnet
4. SV gibt Karte ein (Karte sofort verifiziert, KEINE Belastung)
5. Stripe redirected zu `/dashboard.html?pilot=welcome`

### Backend-Webhook-Flow
1. `checkout.session.completed` mit Trial-Status
2. `stripe-webhook.js` setzt:
   - `workspaces.abo_status='trial'`
   - `workspaces.abo_tier='solo'`
   - `workspaces.abo_trial_endet_am=trial_end_date`
   - `workspaces.stripe_customer_id`
   - `workspaces.stripe_subscription_id`
3. `audit_trail`-Eintrag `stripe.pilot.trial_started`

### Trial-Phase (Tag 1 bis 90)
- `workspaces.abo_status='trial'` — alle Solo-Features verfügbar
- Stripe schickt **automatisch** Reminder-Email an SV (Stripe-Default-Verhalten):
  - Tag 75 (15 Tage vor Ende): Stripe-Standard-Email
  - Tag 87 (3 Tage vor Ende): `trial_will_end`-Webhook → PROVA-Email aus Template

### Tag 90 — Erste Belastung
- Stripe versucht Karte zu belasten: 149€ - 50€ Discount = **99€**
- `invoice.payment_succeeded`-Webhook
- `workspaces.abo_status='aktiv'`, `abo_aktiv_seit=NOW()`
- `audit_trail`-Eintrag `stripe.pilot.founding_paid`
- Welcome-Email (Folge-Sprint Cron-Worker)

---

## Marcel-Status-Verfolgung

### Im Stripe-Dashboard
- **Customers** → Filter: alle Founding-Member
- **Subscriptions** → Filter: `status=trialing`
- **Coupons** → `FOUNDING-99` → `times_redeemed`-Counter

### In Supabase
```sql
-- Alle Pilot-Trials
SELECT id, name, abo_status, abo_trial_endet_am, billing_email
FROM workspaces
WHERE abo_status = 'trial'
ORDER BY abo_trial_endet_am ASC;

-- Pilot-Audit-Log der letzten 7 Tage
SELECT typ, details, created_at
FROM audit_trail
WHERE typ LIKE 'stripe.pilot.%'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Via Skript (Folge-Sprint C4)
```bash
npm run stripe-status   # Webhook-Health
```

---

## Eskalations-Plan bei Bugs während Pilot

### Bug-Severity-Stufen

**S0 — Cosmetic (z.B. Tippfehler in UI)**
- Marcel: in BACKLOG.md notieren, Folge-Sprint
- Kein User-Impact

**S1 — Funktional eingeschränkt (z.B. PDF-Export funktioniert nicht für 1 Akte)**
- Marcel: in 24h Hotfix
- Email an betroffenen SV: "Bug behoben, sorry für Aufwand"

**S2 — Workflow-Blocker (z.B. KI-Diktat funktioniert für Solo-User nicht)**
- Marcel: in 4h Hotfix
- Pilot-SV-Status pausieren wenn nicht innerhalb Stunden lösbar
- Stripe-Subscription-Pausierung (Customer-Portal)

**S3 — Daten-Loss / Auth-Bypass (CRITICAL)**
- Marcel: sofortige Reaktion, ggf. Service-Pause
- DSGVO Art. 33 — innerhalb 72h Aufsichtsbehörde melden
- Plan: `docs/public/INCIDENT-RESPONSE.md`

### Pilot-SV-Kommunikation
- **Slack/WhatsApp** für direkten Draht (Marcel-Wahl, NICHT pflicht)
- Wöchentlicher 30-Min-Call mit jedem aktiven Pilot-SV
- Pilot-Vereinbarung sieht das vor (`docs/public/PILOT-VEREINBARUNG-ENTWURF.md`)

---

## Erfolgs-Kriterien (4-6 Wochen Beta-Phase)

| KPI | Ziel |
|---|---|
| Founding-Plätze gefüllt | 10/10 |
| Pilot-Aktiv-Quote (mind. 5 Gutachten/Mo erstellt) | ≥ 70% |
| Mid-Pilot-NPS (Net Promoter Score) | ≥ 7/10 |
| Trial-zu-Paid-Conversion (Tag 90) | ≥ 60% |
| Mindestens 3 Empfehlungen für nächste Pilot-Welle | ja |
| Mindestens 5 dokumentierte Pilot-Bugs gefixt | ja |
| Mindestens 3 Feature-Requests umgesetzt | ja |

---

## Pilot-SV-Tracking-Sheet (Marcel pflegt selbst)

Empfehlung: Excel oder Notion-Datenbank.

```
SV-Nr | Name | Firma | IHK-Region | Email | LinkedIn
       | Status | Erstkontakt-Datum | Pilot-Signup-Datum
       | Trial-End | Aktiv? | Notizen | Bug-Liste
       | NPS-Mid | NPS-End | Conversion (Y/N) | Referenz?
```

→ Template wird in Folge-Sprint generiert (Marketing-Outreach-Doku Sprint).

---

## Häufige SV-Fragen (FAQ für Marcel)

**Q: "90 Tage gratis — was ist der Haken?"**
A: "Kein Haken. Sie kündigen jederzeit ohne Begründung. Stripe-Customer-Portal-Link in der Welcome-Email. Karte hinterlegen ist nur damit nach 90 Tagen automatisch verlängert wird wenn Sie wollen."

**Q: "Was wenn ich nach 90 Tagen nicht mehr will?"**
A: "Einfach kündigen via Customer-Portal. Keine Belastung. Daten-Export bleibt verfügbar (DSGVO Art. 20)."

**Q: "Sind meine Akten-Daten sicher?"**
A: "EU-Hosting Frankfurt, Pseudonymisierung vor jedem KI-Call, AES-256 Verschlüsselung, AVV mit allen Subprozessoren. Volle Übersicht: `prova-systems.de/security`."

**Q: "Kann ich den Founding-99-Preis jemand anderem geben?"**
A: "Lifetime-Preis ist an Ihren Account gebunden, nicht übertragbar. Aber: Empfehlung für 2. Welle Pilots ist möglich."

**Q: "KI macht Fehler — wer haftet?"**
A: "Sie als SV bleiben rechtlich verantwortlich. PROVA macht §6-Fachurteil bewusst NICHT (Marcel-Doktrin). KI ist Strukturhilfe, kein Bewerter. §407a-Hinweis dokumentiert KI-Nutzung im Gutachten."

---

*Pilot-Einladung-Workflow 03.05.2026 · Marcel kann nach Lesen sofort starten*
