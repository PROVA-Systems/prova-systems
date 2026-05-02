# PROVA Stripe Setup-Doku

**Stand:** 03.05.2026 — Account-Migration auf neuen Stripe-Account
**Sprint:** Stripe-Migration
**Marcel-Pflicht-Aktionen:** siehe Abschnitt unten

---

## Account-Status

| Item | Wert |
|---|---|
| **Alter Account** | Sandbox-Test, 0 Kunden, 0 Zahlungen → DEPRECATED |
| **Neuer Account** | Live, 03.05.2026 angelegt |
| **Statement-Descriptors** | im Stripe-Dashboard gesetzt (Marcel) |
| **Customer-Portal** | im Stripe-Dashboard aktivieren (Marcel-Pflicht) |

---

## Price-IDs (neuer Account)

### Subscriptions

| Plan | Preis | Beschreibung | Stripe Price-ID |
|---|---|---|---|
| Solo | 149€/Mo | 25 Gutachten/Mo | `price_1TSjMZRXumrtL2n5fgToRwyr` |
| Team | 279€/Mo | 60 Gutachten/Mo, bis 5 SVs | `price_1TSjNXRXumrtL2n56c6emN2k` |

### Add-on-Pakete (one-time, 12 Monate gültig)

| Paket | Preis | Stripe Price-ID |
|---|---|---|
| 5 Gutachten | 25€ | `price_1TSl2JRXumrtL2n52XSz85oC` |
| 10 Gutachten | 45€ | `price_1TSl3fRXumrtL2n5Gur4BmWL` |
| 20 Gutachten | 80€ | `price_1TSl4eRXumrtL2n5tIWx0ET8` |

### Founding-Coupon (TBD Marcel)

- 50€ Discount auf Solo lifetime
- Limit: 10 Plätze (Stripe `max_redemptions: 10`)
- Naming-Vorschlag: Coupon-ID `FOUNDING-99`
- **NOCH NICHT angelegt im Dashboard** — Marcel-Pflicht

---

## ENV-Vars (Netlify)

Marcel hinterlegt im Netlify-Dashboard → Site Settings → Environment Variables:

```bash
# Pflicht — von neuem Stripe-Account holen
STRIPE_SECRET_KEY=sk_live_...        # (Live-Mode) oder sk_test_... (Test-Mode)
STRIPE_PUBLISHABLE_KEY=pk_live_...   # für Frontend (falls Stripe.js direkt)
STRIPE_WEBHOOK_SECRET=whsec_...      # nach Webhook-Endpoint-Anlage

# Pflicht — Supabase Service-Role für Webhook
PROVA_SUPABASE_PROJECT_URL=https://cngteblrbpwsyypexjrv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # ⚠ HOCHGEHEIM — niemals committen

# Optional — Price-ID-Override (sonst Defaults aus prova-stripe-prices.js)
STRIPE_PRICE_SOLO=price_1TSjMZRXumrtL2n5fgToRwyr
STRIPE_PRICE_TEAM=price_1TSjNXRXumrtL2n56c6emN2k
STRIPE_PRICE_ADDON_5=price_1TSl2JRXumrtL2n52XSz85oC
STRIPE_PRICE_ADDON_10=price_1TSl3fRXumrtL2n5Gur4BmWL
STRIPE_PRICE_ADDON_20=price_1TSl4eRXumrtL2n5tIWx0ET8

# Optional — Founding-Coupon
STRIPE_FOUNDING_COUPON_ID=FOUNDING-99   # Coupon-ID aus Stripe-Dashboard

# Optional — Tax automatic
STRIPE_AUTO_TAX=true                 # nur wenn Stripe Tax aktiviert
```

**Alte ENV-Vars löschen** (vom alten Sandbox-Account):
- alte STRIPE_SECRET_KEY (Sandbox)
- alte STRIPE_WEBHOOK_SECRET (alter Endpoint)

---

## Webhook-Endpoint einrichten (Marcel-Pflicht)

### Schritt 1 — Endpoint im Stripe-Dashboard anlegen

1. Stripe-Dashboard → Developers → Webhooks → **Add endpoint**
2. **Endpoint URL:** `https://prova-systems.de/.netlify/functions/stripe-webhook`
   - Alternative via netlify.toml-Alias: `https://prova-systems.de/webhook/stripe`
