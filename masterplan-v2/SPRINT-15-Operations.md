# SPRINT 15 — Operations-Block

**Tag:** 15 · **Aufwand:** 6-7h · **Phase:** C Migration & Operations

---

## Ziel
Wir wissen wenn was kaputt ist. Daten sind gesichert. Nutzer sehen Status transparent. Stripe-Secret rotiert.

---

## Scope

### Sentry Error-Tracking
- Frontend (Browser-Errors)
- Backend (Function-Errors)
- Performance-Monitoring (Function-Laufzeit)
- Release-Tracking (jeder Tag-Push)
- Alerts: > 10 Errors/Min → Email an Marcel

### Airtable Backup
- Täglich nightly: alle Tabellen als JSON exportieren
- Komprimiert speichern in Netlify Blobs
- 30 Tage Rolling-Retention
- Restore-Test: Sprint 20

### Status-Page
- `status.prova-systems.de` (Subdomain)
- BetterStack oder UptimeRobot
- Monitoring: Netlify, Airtable, Stripe, OpenAI, IONOS-SMTP, PDFMonkey
- Public-Page mit Service-Status

### Stripe-Secret-Rotation
- `STRIPE_WEBHOOK_SECRET` ist im Memory als "ALT" markiert
- In Stripe-Dashboard neuen Secret generieren
- In Netlify ENV setzen
- Webhook-Endpoint mit neuem Secret testen

---

## Prompt für Claude Code

```
PROVA Sprint 15 — Operations (Tag 15)

Pflicht-Lektüre vor Start:
- 03_SYSTEM-ARCHITEKTUR.md (Monitoring-Architektur)
- Memory: STRIPE_WEBHOOK_SECRET ALT


SCOPE
=====

Block A — Sentry-Integration

A1: Sentry-Account anlegen (Marcel-Aktion)
- sentry.io Free-Tier (5k Events/Monat reicht)
- Project erstellen "prova-systems"
- DSN kopieren
- In Netlify ENV als SENTRY_DSN

A2: Frontend-Sentry
- @sentry/browser via CDN einbinden in 11 Kern-HTMLs
- Init in einem zentralen JS (z.B. theme.js)
- Sentry.init({ dsn: window.PROVA_CONFIG.SENTRY_DSN, ... })
- User-Context: nach Login Sentry.setUser({ email })

A3: Backend-Sentry
- @sentry/node in Functions
- lib/sentry-wrapper.js: wraps Function-Handler
- Try-Catch mit Sentry.captureException
- Performance-Monitoring via Sentry.startTransaction

A4: Release-Tracking
- Jeder Tag = Sentry-Release
- Source-Maps optional uploaden

A5: Alerts
- Sentry-Alert: > 10 Errors/Min → Email an marcel_schreiber891@gmx.de
- Sentry-Alert: Critical Error → Push (via push-notify)

Block B — Airtable-Backup

B1: netlify/functions/backup-airtable.js
- Scheduled (täglich morgen 03:00)
- Iteriert alle Tabellen aus TABLE_NAME_MAP
- Exportiert als JSON
- Komprimiert (gzip)
- Speichert in Netlify Blobs unter backups/{YYYY-MM-DD}.json.gz
- Behält letzte 30 Tage, löscht ältere

B2: netlify.toml Scheduled-Function-Eintrag
- [[scheduled.functions]]
  path = "/.netlify/functions/backup-airtable"
  cron = "0 3 * * *"

B3: Restore-Function netlify/functions/backup-restore.js
- Marcel-only
- POST mit { backup_date, tabelle? }
- Lädt Backup, schreibt zurück
- ⚠️ DESTRUCTIVE — mit Confirmation-Token

B4: Backup-UI im Admin-Cockpit (Sprint 18)
- Liste der Backups
- Download-Button
- Restore-Button (mit Doppel-Bestätigung)

Block C — Status-Page

C1: BetterStack Account anlegen (Marcel)
- Kostenlos für Status-Page
- Monitor anlegen für jede Service:
  - Netlify (https-status)
  - Airtable (API-call)
  - Stripe (api.stripe.com)
  - OpenAI (api.openai.com)
  - IONOS-SMTP (TCP-check Port 587)
  - PDFMonkey
  - prova-systems.de selbst (Health-Check)

C2: status.prova-systems.de
- DNS-CNAME auf BetterStack-Status-URL
- Status-Page customized (PROVA-Branding)
- Public-View

C3: health.js erweitern
- Aktuell nur "OK"
- Neu: Sub-Service-Status (Airtable-erreichbar?, OpenAI-erreichbar?)
- BetterStack pingt diese health.js

Block D — Stripe-Secret-Rotation

D1: Marcel-Aktion in Stripe-Dashboard
- Webhook-Endpoint öffnen
- "Roll Secret" → neuer Secret
- Kopieren

D2: Netlify ENV updaten
- STRIPE_WEBHOOK_SECRET = neuer Wert

D3: Test
- Stripe-Test-Webhook senden
- stripe-webhook.js verarbeitet erfolgreich

Block E — sw.js v218


QUALITÄTSKRITERIEN
==================
- Sentry zeigt Live-Errors
- Backup läuft nightly + sichtbar
- Status-Page öffentlich + ansprechend
- Stripe-Secret rotiert + Test grün
- Alerts feuern bei Test-Trigger


TESTS
=====
1. Force-Error im Frontend → erscheint in Sentry
2. Force-Error im Backend (Function) → erscheint in Sentry
3. Backup manuell triggern → Datei in Netlify Blobs
4. Status-Page öffnen → alle Services grün
5. Stripe-Test-Webhook → 200 OK


ACCEPTANCE
==========
1. Sentry funktional (FE + BE)
2. Airtable-Backup täglich
3. Status-Page öffentlich
4. Stripe-Secret rotiert
5. Alerts konfiguriert


TAG: v180-operations-done
```

---

## Marcel-Browser-Test (15 Min)

1. Sentry-Dashboard öffnen → Test-Errors sichtbar
2. status.prova-systems.de öffnen → Public, alle grün
3. Backup-Datei in Netlify Blobs
4. Stripe-Webhook-Test in Stripe-Dashboard → bei PROVA 200
5. Test-Alert (manuell triggern) → Email kommt an
