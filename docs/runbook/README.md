# PROVA Production-Runbook (M⁴² P11)

**Version:** 1.0
**Stand:** 2026-05-08
**Owner:** Marcel Schreiber

---

## 🎯 Was ist hier drin

Operationelle Anleitungen für PROVA Production-Betrieb — von Setup bis Incident-Response.

---

## 📋 Kapitel-Index

| # | Kapitel | Zweck |
|---|---------|-------|
| 1 | [Push-Alerts-Setup](PUSH-ALERTS-SETUP.md) | VAPID-Keys, Cron, Test-Trigger |
| 2 | [PDFMonkey-Audit](PDFMONKEY-AUDIT.md) | Drift-Check, Compliance-Counter |
| 3 | [Mobile-Device-Tests](MOBILE-DEVICE-TESTS.md) | 24-Test-Plan über 5 Devices |
| 4 | [Pilot-Vereinbarung](PILOT-VEREINBARUNG.md) | Founding-Pilot-Conditions |
| 5 | [Deploy-Workflow](#5-deploy-workflow) | Wie deployen wir? |
| 6 | [Monitoring-Dashboards](#6-monitoring-dashboards) | Was beobachten wir? |
| 7 | [Incident-Response](#7-incident-response) | Service-Down? |
| 8 | [Backup + Recovery](#8-backup--recovery) | Datensicherung |

---

## 5. Deploy-Workflow

### Standard-Deploy (Code-Change)

```bash
# 1. Branch-Check
git status

# 2. Test-Run (lokal)
node scripts/run-all-tests.js --parallel 4

# 3. sw.js CACHE_VERSION bump (Pflicht!)
# Edit sw.js → CACHE_VERSION = 'prova-vXXXX-yyy';

# 4. Commit + Push
git add .
git commit -m "feat(SCOPE): Beschreibung"
git push origin <branch>

# 5. PR auf main
gh pr create --base main --title "..."

# 6. Nach Merge: Netlify-Deploy startet automatisch (~3-5 min)
# Verify: curl https://prova-systems.de | grep CACHE_VERSION
```

### Schema-Migration

```bash
# 1. Migration in /supabase-migrations/<NN>_<topic>.sql erstellen
# 2. Lokal testen mit supabase db reset (falls dev-DB)
# 3. Production via Supabase MCP:
#    apply_migration({ project_id: ..., name: '40_xxx', query: '<SQL>' })
# 4. Verify in Supabase Dashboard → Database → Tables/Functions
```

---

## 6. Monitoring-Dashboards

| Dashboard | URL | Was zeigt es? |
|-----------|-----|--------------|
| **PROVA Status-Page** | https://prova-systems.de/status | Live-Health-Status 8 Services |
| **Admin-Cockpit** | https://prova-systems.de/admin-cockpit.html | Tenant-Übersicht, KI-Kosten, Conversions |
| **Supabase-Dashboard** | https://supabase.com/dashboard/project/cngteblrbpwsyypexjrv | DB-Logs, Auth-Sessions, Storage |
| **Netlify-Dashboard** | https://app.netlify.com/sites/prova-systems | Deploys, Function-Logs, Bandwidth |
| **Sentry** | https://sentry.io | Error-Tracking, Performance |
| **Stripe-Dashboard** | https://dashboard.stripe.com | Payments, Subscriptions |
| **PDFMonkey-Dashboard** | https://app.pdfmonkey.io | Template-Render-Logs |
| **OpenAI-Usage** | https://platform.openai.com/usage | Token-Verbrauch + Kosten |

### Daily-Check (5 min, jeden Morgen)

1. Status-Page: alle Services grün?
2. Sentry: gibt es neue Errors >24h?
3. Stripe: gibt es failed-payments?
4. Admin-Cockpit: KI-Kosten innerhalb Limit?

---

## 7. Incident-Response

### Stufe 1: Service-Degradation (1 Service down)

**Beispiel:** OpenAI-API antwortet langsamer als 10s

1. Status-Page checken: ist Sentry betroffen?
2. Push-Alert sollte schon angekommen sein
3. ki-router auf Anthropic-Fallback umschalten via ENV:
   ```
   netlify env:set KI_FALLBACK_ENABLED true
   netlify deploy --prod
   ```
4. User-Communication via Banner (siehe `lib/ki-fallback-badge.js`)

### Stufe 2: Critical-Service-Down (Supabase / Stripe / PDFMonkey)

1. Sofort-Banner aktivieren (Toggle in admin-cockpit)
2. Maintenance-Mode-Page deployen
3. Status-Page Update mit ETA
4. Support-Channel benachrichtigen (Pilot-Slack)
5. Stündliche Updates bis Recovery

### Stufe 3: Daten-Verlust / Security-Breach

1. **SOFORT:** alle ENV-Secrets rotieren (SUPABASE_SERVICE_ROLE_KEY, STRIPE_*)
2. Supabase: betroffene Rows aus letztem Backup wiederherstellen (PITR ≤ 24h)
3. Forensik: audit_trail-Tabelle exportieren + analysieren
4. DSGVO: betroffene User innerhalb 72h informieren
5. Post-Mortem schreiben (`docs/post-mortems/<datum>.md`)

---

## 8. Backup + Recovery

### Auto-Backups (Supabase Pro Plan, ab 2026-04)

- **Täglich:** 7 Tage Retention
- **Wöchentlich:** 4 Wochen Retention
- **Point-in-Time-Recovery (PITR):** 24h Window

### Manuelle Backups (vor großen Migrations)

```bash
# Supabase MCP:
# get_logs für audit_trail backup
# pg_dump via Connection-String:
pg_dump $SUPABASE_DB_URL > backup-$(date +%Y%m%d).sql
```

### Recovery-Test (alle 90 Tage)

1. Supabase Branch erstellen mit PITR auf 24h zurück
2. Neuste Schema-Migration applien
3. Sample-User-Test durchführen
4. Branch löschen
5. Datum in `docs/runbook/RECOVERY-TESTS.md` dokumentieren

---

## 🆘 Notfall-Kontakte

- **Supabase-Support:** support@supabase.com (Pro-Plan SLA)
- **Stripe-Support:** support@stripe.com (Live-Chat)
- **PDFMonkey:** support@pdfmonkey.io
- **Netlify:** support@netlify.com (Pro-Plan)

---

## 🔄 Runbook-Wartung

Dieser Runbook wird mit jedem M⁴X-Sprint aktualisiert. Letzte Updates:
- 2026-05-08: M⁴² P11 — Initial Production-Runbook (8 Kapitel)

Pull-Requests willkommen via `docs/runbook/`.

---

*M⁴² P11 — Co-Authored-By Claude Opus 4.7 — 2026-05-08*
