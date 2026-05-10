# MEGA⁵⁵ — Lambda-Mass-Cleanup (Phase 1)

**Datum:** 2026-05-10 14:30 GMT+2
**Sprint:** MEGA⁵⁴ Continuation — Lambda-Cleanup im netlify/functions/-Verzeichnis
**Strategie:** Konservativ — nur sicher-tote Lambdas, behalten was extern getriggert wird

---

## Was gelöscht wurde

### Admin-Lambdas (28 Files, alle als Edge-Functions deployed in MEGA⁴³)

```
admin-audit-trail.js          → Edge admin-audit-trail
admin-auth.js                 → Edge admin-auth (lib/admin-auth-guard.js Helper, ungenutzt)
admin-billing-sync.js         → Edge admin-billing-sync
admin-cache-clear.js          → Edge admin-cache-clear
admin-churn.js                → Edge admin-churn
admin-conversion-funnel.js    → Edge admin-conversion-funnel
admin-env-status.js           → Edge admin-env-status
admin-feature-heatmap.js      → Edge admin-feature-heatmap
admin-force-logout.js         → Edge admin-force-logout
admin-funnel.js               → Edge admin-funnel
admin-impersonate.js          → Edge admin-impersonate
admin-ki-aggregations.js      → Edge admin-ki-aggregations
admin-ki-costs.js             → Edge admin-ki-costs
admin-live-sessions.js        → Edge admin-live-sessions
admin-mrr-live.js             → Edge admin-mrr-live
admin-pdf-queue.js            → Edge admin-pdf-queue
admin-pdfmonkey-inventory.js  → Edge admin-pdfmonkey-inventory
admin-pilot-list.js           → Edge admin-pilot-list
admin-pseudonymisierung-audit.js → Edge admin-pseudonymisierung-audit
admin-push-alerts.js          → Edge admin-push-alerts
admin-send-email.js           → Edge admin-send-email
admin-sentry-errors.js        → Edge admin-sentry-errors
admin-stripe-kpis.js          → Edge admin-stripe-kpis
admin-support-inbox.js        → Edge admin-support-inbox
admin-support-update.js       → Edge admin-support-update
admin-system-health.js        → Edge admin-system-health
admin-system-uptime.js        → Edge admin-system-uptime
admin-time-tracking.js        → Edge admin-time-tracking
```

### Login/Auth-Lambdas (1 File)

```
auth-token-issue.js   → durch supabase.auth.signInWithPassword ersetzt (MEGA⁴⁵)
```

### Tote Auth-Libs (3 Files)

```
netlify/functions/lib/auth-resolve.js   → HMAC-Fallback, durch Supabase ES256 ersetzt
netlify/functions/lib/auth-token.js     → HMAC-Server-Sign, durch Supabase Auth ersetzt
netlify/functions/lib/supabase-jwt.js   → Server-Side JWT-Verify, jetzt in Edge native
```

**Total gelöscht: 32 Files (~3500-5000 LOC Legacy-Code).**

---

## Was BEHALTEN wurde (kein Mass-Delete)

### 9 Cron-Lambdas in `netlify.toml [functions."NAME"] schedule = ...`

```
check-referral-rewards    daily 02:00 UTC
email-pilot-feedback-cron daily 10:00 UTC
email-trial-ending-cron   daily 09:00 UTC
fristen-reminder-cron     daily 06:00 UTC
health-check-cron         every 10 min
mahnwesen-cron            daily 06:30 UTC
onboarding-mail-cron      daily 09:00 UTC
send-referral-reminders   daily 14:00 UTC
status-check              every 5 min
```

**Begründung:** Marcel hat in MEGA⁴⁷ pg_cron mit 6 Schedules + Vault-Secrets aktiviert.
9 Lambda-Cron vs 6 pg_cron — bis Marcel bestätigt dass alle Cron-Workflows in pg_cron
laufen, lassen wir Lambda-Cron als Failsafe.

### Externe-Trigger-Lambdas

```
stripe-webhook.js           → Stripe ruft direkt auf (Webhook-URL in Stripe-Dashboard)
stripe-webhook-referral.js  → Stripe Webhook für Referral-Events
make-proxy.js               → Frontend ruft auf (5 *-logic.js Files)
pdf-proxy.js                → kann von externer Quelle aufgerufen werden
push-notify.js              → kann von externer Source getriggert werden
```

**Begründung:** Webhook-URLs sind in Stripe-/Make-Dashboards konfiguriert. Mass-Delete
würde externe Integrationen brechen. Marcel-Confirm nötig vor Delete.

### Helper-Libs `netlify/functions/lib/`

```
admin-auth-guard.js       → für remaining Admin-Functions (none, aber falls back)
cors-helper.js            → von remaining Lambdas genutzt
jwt-middleware.js         → von remaining Lambdas
rate-limit-user.js        → von remaining Lambdas
storage-router.js         → von remaining Lambdas
sentry-wrap.js            → von remaining Lambdas
prova-pseudo.js           → DSGVO-Pseudonymisierung
prova-fetch.js            → fetch-Wrapper
fetch-with-timeout.js     → utility
... (weitere)
```

**Begründung:** Wird von 9 Cron + 5 externen Lambdas genutzt. Mass-Delete würde
Build brechen.

---

## Service-Worker

`sw.js` bleibt bei `prova-v3010-mega54-soft-401`. Lambda-Files sind nicht im
Service-Worker-APP_SHELL (nur Frontend-JS), daher keine Cache-Invalidation nötig.

---

## Acceptance MEGA⁵⁵

| Kriterium | Status |
|---|---|
| 28 Admin-Lambdas + auth-token-issue gelöscht | ✅ git rm |
| 3 tote Auth-Libs gelöscht | ✅ git rm |
| Cron-Lambdas behalten (9) | ✅ |
| Externe-Trigger-Lambdas behalten (5) | ✅ |
| Doc geschrieben | ✅ dieses |
| Commit + Push | ⏳ pending |

**Total:** -32 Files, ~3500-5000 LOC Legacy-Code raus.

---

## Defer auf MEGA⁵⁶ (Marcel-Trigger)

| Item | Begründung |
|---|---|
| Mass-Delete Cron-Lambdas (9) | Erst pg_cron-Audit dass alle 9 Schedules redundant sind |
| Mass-Delete Externe-Trigger-Lambdas (5) | Stripe-Webhook-URLs in Dashboard ändern + Make.com-Workflows konsolidieren |
| Mass-Delete /lib/* Helpers | Erst nach 9+5 Lambda-Delete (sonst Build broken) |
| Refactor 50+ Frontend-Files mit Airtable-Pfaden | K-1.5 Cutover-Sprint, große Refactor |

---

## Rollback-Plan

Falls Mass-Delete Probleme verursacht:
```bash
git revert <mega55-commit-sha>
git push origin main
```

Alle gelöschten Files sind in git-history wiederherstellbar.
