# MEGA³⁷ D11 — Infrastructure + Backup + Monitoring + Post-C-Verify

**Datum:** 2026-05-08

## Infrastruktur-Inventar

| Komponente | Status |
|-----------|--------|
| Supabase Frankfurt — Daily-Backup (PITR) | 🟢 Standard im Pro-Plan |
| Netlify Hosting | 🟢 CDN + DDoS-Layer |
| Sentry (browser + lambdas) | 🟢 lib/sentry-init.js + sentry-wrap.js |
| Stripe Webhook-Idempotenz | 🟢 stripe_events UNIQUE-Constraint |
| Edge-Functions (9 ACTIVE) | 🟢 ki-proxy, whisper-diktat, pdf-generate, send-email, brief-generate, stripe-webhook, lifecycle-trigger, audit-write, ical-feed |

## Post-Phase-C-Vault-Verify

| Item | Status |
|------|--------|
| service_endpoints applied + 10 SEED-Hooks | 🟢 (M³⁷ C1) |
| vault_helpers applied | 🟢 (M³⁷ C2) |
| lib/service-endpoints-cache.js | 🟢 (M³⁷ C4) |
| Marcel-Manual-Doku | 🟢 (M³⁷ C7) |
| Echte Webhook-URLs in service_endpoints | ⏸ Marcel-Pflicht |
| Vault-Secrets gesetzt | ⏸ Marcel-Pflicht |
| Edge-Function-Secrets via supabase-CLI | ⏸ Marcel-Pflicht |
| Netlify-ENV-Final-Count 7-10 | ⏸ Marcel-Pflicht |

## DR/Backup

- RTO/RPO nicht formal dokumentiert — 🟠 HIGH (Marcel-Doku-Pflicht für Pilot-Live).
- Supabase PITR: 7 Tage (Pro-Plan).
- Storage-Buckets-Snapshots: nicht automatisiert.

## Severity

| Befund | Severity |
|--------|----------|
| Daily-Backup vorhanden | 🟢 LOW |
| RTO/RPO undokumentiert | 🟠 HIGH |
| Staging-Environment fehlt | 🟡 MEDIUM |
| Secrets-Rotation-Plan | 🟡 MEDIUM |

## Top-3-Empfehlungen
1. **DR-Plan-Doku:** RTO 4h, RPO 1h (Vorschlag), Restore-Drill-Skript dokumentiert.
2. **Staging-Env via Supabase-Branching** (Beta) für Pre-Prod-Tests.
3. **Secrets-Rotation:** halbjährlich, in MARCEL-Selbsthilfe-Doku als Termin.

## Quellen
- Supabase Backup Docs — supabase.com/docs/guides/platform/backups
- AWS Well-Architected (Reliability) — aws.amazon.com/architecture/well-architected
