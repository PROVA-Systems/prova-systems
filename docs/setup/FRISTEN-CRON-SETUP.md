# Fristen-Reminder-Cron Setup

**Lambda:** `netlify/functions/fristen-reminder-cron.js`
**Zweck:** Tägliche Reminder-E-Mail bei T-14/7/3/1 Tagen vor Frist (DSGVO Art. 12 + § 225 ZPO).

## Trigger-Optionen

### Option A: Netlify Scheduled Function (empfohlen)

`netlify.toml`:
```toml
[[scheduled.functions]]
name = "fristen-reminder-cron"
schedule = "0 7 * * *"   # täglich 07:00 UTC
```

Header-Auth: Netlify Scheduled Functions setzen `X-Cron-Secret` automatisch nicht — daher ENV-Wert auch im Function-Context lesen, oder folgende ENV setzen:

```
FRISTEN_CRON_SECRET=<random-32-char-secret>
```

Im Lambda wird der Header geprüft. Bei Scheduled Functions kann Netlify den Header automatisch setzen via `header_secrets` (Plus-Plan).

### Option B: Make.com / GitHub Actions / cron-job.org

Daily HTTP-POST an:
```
https://prova-systems.netlify.app/.netlify/functions/fristen-reminder-cron
Header: X-Cron-Secret: <FRISTEN_CRON_SECRET>
```

## Required ENVs

| Variable | Zweck |
|----------|-------|
| `FRISTEN_CRON_SECRET` | Cron-Auth-Secret (random 32 char) |
| `RESEND_API_KEY` | Resend API-Key für Reminder-E-Mail |
| `RESEND_FROM` | Absender-Adresse (default `noreply@prova-systems.de`) |
| `SUPABASE_URL` | Supabase-Projekt-URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key (für RLS-bypass beim Cron) |

## Reminder-Pattern

Default: `[14, 7, 3, 1]` Tage vor `datum_soll`.
Pro Frist überschreibbar via Spalte `erinnerung_tage_vor INTEGER[]`.

## Idempotenz

Spalte `erinnerung_letzte_versendet_am DATE` verhindert doppelten Versand pro Tag.
Cron updatet diese Spalte nach erfolgreichem Resend-Send.

## Response-Format

```json
{
  "processed": 47,
  "sent": 12,
  "skipped": 35,
  "today": "2026-05-10"
}
```

- `processed` = Anzahl gefundener offener Fristen in den nächsten 30 Tagen
- `sent` = tatsächlich versendete Reminder
- `skipped` = bereits gesendet ODER `daysDiff` nicht im Pattern

## Test ohne ENV

```bash
curl -X POST -H "X-Cron-Secret: $FRISTEN_CRON_SECRET" \
  https://prova-systems.netlify.app/.netlify/functions/fristen-reminder-cron
```

Ohne `FRISTEN_CRON_SECRET` ENV oder bei Mismatch: `401 Unauthorized`.