3. **Events to send** (Pflicht-Liste):
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. **API-Version:** `2024-12-18.acacia` (oder neuer — Code ist kompatibel)
5. Endpoint speichern → **Signing-Secret** kopieren
6. In Netlify als `STRIPE_WEBHOOK_SECRET` hinterlegen
7. Manueller Trigger Deploy (Netlify redeployt nicht automatisch bei ENV-Change)

### Schritt 2 — Test-Webhook senden

Im Stripe-Dashboard → Webhook-Endpoint → **Send test webhook** → `checkout.session.completed`.

Erwartung:
- HTTP 200 zurück
- `stripe_events`-Tabelle in Supabase enthält den Event mit `status='verarbeitet'`

---

## Founding-Coupon anlegen

1. Stripe-Dashboard → Products → **Coupons** → New
2. Konfiguration:
   - **ID:** `FOUNDING-99` (eindeutig, wird in ENV genutzt)
   - **Discount:** Amount off → **50.00 EUR**
   - **Duration:** Forever
   - **Apply to:** Specific products → nur Solo (`price_1TSjMZRXumrtL2n5fgToRwyr`)
   - **Maximum redemptions:** 10
   - **Currency:** EUR
3. Speichern
4. ENV `STRIPE_FOUNDING_COUPON_ID=FOUNDING-99` setzen

**Nutzung im Frontend:**
```js
fetch('/.netlify/functions/stripe-checkout', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({ plan: 'solo', coupon: 'founding' })
});
```

---

## Code-Pfade (Stripe-Functions)

| Function | Zweck | Auth |
|---|---|---|
| `netlify/functions/stripe-checkout.js` | Checkout-Session anlegen (Solo/Team/Add-ons + Founding) | requireAuth |
| `netlify/functions/stripe-webhook.js` | Empfangen + Verarbeiten Stripe-Events → Supabase | Stripe-Signature |
| `netlify/functions/stripe-portal.js` | Customer-Portal-Link (Abo-Verwaltung) | requireAuth |
| `netlify/functions/lib/prova-stripe-prices.js` | Price-ID-Resolver (ENV-First) | – |

---

## Datenbank-Tabellen

### `workspaces` (Stripe-State)

```sql
abo_tier                           enum('solo' | 'team')
abo_status                         enum('trial' | 'aktiv' | 'pausiert' | 'ueberfaellig' | 'gekuendigt')
abo_aktiv_seit                     timestamptz
abo_gekuendigt_am                  timestamptz
stripe_customer_id                 text
stripe_subscription_id             text
stripe_price_id                    text
abrechnungs_intervall              enum('monatlich' | 'jaehrlich' | 'einmalig')
naechste_zahlung_am                date
letzte_zahlung_am                  date
letzte_zahlung_betrag_eur          numeric
gesamtzahlungen_lifetime_eur       numeric
mrr_eur_snapshot                   numeric
billing_email                      text
kuendigung_zum_am                  date
```

### `stripe_events` (Idempotenz + Audit)

```sql
stripe_event_id                    text UNIQUE  -- Idempotenz
event_type                         text
livemode                           boolean
api_version                        text
stripe_customer_id                 text
stripe_subscription_id             text
stripe_invoice_id                  text
stripe_payment_intent_id           text
workspace_id                       uuid
raw_payload                        jsonb        -- Full Stripe-Event
relevante_daten                    jsonb        -- extrahierte Felder
status                             enum('empfangen' | 'verarbeitet' | 'verarbeitung_fehler' | 'ignoriert' | 'duplikat')
verarbeitet_at                     timestamptz
verarbeitung_dauer_ms              integer
verarbeitung_fehler                text
auswirkung_beschreibung            text
retry_count                        integer
naechster_retry_at                 timestamptz
stripe_created_at                  timestamptz
received_at                        timestamptz
```

### `audit_trail` (DSGVO Art. 5)

Pro Stripe-Event ein Eintrag mit `typ` aus:
- `stripe.subscription.activated`
- `stripe.subscription.cancelled`
- `stripe.invoice.paid`
- `stripe.invoice.failed`
- `stripe.addon.purchased`

---

## Tests

### Lokale Unit-Tests

```bash
node --test tests/stripe/stripe-webhook.test.js tests/stripe/stripe-prices.test.js
# Erwartet: 18/18 PASS
```

