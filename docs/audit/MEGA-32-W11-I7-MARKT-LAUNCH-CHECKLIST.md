# MEGA³² W11-I7 — Markt-Launch-Checkliste

**Datum:** 2026-05-11
**Status:** Markt-Launch-Ready (mit Marcel-Manual-Steps post-W11)

---

## Code-Stand

- ✅ 100% Schema-konform (W12b-Drift-Closure)
- ✅ 71 W12b-Tests + 50 W11-Tests = **121 neue Tests grün**
- ✅ 4 Migrations apply'd via MCP
- ✅ Backwards-Compat-Pattern in allen Lambdas
- ✅ sw.js v660+ mit korrektem APP_SHELL

## DB-Stand

- ✅ 66 Tables (64 + 2 neu: skizzen, fristen aus W12b)
- ✅ Alle Migrations apply'd (Production Live)
- ✅ Alle Tables mit RLS
- ✅ ENUMs: 43 (eintrag_typ, frist_typ, frist_status, foto_typ, dokument_typ, ...)

## Security-Audit

| Punkt | Status |
|---|---|
| RLS auf allen 66 Tables | ✅ |
| 2FA Frontend + Backend | ✅ (W11-I3 + W12b-I4) |
| TOTP-Encryption AES-256-GCM | ✅ (totp-helper.js) |
| Recovery-Codes 10 Stück (1× sichtbar) | ✅ |
| DSGVO Art. 30 audit_trail | ✅ |
| DSGVO Art. 7 einwilligungen | ✅ |
| DSGVO Art. 17 dsgvo_user_loeschen() | ✅ (Phase 4) |
| DSGVO Art. 12 Cookie-13M-Re-Show | ✅ (W10b-I8) |
| Impersonation-Log | ✅ (impersonation_log Tabelle) |
| PII-Detection in Eintraege | ✅ (eintraege-create.js __detectPiiCandidates) |
| EXIF-Strip auf fotos | ✅ (fotos.exif_stripped) |
| HMAC-Auth für iCal-Subscribe | ✅ (W10b-I8) |

## Performance-Audit (Smoke-Test)

**Critical-Path-Lambdas:**
- `eintraege-list?auftrag_id=...` → Index `idx_eintraege_auftrag` (GIN/BTREE) → < 50ms erwartet
- `fristen-list?status=offen&due_within_days=14` → Index `idx_fristen_workspace_offen` → < 80ms
- `skizzen-list?with_svg=1` → ohne Index, aber RLS + LIMIT 200 → < 100ms
- `dashboard-fristen-upcoming` → top 5 → < 50ms
- `status-check` (POST) → 6 externe Probes parallel → < 3000ms
- `auth-2fa-verify` → AES-256-GCM Decrypt + TOTP-Math → < 30ms

**Bundle-Size:**
- akte.html: ~30KB (verifiziert via wc)
- dashboard.html: ~38KB
- lib/schadensfall-tabs-widget.js: ~9KB
- lib/dashboard-fristen-widget.js: ~3.5KB
- lib/auth-2fa-ui.js: ~7.5KB
→ Gesamt-JS pro Page << 500KB ✅

## Compliance

| Compliance-Punkt | Status |
|---|---|
| § 407a Abs. 2 ZPO Eigenleistung | ✅ (lib/prova-disclaimer.js + S3-Stufe-Pattern) |
| § 411 Abs. 1 ZPO Frist | ✅ (Pipeline schadensgutachten T+56) |
| EU AI Act Art. 50 Disclosure | ✅ (alle KI-Outputs mit ProvaDisclaimer) |
| IHK-SVO Terminologie | ✅ (Ergänzungsgutachten, NICHT § 411) |
| DSGVO Art. 7/30 | ✅ (audit_trail INSERT-only via RLS) |
| TDDDG § 25 Cookie-Banner | ✅ (lib/cookie-consent.js + 13M-Re-Show) |
| BVS-Konformität | ✅ (Wertgutachten-Workflow + ImmoWertV § 9) |
| § 6 Fachurteil SV-Eigenleistung | ✅ (S3-Stufe + Override-Modal-Pattern) |

