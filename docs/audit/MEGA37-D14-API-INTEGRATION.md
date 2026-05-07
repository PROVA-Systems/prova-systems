# MEGA³⁷ D14 — API + Integration-Reliability

**Datum:** 2026-05-08

## REST-Konventionen

| Pattern | Coverage |
|---------|----------|
| Status-Codes (200/201/4xx/5xx) | 🟢 jsonResponse-Helper konsistent |
| HTTP-Verbs (GET/POST/PATCH) | 🟢 OPTIONS für CORS |
| 405 für Method-not-allowed | 🟢 |
| 429 für Rate-Limit | 🟢 lib/rate-limit-user.js |
| 503 für Backend-Outage | 🟢 |

## Idempotenz

| Endpoint | Idempotent? |
|----------|-------------|
| Stripe-Webhook | 🟢 stripe_events UNIQUE |
| BES-Aktenzeichen-Generation | 🟢 Optimistic-Lock |
| auftraege-update | 🟡 PATCH mit Whitelist — dabei naturally idempotent (gleicher Patch = gleiches Ergebnis) |
| Make.com-Webhooks (post-C5) | 🟢 service_endpoints konsolidiert |

## API-Versioning

- Nicht versioniert — Single-Version per Branch.
- 🟡 MEDIUM für Breaking Changes (kein /v1/-Prefix).
- Empfehlung: Bei späteren Breaking Changes via Lambda-Suffix `-v2.js`.

## Severity

| Befund | Severity |
|--------|----------|
| Konsistente Error-Response (jsonResponse) | 🟢 LOW |
| CORS-Helper überall | 🟢 LOW |
| Stripe-Idempotenz | 🟢 LOW |
| Make-Webhook-Reliability post-C5 | 🟢 LOW (DB-First mit Legacy-Fallback) |
| API-Versioning fehlt | 🟡 MEDIUM |
| OpenAPI-Spec | 🟡 MEDIUM (für externe Integrationen) |

## Top-3-Empfehlungen
1. **OpenAPI-Spec** für extern dokumentierte Lambdas (Stripe-Webhook, ical-feed) als YAML.
2. **HTTP-Status-Code-Audit** — alle 123 Lambdas grep für Konsistenz.
3. **API-Versioning-Pattern** dokumentieren für Future-Breaking-Changes.

## Quellen
- REST API Design Best Practices — restfulapi.net
- Stripe Idempotent Requests — stripe.com/docs/api/idempotent_requests
