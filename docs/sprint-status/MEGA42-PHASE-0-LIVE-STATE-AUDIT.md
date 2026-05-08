# MEGA⁴² Phase 0 — Live-State-Audit

**Datum:** 2026-05-08
**Branch:** `mega42-live-verify-pilot-ready`
**Hauptquelle:** Live-cURL-Probes auf prova-systems.de + Supabase MCP

---

## 🚨 KRITISCHE FINDINGS — SOFORT-HANDLUNG

### ❌ Finding 1: Production läuft auf `prova-v303` (MEGA²⁸)

**Live-sw.js:** `prova-v303` mit Comment "MEGA²⁸ V3.2-W8-I7"
**Repo-State:** Tags v1300 (M⁴⁰), v1400 (M⁴¹) existieren ABER nicht deployed

**Konsequenz:** ALLE M³⁰-M⁴¹-Sprints sind im Repo, ABER NICHT auf prova-systems.de live.

→ Marcel-Pflicht: mega41 (oder mega42) zu main mergen + Netlify-Deploy triggern.

### ❌ Finding 2: 2 Tabellen ohne RLS = Sicherheitslücke

```
public.system_health_history  RLS=DISABLED
public.push_alert_log         RLS=DISABLED
```

**Risk:** Anyone with anon-key kann alle Rows lesen/modifizieren.

**Fix-SQL:**
```sql
ALTER TABLE public.system_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_alert_log ENABLE ROW LEVEL SECURITY;
-- Plus Policies (sonst blockt RLS alles):
CREATE POLICY health_history_admin_select ON public.system_health_history
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY push_alert_admin_select ON public.push_alert_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');
```

→ M⁴² Phase 8 (Auth-Audit) muss das fixen.

---

## 📊 Live-State-Inventar (HTTP-Status pro Asset)

### M³⁰-M⁴¹ Pages — alle nicht deployed (404)

| Page | Live-Status | Phase |
|------|-------------|-------|
| `/audit-trail.html` | 404 | M⁴¹ P2 |
| `/support.html` | 404 | M⁴¹ P5 |
| `/kontakt-detail.html` | 404 | M⁴¹ P7 |
| `/wiederherstellbare-entwuerfe.html` | 404 | M⁴¹ P10 |
| `/dokument-neu.html` | 404 | M⁴⁰ P3 |
| `/editor-demo.html` | 404 | M⁴⁰ P1.2 |
| `/import-assistent.html` | 200 ✅ | Pre-M³⁰ (Legacy) |

### Pre-M³⁰ Pages — LIVE

| Page | Live-Status |
|------|-------------|
| `/` | 301 (redirect) |
| `/hilfe.html` | 200 |
| `/einstellungen.html` | 200 |
| `/admin-cockpit.html` | 200 |
| `/briefvorlagen.html` | 200 |

### Lambdas — Mix aus deployed (M²⁸) + nicht-deployed (M³⁰+)

| Lambda | Live | Sprint |
|--------|------|--------|
| `ki-proxy` | 204 ✅ | M²⁸ |
| `admin-audit-trail` | 204 ✅ | M²⁸ |
| `admin-support-inbox` | 204 ✅ | M²⁸ |
| `admin-impersonate` | 204 ✅ | M²⁸ |
| `airtable` | 404 ❌ | abgeschaltet |
| `global-search` | 404 ❌ | M³⁹/M⁴⁰ nicht deployed |
| `import-validate` | 404 ❌ | M⁴¹ P1 |
| `audit-source-log` | 404 ❌ | M⁴¹ P2 |
| `kontakt-360` | 404 ❌ | M⁴¹ P7 |
| `faq-search` | 404 ❌ | M⁴¹ P5 |
| `health-check-cron` | 404 ❌ | M⁴¹ P3 |
| `eintraege-pdf-aggregator` | 404 ❌ | M⁴¹ P4 |
| `document-save` | 404 ❌ | M⁴⁰ P1.1 |

---

## 🗄️ Migration-State (Supabase = ✅ vorhanden)

**WICHTIG:** Schema-Migrationen 33-39 SIND APPLIED, nur Frontend/Lambda-Deploy fehlt.

| Migration | Status | Rows | Sprint |
|-----------|--------|------|--------|
| `33_documents_editor` | ✅ | 0 / 0 / 0 | M⁴⁰ P1 |
| `34_document_images` | ✅ | 0 | M⁴⁰ P2 |
| `35_document_templates` | ✅ | 5 (PROVA-Defaults) | M⁴⁰ P7 |
| `36_import_logs` | ✅ | 0 | M⁴¹ P1 |
| `37_audit_trail_ki_source` | ✅ | – (ENUM + Spalten + View) | M⁴¹ P2 |
| `38_system_health_history` | ✅ | 0 + 0 | M⁴¹ P3 |
| `39_support_tickets_faq` | ✅ | 34 (FAQ-Seeds) | M⁴¹ P5 |

**FAQ-Verify:** `faq_entries` hat 34 Rows ✅ (M⁴¹ P5 Seed APPLIED).

---

## ENV-Status (kann nicht direkt geprüft werden — Marcel-Pflicht)

