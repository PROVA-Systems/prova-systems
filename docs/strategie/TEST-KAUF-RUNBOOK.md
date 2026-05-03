# Test-Kauf Runbook (Marcel-Anleitung)

**Stand:** 03.05.2026 (Sprint Catch-Up C2)
**Eigentümer:** Marcel Schreiber
**Zweck:** Marcel verifiziert in 30-60 Min die komplette Stripe-Integration mit echten Test-Käufen.

---

## ⚠️ WICHTIG: LIVE-MODE versus TEST-MODE

PROVA's Stripe-Account hat 2 Modi:
- **LIVE-MODE** (Production): `sk_live_*` Keys — **echtes Geld**
- **TEST-MODE** (Sandbox): `sk_test_*` Keys — fake-Geld, Test-Karte 4242 funktioniert

**Test-Karte `4242 4242 4242 4242` funktioniert NUR in TEST-MODE.**

**Im LIVE-MODE:**
- Echte Karte erforderlich
- Echtes Geld wird abgebucht
- Refund nötig wenn Test → Stripe-Dashboard

---

## Test-Strategie: 3 Optionen

### Option A — Test-Mode-Switch (empfohlen für komplette Verifikation)

**Vorteile:**
- Test-Karte 4242 nutzbar (kein echtes Geld)
- Alle Szenarien testbar (Solo, Team, Add-ons, Founding, Pilot)
- Refund nicht nötig

**Schritte:**
1. Stripe-Dashboard oben rechts: **Toggle „Viewing test data"** aktivieren
2. Im Test-Mode: Coupons + Price-IDs sind **separate** vom Live-Mode!
3. Test-Mode FOUNDING-99-Coupon anlegen (analog zu Live-Mode)
4. Test-Mode Webhook-Endpoint anlegen → eigenes `STRIPE_WEBHOOK_SECRET` (Test)
5. ENV-Vars **temporär** umstellen in Netlify:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_test_...`
   - Trigger Deploy
6. `npm run verify-stripe` + `npm run test-checkouts`
7. Test-Käufe mit `4242 4242 4242 4242` durchführen
8. Verifikation in Supabase
9. **NACH TEST:** ENV-Vars zurück auf Live-Mode + Trigger Deploy

**Nachteil:** Doppel-Deploy + Netlify-ENV-Switching nötig.

### Option B — Live-Mode + sofortiger Refund (mutiger, schneller)

**Vorteile:**
- Keine ENV-Umstellung
- Realistischste Verifikation (echte Live-Mode-Konfiguration)

**Schritte:**
1. `CONFIRM_LIVE_CHECKOUT=ja npm run test-checkouts` → 7 URLs
2. Eigene Karte verwenden für Test-Charge
3. Sofort danach in Stripe-Dashboard:
   - Subscription cancel (für Subscription-Tests)
   - Payment refund (für Add-on-Payment-Tests)
4. Test-Customer löschen oder als „Test-Marcel" archivieren

**Nachteil:** Echtes Geld geht hin und her (~5-10 Min Lag bis Refund verbucht).

### Option C — Nur 1 Plan testen, Rest später (minimaler Risk)

**Vorteile:**
- Schnellste Verifikation (nur 5 Min)
- Minimum-Geld-Bewegung

**Schritte:**
1. Live-Mode: nur Founding-Pilot (90T Trial → keine Belastung in 90 Tagen)
2. Eigene Karte hinterlegen
3. Sofort kündigen via Customer-Portal
4. Add-ons + Solo-Direct + Team später bei echtem Pilot-Bedarf testen

**Nachteil:** unvollständige Verifikation. Sub-Bug könnte erst beim ersten echten Pilot auffallen.

---

## Empfohlener Ablauf (Marcel-Tag heute/morgen)

**60 Min Aufwand. Kombination aus Option A und C:**

### Phase 1 — Test-Mode-Komplett-Verify (30 Min)

```bash
# 1. Test-Mode-Keys in Netlify-UI setzen (temporär)
# Stripe-Dashboard → Toggle "Viewing test data" → Developers → API Keys

# 2. Test-Mode-Coupon FOUNDING-99 anlegen:
# Test-Mode-Dashboard → Products → Coupons → New
#   - ID: FOUNDING-99
#   - 50€ off, Forever, max 10 redemptions, nur Solo-Test-Price

