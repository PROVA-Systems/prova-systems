# K-2 Cleanup-Plan

**Sprint:** K-2 (post-Cutover Cleanup)
**Vorbereitet in:** Mega-Sprint #4 Phase 5 (28.04.2026)
**Status:** Plan-Doku · Ausführung erst NACH erfolgreichem Cutover

---

## TLDR

Nach gründlichem Cutover (≥ 2 Wochen stabil) werden:
- **49 Netlify-Functions** auf ~10 reduziert
- **9 Make.com-Scenarios** deaktiviert + Account gekündigt
- **~12 Frontend-Files** als tot markiert (Hybrid-Auth-Stack)
- **Airtable** auf Read-Only gesetzt (NICHT gelöscht — DSGVO-Backup)

---

## Phase 1: Make.com Scenarios deaktivieren

| Scenario | Make-ID | Ersetzt durch Edge Function |
|---|---|---|
| T3 Termin-Reminder | 5147519 | `lifecycle-trigger` (cron_daily) |
| F1 Finanzen | 5192002 | `stripe-webhook` |
| L3 Lifecycle | 5038113 | `lifecycle-trigger` (trial_start) |
| L8 Lifecycle | 5147509 | `lifecycle-trigger` (trial_ending) |
| L10 Lifecycle | 5158552 | `lifecycle-trigger` (cron) |
| G1 Gutachten Init | 4867125 | `pdf-generate` |
| G3 Gutachten PDF | 4790180 | `pdf-generate` (Polling+Storage) |
| K2 Komm/Email | 4920914 | `send-email` (Resend) |
| A5 Admin | 5147393 | `audit-write` |

**Vorgehensweise:** siehe `scripts/cutover/01-deactivate-make.md`

**Wartezeit nach Deaktivierung:** mind. 2 Wochen, dann Make-Account kündigen (~$11-19/Mo).

---

## Phase 2: Netlify-Functions konsolidieren

### Ersetzt durch Edge Functions (LÖSCHEN nach Cutover)

| Netlify-Function | Edge Function | Status K-1 |
|---|---|---|
| `ki-proxy.js` | `ki-proxy` | ✅ Code-bereit |
| `ki-statistik.js` | `ki-proxy` (Audit-Logging eingebaut) | ✅ |
| `whisper-diktat.js` | `whisper-diktat` | ✅ |
| `pdf-proxy.js` | `pdf-generate` | ✅ |
| `rechnung-pdf.js` | `pdf-generate` (template_key=rechnung-*) | ✅ |
| `mahnung-pdf.js` | `pdf-generate` (template_key=mahnung-*) | ✅ |
| `brief-pdf-senden.js` | `pdf-generate` + `send-email` | ✅ |
| `brief-senden.js` | `send-email` | ✅ |
| `smtp-senden.js` | `send-email` (Resend statt SMTP) | ✅ |
| `smtp-test.js` | (Test-Tool, weg) | — |
| `smtp-credentials.js` | (nicht mehr nötig — Resend) | — |
| `airtable.js` | `dataStore.*` (Frontend) | ✅ |
| `airtable-rate-limiter.js` | (gehört zu airtable.js) | — |
| `audit-log.js` | `audit-write` | ✅ |
| `mein-aktivitaetsprotokoll.js` | `dataStore.auditLog` | ✅ |
| `auth-token-issue.js` | Supabase Auth (signInWithPassword) | ✅ |
| `auth-token-verify.js` | Supabase Auth (verifyJwt) | ✅ |
| `identity-signup.js` | Supabase Auth (signUp) | ✅ |
| `invite-user.js` | (TODO K-2 Edge Function workspace-invite) | ⏳ |
| `provision-sv.js` | (TODO K-2 Edge Function onboarding-create) | ⏳ |
| `prova-subscription.js` | `stripe-webhook` | ✅ |
| `stripe-webhook.js` | Edge `stripe-webhook` (Cutover-Schritt 2) | ✅ |
| `stripe-checkout.js` | (bleibt? Stripe Checkout Session bleibt Frontend-Trigger) | 🤔 |
| `stripe-portal.js` | (bleibt? Customer-Portal-Link) | 🤔 |
| `make-proxy.js` | (mit Make.com weg) | — |
| `termin-reminder.js` | `lifecycle-trigger` (cron) | ✅ |
| `dsgvo-auskunft.js` | (TODO K-2 Edge Function dsgvo-handler) | ⏳ |
| `dsgvo-loeschen.js` | (TODO K-2 Edge Function dsgvo-handler) | ⏳ |
| `setup-tabellen.js` | (Setup-Script, einmalig — weg) | — |
| `admin-cache-clear.js` | (Tool, K-2 prüfen ob nötig) | 🤔 |
| `admin-auth.js` | (Admin-Login, K-2 prüfen) | 🤔 |

### Bleiben (Frontend-Bridges)

| Netlify-Function | Grund |
|---|---|
| `health.js` | Uptime-Probe |
| `error-log.js` | Frontend-Error-Logging (Window.onerror) — kann als kleine Edge Function migrieren, niedrige Prio |
| `push-notify.js` | Web-Push-API (sender) — bleibt bis Migration zu Edge |
| `emails.js` | Falls Frontend-Trigger ohne System-Token nötig — sonst weg |
| `team-interest.js` | Marketing-Page-Endpoint, nicht im SaaS — bleibt |

### Möglicherweise nötig in K-2 (NEU bauen)

| Edge Function (NEU) | Zweck |
|---|---|
| `workspace-invite` | Team-Tier User-Invitation |
| `onboarding-create-workspace` | RLS-bypass für ersten Workspace (siehe Onboarding-Doku) |
| `dsgvo-handler` | Export + Delete via Service-Role |
| `error-log-edge` | Frontend-Errors zu audit_trail (low-prio) |

