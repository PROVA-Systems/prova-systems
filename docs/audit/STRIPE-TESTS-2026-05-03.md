# Stripe-Tests — Pilot-Launch-Verifikation

**Datum:** 03.05.2026 abend (Sprint POST-MEGA-MEGA N1)
**Auditor:** Claude Code (autonom)
**Scope:** Pilot-Launch-Readiness aller Stripe-Pfade
**Status:** automated tests grün, **echte Live-Charges sind Marcel-Pflicht** (CC kann nicht klicken)

---

## Executive Summary

**GO / NO-GO-Empfehlung: 🟢 GO mit Marcel-Manual-Verifikation**

Begründung:
- ✅ 27/27 Stripe-Mock-Tests grün (webhook + prices + founding-pilot)
- ✅ Verify-Stripe-Suite vorhanden (Marcel führt aus)
- ✅ Test-Suite-Skript erstellt (8 Szenarien, Marcel klickt durch)
- ✅ Email-Render-Check (4 founding-Templates, 4 minor viewport-Hinweise)
- ⚠️ **CC kann keine echten Live-Mode-Charges ausführen** (kein Browser, keine Karte)
- ⚠️ Stripe-Trigger-CLI nicht in CI verfügbar — Marcel testet lokal

---

## Was Claude Code automatisiert verifiziert hat

### 1. Mock-Test-Suite (27/27 grün)

```bash
npm run test:stripe
# → tests/stripe/stripe-webhook.test.js (12 Tests)
# → tests/stripe/stripe-prices.test.js (6 Tests)
# → tests/stripe/founding-pilot.test.js (9 Tests)
```

**Gestestete Lifecycle-Events:**
- `checkout.session.completed` (Subscription + One-Time + Pilot)
- `invoice.payment_succeeded` (auch Trial-zu-Paid-Transition)
- `invoice.payment_failed` (→ workspace.abo_status='ueberfaellig')
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- Idempotency via stripe_event_id UNIQUE
- Signature-Validation (rejection bei invalider Signatur)

**Pilot-Spezifisch:**
- `pilot_program=true` → 90T Trial + Auto-FOUNDING-99
- Plan=team mit pilot_program → 400 PILOT_REQUIRES_SOLO
- Sold-Out-Pre-Check → 410 PILOT_SOLD_OUT
- Trial-zu-Paid-Transition → audit-Type `stripe.pilot.founding_paid`

### 2. Verify-Stripe-Suite (Marcel-runs)

`scripts/verify-stripe-setup.js` testet:
- 12 ENV-Vars Format-Check (sk_live, pk_live, whsec, etc.)
- Stripe-Account-Status (`charges_enabled`)
- Webhook-Endpoint im Dashboard (URL + 6 Pflicht-Events inkl. `trial_will_end`)
- Founding-Coupon (existence, valid, max_redemptions, duration=forever)
- 5 Price-IDs aktiv im Stripe-Account
- Supabase Service-Role-Test (workspaces, stripe_events, audit_trail)
- Customer-Portal-Konfiguration

```bash
npm run verify-stripe
```

### 3. Webhook End-to-End-Verify (Marcel-runs)

`scripts/verify-stripe-webhook.js` sendet HMAC-signierten Mock-Event an Live-URL:
- Mock-Event `checkout.session.completed` mit unique ID
- POST mit echter Stripe-Signatur an `/.netlify/functions/stripe-webhook`
- Verify HTTP 200 + Supabase-Eintrag in `stripe_events`
- Auto-Cleanup

```bash
npm run test-webhook
```

### 4. Stripe-Test-Suite-Skript (NEU N1)

`scripts/stripe-test-suite.js` (8 Szenarien):

| # | Szenario | Karte (Test-Mode) | Charge |
|---|---|---|---|
| 1 | Solo Subscription | 4242 4242 4242 4242 | 149€ |
| 2 | Team Subscription | 4242 4242 4242 4242 | 279€ |
| 3 | Founding-Pilot 90T Trial | 4242 (verify-only, KEINE Charge bis Tag 90) | 0€ heute |
| 4 | Pilot-Coupon-Pre-Check | (kein Klick — nur API-Coupon-Status) | n/a |
| 5 | Add-on 5 Gutachten | 4242 | 25€ |
| 6 | Failed-Payment-Karte | **4000 0000 0000 0341** | Setup OK, Charge fail |
| 7 | 3DS-Challenge | **4000 0025 0000 3155** | Auth-Flow |
| 8 | SEPA-Direktdebit | **DE89370400440532013000** | Mandate + Charge |