**Coverage:**
- Signature-Verify (success + fail)
- Idempotency (Duplicate-Event)
- 5 Event-Types (checkout, invoice-paid, subscription-deleted, invoice-failed, unknown)
- Add-on-Payment-Logging
- ENV-Validation (3 Tests)
- Price-ID-Resolver (6 Tests)

### End-to-End mit Stripe Test-Mode

**Test-Karte:** `4242 4242 4242 4242` (alle anderen Felder beliebig)

1. Frontend: pricing.html → "Solo abonnieren" klicken
2. Stripe-Checkout-Page öffnet
3. Test-Karte eingeben + absenden
4. Redirect zu `/dashboard.html?checkout=success`
5. Stripe-Webhook empfängt `checkout.session.completed`
6. Supabase: `workspaces.abo_status='aktiv'` für Test-User
7. `stripe_events`-Tabelle: Event mit `status='verarbeitet'`
8. `audit_trail`: Eintrag `stripe.subscription.activated`

---

## Marcel-Pflicht-Aktionen (Sprint Stripe-Migration)

### SOFORT (vor erstem echten Kunden)

- [ ] **STRIPE_SECRET_KEY** im Netlify-Dashboard hinterlegen (Live-Mode `sk_live_...`)
- [ ] **STRIPE_PUBLISHABLE_KEY** hinterlegen (für Frontend-Stripe.js falls genutzt)
- [ ] **Webhook-Endpoint im Stripe-Dashboard anlegen** (siehe Schritt 1 oben)
- [ ] **STRIPE_WEBHOOK_SECRET** in Netlify hinterlegen
- [ ] **PROVA_SUPABASE_PROJECT_URL** + **SUPABASE_SERVICE_ROLE_KEY** in Netlify hinterlegen
- [ ] **Founding-Coupon `FOUNDING-99` anlegen** (siehe oben)
- [ ] **STRIPE_FOUNDING_COUPON_ID** in Netlify hinterlegen
- [ ] **Customer-Portal im Stripe-Dashboard aktivieren** (Settings → Billing → Customer Portal)
- [ ] **Trigger Deploy** in Netlify (kein Auto-Redeploy bei ENV-Change)
- [ ] **Test-Checkout durchführen** mit Test-Karte 4242…

### Optional (vor Skalierung)

- [ ] Stripe-Tax aktivieren (für EU-Mehrwertsteuer-Berechnung)
- [ ] Stripe-Email-Customization (Branded-Receipts)
- [ ] Stripe-Subscription-Pausierung-Workflow

### Alte Stripe-ENV löschen

- [ ] **alte STRIPE_SECRET_KEY** (Sandbox-Account) entfernen
- [ ] **alte STRIPE_WEBHOOK_SECRET** entfernen

---

## Smoke-Test-Checkliste (nach Deploy)

```
[ ] curl -I https://prova-systems.de/.netlify/functions/stripe-webhook
    → 405 Method Not Allowed (= Function existiert)

[ ] Webhook-Test im Stripe-Dashboard ("Send test webhook")
    → HTTP 200
    → stripe_events-Eintrag in Supabase

[ ] Test-Checkout mit 4242-Karte → Solo
    → Redirect zu /dashboard.html?checkout=success
    → workspaces.abo_status = 'aktiv'

[ ] Test-Checkout mit 4242-Karte → Founding-Coupon
    → 99€ Total statt 149€
    → Coupon-Counter dekrementiert in Stripe

[ ] Test-Checkout mit 4242-Karte → Add-on-5
    → 25€ Charge
    → audit_trail-Eintrag stripe.addon.purchased

[ ] Test-Subscription-Cancel via Customer-Portal
    → workspaces.abo_status = 'gekuendigt'
```

---

## Bekannte Limitations / Folge-Sprints

- **Add-on-Kontingent-Counter:** aktuell nur in `stripe_events` geloggt. Real-Counter-Erhöhung (`workspaces.zusatz_kontingent`) erfordert Schema-Erweiterung — Folge-Sprint
- **Solo-Jahres-Plan:** noch nicht angelegt (Marcel-Direktive: später)
- **Teilrückerstattungen / Pro-Rata-Subscription-Wechsel:** Stripe-Standard-Webhook-Events, aber `customer.subscription.updated` aktuell nur Tier-Sync
- **Statement-Descriptor-Test:** Marcel verifiziert in Test-Charge ob "PROVA SYSTEMS" in Bank-Statement erscheint

---

*Stripe-Setup-Doku 03.05.2026 · Sprint Stripe-Migration*
