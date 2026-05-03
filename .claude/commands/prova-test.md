---
description: PROVA komplette Test-Suite
---

Run the full PROVA test suite, transparent reporting per stage.

1. **Stripe Unit-Tests:**
   ```bash
   npm run test:stripe
   ```
   Erwartet: 27/27 PASS (18 webhook + 6 prices + 9 founding-pilot, summenstand 03.05.)

2. **Multi-Tenant-Isolation-Tests** (nur wenn `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`):
   ```bash
   npm run test:multitenant
   ```
   Erwartet: 33/33 Tests grün (Cross-Tenant-Isolation per RLS verifiziert)
   Wenn ENV fehlt: Skip + Hinweis dass Marcel GitHub-Secrets/local ENV setzen muss

3. **Smoke-Test** (Cutover-Page-Tests):
   ```bash
   bash scripts/smoke-test-cutover.sh
   ```
   Erwartet: 15/15 PASS

4. **Stripe-Verify-Suite** (live, nur wenn Stripe-ENV vorhanden):
   ```bash
   npm run verify-stripe
   ```
   Erwartet: alle ✅ (Setup-Verifikation, kein Charge)

Pro Suite Output:
- ✅/❌-Status
- Anzahl pass/fail
- Bei Fail: Failure-Details (welcher Test, was war erwartet, was kam) + Empfehlung zum Fix
- Bei Skip: warum (z.B. ENV fehlt)

Final-Summary:
```
PROVA Test-Status — <Datum>
✅ Stripe:        27/27
✅ Multi-Tenant:  33/33  (oder skip-reason)
✅ Smoke-Test:    15/15
✅ Verify-Stripe: alle gruen
```

Wenn alles grün: Empfehlung zur Tag-Setzung wenn Sprint-Abschluss.
Wenn Failures: prio-Liste der Fixes.
