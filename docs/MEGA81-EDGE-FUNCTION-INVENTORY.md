# MEGA⁸¹ Edge-Function-Inventar — 13 Kategorien

**Stand:** 2026-05-15 · **Quelle:** lokales `supabase/functions/` + remote `list_edge_functions` MCP.
**Lokale Count:** 143 Function-Dirs (inkl. `_shared`).
**Zweck:** Kategorisierung + Sicher-tot-Liste. KEINE Löschungen in MEGA81 — nur Empfehlungen für MEGA82-Reaping-Sprint.

Frontend-Referenzen via `Grep` über Top-Level-Files. Wenn 0 Caller in Production-Code → Lösch-Kandidat.

---

## 1 · Cron & Scheduled

| Function | Status | Bemerkung |
|---|---|---|
| `health-check-cron` | 🟢 LIVE | cron.job 1 (`*/5 * * * *`) via http_post |
| `status-check` | 🟢 LIVE | cron.job 2 (`*/15 * * * *`) via http_post |
| `uptime-webhook` | 🟡 ? | Externer Trigger, kein lokaler Cron |
| `push-notify` | 🟡 ? | Externer Trigger (Webhook?) |
| `onboarding-mail-cron` | 🟡 ? | Cron-Job in pg_cron fehlt — vermutlich tot |
| `email-pilot-feedback-cron` | 🟡 ? | Dito |
| `email-trial-ending-cron` | 🟡 ? | Dito |
| `fristen-reminder-cron` | ⚫ **TOT** | Ersetzt durch SQL `process_fristen_erinnerungen()` Migrations 53+54 |
| `mahnwesen-cron` | ⚫ **TOT** | Ersetzt durch SQL `prepare_mahnwesen_notifications()` Migration 56 |
| `termin-reminder` | 🟡 ? | Resend-Email-Sender, externer Push-Trigger; kein Cron mehr. Wahrscheinlich Make.com-Altlast |

---

## 2 · KI-Pipeline

| Function | Status | Bemerkung |
|---|---|---|
| `ki-proxy` | 🟢 LIVE | Zentrale KI-Schaltstelle (MEGA79 erweitert mit persoenlicher_ki_kontext) |
| `ki-diktat-strukturierung` | 🟢 LIVE | Diktat-Strukturierung |
| `ki-konsistenz-check` | 🟢 LIVE | §4↔§6 Konsistenz-Check |
| `ki-history` | 🟢 LIVE | KI-Antwort-Historie |
| `ki-feedback` | 🟢 LIVE | User-Feedback auf KI-Vorschläge |
| `foto-captioning` | 🟢 LIVE | Foto-Beschriftung-Vorschlag |
| `whisper-diktat` | 🟢 LIVE | Whisper-API. MEGA81 D.2 patched: Sprache aus user_workflow_settings.diktat_sprache |
| `set-ki-wirkung` | 🟢 LIVE | KI-Wirkung-Tracking (uebernommen/verworfen) |

---

## 3 · Admin-Cockpit (25 Functions)

Alle `admin-*` Functions nutzen `_shared/admin-auth.ts` (Email-Whitelist + 2FA AAL2).