---

## Phase 3: Frontend-Files (alter Auth-Stack)

### Tote Files (LÖSCHEN nach Cutover)

| File | Ersetzt durch | Status |
|---|---|---|
| `prova-fetch-auth.js` | `lib/auth-guard.js` + Supabase JWT | ⏳ |
| `auth-guard.js` (Root) | `lib/auth-guard.js` | ⏳ |
| `prova-auth-api.js` | Supabase Auth direkt | ⏳ |
| `prova-sv-airtable.js` | `lib/data-store.js` Cache via Realtime | ⏳ |
| `prova-airtable-api.js` | `lib/data-store.js` | ⏳ |
| `prova-api.js` | (Generic API-Wrapper) — prüfen | 🤔 |
| `prova-api-cache.js` | (Frontend-Cache) — prüfen | 🤔 |
| `prova-pseudo-send.js` | server-side in `ki-proxy` Edge Function | ⏳ |
| `prova-pseudo.js` | (Frontend-Pseudonymisierung) — bleibt für UI-Hints? | 🤔 |
| `prova-context.js` | (Logging) — prüfen | 🤔 |
| `prova-status-hydrate.js` | (Status-Hydration) — bleibt erstmal | — |
| `prova-account-gate.js` | (Account-Gate) — prüfen | 🤔 |
| `prova-config.js` (Root) | `lib/prova-config.js` MERGE-Pattern | ⚠️ Konflikt |

⚠️ **prova-config.js**: aktueller Konflikt mit `lib/prova-config.js` (siehe `NACHT-PAUSE-DASHBOARD.md`). Lösung: Hotfix-Erweiterung Variante A — `lib/prova-config.js` macht `Object.assign` statt direktem Assignment.

### Bleibt — UI-Layer (Supabase-agnostisch)

| File | Zweck |
|---|---|
| `nav.js` | ✅ Hybrid-Modus |
| `theme.js` | UI |
| `prova-notifications.js` | Toast-System |
| `prova-sanitize.js` | XSS-Schutz |
| `prova-error-handler.js` | Frontend-Error-UI |
| `prova-layout.config.js` | Layout-Constants |
| `mobile.css`, `prova-design.css`, `page-template.css` | Styles |
| `auftragstyp.js` | UI-Helper |

---

## Phase 4: Airtable Read-Only

**NICHT löschen!** Mind. 4 Wochen Read-Only-Backup, dann archivieren (Soft-Delete in Airtable, ~30 Tage reversibel), dann Permanent-Delete falls keine Beanstandungen.

Vorgehensweise: `scripts/cutover/04-airtable-readonly.md`

```
Tag 0:    Read-Only setzen
Woche 1:  Daily Smoke-Test
Woche 2:  Pilot-User-Anfragen
Woche 4:  Cutover-Final-Confirmation
Monat 3:  Airtable archivieren
Monat 6:  Permanent-Delete (optional)
```

---

## Phase 5: Bash-Cleanup-Script ausführen

Bereits vorbereitet: `scripts/cutover/05-cleanup-frontend.sh`

```bash
# Erst Dry-Run:
bash scripts/cutover/05-cleanup-frontend.sh --dry-run

# Dann live (mit Confirmation):
bash scripts/cutover/05-cleanup-frontend.sh

# Files landen in _obsolete-cutover-YYYYMMDD/ (Soft-Delete für Recovery)
```

---

## Phase 6: ENV-Vars-Cleanup

### In Netlify entfernen (nach 2 Wochen stabil)

```
AIRTABLE_PAT                  # falls aus .env raus — VORSICHT, Re-Migration?
NETLIFY_IDENTITY_REDIRECT_URL
MAKE_WEBHOOK_T3 .. A5         # 9 Webhook-URLs
MAKE_API_KEY
GMAIL_OAUTH_CLIENT_ID
GMAIL_OAUTH_CLIENT_SECRET
SMTP_HOST, SMTP_USER, SMTP_PASS
PDFMONKEY_API_KEY             # falls Edge Function-Path stable
```

→ Liste in `scripts/cutover/05-cleanup-frontend.sh` ergänzen falls Marcel will.

### In Supabase secrets BLEIBEN

```
OPENAI_API_KEY
PDFMONKEY_API_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
PROVA_SYSTEM_TOKEN
PROVA_ICAL_SECRET
PROVA_MAIL_FROM
```

---

## Akzeptanz K-2 Cleanup Done

```
✓ 9 Make-Scenarios OFF
✓ Make-Account gekündigt (nach 2 Wochen)
✓ Netlify-Functions reduziert von 49 auf ~10 (verifiziert: ls netlify/functions | wc -l)
✓ Tote Frontend-Files in _obsolete-cutover-*/
✓ Airtable Read-Only (mind. 4 Wochen)
✓ ENV-Vars ausgemistet (alte Make/Gmail-Keys raus)
✓ git tag v200-k-2-cleanup-done
```

---

## Voraussetzungen vor K-2 Start

```
✓ K-1.5 Cutover live + 2 Wochen stabil
✓ Smoke-Tests aller Edge Functions täglich grün
✓ Stripe Webhook Live-Mode auf Supabase-URL (Cutover-Schritt 2)
✓ Resend Domain verifiziert
✓ pg_cron-Job für lifecycle läuft
✓ Pilot-User keine Bug-Reports zu Migration
```

---

🎯 **K-2 Cleanup-Plan ist Vorbereitung. Ausführung erst nach Cutover + 2 Wochen.**
