# PROVA Edge Functions Deploy-Runbook (K-1.2)

**Sprint:** K-1.2
**Owner:** Marcel (führt Deployment manuell aus)
**Stand:** 28.04.2026

---

## TLDR

```bash
# 1. Login
supabase login
supabase link --project-ref cngteblrbpwsyypexjrv

# 2. Secrets setzen (siehe unten)
supabase secrets set OPENAI_API_KEY=sk-... PDFMONKEY_API_KEY=... \
  RESEND_API_KEY=re_... STRIPE_WEBHOOK_SECRET=whsec_... \
  PROVA_SYSTEM_TOKEN=$(openssl rand -hex 32) \
  PROVA_ICAL_SECRET=$(openssl rand -hex 32) \
  PROVA_MAIL_FROM='PROVA Systems <noreply@prova-systems.de>'

# 3. Deploy in Reihenfolge
supabase functions deploy ki-proxy
supabase functions deploy whisper-diktat
supabase functions deploy pdf-generate
supabase functions deploy send-email
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy lifecycle-trigger
supabase functions deploy audit-write
supabase functions deploy ical-feed --no-verify-jwt

# 4. Health-Check
open https://prova-systems.de/tools/test-edge-functions.html
```

---

## Voraussetzungen

- [ ] Supabase CLI installiert (`brew install supabase/tap/supabase` oder npm)
- [ ] Node.js ≥ 18
- [ ] Supabase-Projekt-Zugriff (admin)
- [ ] Resend.com-Account + Domain `prova-systems.de` verifiziert
- [ ] PDFMonkey-Account aktiv
- [ ] OpenAI-Account mit API-Key
- [ ] Stripe-Account, Webhook-Secret aus Dashboard

---

## Secrets (in Supabase setzen)

| Secret | Wert / Quelle | Verwendung |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com → API Keys | ki-proxy, whisper-diktat |
| `PDFMONKEY_API_KEY` | pdfmonkey.io → API Keys | pdf-generate |
| `RESEND_API_KEY` | resend.com/api-keys | send-email |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → API Keys → Secret Key | stripe-webhook (für API-Calls, optional) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Endpoint → Signing Secret | stripe-webhook (Signature-Verify) |
| `PROVA_SYSTEM_TOKEN` | `openssl rand -hex 32` | lifecycle-trigger, send-email (System-Calls) |
| `PROVA_ICAL_SECRET` | `openssl rand -hex 32` | ical-feed (Token-HMAC) |
| `PROVA_MAIL_FROM` | `'PROVA Systems <noreply@prova-systems.de>'` | send-email From-Header |

```bash
# Alle auf einmal:
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  PDFMONKEY_API_KEY=... \
  RESEND_API_KEY=re_... \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PROVA_SYSTEM_TOKEN=$(openssl rand -hex 32) \
  PROVA_ICAL_SECRET=$(openssl rand -hex 32) \
  PROVA_MAIL_FROM='PROVA Systems <noreply@prova-systems.de>'

# Liste aller gesetzten Secrets:
supabase secrets list
```

**SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY** sind automatisch in jeder
Edge Function verfügbar — nicht extra setzen.

**SUPABASE_ANON_KEY** auch automatisch — wird von _shared/supabase.ts genutzt.

---

## Deploy-Reihenfolge

`_shared/` wird automatisch mit jedem Funktion-Deploy hochgeladen — kein
separates Deploy nötig.

| # | Function | `--no-verify-jwt` | Public? |
|---|---|---|---|
| 1 | `ki-proxy` | nein | nein (JWT pflicht) |
| 2 | `whisper-diktat` | nein | nein |
| 3 | `pdf-generate` | nein | nein |
| 4 | `send-email` | nein | nein (oder System-Token) |
| 5 | `stripe-webhook` | **ja** | **ja** (Stripe ruft direkt) |
| 6 | `lifecycle-trigger` | nein | nein (System-Token) |
| 7 | `audit-write` | nein | nein |
| 8 | `ical-feed` | **ja** | **ja** (externer Kalender) |

**Wichtig:** `--no-verify-jwt` bei `stripe-webhook` und `ical-feed`, sonst
blockiert die Supabase-Edge-Runtime den Request bevor unser Handler läuft.

```bash
# Deploys:
supabase functions deploy ki-proxy
supabase functions deploy whisper-diktat
supabase functions deploy pdf-generate
supabase functions deploy send-email
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy lifecycle-trigger
supabase functions deploy audit-write
supabase functions deploy ical-feed --no-verify-jwt
```

Erwartete URLs:
```
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/ki-proxy
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/whisper-diktat
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/pdf-generate
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/send-email
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/stripe-webhook
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/lifecycle-trigger
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/audit-write
https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/ical-feed
```

---

## Post-Deploy: Stripe Webhook umstellen

⚠️ Nur wenn Cutover (K-1.5) live geht — bis dahin altes Make-Webhook
parallel laufen lassen.

