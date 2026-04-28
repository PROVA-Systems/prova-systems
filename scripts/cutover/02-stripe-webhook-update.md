# Cutover Schritt 02 — Stripe Webhook auf Supabase umstellen

**Sprint:** K-1.5 · **Owner:** Marcel · **Reihenfolge:** Schritt 2/5

---

## URLs

| | URL |
|---|---|
| **Alt (Netlify)** | `https://prova-systems.de/.netlify/functions/stripe-webhook` |
| **Neu (Supabase)** | `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/stripe-webhook` |

---

## Schritte

### 1. Endpoint umstellen

1. https://dashboard.stripe.com/webhooks (Live oder Test, je nach Mode)
2. Bestehenden Endpoint auswählen
3. Option A — sicherer: **neuen Endpoint anlegen** (alter parallel laufen lassen):
   - URL: `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/stripe-webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - **Reveal Signing Secret** → kopieren
4. Option B — direkt umstellen: alten Endpoint URL ändern

### 2. Webhook-Secret in Supabase setzen

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_NEU_VOM_DASHBOARD
```

⚠️ Bei Option A: Secret ist **per Endpoint** unterschiedlich. Setze den Secret des NEUEN Endpoints.

### 3. Test-Event triggern

Im Stripe Dashboard:
1. Endpoint öffnen → **Send test event**
2. Event auswählen (z.B. `customer.subscription.created`)
3. Send

Im Supabase Dashboard:
4. Project → Edge Functions → `stripe-webhook` → Logs
5. Erwartet: 200 OK, `[stripe-webhook] event ... processed`
6. SQL-Editor:
   ```sql
   SELECT id, event_type, status, verarbeitung_fehler, created_at
   FROM stripe_events
   ORDER BY created_at DESC LIMIT 5;
   ```
   Erwartet: Test-Event mit `status='ignoriert'` (Subscription-ID kein Workspace zugeordnet — okay) ODER `status='verarbeitet'`.

### 4. Bei Option A: alten Endpoint deaktivieren

Wenn Test grün und 24h ohne Probleme:
1. Stripe Dashboard → alter Endpoint → **Disable**
2. NICHT löschen — Rollback-Reserve

---

## Rollback

```
Stripe Dashboard → neuer Endpoint → Disable
                 → alter Endpoint → Enable (falls Option A) oder URL zurück (Option B)
supabase secrets unset STRIPE_WEBHOOK_SECRET   # falls per Wert verwendet
# Alter Make F1 / Netlify Function läuft wieder
```

---

## Verifikation nach Live-Switch

- [ ] Test-Subscription anlegen → `stripe_events` neue Row
- [ ] Test-Subscription cancel → `workspace.abo_status='gekuendigt'`
- [ ] Test-Invoice payment_succeeded → `workspace.abo_status='aktiv'`
- [ ] Logs in Supabase Dashboard zeigen 2xx-Responses