**Marcel-Output:** 8 Checkout-URLs + JSON-Report.

```bash
npm run test:stripe-suite
```

### 5. Email-Render-Check (NEU N1)

`scripts/email-render-check.js`:
- Liest alle Templates aus `email-templates/`
- Ersetzt `{{platzhalter}}` mit Mock-Daten
- Schreibt nach `docs/email-test-renders/`
- Validiert: viewport-meta, Script-Tags, max-width-Container

**Run-Ergebnis (founding-Templates):** 4/4 gerendert, 4 viewport-meta-Hinweise (nicht kritisch — Email-Clients haben eigene Mobile-Logik). Templates funktional.

```bash
node scripts/email-render-check.js
```

### 6. Webhook-Status + Replay (Marcel-Tools)

```bash
npm run stripe-status   # Letzte 50 Events korreliert mit Supabase
npm run stripe-replay   # Failed-Webhooks neu zustellen
```

---

## Was Marcel selbst machen muss (CC kann nicht)

### Live-Mode-Charges (echte Karte + Refund)

CC kann keine echten Stripe-Checkout-Pages durchklicken. Marcel muss:

**Option A — Test-Mode-Switch (empfohlen):**
1. ENV temporär auf `sk_test_*` umstellen
2. `npm run test:stripe-suite` → 8 URLs
3. Mit 4242-Karte durchklicken (kein echtes Geld)
4. Verify in Supabase pro Szenario
5. ENV zurück auf Live-Mode

**Option B — Live-Mode + Refund:**
1. `CONFIRM_LIVE_CHECKOUT=ja npm run test:stripe-suite` → 8 URLs
2. Eigene Karte + sofort Refund via Stripe-Dashboard
3. Subscription-Cancel via Customer-Portal

**Option C — Minimal-Test (1 Szenario):**
1. Nur Founding-Pilot durchklicken (Trial = 0€ heute, keine echte Charge)
2. Sofort kündigen via Customer-Portal
3. Spart Aufwand für Demo-Phase

**Empfehlung:** Option A oder C. Option B nur wenn Marcel echte Live-Mode-Webhook-Verifikation braucht.

### Stripe-CLI für `stripe trigger`

Wenn Marcel lokales Webhook-Testing will:
```bash
brew install stripe/stripe-cli/stripe   # macOS
# oder: scoop install stripe (Windows)
stripe login
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.trial_will_end
stripe trigger invoice.payment_succeeded
```

Nicht zwingend für Pilot-Launch — Mock-Tests decken das Verhalten ab.

---

## Edge-Cases-Coverage

| Edge-Case | Test | Status |
|---|---|---|
| Pilot-Coupon nach 10 Redemptions | Mock-Test 9 + Live-API-Pre-Check | ✅ 410 PILOT_SOLD_OUT |
| Trial-Auslauf (Tag 90) | Mock-Test 9 + audit_trail-Check | ✅ founding_paid |
| Customer-Portal-Zugang | Marcel-manuell | ⏳ Marcel-Test |
| Re-Signup nach Cancel mit gleicher Email | Stripe-Default (createCustomer ist idempotent per email) | ⏳ Marcel-Test |
| 3DS-Challenge | Test-Suite Szenario 7 (4000002500003155) | ⏳ Marcel-Klick |
| Failed-Payment | Test-Suite Szenario 6 (4000000000000341) | ⏳ Marcel-Klick |
| SEPA-Mandat | Test-Suite Szenario 8 | ⏳ Marcel-Klick |
| Pilot mit Team-Plan | Mock-Test 9 | ✅ 400 PILOT_REQUIRES_SOLO |
| Pilot ohne FOUNDING-Coupon-Konfig | Mock-Test 9 | ✅ 500 COUPON_NOT_CONFIGURED |
| Race-Condition: 11 simultane Pilot-Signups | Stripe handhabt 11. mit Coupon-Error | ⚠️ Stripe-Side-Limit |

---

## Refund-Liste (bei Live-Mode-Tests)

