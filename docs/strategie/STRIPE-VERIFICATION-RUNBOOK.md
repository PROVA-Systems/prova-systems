# Stripe-Verification Runbook (Marcel-Anleitung)

**Stand:** 03.05.2026 (Sprint Stripe-Migration)
**Zweck:** Marcel verifiziert in <5 Min die komplette Stripe-Integration nach ENV-Setup.

---

## Quick-Start (30 Sekunden)

```bash
# 1. ENV + Konfig prüfen (kein Stripe-Charge, lesend)
npm run verify-stripe

# 2. Webhook End-to-End testen (Mock-Event signiert senden)
npm run test-webhook

# 3. Test-Checkout-URLs erzeugen (im Test-Mode safe, im Live-Mode echtes Geld!)
npm run test-checkouts
```

Erwartetes Ergebnis: alle 3 Skripte exit 0, alles ✅.

---

## Schritt 1 — `verify-stripe` (lesend, ~30s)

**Was passiert:**
- 12 ENV-Vars Format-Check
- Stripe-Account abfragen (`stripe.accounts.retrieve`)
- Webhook-Endpoint prüfen (URL + 5 Pflicht-Events)
- Founding-Coupon prüfen
- Alle 5 Price-IDs aktiv?
- Supabase-Service-Role testen (workspaces + stripe_events + audit_trail)
- Customer-Portal aktiv?

**Output:** farbige Tabelle ✅/⚠/❌ pro Check.

### Wenn ❌: Troubleshooting

| Fehler | Lösung |
|---|---|
| `STRIPE_SECRET_KEY fehlt` | Netlify-Dashboard → Site Settings → Environment Variables → `STRIPE_SECRET_KEY` setzen (Live-Mode `sk_live_...` aus neuem Stripe-Account) |
| `Stripe-API-Call fehlgeschlagen` | Key invalid? Im Stripe-Dashboard regenerieren, neu setzen, Trigger Deploy |
| `Stripe-Account akzeptiert KEINE Zahlungen` | Stripe-Onboarding nicht abgeschlossen — Identitäts-Verifikation + Bank-Daten in Stripe-Dashboard ergänzen |
| `Webhook-Endpoint NICHT gefunden` | Im Stripe-Dashboard: Developers → Webhooks → Add endpoint → URL `https://prova-systems.de/.netlify/functions/stripe-webhook` |
| `Fehlende Pflicht-Events` | Webhook-Endpoint editieren, alle 5 Events hinzufügen: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated` |
| `Coupon nicht gefunden` | Stripe-Dashboard → Products → Coupons → New: ID `FOUNDING-99`, 50€ off, Forever, max 10 redemptions, nur Solo-Price |
| `Supabase workspaces-Read fehlgeschlagen` | `SUPABASE_SERVICE_ROLE_KEY` falsch oder fehlt — aus Supabase-Dashboard kopieren |
| `Customer-Portal nicht konfiguriert` | Stripe-Dashboard → Settings → Billing → Customer Portal → aktivieren |

### Empfohlener Workflow bei ENV-Änderungen

1. ENV in Netlify-UI ändern
2. **Trigger Deploy** klicken (Netlify redeployt nicht auto)
3. ~3 Min Deploy-Wartezeit
4. `npm run verify-stripe` lokal (nutzt `.env.local`)

---

## Schritt 2 — `test-webhook` (~5s)

**Was passiert:**
- Mock-Event `checkout.session.completed` mit unique ID erzeugen
- HMAC-SHA256-Signatur wie Stripe selbst berechnen
- POST an Live-Webhook-URL `https://prova-systems.de/.netlify/functions/stripe-webhook`
- 2s warten, Supabase prüfen
- Test-Daten aus DB löschen (cleanup)

**Erwartetes Ergebnis:**
```
✅ Mock-Event erzeugt: evt_test_<id>
✅ HTTP 200 — Function aktiv
✅ stripe_events-Eintrag: status=verarbeitet (oder ignoriert wenn no Workspace)
✅ Test-Daten gelöscht
```

### Wenn ❌:

| Fehler | Lösung |
|---|---|
| `HTTP 400 — Webhook signature failed` | `STRIPE_WEBHOOK_SECRET` in Netlify falsch oder fehlt. Aus Stripe-Dashboard → Webhook-Endpoint → "Reveal signing secret" kopieren, Trigger Deploy |
| `HTTP 500 — Webhook nicht konfiguriert` | `STRIPE_WEBHOOK_SECRET` oder `STRIPE_SECRET_KEY` fehlt in Netlify |
| `HTTP 500 — Supabase nicht konfiguriert` | `PROVA_SUPABASE_PROJECT_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Netlify setzen, Trigger Deploy |
| `HTTP 404` | Function nicht deployed. Trigger Deploy in Netlify-UI, ~3 Min warten |
| `stripe_events-Eintrag nicht gefunden` | Function lief, hat aber INSERT in Supabase nicht geschafft → Logs in Netlify-Dashboard → Functions → stripe-webhook → Logs prüfen |
| `Network-Error` | DNS / Netlify-Edge-Issue — `curl -I https://prova-systems.de/.netlify/functions/stripe-webhook` direkt testen |