| Function | Status | Bemerkung |
|---|---|---|
| `admin-audit-trail` | 🟢 LIVE | Audit-Stream |
| `admin-billing-sync` | 🟢 LIVE | Stripe-Status |
| `admin-cache-clear` | 🟢 LIVE | DEV-Tool |
| `admin-churn` | 🟢 LIVE | |
| `admin-conversion-funnel` | 🟢 LIVE | |
| `admin-env-status` | 🟢 LIVE | |
| `admin-feature-heatmap` | 🟢 LIVE | |
| `admin-force-logout` | 🟢 LIVE | Support-Tool |
| `admin-funnel` | 🟢 LIVE | |
| `admin-impersonate` | 🟢 LIVE | Support-Login-as |
| `admin-ki-aggregations` | 🟢 LIVE | MEGA81 D.1 patched: is_founder-Check zusätzlich zu Email-Whitelist |
| `admin-ki-costs` | 🟢 LIVE | |
| `admin-live-sessions` | 🟢 LIVE | |
| `admin-mrr-live` | 🟢 LIVE | |
| `admin-pdf-queue` | 🟢 LIVE | |
| `admin-pdfmonkey-inventory` | 🟢 LIVE | |
| `admin-pilot-list` | 🟢 LIVE | |
| `admin-pseudonymisierung-audit` | 🟢 LIVE | |
| `admin-push-alerts` | 🟢 LIVE | |
| `admin-send-email` | 🟢 LIVE | |
| `admin-sentry-errors` | 🟢 LIVE | |
| `admin-stripe-kpis` | 🟢 LIVE | |
| `admin-support-inbox` | 🟢 LIVE | |
| `admin-support-update` | 🟢 LIVE | |
| `admin-system-health` | 🟢 LIVE | |
| `admin-system-uptime` | 🟢 LIVE | |
| `admin-time-tracking` | 🟢 LIVE | |

---

## 4 · Auftrags-CRUD

| Function | Status | Bemerkung |
|---|---|---|
| `list-auftraege` | 🟢 LIVE | |
| `auftraege-update` | 🟢 LIVE | |
| `auftrag-eigenleistung-quote` | 🟢 LIVE | 500-Zeichen-Gate |
| `auftrag-mode-override` | 🟢 LIVE | A/B/C/D-Mode-Override |
| `akte-export` | 🟢 LIVE | |
| `create-demo-akte` | 🟢 LIVE | Onboarding-Demo |

---

## 5 · Eintrags-CRUD

| Function | Status | Bemerkung |
|---|---|---|
| `eintraege-create` | 🟢 LIVE | |
| `eintraege-update` | 🟢 LIVE | |
| `eintraege-delete` | 🟢 LIVE | |

---

## 6 · Fristen + Termine + Kalender

| Function | Status | Bemerkung |
|---|---|---|
| `fristen-list` | 🟢 LIVE | |
| `fristen-create` | 🟢 LIVE | |
| `fristen-update` | 🟢 LIVE | |
| `fristen-mark-erfuellt` | 🟢 LIVE | |
| `dashboard-fristen-upcoming` | 🟡 ? | 0 Frontend-Caller in Top-Level-Files. **MEGA82-Kandidat zum Löschen**, evtl. ersetzt durch neues Heute-Widget (MEGA81 B.4) |
| `termine-ical-token` | 🟢 LIVE | iCal-Token-Issue |
| `ical-feed` | 🟢 LIVE | iCal-Subscription-Output |
| `ical-subscribe-url` | 🟢 LIVE | URL-Generator für Outlook/Apple/Google |
| `termin-reminder` | 🟡 ? | Siehe Kategorie 1 |

---

## 7 · Dokumente + PDF + Briefe

| Function | Status | Bemerkung |
|---|---|---|
| `document-load` | 🟢 LIVE | |
| `document-save` | 🟢 LIVE | |
| `document-templates-list` | 🟢 LIVE | |
| `document-template-create` | 🟢 LIVE | |
| `document-template-use` | 🟢 LIVE | |
| `dokumente-list` | 🟢 LIVE | |
| `list-dokument-templates` | 🟡 ? | Duplikat zu `document-templates-list`? MEGA82-Audit |
| `generate-pdf-mode-c` | 🟢 LIVE | Mode-C-PDF |
| `foto-anlage-pdf` | 🟢 LIVE | |
| `pdf-generate` | 🟢 LIVE | |
| `pdf-proxy` | 🟢 LIVE | PDFMonkey-Proxy |
| `brief-generate` | 🟢 LIVE | |
| `bescheinigung-generate` | 🟢 LIVE | |
| `generate-bescheinigungs-aktenzeichen` | 🟢 LIVE | |
| `rechnung-zugferd` | 🟢 LIVE | ZUGFeRD-Export |
| `editor-docx-export` | 🟢 LIVE | |