# 3. Test-Mode-Webhook-Endpoint anlegen:
# Test-Mode-Dashboard → Developers → Webhooks → Add endpoint
#   - URL: https://prova-systems.de/.netlify/functions/stripe-webhook
#   - Events: 6 (Pflicht-Liste aus STRIPE-SETUP.md + customer.subscription.trial_will_end)
#   - Signing-Secret kopieren

# 4. Netlify-ENV temporär switchen
# Trigger Deploy

# 5. Verify-Suite laufen lassen
npm run verify-stripe   # Alles ✅?
npm run test-webhook    # End-to-End grün?
npm run test-checkouts  # 7 URLs erzeugen

# 6. Test-Käufe in Browser:
# URL 1 (Solo) → 4242 4242 4242 4242, beliebige Daten → Charge succeed
# URL 3 (Founding manueller Coupon) → 4242 → Charge 99€
# URL 7 (Founding-Pilot) → 4242 → Charge 0€ heute, Trial 90T

# 7. Verifikation pro Test in Supabase:
# Dashboard → Table Editor → workspaces → Test-User finden
#   - abo_status korrekt?
#   - stripe_customer_id gesetzt?
#   - stripe_subscription_id gesetzt?
# Table Editor → stripe_events → Letztes Event status='verarbeitet'?
# Table Editor → audit_trail → typ='stripe.subscription.activated' oder 'stripe.pilot.trial_started'
```

### Phase 2 — Live-Mode-Sanity-Check (15 Min)

```bash
# 8. ENV zurück auf Live-Mode + Trigger Deploy
# Im Live-Mode:
npm run verify-stripe   # Live-Account-Status grün?

# 9. Live-Mode-Webhook-Test:
npm run test-webhook    # Mock-Event mit Live-Webhook-Secret

# 10. Optional: 1 echter Founding-Pilot-Test
# Eigene Karte → 0€ heute (Trial), Subscription sofort kündigen via Portal
# (kein Geld bewegt, da Trial-Phase)
```

### Phase 3 — Cleanup (15 Min)

```bash
# 11. Test-Mode aufräumen (optional):
# Stripe-Test-Mode-Dashboard → Test-Customers löschen
# Test-Subscriptions cancel
# (Test-Mode-Daten verschmutzen aber niemanden, optional)

