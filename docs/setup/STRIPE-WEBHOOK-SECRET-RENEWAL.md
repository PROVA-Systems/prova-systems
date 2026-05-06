# Stripe-Webhook-Secret Renewal-Anleitung (Marcel-Manual-Step)

**Datum:** 2026-05-10 (MEGA²⁹ W9-I6)
**Trigger:** Nach Stripe-Live-Account-Aktivierung oder Webhook-Endpoint-Änderung
**Pflicht-Frequenz:** bei JEDEM Wechsel Test → Live, bei Endpoint-URL-Änderung, bei Verdacht auf Compromise

---

## TL;DR

Stripe-Webhooks sind via Signing-Secret authentifiziert. Bei Test→Live-Wechsel oder Endpoint-Änderung muss `STRIPE_WEBHOOK_SECRET` (oder neu `PROVA_STRIPE_WEBHOOK_SECRET`) in Netlify ENV aktualisiert werden — sonst werden alle Stripe-Events abgelehnt → Pricing-Sync, Subscription-Updates, Refunds funktionieren NICHT.

---

## Schritt-für-Schritt-Anleitung

### Schritt 1: Stripe-Webhook-Endpoint öffnen

1. Login auf [dashboard.stripe.com](https://dashboard.stripe.com)
2. Modus prüfen (Test vs Live) — Toggle oben rechts
3. Navigation: **Developers → Webhooks**
4. Endpoint `https://app.prova-systems.de/.netlify/functions/stripe-webhook` öffnen

### Schritt 2: Signing-Secret kopieren

1. Im Endpoint-Detail-View: Bereich "Signing secret"
2. **"Reveal"** klicken → Secret-String beginnt mit `whsec_...`
3. **Komplett kopieren** (Ctrl+C)

### Schritt 3: Netlify ENV aktualisieren

1. Login auf [app.netlify.com](https://app.netlify.com)
2. PROVA-Project öffnen → **Site Settings → Environment Variables**
3. **Neue ENV setzen** (defensiv-Pattern, beide Names):
   - `PROVA_STRIPE_WEBHOOK_SECRET` = `<copied secret>` (NEU, Pflicht ab Welle 9)
   - `STRIPE_WEBHOOK_SECRET` = `<copied secret>` (Legacy, kann nach 1 Sprint entfernt werden)

**Wichtig:** Beide ENVs setzen während Übergangsphase. Code liest defensiv-Pattern:
```js
const secret = process.env.PROVA_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
```

### Schritt 4: Re-Deploy

1. Netlify Dashboard → **Deploys → Trigger deploy → Deploy site**
2. Warten bis Deploy grün
3. Optional: Function-Logs prüfen — keine "Webhook signature verification failed"-Errors

### Schritt 5: Test-Webhook senden

1. Stripe Dashboard → Webhook-Endpoint
2. **"Send test webhook"** Button
3. Event-Typ: `customer.subscription.updated`
4. **Send test webhook** klicken
5. Response prüfen:
   - ✅ Status 200 → Renewal erfolgreich
   - ❌ Status 401 → Secret falsch (Schritt 2-4 wiederholen)

### Schritt 6: Verify in Logs

```bash
# Netlify CLI
netlify functions:list
netlify functions:log stripe-webhook

# Erwartung: kein "Signature verification failed", erfolgreiche Event-Verarbeitung
```

---

## Defensiv-Migration-Code (W6P2-I5 + W9-I6)

In `netlify/functions/stripe-webhook.js` muss das defensiv-Pattern aktiv sein:

```js
const webhookSecret = process.env.PROVA_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  return { statusCode: 500, body: 'PROVA_STRIPE_WEBHOOK_SECRET (Legacy: STRIPE_WEBHOOK_SECRET) nicht konfiguriert' };
}
```

Marcel-Audit: prüfen ob Pattern in stripe-webhook.js + verify-stripe-webhook.js + stripe-checkout.js aktiv.

---

## Weitere "Pre-Live"-ENVs für Renewal-Audit

Bei Stripe-Live-Wechsel ALLE folgende ENVs prüfen + aktualisieren:

### Stripe-API-Keys
- `STRIPE_SECRET_KEY` → `PROVA_STRIPE_SECRET_KEY` (Live-Mode!)
- `STRIPE_WEBHOOK_SECRET` → `PROVA_STRIPE_WEBHOOK_SECRET` (THIS DOC)
- `STRIPE_REFERRAL_WEBHOOK_SECRET` (falls separater Endpoint)

### Price-IDs (Live-Mode!)
- `STRIPE_PRICE_SOLO` (Live-Price-ID für 179€/Mo)
- `STRIPE_PRICE_TEAM` (Live-Price-ID für 379€/Mo)
- `STRIPE_PRICE_ADDON_5F` (price_1TJLnv8 oder Live-Equivalent)
- `STRIPE_PRICE_ADDON_10F` (price_1TJLpG8 oder Live-Equivalent)

### Coupons
- `STRIPE_FOUNDING_COUPON_ID` (FOUNDING-99 Live-Coupon-ID)
- `STRIPE_AUTO_TAX` (Live-Tax-Settings, optional)

---

## Failure-Mode-Recovery

### Fall A: Webhooks gehen ins Leere (Secret-Mismatch)
**Symptom:** Subscription-Status nicht in PROVA-DB synchronisiert.
**Recovery:**
1. Stripe Dashboard → Events → "Failed events" filter
2. Bulk-Replay nach Secret-Update
3. Alternative: Manual-Sync via Stripe-API + admin-billing-sync (W8-I7)

### Fall B: Compromised Secret
**Symptom:** unerwartete Webhook-Events von Drittparteien.
**Recovery:**
1. Stripe Dashboard: Endpoint löschen
2. Neuen Endpoint mit neuem Secret erstellen
3. ENV updaten (Schritte 1-5 oben)
4. Audit-Trail prüfen (admin-audit-trail) für Event-History

---

## Marcel — Action-Items vor Pilot-Launch

🔴 **PFLICHT vor erstem zahlenden Kunde:**
1. Stripe-Account auf Live-Mode aktivieren
2. Webhook-Endpoint im Live-Mode neu erstellen
3. Signing-Secret in `PROVA_STRIPE_WEBHOOK_SECRET` setzen
4. Test-Webhook erfolgreich
5. Live-Test mit echter Karte (4242... funktioniert nur Test-Mode!)

🟡 **Empfohlen:**
6. Stripe-Tax aktivieren (Auto-Tax für DE/EU)
7. Stripe Dashboard → Notifications: "Failed webhook" Alerts aktivieren

---

*MEGA²⁹ W9-I6 Stripe-Webhook-Renewal-Anleitung — Marcel-Manual-Pflicht für Live-Launch.*