---

## Schritt 3 — `test-checkouts` (~10s, 6 URLs)

**Was passiert:**
- Erzeugt 6 Stripe-Checkout-Sessions:
  1. Solo (149€/Mo Subscription)
  2. Team (279€/Mo Subscription)
  3. Founding Solo (99€ lifetime via Coupon)
  4. Add-on 5 Gutachten (25€)
  5. Add-on 10 Gutachten (45€)
  6. Add-on 20 Gutachten (80€)
- Jede gibt eine Stripe-Hosted-Checkout-URL aus

**⚠️ LIVE-MODE-WARNUNG:**
- Wenn `STRIPE_SECRET_KEY` mit `sk_live_` beginnt: **echtes Geld**
- Skript bricht ab, fragt nach Bestätigung via `CONFIRM_LIVE_CHECKOUT=ja`

### Drei Ansätze (Marcel-Wahl):

**Ansatz A — Test-Mode-Checkout** (empfohlen):
1. ENV `STRIPE_SECRET_KEY` temporär auf Test-Mode-Key umstellen (`sk_test_...`)
2. `npm run test-checkouts`
3. URLs öffnen, Test-Karte `4242 4242 4242 4242` (jedes zukünftige Datum, jeder CVC)
4. SEPA-Test-IBAN: `DE89370400440532013000`
5. Nach Test ENV zurücksetzen auf Live-Mode

**Ansatz B — Live-Mode + Refund** (mutiger):
1. `CONFIRM_LIVE_CHECKOUT=ja npm run test-checkouts`
2. URLs öffnen, eigene Karte verwenden
3. Sofort nach Charge → Stripe-Dashboard → Payments → Refund

**Ansatz C — nur 1 Sub-Plan testen, Rest später:**
1. Erste URL (Solo) öffnen, mit eigener Karte zahlen
2. Sofort kündigen via Customer-Portal
3. Refund initiieren
4. Add-ons + Founding später wenn 1. Pilot-Kunde da ist

### Akzeptanz nach erfolgreichem Test-Checkout

```
✅ Stripe-Checkout-Page öffnet (Stripe-Hosted)
✅ Zahlung erfolgreich verarbeitet
✅ Redirect zu /dashboard.html?checkout=success
✅ Supabase: workspaces.abo_status='aktiv' für Test-Email
✅ stripe_events: Event mit status='verarbeitet'
✅ audit_trail: Eintrag stripe.subscription.activated
```

---

## Manuelle Verifikation (5 Min, ohne Skripte)

```bash
# Webhook-URL erreichbar?
curl -I https://prova-systems.de/.netlify/functions/stripe-webhook
# Erwartet: HTTP/2 405 Method Not Allowed (= Function existiert)

# Function-Logs in Netlify
# Dashboard → Functions → stripe-webhook → Logs (live tail)

# Stripe-Webhook-Logs
# Stripe-Dashboard → Developers → Webhooks → Endpoint klicken → Recent deliveries

# Supabase-Tabelle prüfen
# Supabase-Dashboard → Table Editor → stripe_events
```

---

## Test-Karten-Liste (Test-Mode)

| Szenario | Karte | Ergebnis |
|---|---|---|
| Erfolg | `4242 4242 4242 4242` | Charge succeeds |
| 3D-Secure | `4000 0027 6000 3184` | Auth-Flow erforderlich |
| Decline (insufficient funds) | `4000 0000 0000 9995` | Decline |
| Decline (lost card) | `4000 0000 0000 9987` | Decline |
| SEPA Erfolg | IBAN `DE89370400440532013000` | Mandate created |
| SEPA Decline | IBAN `DE61370400440532013001` | Mandate failed |

(Alle anderen Felder beliebig — Datum in Zukunft, beliebiger CVC, beliebiger Name.)

---

## Erfolg-Checkliste (alle ✅ = Marcel kann Pilot-SVs einladen)

- [ ] `npm run verify-stripe` → exit 0, keine ❌
- [ ] `npm run test-webhook` → exit 0
- [ ] Test-Checkout Solo erfolgreich (Karte 4242)
- [ ] `workspaces.abo_status='aktiv'` für Test-User in Supabase
- [ ] `stripe_events` enthält Event mit `status='verarbeitet'`
- [ ] `audit_trail` enthält Eintrag `stripe.subscription.activated`
- [ ] Customer-Portal-Link öffnet Stripe-Portal (über Solo-User-Account)
- [ ] Add-on-Test (mind. 1 von 3): Charge erfolgreich
- [ ] Founding-Coupon-Test: Total = 99€ statt 149€

---

## Bei totaler Verzweiflung

NACHT-PAUSE-Pattern: schreibe `docs/diagnose/STRIPE-PROBLEM-<datum>.md` mit:
- Was du versucht hast
- Was nicht funktioniert
- Stripe-Dashboard-Screenshots
- Netlify-Function-Logs

→ Claude Code analysiert in nächster Session.

---

*Stripe-Verification Runbook 03.05.2026 · Sprint Stripe-Migration*