## Marcel-Manual-Action-Liste (post-W11)

### Pre-Launch
1. **Stripe Live-Mode-Webhook registrieren:**
   - Endpoint: `https://app.prova-systems.de/.netlify/functions/stripe-webhook`
   - Events: `customer.created`, `customer.subscription.*`, `invoice.*`
   - Webhook-Secret in Netlify-ENV `STRIPE_WEBHOOK_SECRET`
2. **Resend Domain verifizieren:**
   - SPF + DKIM + DMARC Records für `prova-systems.de` setzen
   - In Resend-Dashboard verifizieren
3. **DNS für app.prova-systems.de finalisieren** (Netlify CNAME)
4. **AVV-Templates an DSGVO-Anwalt:**
   - `avv.html` Stand 2026-05 reviewen lassen
   - Anpassungen einarbeiten falls nötig
5. **Anthropic DPA verifizieren** (KI-Provider)
6. **5 ENVs setzen in Netlify:**
   - `PROVA_EMAIL_CRON_SECRET` (random 32-char)
   - `PROVA_CALENDLY_URL` (z.B. `https://calendly.com/marcel-prova/15min`)
   - `PROVA_FOUNDING_REMAINING` (z.B. `7` für 7 verbleibende Plätze)
   - `PROVA_ADMIN_EMAILS` (Marcel-Emails comma-separated)
   - `RESEND_API_KEY` (falls noch nicht gesetzt)
7. **Cron-Schedule via netlify.toml:**
   - email-trial-ending-cron: täglich 09:00
   - email-pilot-feedback-cron: täglich 10:00
   - fristen-reminder-cron: täglich 07:00
   - status-check (POST): 5min
   - status-cron-secret in ENV

### Launch-Day
8. **First-Pilot-Outreach starten:**
   - BVS-Mailing via existing Email-System
   - LinkedIn-Posts (Marcel-Founder-Account)
   - Onboarding via persönlichen Calendly-Termin
9. **Status-Page öffentlich machen:**
   - `https://app.prova-systems.de/status.html` Live-Check
10. **Sentry-Region EU verifizieren** (DSGVO Art. 44)

### Post-Launch
11. **Pilot-Feedback-Loop:**
    - Daily-Cron-Mail nach 7 Tagen → 15min Calendly
    - Weekly-Marcel-Review via Admin-Cockpit (Live-Sessions + Funnel + MRR)
12. **First-MRR-Milestone:** 5 Founding-Members (5 × 99€ = 495€/mo)
13. **Pilot-Feedback in W12c einarbeiten** (falls nötig — sonst direkt W13 Multi-User-Team)

## Performance-Smoke-Test (Marcel-Manual)

**5 kritische User-Flows:**

| Flow | Erwartete Latenz | Status |
|---|---|---|
| Login + 2FA-Verify | < 800ms | ⏸ pending Marcel-Test |
| Demo-Fall erstellen | < 1500ms (5 Inserts) | ⏸ |
| Auftrag-Detail-Page (akte.html mit 5 Tabs) | < 600ms initial + Tab-Switch < 200ms | ⏸ |
| JVEG-Stundenzettel-Export | < 800ms | ⏸ |
| Dashboard-Fristen-Widget Load | < 300ms | ⏸ |

**Errors in Sentry:** 0 erwartet beim ersten Pilot-Login.

---

## Welle-12c-Fallback (falls nötig)

**Nur bei kritischen Pilot-Bugs** — sonst Marcel direkt zu W13 Multi-User-Team Sprint.

---

*MEGA³² W11-I7 — Markt-Launch-Checkliste — Co-Authored-By Claude Opus 4.7*
