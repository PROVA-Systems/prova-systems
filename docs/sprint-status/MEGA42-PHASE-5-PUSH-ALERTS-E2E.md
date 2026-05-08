# MEGA⁴² Phase 5 — Push-Alerts End-to-End-Verify

**Datum:** 2026-05-08
**Branch:** `mega42-live-verify-pilot-ready`

---

## 🚨 Phase-0-Findings die hier behoben wurden

1. **health-check-cron NICHT in netlify.toml scheduled** — Lambda existierte (M⁴¹ P3), aber Cron triggerte nie. ✅ Schedule `*/10 * * * *` ergänzt.
2. **push-setup.html fehlte** — User konnten ihre VAPID-Subscription nicht registrieren. ✅ 3-Step-Wizard erstellt.
3. **health-test-down.html fehlte** — Marcel konnte nicht manuell Push-Alerts testen. ✅ Test-Tool mit 3 Buttons erstellt.
4. **ENV-Doku fehlte** — Marcel wusste nicht welche ENV-Vars wo zu setzen sind. ✅ docs/runbook/PUSH-ALERTS-SETUP.md mit Architektur-Diagram.

---

## 📦 Deliverables

| File | Zweck | LOC |
|------|-------|-----|
| `push-setup.html` | 3-Step-Wizard (Berechtigung/Subscription/Test) | 245 |
| `health-test-down.html` | Manuelle Trigger-Tools für Marcel-Live-Test | 220 |
| `netlify.toml` | Schedule `*/10 * * * *` für health-check-cron | +4 |
| `docs/runbook/PUSH-ALERTS-SETUP.md` | Setup-Guide + ENV-Vars + Test-Anleitung | 130 |
| `tests/push-alerts/m42-p5-setup-pages.test.js` | 24 Tests | 145 |
| `sw.js` | APP_SHELL + CACHE_VERSION v1405 | +3 |

---

## 🛡️ E2E-Flow

```
1. Marcel öffnet /push-setup.html
   ↓ Step 1: Notification.requestPermission()
   ↓ Step 2: pushManager.subscribe() + POST /push-subscribe
   ↓ Step 3: POST /push-test → web-push() → Browser-Notification
2. Netlify Schedule (alle 10min) triggert health-check-cron
   ↓ probe() für 8 Services → INSERT system_health_history
   ↓ Bei status=down: POST /push-notify → web-push() → Marcel's Gerät
3. Marcel bekommt Push-Notification innerhalb 10min nach Service-Down.
```

---

## ✅ Acceptance

| Item | Status |
|------|--------|
| pg_cron eingerichtet (via netlify.toml) | ✅ |
| health-check-cron Schedule */10min | ✅ |
| push-setup.html mit 3 Steps | ✅ |
| health-test-down.html mit 3 Test-Tools | ✅ |
| ENV-Doku in docs/runbook/ | ✅ |
| 24 Wiring-Tests grün | ✅ |
| sw.js APP_SHELL + v1405 | ✅ |
| **End-to-End live-verifiziert** | 🔴 PENDING — Marcel-Pflicht |

---

## 🔴 Marcel-Pflicht (Live-Verify)

1. ENV-Vars auf Netlify setzen:
   ```
   HEALTH_CHECK_CRON_SECRET=<random 64-char>
   VAPID_PUBLIC_KEY=<from web-push generate>
   VAPID_PRIVATE_KEY=<from web-push generate>
   VAPID_SUBJECT=mailto:marcel.schreiber891@gmail.com
   ```
2. Push to main → Netlify-Deploy
3. `/push-setup.html` durchlaufen
4. `/health-test-down.html` triggern
5. Push erhalten ✓ → in Phase 13 dokumentieren

---

## 🎯 Phase 5 Status

**ACCEPTANCE ERFÜLLT (Code)** — 4 Kritische Lücken aus Phase 0 behoben, 24 Tests grün, End-to-End-Doku komplett.

**🔴 LIVE-VERIFY PENDING** — Marcel braucht ENV-Setup + Deploy + Real-Device-Test.

---

*MEGA⁴² Phase 5 — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
