# PROVA — Marcel-Onboarding-Doku (Markt-Launch v700)

**Datum:** 2026-05-11
**Status:** Pilot-Launch-Ready

---

## Pilot-Kunde-Aufnahme-Workflow

### Schritt 1: Outreach
- Kanal A: BVS-Mailing (Bundesverband ö.b.u.v. Sachverständige)
- Kanal B: LinkedIn-Posts (Marcel-Founder-Account)
- Kanal C: Persönliche Empfehlungen (Marcel-Netzwerk)

### Schritt 2: Erstkontakt
- 15-Min-Calendly: `https://calendly.com/marcel-prova/15min` (in `PROVA_CALENDLY_URL`)
- Demo-Walk-Through via Screenshare (Demo-Fall SCH-DEMO-001)
- Founding-Member-Angebot (99€ lifetime, Coupon `FOUNDING-99`)

### Schritt 3: Signup + Onboarding-Email-Cycle
- User registriert via app.prova-systems.de
- Lambda `email-welcome.js` triggert sofort (Setup-Guide)
- Lambda `onboarding-create-demo.js` erstellt SCH-DEMO-001 (Frontend-Hint)
- 14-Tage-Trial automatisch (workspaces.trial_end)
- T-3: `email-trial-ending-cron.js` mit Pricing-Cards
- T+7 nach erstem echten Auftrag: `email-pilot-feedback-cron.js` mit Calendly

---

## Support-Inbox-Handling

**Lambda:** `admin-support-inbox.js` (existing W8-I7)
**Tabelle:** `support_tickets` mit ENUM ticket_typ + ticket_status + ticket_prioritaet

**Workflow:**
1. User sendet Support-Anfrage via einstellungen.html-Form
2. Ticket landet in `support_tickets` (Status: `neu`)
3. Marcel sieht in admin-cockpit.html "Support-Inbox"
4. Reply via `support_replies`-Insert
5. Status-Update: `in_bearbeitung` → `geloest` → `closed`

---

## Stripe-Dashboard-Cheatsheet

**Login:** dashboard.stripe.com (Marcel-Account)

**Häufige Aktionen:**
- **Active Subscriptions:** Subscriptions → Filter status=active
- **Founding-Member-Coupon:** Coupons → `FOUNDING-99` (99€ lifetime)
- **Trial-Status pro Customer:** Customers → Trials
- **Webhook-Health:** Developers → Webhooks → /stripe-webhook
- **MRR-Übersicht:** Reports → Subscription Metrics

**Live vs. Test-Mode:**
- Toggle oben rechts
- Live-Webhook-Secret in Netlify-ENV `STRIPE_WEBHOOK_SECRET`
- Test-Webhook für lokale Tests via Stripe CLI

---

## Häufige Probleme + Lösungen

### "User kann sich nicht einloggen"
1. Email in Supabase Dashboard → Authentication suchen
2. Wenn `email_confirmed_at = null`: Confirm-Mail re-senden
3. Wenn TOTP-Lock: User-Email an Marcel mit Recovery-Code-Reset-Bitte
4. Reset via SQL: `UPDATE users SET totp_enabled=false, totp_secret=null WHERE email='...'`

### "Stripe-Subscription wurde nicht in Supabase übernommen"
1. Stripe-Dashboard → Webhooks → /stripe-webhook → Logs checken
2. `stripe_events`-Tabelle: nach `stripe_event_id` suchen
3. Falls `verarbeitung_fehler`: Detail in `error_message`
4. Manueller Re-Run via Stripe-CLI: `stripe events resend <evt_id>`

### "Demo-Fall doppelt erstellt"
- Sollte nicht passieren (Idempotenz-Check)
- Falls doch: `onboarding-delete-demo.js` aufrufen (Hard-Delete des einen)
- Oder direkt in DB: `UPDATE auftraege SET deleted_at=NOW() WHERE az='SCH-DEMO-001' AND id != '<keep-this>'`

### "Fristen-Reminder kommt nicht an"
1. Cron-Logs in Netlify Functions → Activity prüfen
2. ENV `FRISTEN_CRON_SECRET` korrekt gesetzt?
3. ENV `RESEND_API_KEY` valid?
4. `fristen.erinnerung_letzte_versendet_am` checken — heute? dann skipped (Idempotenz)
5. Resend-Dashboard → Email-Log checken

### "KI-Lambda timeout (10s)"
- Netlify-Functions-Limit ist 10s default, 26s bei Pro
- Foto-Captioning-Lambda kann an Limit kratzen
- Lösung: Background-Function nutzen (Netlify Pro) ODER Streaming-Response

---

## Daily-Marcel-Routine

### Morgens (5 Min)
1. Sentry-Dashboard öffnen → 0 unresolved Errors target
2. Status-Page `/status.html` → 6 Services up?
3. Admin-Cockpit → Live-Sessions + MRR-Live + Funnel

### Mittags (10 Min)
1. Support-Inbox bearbeiten
2. Stripe-Dashboard → Active Subs

### Abends (15 Min)
1. Pilot-Feedback-Mails reviewen
2. Calendly-Termine bestätigen
3. GitHub-Activity check (CC-PRs falls vorhanden)

---

## Eskalations-Kontakte

- **Supabase-Support:** support@supabase.io (Pro-Plan)
- **Stripe-Support:** support@stripe.com (Live-Mode-Tickets)
- **Resend-Support:** support@resend.com
- **Anthropic DPA:** privacy@anthropic.com
- **Netlify-Support:** support@netlify.com (Pro-Plan)

---

## Notfall-Recovery

**Database-Backup-Test (monatlich):**
1. Supabase Dashboard → Settings → Database → Backups
2. Latest-Backup auf Branch restoren (Pro-Plan)
3. Smoke-Test auf Branch
4. Rollback-Plan dokumentiert in `docs/setup/BACKUP-STRATEGIE.md`

**Critical-Bug-Hotfix:**
1. Branch `hotfix-XXX` von main
2. Fix + Test
3. Merge zu main → Auto-Deploy via Netlify
4. Sentry-Watch 24h

---

*PROVA Marcel-Onboarding-Doku — Co-Authored-By Claude Opus 4.7*
