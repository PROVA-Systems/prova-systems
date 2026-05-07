# MEGA³⁷ D12 — Business-Logic + Race-Conditions + Audit-Trail

**Datum:** 2026-05-08

## Race-Condition-Audit

| Pattern | Status |
|---------|--------|
| Stripe-Webhook-Idempotenz | 🟢 stripe_events UNIQUE(stripe_event_id) |
| Auftrag-State-Machine | 🟡 Phasen-Skip-Logic in lib/wizard-live-save.js — keine DB-CHECK-Constraints |
| BES-/RG-Sequenz-Generation | 🟢 Optimistic-Locking (M³⁶ W4.6) |
| Soft-Delete (deleted_at) | 🟢 konsistent in auftraege, kontakte |
| Push-Subscription-Updates | 🟢 service_endpoints schreibt INSERT … ON CONFLICT |

## Audit-Trail-Vollständigkeit

| Operation | Logged in audit_trail? |
|-----------|------------------------|
| Auftrag erstellt/gelöscht | 🟢 |
| User-Login + 2FA-Setup | 🟢 |
| KI-Calls (mit Tokens + Kosten) | 🟢 (ki_protokoll-Tabelle) |
| State-Override (Marcel-Direktive) | 🟢 (admin-impersonate, admin-force-logout) |
| Vault-Secret-Read | ⚠️ Nicht geloggt (security: gewollt? Empfehlung: ja, ohne Wert) |

## 30-Tage-Retention

- Logs: nach 30 Tagen automatisch gelöscht (Annahme — nicht via pg_cron verifiziert).
- 🟡 MEDIUM: Retention-Policy als pg_cron-Job formalisieren.

## Severity

| Befund | Severity |
|--------|----------|
| Stripe-Idempotenz korrekt | 🟢 LOW |
| BES-Sequenz Optimistic-Lock | 🟢 LOW |
| Auftrag-Phase ohne DB-CHECK | 🟡 MEDIUM |
| Retention-Policy ohne pg_cron | 🟡 MEDIUM |
| Vault-Read-Logging | 🟡 MEDIUM |

## Top-3-Empfehlungen
1. **CHECK-Constraint** in `auftraege.phase`: nur Forwärts oder explizite Skip mit Begründung.
2. **pg_cron-Job** für Retention (z. B. `DELETE FROM audit_trail WHERE created_at < NOW() - INTERVAL '30 days'`).
3. **Audit-Wrapper** für Vault-Reads (Function-Aufruf-Counter ohne Wert-Disclosure).

## Quellen
- PostgreSQL UNIQUE Constraints
- pg_cron Docs (Supabase)
- OWASP A09 Logging