---

## 8 · Media + Storage

| Function | Status | Bemerkung |
|---|---|---|
| `fotos-list` | 🟢 LIVE | |
| `foto-upload` | 🟢 LIVE | |
| `skizze-save` | 🟡 ? | Singular vs Plural — Duplikat zu `skizzen-save`? MEGA82 |
| `skizzen-save` | 🟢 LIVE | |
| `skizzen-list` | 🟢 LIVE | |
| `skizzen-delete` | 🟢 LIVE | |
| `anhaenge-list` | 🟢 LIVE | |
| `anhang-process` | 🟢 LIVE | |
| `editor-image-upload` | 🟢 LIVE | |

---

## 9 · Auth + 2FA + DSGVO + Legal

| Function | Status | Bemerkung |
|---|---|---|
| `auth-2fa-setup` | 🟢 LIVE | |
| `auth-2fa-verify` | 🟢 LIVE | |
| `auth-2fa-disable` | 🟢 LIVE | |
| `auth-token-issue` | 🟢 LIVE | |
| `dsgvo-loeschen` | 🟢 LIVE | |
| `dsgvo-loeschen-antrag` | 🟢 LIVE | |
| `dsgvo-portabilitaet` | 🟢 LIVE | |
| `log-legal-acceptance` | 🟢 LIVE | |
| `re-consent-pending` | 🟢 LIVE | |
| `re-consent-submit` | 🟢 LIVE | |
| `cancellation-survey` | 🟢 LIVE | |
| `team-interest` | 🟢 LIVE | Lead-Capture für Team-Tier |
| `provision-sv` | 🟢 LIVE | |

---

## 10 · Stripe + Referral + Pilot

| Function | Status | Bemerkung |
|---|---|---|
| `stripe-checkout` | 🟢 LIVE | (geschützt, NICHT antasten) |
| `stripe-portal` | 🟢 LIVE | (geschützt) |
| `stripe-webhook` | 🟢 LIVE | (geschützt) |
| `stripe-webhook-referral` | 🟢 LIVE | (geschützt) |
| `redeem-referral-code` | 🟢 LIVE | |
| `create-referral` | 🟢 LIVE | |
| `check-referral-rewards` | 🟢 LIVE | |
| `send-referral-reminders` | 🟢 LIVE | |
| `pilot-seats` | 🟢 LIVE | Founding-Pilot |

---

## 11 · Email + Notify

| Function | Status | Bemerkung |
|---|---|---|
| `send-email` | 🟢 LIVE | |
| `send-welcome-email` | 🟢 LIVE | |
| `email-welcome` | 🟡 ? | Duplikat? MEGA82-Audit |
| `support-ticket-create` | 🟢 LIVE | |

---

## 12 · Suche + Audit + Kontext

| Function | Status | Bemerkung |
|---|---|---|
| `global-search` | ⚫ **TOT** | Ersetzt durch SQL-RPC `global_search` (Migration 52). Frontend `lib/prova-global-search.js` ruft seit MEGA78 die RPC, nicht die Edge-Function. **MEGA82 löschen** |
| `faq-search` | 🟢 LIVE | |
| `audit-log` | 🟢 LIVE | |
| `audit-write` | 🟢 LIVE | |
| `audit-narrative-v1` | 🟢 LIVE | Dashboard Aktivitaeten-Widget |
| `audit-source-log` | 🟢 LIVE | |
| `audit-trail-write` | 🟢 LIVE | |
| `mein-aktivitaetsprotokoll` | 🟢 LIVE | |
| `kontakt-360` | 🟢 LIVE | 360°-Sicht |
| `kontakt-aktivitaeten` | 🟢 LIVE | |
| `fragments-to-befund-v1` | 🟢 LIVE | KI-Befund-Pipeline |
| `asset-to-fragments-v1` | 🟢 LIVE | Diktat → Fragmente |
| `similarity-v1` | 🟢 LIVE | Embedding-Search |
| `user-favoriten-list` | 🟢 LIVE | |
| `user-favoriten-toggle` | 🟢 LIVE | |
| `workflow-settings` | 🟢 LIVE | |

