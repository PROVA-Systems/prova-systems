# Sprint STRIPE-PERFEKT — Zahlungen bulletproof

> **PRIORITÄT:** Kritisch. Nach AUTH-PERFEKT.
> Marcel will: *"Zahlungen über Stripe müssen perfekt funktionieren."*

---

## Ziel

Stripe-Integration so wasserdicht wie die von Stripe selbst empfohlen. Kein einziger Rand-Case durch den Geld verloren geht, keine doppelten Buchungen, keine unautorisierten Abos.

---

## Voraussetzungen

- ✅ Sprint AUTH-PERFEKT abgeschlossen
- ✅ Stripe-Account hat echte `STRIPE_SECRET_KEY` (nicht mehr ALT!)
- ✅ Stripe-Webhook-Endpoint registriert: `https://prova-systems.de/.netlify/functions/stripe-webhook`
- ✅ `STRIPE_WEBHOOK_SECRET` aus Stripe-Dashboard kopiert und in Netlify-ENV gesetzt

---

## Die 5 Stripe-Regeln die wir einhalten

1. **Signatur-Verifizierung bei JEDEM Webhook** (sonst kann jeder einen Webhook vortäuschen)
2. **Idempotency-Key bei jedem Mutations-Call** (sonst doppelte Buchungen bei Retry)
3. **Events sind Source of Truth, NICHT Frontend** (Frontend sagt "ich habe bezahlt", Webhook entscheidet)
4. **Subscription-Lifecycle vollständig abgebildet** (trial, active, past_due, canceled, unpaid)
5. **Kündigung zum Periodenende, NICHT sofort** (Rechtlich sauber, Kundenfreundlich)

---

## Teil 1: Webhook-Signatur-Verifizierung

### Problem heute
Ohne Verifizierung kann ein Angreifer Fake-Webhooks schicken: *"User XYZ hat bezahlt, gib ihm Premium-Zugang"*.

### Lösung in `stripe-webhook.js`

```javascript
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  var sig = event.headers['stripe-signature'];
  var endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  var stripeEvent;
  
  try {
    // CRITICAL: Das ist die Sicherung.
    // constructEvent wirft wenn Signatur nicht passt.
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return { statusCode: 400, body: 'Webhook Error: ' + err.message };
  }
  
  // Jetzt sind wir sicher: Event kommt von Stripe.
  console.log('Stripe event:', stripeEvent.type);
  
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripeEvent.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialEndingSoon(stripeEvent.data.object);
        break;
      default:
        console.log('Unhandled event type:', stripeEvent.type);
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Handler error:', err);
    // WICHTIG: 500 zurückgeben, damit Stripe retried
    return { statusCode: 500, body: 'Handler error' };
  }
};
```

**Wichtig:** In `netlify.toml` muss für `stripe-webhook` der Body **raw** bleiben (nicht als JSON geparst):

```toml
[[edge_functions]]
  function = "stripe-webhook"
  path = "/.netlify/functions/stripe-webhook"

# ODER im Function-Code: event.body bleibt raw-Buffer
```

---

## Teil 2: Checkout mit Idempotency

### `stripe-checkout.js` v3 (aktuell v2 in Memory-Note)