| ENV-Var | Erwartet | Status |
|---------|----------|--------|
| `SUPABASE_URL` | ✅ | unbekannt — wahrscheinlich gesetzt (Live-DB funktioniert) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | unbekannt |
| `OPENAI_API_KEY` | ✅ | unbekannt — `ki-proxy` läuft |
| `PDFMONKEY_API_KEY` | M⁴¹ P9 | unbekannt — Marcel-Pflicht |
| `HEALTH_CHECK_CRON_SECRET` | M⁴¹ P3 | unbekannt — wahrscheinlich nicht gesetzt |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | bestehend | unbekannt |

→ M⁴² Phase 5 dokumentiert die nötigen ENV-Vars für Marcel.

---

## 📋 M⁴²-Lücken-Liste pro Phase

### Phase 1 — Komplett-Test-Run
- Existing 561 Tests im Repo, nicht in CI
- Kein Cross-Platform Run-Script
- **Action:** scripts/run-all-tests.js Cross-Platform implementieren

### Phase 2 — Stepper-Migration
- 4 Workflows (schadensfaelle/wertgutachten/beratung/baubegleitung) NICHT auf wizard-stepper migriert
- Foundation in M⁴¹ vorhanden, Migration ausstehend
- **Action:** Mass-Migrate + Konsistenz-Check

### Phase 3 — Playwright E2E
- Existing tests/e2e-compound/* sind Source-Verification (Node-test)
- Kein echter Browser-Run
- Playwright nicht installiert
- **Action:** Playwright-Setup + 5 .spec.js gegen prova-systems.de (sobald deployed)

### Phase 4 — Performance-Suite
- 0 Performance-Messungen für M⁴¹-Acceptance-Items
- Synthetic-Data fehlt
- **Action:** scripts/perf-suite.js + Synthetic-Data-Generators

### Phase 5 — Push-Alerts
- pg_cron nicht eingerichtet (ENV + Schedule)
- VAPID-Subscription für Marcel nicht registriert
- push-setup.html + health-test-down.html fehlen
- **Action:** ENV-Doku + Setup-Pages + cron-SQL

### Phase 6 — PDFMonkey Live-Audit
- admin-pdfmonkey-inventory existiert, nicht live ausgeführt
- Drift-Liste unbekannt
- 22+ Templates Render-Status unbekannt
- **Action:** Live-Run nach Deploy + Drift-Behebung

### Phase 7 — Mobile Real-Device
- Apple Pencil 1+2 / Samsung S Pen ungetestet
- iPhone Safari + Android Chrome ungetestet
- **Action:** Test-Plan-Doku + DevTools-Subset von CC + 🔴 Marcel-Pflicht

### Phase 8 — Auth-Audit
- 14 M⁴¹-Lambdas + 25 admin-Lambdas + Existing-Lambdas — keine systematische Auth-Matrix
- 2 Tabellen ohne RLS (kritisch!)
- **Action:** Lambda-Auth-Matrix + RLS-Fixes + Rate-Limit-Audit

### Phase 9 — DSGVO-Roundtrip
- Email-Versand-Setup unklar
- Export- und Löschungs-Roundtrip nicht durchgespielt
- **Action:** Email-Templates + Roundtrip-Tests + Email-Setup-Doku

### Phase 10 — Pilot-Onboarding
- Kein Welcome-Mail-Set
- Kein In-App-Tutorial
- Keine Demo-Daten-Seeds
- **Action:** Komplettes Pilot-Material schaffen

### Phase 11 — Production-Runbook
- Existiert nicht
- **Action:** docs/runbook/ mit 8 Kapiteln

### Phase 12 — Compound-Live-Tests
- Marcel-Pflicht — Bildschirm-Recording der 5 Szenarien
- **Action:** Test-Protokoll-Template + Bug-Fixes

---

## 🎯 Top-3 Pre-Pilot-Blocker (vor M⁴²-FINAL)

1. **🚨 DEPLOYMENT:** mega41 (oder mega42-final) muss zu main + Production deployed werden. Ohne das ist 99% des M⁴⁰+M⁴¹-Codes irrelevant.
2. **🚨 RLS-FIX:** `system_health_history` + `push_alert_log` brauchen RLS sofort.
3. **🚨 ENV-Setup:** PDFMONKEY_API_KEY + HEALTH_CHECK_CRON_SECRET + VAPID-Subscription für Push.

---

## 🔴 Marcel-Pflicht-Items (post-Phase 0)

1. Mega41 oder Mega42-FINAL zu main mergen + Netlify-Deploy
2. RLS-Fix-SQL in Supabase ausführen (siehe Finding 2)
3. ENV-Var-Liste auf Netlify ergänzen (siehe Phase 5)

---

## 📈 M⁴² Phasen-Reihenfolge (Self-Scoping nach Live-State)

Original-Reihenfolge bleibt, aber **Phase 8 (Auth-Audit) priorisiert Finding 2 (RLS-Fix)**.

Andere Reihenfolge bleibt unverändert.

---

## 🛠️ Methodik-Hinweise

- **HTTP-Probes** via cURL mit `--max-time 8`
- **Migration-Verify** via Supabase MCP `list_tables`
- **ENV** kann CC nicht direkt prüfen → Marcel-Pflicht
- **Playwright-E2E** wird Phase 3 brauchen `npm install playwright`

---

*MEGA⁴² Phase 0 Live-State-Audit — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
