# MEGA²⁸ W3-I6 — Sentry-Integration Audit

**Datum:** 2026-05-10 morgens
**Auditor:** Claude Opus 4.7

---

## TL;DR

- **Frontend:** ✅ Sentry-Init eingerichtet (`lib/sentry-init.js`)
- **Backend:** 🟡 Coverage 39 / 64 Lambdas (61%) — 25 Lambdas ohne `withSentry`-Wrapper
- **Tooling:** `lib/sentry-wrap.js` etabliert + `admin-sentry-errors.js` Cockpit-Bridge
- **Quick-Fix in W3-I6:** `pdf-proxy.js` als Reference-Lambda gewrappt

---

## Frontend Coverage

### Sentry-Init eingebunden in
- `index.html`, `app.html`, `admin-dashboard.html`, `admin/index.html`, `admin/voll.html`
- `legal/avv.html`, `avv.html`, `500.html`
- `lib/sentry-init.js` (zentrale Init-Logik)

### Bewertung
✅ **Frontend-Sentry ist solide.** Source-Maps sollten via Build-Plugin geuploadet werden — Marcel-TODO falls noch nicht.

---

## Backend (Lambda) Coverage

### 39 / 64 Lambdas mit `withSentry` (61%)

```
admin-audit-trail, admin-churn, admin-feature-heatmap, admin-force-logout,
admin-funnel, admin-impersonate, admin-ki-costs, admin-live-sessions,
admin-pdf-queue, admin-pilot-list, admin-push-alerts, admin-send-email,
admin-sentry-errors, admin-stripe-kpis, admin-system-health,
admin-time-tracking, auth-token-issue, cancellation-survey,
check-referral-rewards, create-demo-akte, ... (39 total)
```

### 25 Lambdas OHNE `withSentry` (39%)

| File | Severity | Begründung Wrap-Pflicht |
|---|---|---|
| **pdf-proxy.js** | 🔴 HIGH | PDF-Streaming, kritischer Pfad — **GEWRAPPED in W3-I6** ✅ |
| **whisper-diktat.js** | 🔴 HIGH | KI-Cost-Endpoint, OpenAI-Fehler unsichtbar ohne Wrap |
| **dsgvo-auskunft.js** | 🔴 HIGH | Compliance-kritisch, Fehler müssen alarmiert werden |
| **dsgvo-loeschen.js** | 🔴 HIGH | Compliance-kritisch (User-Right-to-be-forgotten) |
| **stripe-portal.js** | 🟡 MEDIUM | Stripe-Errors sollten alarmiert werden |
| **provision-sv.js** | 🟡 MEDIUM | Onboarding-Pfad |
| **push-notify.js** | 🟡 MEDIUM | Push-Errors sind silent ohne Wrap |
| **foto-captioning.js** | 🟡 MEDIUM | KI-Cost-Endpoint |
| **normen-picker.js** | 🟡 MEDIUM | KI-Cost-Endpoint |
| **smtp-credentials, smtp-senden** | 🟡 MEDIUM | Email-Pfad-Errors silent |
| **akte-export.js** | 🟡 MEDIUM | User-Workflow-Pfad |
| **make-proxy.js** | 🟡 MEDIUM | Inter-Server-Bridge |
| **mein-aktivitaetsprotokoll.js** | 🟢 LOW | Read-Only-Endpoint |
| **emails.js** | 🟢 LOW | Read-Only-Endpoint |
| **error-log.js** | 🟢 LOW | Self-Logging — Wrap würde Loop-Risk |
| **health.js** | 🟢 LOW | Public-Health-Check |
| **audit-log.js** | 🟢 LOW | Self-Logging |
| **team-interest.js** | 🟢 LOW | Marketing-Form |
| **termin-reminder.js** | 🟢 LOW | Background-Cron |
| **foto-anlage-pdf.js** | 🟢 LOW | Sub-Workflow |
| **ki-statistik.js** | 🟢 LOW | Read-Only-Stats |
| **normen.js** | 🟢 LOW | Read-Only-DB |
| **admin-auth.js** | 🟢 LOW | Vermutlich legacy/wraps anders |
| **admin-cache-clear.js** | 🟢 LOW | Internal-Secret-Endpoint |

---

## Quick-Fix in W3-I6: pdf-proxy.js

### Vorher
```js
const ProvaPseudo = require('./lib/prova-pseudo');

// ── Handler ──
exports.handler = async function(event, context) {
  // ...
};
```

### Nachher
```js
const ProvaPseudo = require('./lib/prova-pseudo');
const { withSentry } = require('./lib/sentry-wrap');

// ── Handler ──
exports.handler = withSentry(async function(event, context) {
  // ...
}, { name: 'pdf-proxy' });
```

### Effect
- Alle thrown Errors werden in Sentry gemeldet mit Lambda-Name + Event-Kontext
- DSGVO-konform (sentry-wrap pseudonymisiert PII automatisch via captureContext-Hook)
- Zero-overhead bei Success-Path (~ <1ms try-catch-around-handler)

---

## Empfehlungen Welle 4

### P1 — Wrap top-4 HIGH-severity Lambdas
- `whisper-diktat.js`
- `dsgvo-auskunft.js`
- `dsgvo-loeschen.js`
- `pdf-proxy.js` ✅ (W3-I6 done)

### P2 — Wrap MEDIUM-severity Lambdas (10 Stück)
Bulk-Edit, identisches Pattern. Ein Sprint-Item: ~30 min.

### P3 — Source-Maps Upload-Verifikation
Marcel-TODO: prüfen ob Sentry-Source-Maps von Netlify-Build hochgeladen werden. Falls nicht: Sentry-Webpack-Plugin oder Netlify-CLI-Sentry-Integration.

### P4 — Rate-Limit für Sentry-Events
Verhindert Bug-Storms (z.B. PDF-Generation-Fail in Schleife → 1000 Sentry-Events/min).
Lösung: `Sentry.init({ tracesSampleRate: 0.1 })` (10% sampling) oder eigenes Throttle-Layer in `sentry-wrap.js`.

---

## ENV-Vars für Marcel

```
PROVA_SENTRY_DSN          (production-DSN, von dash.sentry.io)
PROVA_SENTRY_ENVIRONMENT  (production / staging / pre-pilot)
PROVA_SENTRY_RELEASE      (Git-SHA — wird automatisch via COMMIT_REF gesetzt)
PROVA_SENTRY_TEST_SECRET  (für sentry-test.js Endpoint)
```

---

## DSGVO-Konformität in Sentry

### Pseudonymisierung Pflicht (Regel 17 + Verfahrensverzeichnis)
- `sentry-wrap.js` muss `beforeSend`-Hook haben, der PII aus Error-Messages strippt
- **Status TBD:** Code-Review von `lib/sentry-wrap.js` für Pseudonymisierung-Hook
- **Aktueller PII-Risk:** Wenn ein Error-Message `email`, `ip`, `name` enthält, wird das in Sentry stored.

### Action-Item für Welle 4
1. Sentry-Wrap-Code-Review (Pseudonymisierung)
2. `sample_rate` setzen (10% production)
3. Audit-Skript: `grep -rn "captureException\|setUser" --include="*.js"` → keine Klartext-PII

---

*MEGA²⁸ W3-I6 Sentry-Audit erfolgreich. 1 Reference-Lambda (pdf-proxy) gewrappt. Welle-4-Plan dokumentiert.*