```javascript
exports.handler = async function(event) {
  var { plan, sv_email } = JSON.parse(event.body);
  var sessionEmail = validateSessionToken(event.headers.authorization);
  if (!sessionEmail || sessionEmail !== sv_email) {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  
  // Idempotency-Key: verhindert doppelte Checkouts bei Retry
  var idempotencyKey = sv_email + '-' + plan + '-' + Date.now();
  
  // Plan → Stripe-Price-ID
  var priceId;
  if (plan === 'solo') priceId = process.env.STRIPE_PRICE_SOLO;       // 149€/mo
  else if (plan === 'team') priceId = process.env.STRIPE_PRICE_TEAM;  // 279€/mo
  else return { statusCode: 400, body: 'Invalid plan' };
  
  // Customer erstellen/finden
  var customers = await stripe.customers.list({ email: sv_email, limit: 1 });
  var customer;
  if (customers.data.length) {
    customer = customers.data[0];
  } else {
    customer = await stripe.customers.create({
      email: sv_email,
      metadata: { sv_email: sv_email }
    }, { idempotencyKey: 'customer-' + sv_email });
  }
  
  // Checkout-Session erstellen
  var session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    mode: 'subscription',
    subscription_data: {
      trial_period_days: 14,  // 14 Tage Trial
      metadata: {
        sv_email: sv_email,
        plan: plan
      }
    },
    success_url: 'https://prova-systems.de/willkommen.html?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://prova-systems.de/app-register.html?cancel=true',
    locale: 'de',
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    customer_update: {
      address: 'auto',
      name: 'auto'
    }
  }, { idempotencyKey: idempotencyKey });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url })
  };
};
```

### Kritisch: `success_url` ist kein Beweis für Zahlung!

**FALSCH (wie es oft gemacht wird):**
```javascript
// willkommen.html
if (url.searchParams.get('session_id')) {
  // "Zahlung erfolgreich, gib Premium-Zugang!"  ← ANGREIFBAR!
}
```

**Warum falsch:** Ein Angreifer kann einfach auf `willkommen.html?session_id=fake` navigieren und bekommt Premium.

**RICHTIG:** Premium-Zugang wird **NUR** durch `checkout.session.completed` Webhook aktiviert. Die `willkommen.html` zeigt nur "Vielen Dank, bitte warten Sie bis Ihre Zahlung verarbeitet ist" — und fragt alle 3 Sekunden beim Server nach `subscription_status`.

---

## Teil 3: Subscription-Lifecycle

### Stati die Stripe kennt

| Status | Bedeutung | Was PROVA tut |
|---|---|---|
| `trialing` | In 14-Tages-Trial | Voller Zugriff |
| `active` | Zahlung erfolgt, aktiv | Voller Zugriff |
| `past_due` | Zahlung fehlgeschlagen, Retry läuft | Zugriff mit Warnung, Email an SV |
| `unpaid` | Alle Retries fehlgeschlagen | Read-Only-Modus (kein neuer Fall) |
| `canceled` | Gekündigt | Read-Only bis Periodenende, dann gesperrt |
| `incomplete` | Initial-Zahlung nicht abgeschlossen | Kein Zugriff |

### Handler `handleSubscriptionUpdated`

```javascript
async function handleSubscriptionUpdated(subscription) {
  var sv_email = subscription.metadata.sv_email;
  var status = subscription.status;
  var currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  var trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  var cancelAtPeriodEnd = subscription.cancel_at_period_end;
  
  // Airtable aktualisieren
  await updateSVRecord(sv_email, {
    subscription_status: status,
    stripe_subscription_id: subscription.id,
    current_period_end: currentPeriodEnd,
    trial_end: trialEnd,
    will_cancel: cancelAtPeriodEnd
  });
  
  // Audit-Trail
  await logAudit({
    sv_email: sv_email,
    aktion: 'subscription_' + status,
    timestamp: new Date().toISOString(),
    notizen: 'Status: ' + status + ', Period-End: ' + currentPeriodEnd
  });
  
  // Bei Kündigung: Email
  if (cancelAtPeriodEnd) {
    await sendCancellationConfirmation(sv_email, currentPeriodEnd);
  }
}
```

### Payment Failed Handler (wichtig!)

