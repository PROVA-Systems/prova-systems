# MEGA³⁷ D05 — Rate-Limiting + DDoS-Schutz

**Datum:** 2026-05-08
**Methodik:** grep für `RateLimit` Coverage, lib/rate-limit-user.js Audit.

## Coverage

- `RateLimit.check`-Calls: **64 Lambdas** (von ~123 total) → 52% Coverage.
- Auth-Endpoints (admin-auth, auth-2fa-*): 🟢 Rate-Limit aktiv.
- KI-Endpoints (ki-proxy, whisper-diktat): 🟢 Rate-Limit aktiv.
- Webhook-Endpoints (stripe-webhook): 🟢 idempotent + signed.
- File-Upload (foto-upload): 🟢 Rate-Limit + Size-Limit.

## Severity

| Befund | Severity | Detail |
|--------|----------|--------|
| 64/123 Lambdas mit Rate-Limit | 🟡 MEDIUM | Prozentual gut, aber 59 ohne Limit prüfen |
| Auth-Endpoints geschützt | 🟢 LOW | Brute-Force-Risiko mitigiert |
| File-Upload Size + MIME | 🟢 LOW | foto-upload (M³⁵ C1) |
| DDoS auf Netlify-Level | 🟢 LOW | Netlify hat eingebaute DDoS-Schutzmechanismen |

## Top-3-Empfehlungen
1. **100%-Coverage-Audit:** durchgehen welche der 59 Lambdas wirklich Rate-Limit brauchen (READ-Heavy: vielleicht nicht).
2. **Per-Endpoint-Tuning:** Hot-Endpoints (z. B. list-auftraege) brauchen höheres Limit als KI-Calls.
3. **Sliding-Window** statt Fixed-Window in lib/rate-limit-user.js prüfen (weniger Burst-Probleme).

## Quellen
- OWASP API Security — owasp.org/API-Security
- Netlify Rate-Limiting — docs.netlify.com/edge-functions/api/
