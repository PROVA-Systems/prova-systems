# 🚀 PROVA — Pilot-Launch-Checklist

**Erstellt:** 03.05.2026
**Status:** Pre-Launch
**Zielgruppe:** Marcel (Founder)
**Verwendung:** **Vor jeder Pilot-Einladung** Punkt fuer Punkt durchgehen.

---

## 1. ENV-Variablen (Netlify Production)

### Pflicht (PROVA wirft Fehler wenn fehlt)

- [ ] `SUPABASE_URL` — `https://cngteblrbpwsyypexjrv.supabase.co`
- [ ] `SUPABASE_ANON_KEY` — Anon-Public-Key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Service-Role (NUR Backend!)
- [ ] `STRIPE_SECRET_KEY` — `sk_live_…` (Live-Mode!)
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe Dashboard → Webhooks
- [ ] `STRIPE_COUPON_FOUNDING` — `FOUNDING-99`
- [ ] `STRIPE_PRICE_SOLO` — `price_…` Solo 149€
- [ ] `STRIPE_PRICE_TEAM` — `price_…` Team 279€
- [ ] `STRIPE_PRICE_FOUNDING_SOLO` — `price_…` 99€ lifetime
- [ ] `OPENAI_API_KEY` — `sk-proj-…`
- [ ] `RESEND_API_KEY` — `re_…`
- [ ] `PDFMONKEY_API_KEY` — PDFMonkey Dashboard
- [ ] `AUTH_HMAC_SECRET` — min 32 Zeichen, Random
- [ ] `JWT_SECRET` — min 32 Zeichen

### Optional (Features, die noch nicht aktiv sein muessen)

- [ ] `SENTRY_DSN_FUNCTIONS` — Functions-Sentry
- [ ] `SENTRY_DSN_BROWSER` — Browser-Sentry
- [ ] `SENTRY_AUTH_TOKEN` — fuer Admin-Cockpit Sentry-Tab
- [ ] `SENTRY_ORG_SLUG` — z.B. `prova-systems`
- [ ] `SENTRY_PROJECT_SLUG_FUNCTIONS`
- [ ] `SENTRY_PROJECT_SLUG_BROWSER`

**Verifikation:**
```
npm run verify-stripe
```
→ alle Stripe-Variablen werden gegen Stripe-API gepruefte; Output muss "✅ ALL GOOD" sein.

---

## 2. Stripe-Setup (Live-Mode)

- [ ] Stripe-Account auf "Live-Mode" geschaltet (nicht Test!)
- [ ] Produkte angelegt:
  - [ ] PROVA Solo (149€/Monat, recurring)
  - [ ] PROVA Team (279€/Monat, recurring)
  - [ ] PROVA Founding-Solo (99€/Monat, recurring, lifetime)
- [ ] Coupon `FOUNDING-99` angelegt:
  - [ ] -50€/Monat (vom 149€-Solo-Preis)
  - [ ] Duration: forever
  - [ ] max_redemptions: 10 (Founding-Members-Cap)
- [ ] Webhook angelegt: `https://app.prova-systems.de/.netlify/functions/stripe-webhook`
  - [ ] Events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.trial_will_end`
  - [ ] `STRIPE_WEBHOOK_SECRET` in Netlify ENV uebernommen
- [ ] Customer Portal aktiviert:
  - [ ] Stripe → Settings → Billing → Customer portal
  - [ ] Allow customers to: cancel subscriptions, update payment methods
- [ ] Test-Webhook gesendet via Stripe CLI:
  ```
  stripe listen --forward-to https://app.prova-systems.de/.netlify/functions/stripe-webhook
  stripe trigger checkout.session.completed
  ```
  → Webhook landet in `stripe_events` Tabelle, `audit_trail` zeigt `stripe.subscription.activated`

---

## 3. Supabase-Setup

### Datenbank-Schema

- [ ] `/supabase-migrations/01_schema_foundation.sql` ausgefuehrt
- [ ] `/supabase-migrations/02_schema_kerngeschaeft.sql` ausgefuehrt
- [ ] `/supabase-migrations/03_schema_artefakte_storage.sql` ausgefuehrt
- [ ] `/supabase-migrations/04_schema_komplett_finale.sql` ausgefuehrt
- [ ] `/supabase-migrations/05_v2_patch_billing_master_uebersicht_FIXED.sql` ausgefuehrt
- [ ] `/supabase-migrations/06_v3_patch_final_lueckenschluss.sql` ausgefuehrt

### Storage-Buckets

- [ ] `sv-files` (private, RLS via workspace_id)
- [ ] `sv-public` (public, fuer Logos/Stempel)
- [ ] `sv-system` (private, System-Files)

### Auth-Settings

- [ ] Email-Bestaetigung aktiviert
- [ ] Passwort-Reset-Email-Template angepasst (PROVA-Branding)
- [ ] Welcome-Email-Template angepasst
- [ ] Sign-up rate limit: 5/Stunde/IP

### RLS-Policies

- [ ] **Stichproben-Test:** mit anon-Key versuchen, Workspace-fremde Daten zu lesen → 401/0 rows
- [ ] `npm run test:multitenant` (sofern CI-Setup vorhanden) → grün

---

## 4. Frontend-Smoke-Tests (manuell, ~30 Min)

### Cold-Start (frischer Browser, kein Cookie)

- [ ] `https://app.prova-systems.de/` → Landing-Page laedt < 3s
- [ ] `→ Pilot werden`-Klick → Pilot-Page mit Founding-99-Programm
- [ ] Pilot-Page: Stripe-Checkout-Klick → Stripe-Checkout-Flow oeffnet
- [ ] Test-Checkout (Karte 4242…) abschliessen → Redirect zu /onboarding
- [ ] Onboarding (Email/Passwort, Workspace-Name, Branche) durchklicken
- [ ] Dashboard erreicht, Empty-State sichtbar
- [ ] **Demo-Fall** (`SCH-DEMO-001`)-Link → laedt + zeigt vorgenerierte Daten

