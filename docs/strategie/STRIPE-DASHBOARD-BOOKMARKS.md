# Stripe-Dashboard Marcel-Bookmarks + Notification-Setup

**Stand:** 03.05.2026 (Sprint Catch-Up C2)
**Eigentümer:** Marcel Schreiber
**Zweck:** Marcel arbeitet effizient mit Stripe-Dashboard ohne im Menü-Wirrwarr verloren zu gehen.

---

## Browser-Bookmarks (Top 5)

Marcel sollte diese 5 URLs als Bookmark-Folder „PROVA Stripe" speichern:

### 1. **Subscriptions Übersicht**
```
https://dashboard.stripe.com/subscriptions
```
- Filter: Status, Plan, Customer
- Aktive Abos, Trials, Gekündigte
- Pro Subscription: Klick → Customer + Invoices + Events

### 2. **Customers**
```
https://dashboard.stripe.com/customers
```
- Suche nach Email
- Pro Customer: Subscription, Cards, Invoices, Refund-Buttons
- Bei Pilot-SV-Anfrage: hier landen für Account-Anpassungen

### 3. **Coupons (Founding-Tracking)**
```
https://dashboard.stripe.com/coupons/FOUNDING-99
```
- Direct-Link zu FOUNDING-99-Coupon
- `Times redeemed` = wieviele Founding-Plätze schon weg
- `Max redemptions` = 10
- Bei 10/10: Pilot-Programm ist „ausverkauft"

### 4. **Webhooks**
```
https://dashboard.stripe.com/webhooks
```
- Endpoint-Klick → Recent deliveries
- Hier sehen wir ob Webhook ankommt
- Bei rotem Failure: Retry-Button vorhanden
- Marcel-Skript: `npm run stripe-status` (kommt in C4)

### 5. **Reports / Revenue**
```
https://dashboard.stripe.com/reports
```
- MRR (Monthly Recurring Revenue) — wichtigste Pilot-Metrik
- Churn-Rate
- Customer-Cohort-Analysen
- CSV-Export für eigene Analysen

---

## Mobile-App-Setup

### Stripe Dashboard App
- **iOS:** App-Store „Stripe Dashboard"
- **Android:** Google-Play „Stripe Dashboard"
- Login mit Stripe-Account (2FA-Pflicht)

### Was die App kann
- ✅ Live-Notifications für jede Zahlung
- ✅ Customers + Subscriptions abrufen
- ✅ Refunds direkt aus App
- ✅ Webhook-Monitoring (basic)
- ❌ Coupon-Erstellung (nur Web)
- ❌ Webhook-Endpoint-Konfiguration (nur Web)

### Empfehlung für Pilot-Phase
- App auf Smartphone installiert lassen → Live-Push bei jeder Pilot-Aktivierung
- Marcel sieht in Echtzeit: "Pilot-SV X hat sich angemeldet"

---

## Email-Notifications-Konfiguration

### Daily Digest (empfohlen)
1. Stripe-Dashboard → Settings → Email preferences
2. Aktivieren:
   - **Daily revenue summary** (jeden Morgen 09:00)
   - **Subscription status changes** (live)
   - **Failed payment** (live, kritisch!)

### Critical Events (live)
- ✅ Customer disputed payment (Chargeback)
- ✅ Subscription canceled
- ✅ Payment failed
- ✅ Coupon redemption (jeder Founding-Member-Signup → Marcel weiß sofort)

### Marketing-Spam aus
- ❌ Stripe Capital Updates
- ❌ Stripe Atlas Updates
- ❌ Product Updates (nice-to-have aber stört)

---

## Push-Notifications (kritische Events)

In Stripe-Mobile-App → Settings → Notifications:

**An:**
- Successful payments (zeigt jeden Pilot-Trial-Start)
- Failed payments (kritisch — Karte könnte abgelaufen sein)
- Disputes (Chargeback — sofort handeln)

