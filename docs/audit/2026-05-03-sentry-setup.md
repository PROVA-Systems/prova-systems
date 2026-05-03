# Audit 21 — Sentry / Error-Monitoring-Setup

**Datum:** 03.05.2026 (Sprint S6 Phase 4)
**Auditor:** Claude Code
**Methodik:** Architektur-Empfehlung (kein Sentry aktuell installiert)

---

## Status

**KEIN Error-Monitoring aktiv.** PROVA hat aktuell:
- `console.error` in Functions
- `prova-logger.js` für strukturierte Logs (Netlify-Function-Logs, 90T Retention auf Pro)
- `error-log.js` Function für Frontend-Error-Reports → schreibt in audit_trail (?) — Voll-Cleanup tot

**Lücke:** keine Real-Time-Alerts, keine Trace-IDs für Support, keine Aggregation.

---

## Empfohlene Lösung: Sentry

### Warum Sentry?
- **Free-Tier:** 5.000 Errors/Monat — reicht für 10-Pilot-SVs locker
- **Industry-Standard** für Web-Apps + Node.js
- **DSGVO-Datenverarbeitung in EU-Region** verfügbar (Sentry GmbH)
- **Filter-Features** für PII-Sanitization

### Alternative: Logtail / BetterStack (auch DE/EU)

---

## Setup-Plan (für Folge-Sprint)

### 1. Account-Anlage
- sentry.io → New Project
- Region: **EU** (Frankfurt)
- Project-Type: Browser (Frontend) + Node.js (Functions)
- DSN kopieren (separate für Frontend + Backend)

### 2. Backend-Integration (Netlify Functions)

```js
// netlify/functions/lib/sentry.js
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN_NODE && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_NODE,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // PII-Sanitization
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      if (event.user) {
        // User-Email pseudonymisieren
        if (event.user.email) {
          event.user.email = '[REDACTED]';
        }
      }
      return event;
    }
  });
}

module.exports = Sentry;
```

**Usage in Functions:**
```js
const Sentry = require('./lib/sentry');

exports.handler = async (event, context) => {
  try {
    // ...
  } catch (e) {
    Sentry.captureException(e, {
      tags: { function: 'stripe-webhook' },
      extra: { eventType: stripeEvent?.type }
    });
    return { statusCode: 500, body: 'Server error' };
  }
};
```

### 3. Frontend-Integration

```html
<script src="https://browser.sentry-cdn.com/<version>/bundle.tracing.min.js"></script>
<script>
  Sentry.init({
    dsn: 'https://...@sentry.io/...',
    environment: 'production',
    tracesSampleRate: 0.1,
    integrations: [new Sentry.BrowserTracing()],
    beforeSend(event) {
      // PII-Sanitization für Frontend
      if (event.user?.email) event.user.email = '[REDACTED]';
      // localStorage-Inhalte aus Breadcrumbs filtern
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(b => {
          if (b.data?.key?.startsWith('prova_diktat_')) return false;
          if (b.data?.key?.startsWith('prova_stellungnahme_')) return false;
          if (b.data?.key === 'prova_auth_token') return false;
          return true;
        });
      }
      return event;
    }
  });
</script>
```

### 4. ENV-Vars (Marcel-Aktion)
```
SENTRY_DSN_NODE=https://...@sentry.io/<project-id-backend>
SENTRY_DSN_BROWSER=https://...@sentry.io/<project-id-frontend>
```

### 5. Test-Error
```bash
# Backend-Test
curl -X POST https://prova-systems.de/.netlify/functions/health \
  -H "X-Test-Sentry: 1"
# Erwartet: Error-Event in Sentry-Dashboard
```

---

## DSGVO-Konformität Sentry-Setup

| Aspekt | Maßnahme |
|---|---|
| EU-Region | Sentry GmbH (DE) wählen — Daten bleiben in EU |
| AVV | Sentry Data Processing Addendum signieren |
| PII-Filter | `beforeSend()` filtert User-Email + Auth-Token + Akten-Inhalte |
| Retention | Sentry-Default 90 Tage — DSGVO-konform |
| Subprozessor-Liste | Sentry GmbH in `docs/public/AVV-VORLAGE.md` ergänzen nach Setup |

---

## Marcel-Pflicht-Aktionen für Sentry-Aktivierung

- [ ] Sentry-Account anlegen (EU-Region)
- [ ] 2 Projekte: Browser + Node
- [ ] DSN in Netlify-ENV setzen
- [ ] DPA mit Sentry abschließen
- [ ] AVV-Vorlage + Datenschutzerklärung um Sentry ergänzen
- [ ] Test-Error verifizieren

---

## Findings → BACKLOG

| ID | Severity | Titel |
|---|---|---|
| SE-01 | HIGH | Real-Time-Alerts fehlen (Audit 1 V15.3.1) |
| SE-02 | HIGH | Trace-IDs für Support fehlen (Audit 1 V16.1.3) |
| SE-03 | MED | Sentry-Setup vor Pilot-Launch | NEEDS-MARCEL |

---

*Audit 21 abgeschlossen 03.05.2026 (Anleitung) · Marcel-Setup pending*