### Auftraege-Flow (Schaden/Mangel)

- [ ] `+ Neuer Auftrag` → Auftragstyp-Picker (4 Flows)
- [ ] Schaden/Mangel auswaehlen → Stamm-Daten-Form
- [ ] Stamm-Daten ausfuellen + Speichern → Auftrag-Detail-Page
- [ ] Diktat-Aufnahme starten → Whisper-Transkription nach 5-10s
- [ ] §1-§5 generieren → KI strukturiert Befunde
- [ ] §6 Fachurteil-Editor:
  - [ ] Leeres Textfeld dominiert (60% Viewport)
  - [ ] Befunde-Panel rechts sichtbar
  - [ ] Min 500 Zeichen + 2/3 Marker → Speichern moeglich
  - [ ] Override-Modal bei Unterschreitung
  - [ ] Copy/Paste erlaubt, aber `audit_trail` zeigt `paste_event`
- [ ] Halluzinations-Check + §407a-Check vor Freigabe → laufen automatisch
- [ ] Freigabe → PDF-Generierung via PDFMonkey → PDF-Link in Dashboard
- [ ] Email-Versand → Resend-Log zeigt Zustellung

### Buerotools (Stichprobe)

- [ ] **Rechnungen** → `+ Rechnung` → Stripe-Connect (oder manuell)
- [ ] **Termine** → `+ Termin` → Kalender-Eintrag
- [ ] **Kontakte** → `+ Kontakt` → CRUD
- [ ] **Briefvorlagen** → Vorlage editieren + Vorschau
- [ ] **Textbausteine** → Floskeln-Liste (gesetzt aus FLOSKELN-SEED-DATEN.md)
- [ ] **Normen** → DIN-Suche

---

## 5. Email-Templates (Resend)

- [ ] Welcome-Mail nach Pilot-Anmeldung
- [ ] Day-2 Reminder ("Login fehlt") — automatisiert
- [ ] Day-3 Reminder ("Erste Akte fehlt") — automatisiert
- [ ] Day-7 Check-in (3 Fragen)
- [ ] Day-14 NPS
- [ ] Day-30 Roadmap-Mitsprache
- [ ] Day-60 Stripe-Reminder
- [ ] Day-88 Final-Founder-Email
- [ ] Trial-Ending-3d-Reminder (auto via Stripe-Webhook)
- [ ] Subscription-Cancelled-Mail (auto)
- [ ] Payment-Failed-Mail (auto)

**Verifikation:**
```
npm run test:emails
```
→ alle Templates rendern ohne Unfilled-Platzhalter, viewport+max-width OK.

---

## 6. Admin-Cockpit (Marcel-only)

- [ ] `https://app.prova-systems.de/admin/` laedt Login
- [ ] Login mit `marcel.schreiber891@gmail.com` → Cockpit
- [ ] Login mit Test-Email → "kein Admin-Zugang"-Fehler
- [ ] Tab "Pilot-Liste" → Workspaces sichtbar (mind. 1)
- [ ] Tab "Stripe-KPIs" → MRR + Founding-Coupon-Status
- [ ] Tab "Sentry-Errors" → Issues oder "Konfiguration fehlt"
- [ ] Tab "Quick-Actions" → Impersonation-Form sichtbar
- [ ] Audit-Trail-Eintrag pro Tab-Switch in `audit_trail` (Supabase SQL Editor)