---

## 13 · Utility + Sonstiges + Tot

| Function | Status | Bemerkung |
|---|---|---|
| `health` | 🟢 LIVE | Public Health-Endpoint |
| `public-status` | 🟢 LIVE | Public Status-Page |
| `parse-docx` | 🟢 LIVE | Vorlagen-Import |
| `parse-beweisbeschluss` | 🟢 LIVE | KI-Beweisbeschluss-Parse |
| `import-validate` | 🟢 LIVE | Kontakte-Import |
| `import-execute` | 🟢 LIVE | |
| `import-rollback` | 🟢 LIVE | |
| `lifecycle-trigger` | 🟢 LIVE | Make.com-Hook |
| `sentry-test` | 🟡 ? | Test-Endpoint — MEGA82 prüfen ob noch genutzt |
| `onboarding-create-demo` | 🟢 LIVE | |
| `onboarding-delete-demo` | 🟢 LIVE | |
| `migrate-normen-airtable` | ⚫ **TOT** | Migration abgeschlossen MEGA76. **MEGA82 löschen** |
| `migrate-textbausteine-airtable` | ⚫ **TOT** | Dito. **MEGA82 löschen** |

---

## Sicher-tot-Liste (für MEGA82-Reaping)

Diese 5 Functions können in MEGA82 mit `supabase functions delete` aus der Cloud entfernt + lokale Verzeichnisse gelöscht werden:

1. **`global-search`** — RPC `public.global_search` ersetzt seit MEGA78
2. **`fristen-reminder-cron`** — SQL `process_fristen_erinnerungen()` ersetzt seit MEGA79
3. **`mahnwesen-cron`** — SQL `prepare_mahnwesen_notifications()` ersetzt seit MEGA80
4. **`migrate-normen-airtable`** — Migration abgeschlossen seit MEGA76
5. **`migrate-textbausteine-airtable`** — Migration abgeschlossen seit MEGA76

**Vor jedem Delete**: Frontend-Grep auf den Function-Namen + 24h Tail-Wait der Logs.

---

## Audit-Kandidaten (für MEGA82)

Diese 10 Functions brauchen eine genauere Caller-Analyse vor Lösch-Entscheidung:

| Function | Verdacht |
|---|---|
| `dashboard-fristen-upcoming` | Ersetzt durch Heute-Widget? Frontend-Grep zeigt 0 Caller in Production |
| `termin-reminder` | Make.com-Altlast — Cron jetzt SQL-basiert. Email-Push-Path noch nötig? |
| `onboarding-mail-cron` | Cron-Job in pg_cron fehlt — vermutlich abgeklemmt |
| `email-pilot-feedback-cron` | Dito |
| `email-trial-ending-cron` | Dito |
| `list-dokument-templates` | Duplikat zu `document-templates-list`? |
| `skizze-save` (Singular) | Duplikat zu `skizzen-save` (Plural)? |
| `email-welcome` | Duplikat zu `send-welcome-email`? |
| `push-notify` | Externer Trigger — von wo? |
| `uptime-webhook` | Externer Trigger — von wo? |
| `sentry-test` | Test-Endpoint, vermutlich Dead-Weight |

---

## Geschützt — NIE antasten

Aus `CLAUDE.md` Niemals-Wrappen-Liste:

- `stripe-webhook`, `stripe-webhook-referral`, `stripe-checkout`, `stripe-portal` (Stripe-Dashboard URLs registriert)
- `ki-proxy`, `pdf-proxy`
- Alle `*-cron`-Functions, die noch in `cron.job` aktiv sind (jobid 1, 2)
- `lifecycle-trigger` (Make.com bis Cutover aktiv)
