# MEGA⁴⁷ Playwright-Run-Ergebnisse

**Datum:** 2026-05-09 22:45 GMT+2

## Status: ⏸ Defer auf Marcel-Phase

Playwright-Suite (`tests/playwright/mega46-e2e-smoke.spec.js`) requires:

1. **Test-User in Supabase Auth**
   - `test-pilot@prova-systems.test` mit gültigem Passwort
   - Workspace + Membership angelegt (provision-sv aufrufen)
   - Email muss confirmed sein (Supabase Auth Default: confirm-flow)

2. **ENV-Variables in Test-Run-Context**
   - `PROVA_TEST_EMAIL`
   - `PROVA_TEST_PASSWORD`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`

3. **Playwright-Browser-Install**
   - `npx playwright install chromium` (~150MB Download)

4. **Live-Site oder Local-Dev-Server**
   - `https://app.prova-systems.de` (post-Push-Deploy)
   - oder `npx http-server -p 8080`

## Warum CC das nicht im Night-Shift macht

a) Test-User-Erstellung würde echte Email-Confirmation brauchen (Supabase
   sendet Mail). Quick-Fix wäre Marcel-Side via Dashboard.
b) Passwort-Generierung + Speicherung in ENV: Sicherheits-Risiko wenn CC
   das ohne Marcel-Sichtbarkeit macht.
c) Playwright-Install + Browser ~150MB ist Zeit/Ressourcen-Aufwand der
   nichts deterministisches liefert (Race-Conditions, Flake möglich).
d) Real-Run würde Session-Tokens generieren die in audit_trail loggen —
   wäre laut für Pilot-Stats ohne Marcel-Bewusstsein.

## Was stattdessen gemacht wurde

1. **Playwright-Skeleton ist vorhanden** (MEGA⁴⁶):
   `tests/playwright/mega46-e2e-smoke.spec.js` — 10 Test-Stubs + 1 echter
   Edge-Health-Check. Alle Stubs sind `test.skip(SKIP_REAL, ...)` skippable
   ohne Credentials.

2. **Edge-Health-Check standalone runnable:**
   ```bash
   export SUPABASE_URL="https://cngteblrbpwsyypexjrv.supabase.co"
   export SUPABASE_ANON_KEY="<aus Supabase Dashboard>"
   npx playwright test tests/playwright/mega46-e2e-smoke.spec.js \
       --grep "Edge-Functions Health"
   ```
   Erwartung: 200 (oder 503 falls ENV-Degraded), Body hat status+checks.

3. **Manueller Browser-Smoke-Test-Helper:**
   `docs/MARCEL-SMOKE-TEST-MEGA46.md` (10 Workflows A-J, ~30 Min)
   ist der pragmatischere Ersatz für Real-Playwright-Run im aktuellen
   Stand. Marcel kann das morgens durchklicken.

## Empfohlene Marcel-Action für Pilot-Live

### Quick-Path (10 Min)
```
1. Supabase Dashboard → Auth → Users → "Add user"
   Email: test-pilot@prova-systems.test
   Passwort: <16-char-secure-random>
   "Auto-confirm: ON"

2. Supabase SQL Editor:
   INSERT INTO public.workspaces (name, billing_email, paket, abo_status, max_user)
   VALUES ('Test-Pilot SV-Büro', 'test-pilot@prova-systems.test', 'Solo', 'aktiv', 1)
   RETURNING id;
   -- Copy returned id, then:
   INSERT INTO public.workspace_memberships (workspace_id, user_id, rolle, is_active, joined_at)
   VALUES ('<copied-id>', (SELECT id FROM auth.users WHERE email='test-pilot@prova-systems.test'), 'owner', true, now());

3. Browser: https://app.prova-systems.de/login
   Login mit Test-Account → durchklicken Workflows A bis J
```

### Full-Path (30+ Min)
```
1. Wie oben + Demo-Akte:
   POST https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/create-demo-akte
   Authorization: Bearer <test-user-jwt>
2. Dann durchklicken aller 10 Workflows aus MARCEL-SMOKE-TEST-MEGA46.md
3. Pro Workflow: Network-Tab + Console screenshots → an mich falls Bug
```

## Ergebnis

**Playwright-Tests:** Skeleton ✅, Real-Run ⏸ defer.
**Stattdessen:** Browser-Smoke-Test-Doc + Edge-Health-Check Standalone.
