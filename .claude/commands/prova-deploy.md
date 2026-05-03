---
description: PROVA Deploy-Workflow — Tests + sw.js Bump + Commit + Push
---

Run the PROVA deploy workflow strictly sequentially. STOP at any failure and report.

1. **Pre-Flight Status:** `git status --short` — alle Files ready für Commit?
2. **Tests:**
   - `npm run test:stripe` (Stripe Unit-Tests, 27/27 erwartet)
   - `npm test` (smoke-Test wenn vorhanden)
3. **Lint** wenn `.eslintrc*` existiert: `npm run lint || true`
4. **sw.js CACHE_VERSION-Bump** (nur wenn Frontend-JS/CSS oder APP_SHELL geändert wurde):
   - aktuellen Wert lesen (`grep CACHE_VERSION sw.js`)
   - um 1 erhöhen (z.B. `prova-v253` → `prova-v254`)
   - mit `node --check sw.js` verifizieren
5. **Commit** mit Conventional-Message-Format:
   - `feat:` / `fix:` / `docs:` / `chore:` / `test:` Prefix
   - Sprint-Bezug + Severity wo passend
   - Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
6. **Push** — `git push origin main` (Marcel-OK über settings.json `ask`-Liste)
7. **Deploy-Verify:** 30s warten, dann `curl -I https://app.prova-systems.de/sw.js | grep prova-v` — neue CACHE_VERSION sichtbar?

Wenn ein Schritt fehlschlägt:
- KEIN Push bei roten Tests
- Marcel transparent informieren mit Stack-Trace + Empfehlung zum Fix
- BACKLOG.md updaten falls neuer Bug entdeckt

Final: kurze Zusammenfassung was deployed wurde + Tag-Empfehlung falls Sprint-Abschluss.