Wenn Marcel Option B wählt — Refund-Workflow:
1. Stripe-Dashboard → Payments → Test-Charge öffnen
2. "Refund payment" → Reason "Test transaction"
3. Subscription cancel via Customer-Portal-Link aus Welcome-Email
4. (Optional) Customer-Object löschen via Dashboard → Customer → Top-right Menu

Erwartete Charges bei Option B (alle Karten):
- Solo: 149€ → Refund
- Team: 279€ → Refund
- Founding-Pilot: 0€ heute (Trial), Subscription-Cancel reicht
- Add-on 5: 25€ → Refund
- Total Bewegt: ~453€ (Refund komplett)

---

## Was Stripe-Webhook in PROVA tut (Lifecycle-Übersicht)

```
SV → Checkout-URL klicken
  ↓
Stripe-Hosted-Page → Karte + Submit
  ↓
Stripe → POST /.netlify/functions/stripe-webhook (signed)
  ↓
PROVA-Webhook:
  1. Signature-Verify (constructEvent)
  2. Idempotency-Check (stripe_events UNIQUE)
  3. Insert stripe_events (status='empfangen')
  4. Switch event.type:
     - checkout.session.completed → workspace.abo_status (Trial / Aktiv)
     - invoice.payment_succeeded → letzte_zahlung_*, MRR
     - customer.subscription.trial_will_end → audit_trail-Eintrag
     - customer.subscription.deleted → abo_status='gekuendigt'
  5. audit_trail-Eintrag (DSGVO Art. 5)
  6. UPDATE stripe_events (status='verarbeitet', verarbeitet_at)
  ↓
HTTP 200 → Stripe markiert Event als delivered
```

---

## Findings + Empfehlungen

### KEINE neuen kritischen Findings
- Mock-Tests grün, Webhook-Lifecycle vollständig modelliert
- Pilot-Programm-Logik korrekt (90T Trial + Auto-Coupon)
- DSGVO-Audit-Trail per Stripe-Event vorhanden

### Minor-Empfehlungen für Folge-Sprints
1. Email-Templates: viewport-meta ergänzen (mobile-Email-Best-Practice)
2. Stripe-CLI-Setup-Doku in MARCEL-PFLICHT-AKTIONEN ergänzen (für lokales `stripe trigger`)
3. Failed-Payment-Recovery-Email noch nicht in Templates (Marcel-Decision: bauen oder Stripe-Standard nutzen?)

### NEEDS-MARCEL (4 Items vor Pilot-Launch)
1. **Live-Mode-Test mind. 1 Szenario** (Empfehlung: Option C, nur Founding-Pilot, Trial = 0€)
2. **Customer-Portal-Test** (Self-Service-Cancel + Karten-Update)
3. **Stripe-Webhook-Recent-Deliveries** im Dashboard prüfen (alle 200?)
4. **Re-Signup-Test** mit gleicher Email nach Cancel

---

## Test-Run-Protokoll

```
Mock-Tests:                           ✅ 27/27 (npm run test:stripe)
verify-stripe-setup.js (Marcel):      ⏳ pending
verify-stripe-webhook.js (Marcel):    ⏳ pending
stripe-test-suite.js (Marcel-klickt): ⏳ pending
email-render-check.js:                ✅ 4/4 (4 minor viewport hints)
stripe-status (Marcel):               ⏳ pending
```

---

## GO / NO-GO

🟢 **GO mit folgenden Marcel-Bedingungen:**

1. ✅ Marcel führt `npm run verify-stripe` einmal aus + alle ✅
2. ✅ Marcel führt `npm run test-webhook` einmal aus + grün
3. ✅ Marcel klickt mind. 1 Szenario aus `npm run test:stripe-suite` (Empfehlung: Founding-Pilot)
4. ✅ Marcel verifiziert in Supabase: workspace + audit_trail-Eintrag

Erst danach: erste echte Pilot-SV-Einladung.

🔴 **NO-GO wenn:**
- `verify-stripe` rote Checks (z.B. Webhook-Endpoint fehlt)
- Webhook-End-to-End nicht 200
- Audit-Trail-Eintrag fehlt nach Test-Klick

→ NACHT-PAUSE-File schreiben, Claude Code analysiert in nächster Session.

---

*N1 abgeschlossen 03.05.2026 abend · Marcel-Manual-Verify-Tasks pending*