1. Stripe Dashboard → Developers → Webhooks
2. **Add Endpoint** (oder existierenden updaten):
   - URL: `https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/stripe-webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. **Signing Secret kopieren** → `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
4. **Send Test Event** im Stripe-Dashboard → in `stripe_events`-Tabelle prüfen ob ankommt.

---

## Post-Deploy: pg_cron-Jobs

Lifecycle-Daily-Sweep braucht einen Cron-Trigger. Im Supabase SQL-Editor ausführen
(einmalig):

```sql
-- pg_cron-Extension aktivieren (falls noch nicht)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily Lifecycle-Sweep (09:00 UTC = 11:00 MESZ / 10:00 MEZ)
SELECT cron.schedule(
    'lifecycle-daily-sweep',
    '0 9 * * *',
    $$
    SELECT net.http_post(
        url := 'https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/lifecycle-trigger',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-prova-system-token', current_setting('app.system_token', true)
        ),
        body := jsonb_build_object('trigger', 'cron_daily')
    );
    $$
);
```

**Hinweis:** `app.system_token` muss in postgres-config gesetzt sein (gleicher
Wert wie `PROVA_SYSTEM_TOKEN` im Edge-Functions-Secrets):

```sql
ALTER DATABASE postgres SET app.system_token = '...';
```

Cron-Status prüfen:
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## Logs ansehen

```bash
# Live-Tail einer Function:
supabase functions logs ki-proxy --follow

# Letzte 100 Lines:
supabase functions logs send-email --since=1h
```

Auch im Supabase-Dashboard → Edge Functions → <function> → Logs.

---

## Health-Check

```bash
# Im Browser:
open https://prova-systems.de/tools/test-edge-functions.html
```

1. Setup-Banner: Anon-Key paste
2. Login mit Founder-Account
3. „Alle 8 testen" klicken
4. Status-Badges:
   - **ki-proxy:** ok (200 mit OpenAI-Antwort)
   - **whisper-diktat:** disabled (braucht Audio-Upload — manueller Test)
   - **pdf-generate:** ok (200 mit PDF-URL) — kann 5-15s dauern wegen Polling
   - **send-email:** ok (200, Mail kommt an)
   - **stripe-webhook:** ok (401, da keine Signature — gewollt)
   - **lifecycle-trigger:** ok (401, da kein System-Token — gewollt)
   - **audit-write:** ok (200)
   - **ical-feed:** ok (400, da kein Token — gewollt)

---

## Rollback

```bash
# Eine Function entfernen:
supabase functions delete <name>

# Logs ansehen vor Delete:
supabase functions logs <name> --since=24h > /tmp/<name>-logs.txt
```

Bei Problemen mit einer Function: alte Make-Scenarios reaktivieren (siehe
`scripts/cutover/01-deactivate-make.md`), Edge Function deletmen, debuggen, redeployen.

---

## Troubleshooting

### `Edge Function returned a non-2xx status code`

- Logs prüfen: `supabase functions logs <name>`
- Häufig: fehlendes Secret. `supabase secrets list` checken.

### `JWT invalid: no user`

- Frontend sendet keinen oder falschen Authorization-Header.
- Test mit `curl -H "Authorization: Bearer <token>" ...`
- Token aus `getCurrentSession()` holen.

### `permission denied for table <name>`

- RLS-Policy fehlt für die Tabelle.
- Service-Role nutzt RLS-Bypass — nur in pg_cron + Webhook-Functions.
- Für User-Calls: `createSupabaseClient(req)` (User-JWT) statt
  `createServiceClient()`.

### `Resend domain not verified`

- Resend.com → Domains → `prova-systems.de` verifizieren via DNS-TXT-Records.
- Bis dahin nur Test-Mails an die Resend-Sandbox-Domain möglich.

---

## Replaced Make-Scenarios (Cutover-Mapping)

| Make-Scenario | ID | → Edge Function | Status nach Cutover |
|---|---|---|---|
| K2 (Komm/Email) | 4920914 | `send-email` | deaktivieren |
| G3 (Gutachten PDF) | 4790180 | `pdf-generate` | deaktivieren |
| G1 (Gutachten Init) | 4867125 | `pdf-generate` | deaktivieren |
| F1 (Finanzen) | 5192002 | `stripe-webhook` | deaktivieren |
| L3 (Lifecycle) | 5038113 | `lifecycle-trigger` | deaktivieren |
| L8 (Lifecycle) | 5147509 | `lifecycle-trigger` | deaktivieren |
| L10 (Lifecycle) | 5158552 | `lifecycle-trigger` | deaktivieren |
| T3 (Termin-Reminder) | 5147519 | `lifecycle-trigger` (cron) ODER nicht ersetzt — TODO K-2 | deaktivieren oder beibehalten |
| A5 (Admin) | 5147393 | `audit-write` (eingeschränkt) | deaktivieren |

→ Volle Cutover-Anweisung in `scripts/cutover/01-deactivate-make.md` (K-1.5).
