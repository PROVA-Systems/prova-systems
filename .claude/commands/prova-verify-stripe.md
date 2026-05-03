---
description: PROVA Stripe-Setup Komplett-Verifikation
---

Run Stripe verification chain — Marcel-Pre-Pilot-Pflicht.

1. **ENV + API + Webhook + Coupon + Supabase + Portal:**
   ```bash
   npm run verify-stripe
   ```

2. **End-to-End Webhook-Test (Mock-Event signiert):**
   ```bash
   npm run test-webhook
   ```

3. **Live-Webhook-Health (letzte 50 Events):**
   ```bash
   npm run stripe-status
   ```

4. Bei `npm run verify-stripe` exit 0 + alle ✅:
   - **Empfehlung:** Marcel macht Test-Käufe via `npm run test-checkouts`
   - Verweis auf `docs/strategie/TEST-KAUF-RUNBOOK.md` (Test-Mode-Switch oder Live+Refund-Strategie)

5. Bei rotem Check (exit 1):
   - Welcher Check ❌? (parse Output)
   - Troubleshooting aus `docs/strategie/STRIPE-VERIFICATION-RUNBOOK.md` zitieren (passenden Abschnitt finden)
   - Konkrete Marcel-Aktion empfehlen (z.B. "STRIPE_WEBHOOK_SECRET in Netlify-UI setzen + Trigger Deploy")

Output-Format:
```
PROVA Stripe-Verify — <Datum>

verify-stripe:   ✅ pass / ❌ fail (welcher Check)
test-webhook:    ✅ pass / ❌ fail
stripe-status:   ✅ ok / ⚠ warn / ❌ fail

→ Empfehlung: <konkrete nächste Aktion>
```

Bei Failed-Webhooks: hinweis auf `npm run stripe-replay` für Re-Delivery.