# 12. Founding-Coupon-Counter checken:
# Test-Mode-Coupon-Counter zurücksetzen NICHT möglich → einfach ignorieren
# Live-Mode-Coupon: noch 10/10 frei (keine Test-Käufe waren Live)
```

---

## Test-Karten-Liste (TEST-MODE)

| Szenario | Karte | Erwartetes Ergebnis |
|---|---|---|
| **Erfolg** | `4242 4242 4242 4242` | Charge succeeds |
| **3D-Secure-Auth** | `4000 0027 6000 3184` | Auth-Flow → Charge succeed |
| **Decline (insufficient funds)** | `4000 0000 0000 9995` | Decline mit "card_declined" |
| **Decline (lost card)** | `4000 0000 0000 9987` | Decline |
| **Subscription Test** | `4000 0027 6000 3184` | 3DS dann Sub erstellt |
| **SEPA Erfolg** | IBAN `DE89370400440532013000` | Mandate + Charge |
| **SEPA Decline** | IBAN `DE61370400440532013001` | Mandate failed |

(Alle anderen Felder beliebig: zukünftiges Datum, beliebiger CVC, beliebiger Name.)

---

## Verifikation-Checkliste pro Test

Nach jedem erfolgreichen Test-Checkout:

### In Browser
- [ ] Redirect zu `/dashboard.html?checkout=success` (oder `/pilot=welcome`)
- [ ] Dashboard öffnet ohne Fehler
- [ ] Profil-Page zeigt Abo-Status

### In Stripe-Dashboard
- [ ] Customer-Eintrag erstellt
- [ ] Subscription mit korrektem Plan + Status
- [ ] Bei Pilot: `status=trialing` mit `trial_end` in 90T
- [ ] Bei Founding-Coupon: `discounts` zeigt FOUNDING-99
- [ ] Webhook-Logs: alle Events delivered (200 OK)

### In Supabase
- [ ] `workspaces.stripe_customer_id` gesetzt
- [ ] `workspaces.stripe_subscription_id` gesetzt
- [ ] `workspaces.abo_status` korrekt (`aktiv` oder `trial`)
- [ ] `workspaces.abo_tier` korrekt (`solo` oder `team`)
- [ ] Bei Pilot: `workspaces.abo_trial_endet_am` gesetzt
- [ ] `stripe_events`-Eintrag mit `status='verarbeitet'`
- [ ] `audit_trail`-Eintrag (z.B. `stripe.pilot.trial_started`)

---

## Cleanup nach Tests (Live-Mode)

### Wenn Live-Test gemacht
1. **Refund** (für Add-on/Solo/Team/Founding-Manuell):
   - Stripe-Dashboard → Payments → Charge → Refund
   - Reason: "Test transaction"
2. **Subscription cancel** (für Subscriptions):
   - Customer-Portal-Link aus Welcome-Email öffnen
   - "Cancel subscription" klicken
   - Bestätigen
3. **Customer löschen** (optional, ggf. Audit-Log behalten):
   - Stripe-Dashboard → Customer → Top-right Menu → Delete
   - ⚠️ Daten in Supabase bleiben (RLS-protected)
4. **Workspace in Supabase aufräumen**:
   ```sql
   DELETE FROM workspaces WHERE billing_email = 'marcel-test@...';
   ```
   (Test-User-Email immer klar erkennbar)
5. **Founding-Coupon-Counter** (NUR wenn versehentlich Live-Pilot getestet):
   - `times_redeemed` lässt sich nicht zurücksetzen
   - Falls 1x Pilot getestet: `max_redemptions` von 10 auf 11 erhöhen → kompensiert

---

## Häufige Fehler

### ❌ "Test-Mode-Coupon nicht gefunden"
**Ursache:** Coupon nur in Live-Mode angelegt, nicht im Test-Mode
**Fix:** Test-Mode-Toggle → Coupons → New → FOUNDING-99 (separater Account!)

### ❌ "Webhook signature failed"
**Ursache:** `STRIPE_WEBHOOK_SECRET` ist Live-Mode-Wert, aber Test-Mode aktiv
**Fix:** Test-Mode-Webhook-Endpoint anlegen → eigenes Secret holen → Netlify-ENV updaten

### ❌ "stripe_events-Eintrag fehlt"
**Ursache:** Webhook hat 200 zurück, aber Supabase-INSERT fehlgeschlagen
**Fix:** `SUPABASE_SERVICE_ROLE_KEY` korrekt? Trigger Deploy? Function-Logs in Netlify?

### ❌ "Customer-Email mismatch"
**Ursache:** Test-Email ist nicht in `users`-Tabelle in Supabase
**Fix:** Vor Test: Test-User in Supabase Auth anlegen mit derselben Email

---

## Erfolgs-Kriterien (alle ✅ = Marcel kann Pilot-SVs einladen)

- [ ] `npm run verify-stripe` → exit 0, alle ✅
- [ ] `npm run test-webhook` → exit 0, end-to-end grün
- [ ] Test-Checkout Solo erfolgreich (Test-Mode)
- [ ] Test-Checkout Founding-manuell-Coupon: Total = 99€
- [ ] Test-Checkout Founding-Pilot: 0€ heute, Trial 90T
- [ ] Subscriptions in Stripe-Dashboard sichtbar
- [ ] Webhooks alle 200 OK
- [ ] Workspace + Audit-Trail in Supabase korrekt
- [ ] Customer-Portal-Link öffnet Self-Service-Page

---

## Notfall: Setup ist kaputt, was tun?

1. **`docs/strategie/STRIPE-VERIFICATION-RUNBOOK.md`** Troubleshooting-Tabelle
2. **NACHT-PAUSE-File** in `docs/diagnose/` schreiben mit:
   - Was ich versucht habe
   - Was nicht funktioniert
   - Stripe-Dashboard-Screenshots
   - Netlify-Function-Logs
3. **Claude Code** in nächster Session analysiert + fixt

---

*Test-Kauf Runbook 03.05.2026*