**Aus:**
- Account Updates
- Stripe News

---

## Customer-Portal-Konfiguration

Stripe Dashboard → Settings → Billing → Customer portal

### Pflicht-Aktivierungen
- ✅ View invoice history
- ✅ Update payment method
- ✅ Cancel subscription (Self-Service)
- ✅ Download invoices (DSGVO-Auskunft-Erleichterung)

### Optionale (Pilot-Phase entscheiden)
- ⚠️ Pause subscription — wenn Marcel das anbietet, könnte SV permanent pausieren
- ⚠️ Update subscription (Plan-Wechsel) — aktuell nur Solo, also nicht relevant

### Branding
- Custom Logo: PROVA-Logo hochladen
- Primary color: `#1B3F6B` (PROVA-Navy)
- Custom Support-Email: `kontakt@prova-systems.de`

---

## Refund-Workflow (für Test-Käufe + Pilot-Failures)

### Bei Test-Käufen
1. `https://dashboard.stripe.com/payments` → Test-Charge öffnen
2. Top-right "Refund" klicken
3. Reason: "Test transaction"
4. Innerhalb 5-10 Tagen wird zurückgebucht

### Bei Pilot-Frustration
1. SV will sofort kündigen + refunden
2. Customer-Suche → Subscription cancel + Refund last invoice
3. Email-Bestätigung an SV
4. NPS-Frage einbauen ("Was hätte besser sein müssen?")

---

## Tax-Configuration (später)

### Aktuell nicht aktiv
- `STRIPE_AUTO_TAX=false` (default)
- Marcel berechnet MwSt manuell auf Rechnungen

### Wenn Skalierung
Stripe-Tax aktivieren → Settings → Tax:
- Automatic VAT calculation für EU-B2B
- Reverse-Charge-Mechanismus
- VAT-ID-Validation

---

## Multi-Currency (später)

Aktuell nur EUR. Bei DACH-Erweiterung:
- CHF (Schweiz)
- USD (falls internationale SVs)

---

## Häufige Fehler vermeiden

### ❌ NICHT machen
- Test-Mode-Coupons in Live-Mode kopieren (zwei verschiedene Accounts!)
- Webhook-Secret im Frontend exponieren (NUR Backend)
- Customer-Email post-Anlage ändern (Stripe verlinkt fix mit Customer-Object)
- Subscription pausieren statt cancel (verwirrt Customers)

### ✅ Best-Practices
- Bei Bugs: ZUERST Stripe-Webhook-Logs prüfen (Tracking-ID notieren)
- Refunds sofort + transparent (SV kommuniziert das positiv weiter)
- Bei Streit: Stripe-Dispute-Mechanismus nutzen, nicht direkt Bank
- Founding-Member-Email-Bounce → Customer-Portal-Link manuell senden

---

## Notfall-Kontakte

### Stripe-Support (Pro-Plan-Customer)
- 24/7 Chat im Dashboard
- Reaktionszeit: meist <1h für Live-Mode-Fragen

### Rate-Limits
- 100 Requests / Sekunde (Default)
- Bei Skalierung: Stripe-Rate-Limit-Increase anfordern

---

## Marcel-Daily-Routine (während Pilot-Phase)

**Morgens (5 Min):**
1. Stripe-Mobile-App: Daily Digest checken
2. Subscriptions: alle Status auf einen Blick
3. Webhooks: Recent Deliveries — alle grün?

**Wöchentlich (20 Min):**
1. Customer-Portal-Stats: wieviele User aktiv?
2. Coupon-Counter: `times_redeemed` vs `max_redemptions`
3. MRR-Trend (Reports)
4. Failed-Payments → manuell nachfassen

**Pre-Pilot-Onboarding-Call (10 Min):**
1. Customer-Suche nach SV-Email
2. Subscription-Status verifizieren
3. Trial-End-Datum notieren

---

*Stripe-Dashboard Bookmarks 03.05.2026*