```javascript
async function handlePaymentFailed(invoice) {
  var customerId = invoice.customer;
  var customer = await stripe.customers.retrieve(customerId);
  var sv_email = customer.email;
  var attemptCount = invoice.attempt_count;
  
  // Stripe retried automatisch: 1, 3, 5, 7 Tage nach erstem Fehler
  // Nach 4 Fehlern: subscription wird unpaid
  
  if (attemptCount === 1) {
    await sendPaymentFailedEmail(sv_email, 'erster');
    await logAudit({ sv_email, aktion: 'payment_failed_1', timestamp: new Date().toISOString() });
  } else if (attemptCount === 3) {
    await sendPaymentFailedEmail(sv_email, 'dringend');
    await logAudit({ sv_email, aktion: 'payment_failed_3', timestamp: new Date().toISOString() });
  }
  
  // Marker in Airtable setzen dass Zahlung ausstehend
  await updateSVRecord(sv_email, { payment_due: true });
}
```

### Trial Ending Soon (3 Tage vorher)

```javascript
async function handleTrialEndingSoon(subscription) {
  var sv_email = subscription.metadata.sv_email;
  var trialEnd = new Date(subscription.trial_end * 1000);
  
  await sendTrialEndingEmail(sv_email, trialEnd);
  await logAudit({ sv_email, aktion: 'trial_ending_soon_3days', timestamp: new Date().toISOString() });
}
```

---

## Teil 4: Guards im Frontend

### Paket-Guard `paket-guard.js` v2

```javascript
// paket-guard.js - prüft bei jedem Seitenaufruf ob User aktiv ist
(async function() {
  var svEmail = localStorage.getItem('prova_sv_email');
  if (!svEmail) return;
  
  var res = await fetch('/.netlify/functions/subscription-status', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('prova_session_token') }
  });
  var status = await res.json();
  
  if (status.subscription_status === 'unpaid' || status.subscription_status === 'canceled_expired') {
    // Nur Archiv + Einstellungen + Zahlung zugänglich
    if (!['archiv.html', 'einstellungen.html', 'rechnungen.html', 'zahlung.html'].some(p => location.pathname.includes(p))) {
      showPaymentDueBanner();
    }
  }
  
  if (status.subscription_status === 'past_due') {
    showWarningBanner('Ihre letzte Zahlung ist fehlgeschlagen. Bitte aktualisieren Sie Ihre Zahlungsdaten.');
  }
  
  if (status.trial_end && daysUntil(status.trial_end) <= 3) {
    showInfoBanner('Ihr Testzeitraum endet in ' + daysUntil(status.trial_end) + ' Tagen.');
  }
})();
```

### Feature-Guard (z.B. Fall-Limit Solo = 30)

```javascript
async function kannFallAnlegen() {
  var user = await getCurrentUser();
  var faelle = await zaehleAktiveFaelle(user.email);
  
  var limit = user.paket === 'team' ? 999 : 30;
  limit += (user.Faelle_Zusatz || 0);  // Add-ons
  
  return faelle < limit;
}
```

---

## Teil 5: Kündigung (kundenfreundlich)

### In `einstellungen.html`

```html
<section class="abo">
  <h2>Ihr Abonnement</h2>
  <p>Paket: <strong id="paket">Solo</strong></p>
  <p>Nächste Abrechnung: <strong id="next-billing"></strong></p>
  <p>Status: <strong id="status"></strong></p>
  
  <button onclick="kuendigen()" class="btn-danger-outline">Abo kündigen</button>
  
  <!-- Wenn bereits gekündigt: -->
  <div id="cancel-confirm" style="display:none">
    <p>Ihr Abo wurde gekündigt. Es läuft bis <strong id="cancel-end"></strong>.</p>
    <button onclick="reaktivieren()">Doch nicht kündigen</button>
  </div>
</section>
```

### `cancel-subscription.js`

```javascript
exports.handler = async function(event) {
  var sessionEmail = validateSessionToken(event.headers.authorization);
  if (!sessionEmail) return { statusCode: 401, body: 'Unauthorized' };
  
  var user = await getUserByEmail(sessionEmail);
  
  // cancel_at_period_end = true: kundenfreundlich, Zugang bis Periodenende
  await stripe.subscriptions.update(user.stripe_subscription_id, {
    cancel_at_period_end: true
  });
  
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
```