**SQL-Verifikation:**
```sql
select count(*), typ from audit_trail
where typ like 'admin.%' and created_at > now() - interval '1 hour'
group by typ order by count(*) desc;
```

---

## 7. Domain + DNS

- [ ] `prova-systems.de` (Landing) → Netlify CNAME
- [ ] `app.prova-systems.de` (App) → Netlify CNAME
- [ ] `admin.prova-systems.de` (NICHT eigenstaendig — `app.prova-systems.de/admin/` reicht)
- [ ] HTTPS-Zertifikat aktiv (Let's Encrypt via Netlify)
- [ ] HSTS Header gesetzt
- [ ] Cloudflare Email-Obfuscation: AUS (siehe netlify.toml `skip_processing = true`)

---

## 8. Legal-Pages

- [ ] `/impressum.html` mit Marcel-Daten + ö.b.u.v.-SV-Status
- [ ] `/datenschutz.html` mit DSGVO-konformer Auflistung aller Sub-Auftrags-Verarbeiter
- [ ] `/agb.html` mit aktuellen Pricing (149€/279€/99€)
- [ ] `/avv.html` mit AVV-konformen Datenfluss-Tabellen
- [ ] **Stichprobe:** Tabelle `versicherungs_partner` matched mit avv.html
- [ ] **Forced-Re-Consent:** view `v_user_pending_einwilligungen` zeigt 0 fuer Marcel

---

## 9. Backup + Disaster-Recovery

- [ ] Supabase: Daily-Backup aktiviert (Free-Tier 2T retention; Pro = 7T+)
- [ ] Manueller Test: `pg_dump` lokal funktioniert
- [ ] PDFMonkey: Templates exportiert + im Repo unter `/pdf-templates/`
- [ ] Stripe: Coupons/Produkte dokumentiert in `docs/strategie/STRIPE-PRICING-FINAL.md`
- [ ] Make.com: Falls noch genutzt → Scenario-Backup als JSON

---

## 10. Monitoring + Alerting

- [ ] Sentry-DSN Functions konfiguriert + Test-Error gesendet
- [ ] Sentry-DSN Browser konfiguriert + Test-Error gesendet
- [ ] Stripe-Webhook-Failures werden via Email an Marcel gesendet
- [ ] Supabase-Alerts: DB-CPU > 80%, Connection-Limit-Reached
- [ ] Netlify-Deploy-Fail → Email-Notification an Marcel

---

## 11. Marcel-Pflichtaktionen (NACH Deploy)

- [ ] Manueller Founding-Pilot-Checkout durchfuehren (Live-Karte!)
- [ ] Eigenen Account anlegen + komplettes Auftrags-Flow durchziehen
- [ ] PDF-Output gegenchecken (Layout, Logo, Footer)
- [ ] Email-Zustellung pruefen (Spam-Folder!)
- [ ] Mobile-Test auf eigenem iPhone/Android (Login + Diktat + Akten-Liste)
- [ ] **5 erste Pilot-Einladungen** persoenlich versenden (kein Massmail!)

---

## ✅ GO-Kriterium (alle muessen ✅ sein)

- [ ] Sektion 1 (ENV) — Pflicht-Variablen alle gesetzt
- [ ] Sektion 2 (Stripe) — Live-Mode + Webhook gruen
- [ ] Sektion 3 (Supabase) — Schema + RLS getestet
- [ ] Sektion 4 (Smoke-Tests) — Cold-Start + Auftrags-Flow durchgespielt
- [ ] Sektion 5 (Email) — Render-Check OK
- [ ] Sektion 6 (Admin) — Cockpit erreichbar
- [ ] Sektion 7 (Domain) — HTTPS + DNS OK
- [ ] Sektion 8 (Legal) — Pages aktuell
- [ ] Sektion 9 (Backup) — DR-Strategie steht
- [ ] Sektion 10 (Monitoring) — Sentry + Alerts aktiv
- [ ] Sektion 11 (Marcel) — eigener Test-Run + erste 5 Einladungen

---

## ❌ NO-GO (sofortiger Stop)

- ❌ Stripe-Webhook liefert keine Events → Pilot kann sich anmelden, aber Kontostand stimmt nicht
- ❌ Supabase-Datenleck (RLS bypassed) → kritische DSGVO-Verletzung
- ❌ Pseudonymisierung vor OpenAI faellt aus → DSGVO + AVV verletzt
- ❌ §6-Editor laesst KI-generierte Texte unter 500 Zeichen ohne Override-Audit durch → 407a-Verletzung
- ❌ Mobile-Layout broken → Solo-SVs nutzen Tablet/Phone unterwegs

---

*Erstellt im POST-MEGA-MEGA Sprint N4 am 03.05.2026.*