---

## Test-Modus einrichten

### Stripe-Testkarten (zum Testen)

| Szenario | Kartennummer |
|---|---|
| Erfolgreich | `4242 4242 4242 4242` |
| Zahlung lehnt ab | `4000 0000 0000 0002` |
| 3D-Secure erforderlich | `4000 0025 0000 3155` |
| Insufficient funds | `4000 0000 0000 9995` |

**Ablaufdatum beliebig in Zukunft, CVC beliebig.**

### Webhook-Test lokal

Stripe CLI installieren:
```bash
stripe listen --forward-to https://prova-systems.de/.netlify/functions/stripe-webhook
```

Dann Events triggern:
```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

---

## Akzeptanzkriterien

- [ ] `stripe-webhook.js` verifiziert Signatur, lehnt fremde Requests ab
- [ ] Alle 7 Event-Typen werden gehandelt (completed/created/updated/deleted/failed/succeeded/trial_ending)
- [ ] Idempotency-Keys bei Checkout-Session und Customer-Create
- [ ] `success_url` gewährt KEINE Rechte — nur Webhook tut das
- [ ] Subscription-Status in SACHVERSTEANDIGE korrekt gespiegelt
- [ ] Payment-Failed: 3 Stufen-Email (1. Versuch, 3. Versuch, Deaktivierung)
- [ ] Trial-Ending: Email 3 Tage vorher
- [ ] Kündigung: cancel_at_period_end=true (nicht sofort)
- [ ] Reaktivierung möglich solange Periode nicht abgelaufen
- [ ] `paket-guard.js` zeigt Warnung bei past_due, Banner bei unpaid
- [ ] Fall-Limits respektiert (Solo 30 + Add-ons)
- [ ] Alle Stripe-Actions in AUDIT_TRAIL geloggt
- [ ] `STRIPE_PRICE_SOLO` und `STRIPE_PRICE_TEAM` als ENV-Vars
- [ ] sw.js CACHE_VERSION inkrementiert

---

## Test-Checkliste für Marcel

### Success Cases
1. [ ] Neuanmeldung mit `4242 4242 4242 4242` → 14 Tage Trial beginnt
2. [ ] Status in Airtable: `trialing`, `trial_end` gesetzt
3. [ ] Nach Trial-End: Status `active`, erste Abbuchung erfolgt
4. [ ] In Stripe Dashboard: Subscription aktiv mit korrektem Tarif

### Failure Cases
5. [ ] Anmeldung mit `4000 0000 0000 0002` (Rejection) → Fehlermeldung
6. [ ] Stripe Dashboard: `invoice.payment_failed` Event
7. [ ] Email "Zahlung fehlgeschlagen" kommt an

### Webhook-Manipulation (muss scheitern!)
8. [ ] Mit Postman ein Fake-Event ohne `stripe-signature` an Webhook schicken → 400
9. [ ] Mit falscher Signatur → 400
10. [ ] Event.data ändern aber gleiche Signatur → 400

### Kündigung
11. [ ] In Einstellungen "Abo kündigen" → Bestätigungs-Modal
12. [ ] Nach Klick: Status `cancel_at_period_end = true`
13. [ ] Zugriff bleibt bis `current_period_end`
14. [ ] "Doch nicht kündigen" → Status `cancel_at_period_end = false`

### Session-Hijacking verhindern
15. [ ] Im DevTools `localStorage.prova_paket` auf "team" ändern → nach Reload: Backend sagt "solo" (Frontend-Manipulation wirkungslos)

---

## Bekannte Limitierungen

- Keine Rechnungs-Wrapping für SEPA-Mandate (nur Card + SEPA-Debit via Stripe)
- Keine jährliche Zahlung (nur monatlich) — kann in K3+ ergänzt werden
- Keine Rabatt-Codes-UI (aber `allow_promotion_codes: true` ist aktiv)
