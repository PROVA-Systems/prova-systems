# CATCH-UP-SPRINT FINAL — 03.05.2026 mittag

**Auftrag:** Marcel Schreiber, 03.05.2026 morgen
**Auditor:** Claude Code (autonom)
**Wall-Clock-Time:** ~2.5h
**Trigger:** Lücke im Mega-Mega-Sprint — Founding-Pilot-Programm war nicht eingebaut

---

## 🎯 Was erstellt wurde

### Sprint C1 — Founding-Pilot-Programm (Pilot-Launch-Blocker)

**Backend:**
- `stripe-checkout.js v4` — neuer Body-Param `pilot_program=true`
  - Auto-Apply FOUNDING-99 Coupon
  - 90 Tage Trial via `subscription_data.trial_period_days`
  - `payment_method_collection='always'` (Karte sofort verifizieren bei Trial)
  - Pre-Check Coupon-Plätze → 410 PILOT_SOLD_OUT bei 10/10
  - Validation: nur Solo-Plan, nur Subscription-Mode
- `stripe-webhook.js v3` — 3 neue Event-Pfade
  - `handleCheckoutCompleted` erkennt Trial-Status → workspace.abo_status='trial'
  - `handleInvoicePaymentSucceeded` erkennt Trial-zu-Paid-Transition
  - `handleTrialWillEnd` (NEU) — Webhook 3 Tage vor Trial-Ende
  - 3 neue Audit-Trail-Types: `stripe.pilot.trial_started`, `stripe.pilot.trial_ending_soon`, `stripe.pilot.founding_paid`

**Frontend:**
- `pilot.html` — Founding-Member-Signup-Page mit gold-Branding
  - Live-Pricing: 0€ heute, 99€ ab Trial-End-Datum (dynamisch berechnet)
  - Plätze-Anzeige nach Pre-Flight
  - Stripe-Hosted-Checkout-Redirect
  - Sold-Out-Handling
  - Mobile-responsive
- `netlify.toml` — `/pilot` URL-Aliases (Cross-Domain + App-Subdomain)
- `sw.js v253` — pilot.html in APP_SHELL

**Email-Templates** (`email-templates/founding/`, 4 Stück):
- `pilot-einladung.html` — Marcel-manuell, persönlich
- `trial-welcome.html` — automatisch nach Pilot-Signup
- `trial-ending-email.html` — automatisch Tag 87
- `founding-welcome.html` — automatisch nach erster Zahlung
- Tonalität: persönlich (Marcel als Founder), kein Marketing-Sprech

**Tests:**
- `tests/stripe/founding-pilot.test.js` — 9 Tests, alle grün
- Total Stripe-Tests: **27/27 grün**

### Sprint C2 — Marcel-Vorbereitung (3 Doku-Files)

- `docs/strategie/PILOT-EINLADUNG-WORKFLOW.md` — Schritt-für-Schritt von SV-Identifikation bis Tag-90-Conversion
- `docs/strategie/STRIPE-DASHBOARD-BOOKMARKS.md` — Top 5 Bookmarks + Mobile-App + Notification-Setup + Daily-Routine
- `docs/strategie/TEST-KAUF-RUNBOOK.md` — 3 Test-Strategien (Test-Mode-Switch, Live+Refund, Single-Plan), Test-Karten-Liste, Verifikation-Checkliste, Cleanup-Workflow

### Sprint C3 — Tot-Code-Decision-Files

- `docs/diagnose/TOT-CODE-DECISION-foto-upload.md`
  - Empfehlung: **LÖSCHEN** (5 Min vs 3h Fix)
  - Caller-Analyse: nur `foto-archiv.js`, **nirgends in HTML geladen**
  - HIGH-Findings H-17 + H-23 würden mit Lösch aufgelöst
- `docs/diagnose/TOT-CODE-DECISION-invite-user.md`
  - Empfehlung: **LÖSCHEN** (2 Min vs 4-6h Fix)
  - 0 aktive Caller im Repo
  - HIGH-Findings H-18 + H-21 würden aufgelöst
  - Bonus-Hinweis: alle 3 Tot-Code-Functions (auth-token-issue, invite-user, foto-upload) in einem Cleanup-Commit löschen

### Sprint C4 — Stripe-Webhook-Monitoring

- `scripts/stripe-webhook-status.js` — Live-Health-Check
  - Letzte 50 Stripe-Events korreliert mit `stripe_events`-Table
  - Pro Event: PROVA-Status (`verarbeitet` / `fehler` / `fehlt`)
  - Farbige TTY-Output, exit 1 bei Failed
- `scripts/stripe-webhook-replay.js` — Failed-Event Re-Delivery
  - Letzte 24h Failed-Events identifizieren
  - Replay via Stripe-API (`/v1/webhook_endpoints/{id}/events/{event_id}/resend`)
  - `--all` oder `--event=evt_X` Flag
- `package.json` scripts: `stripe-status`, `stripe-replay`

---

## 📊 Wieviel Zeit

| Sprint | Aufwand |
|---|---|
| C1 — Founding-Pilot | ~90 Min |
| C2 — Marcel-Vorbereitung | ~30 Min |
| C3 — Tot-Code-Decisions | ~15 Min |
| C4 — Webhook-Monitoring | ~20 Min |
| Final-Sync + Report | ~15 Min |
| **Total** | **~2.5h** |

---

## 📦 Commits

| SHA | Sprint | Was |
|---|---|---|
| `794e0e8` | C1 | Founding-Pilot — Backend + Page + Webhook + Templates + 9 Tests |
| (folgt) | C2-C4-Final | 3 Marcel-Doku + 2 Tot-Code-Decisions + 2 Monitoring-Skripte + Final-Report |

---

## 🚨 Marcel-Aktionen-für-jetzt (priorisiert)

### TOP 3 — JETZT direkt umsetzbar

1. **Stripe-Verify komplett durchführen** (60 Min, RUNBOOK in `docs/strategie/TEST-KAUF-RUNBOOK.md`):
   ```bash
   npm run verify-stripe        # ENV-Check
   npm run test-webhook         # Mock-Event signiert senden
   npm run test-checkouts       # 7 Test-URLs (jetzt mit Founding-Pilot!)
   ```
   Dann: Test-Mode-Switch oder Live+Refund-Strategie wählen.

2. **Erste Pilot-Einladung schreiben** (15 Min, Workflow in `docs/strategie/PILOT-EINLADUNG-WORKFLOW.md`):
   - 1 SV aus Marcels Liste identifizieren
   - Email-Template `email-templates/founding/pilot-einladung.html` personalisieren
   - Senden — Pilot-Link: `https://app.prova-systems.de/pilot`

3. **Tot-Code-Decisions umsetzen** (10 Min):
   - `docs/diagnose/TOT-CODE-DECISION-foto-upload.md` lesen → Marcel sagt löschen oder behalten
   - `docs/diagnose/TOT-CODE-DECISION-invite-user.md` lesen → Marcel sagt löschen oder behalten
   - Bei Löschen: Claude Code in nächster Session führt aus

### MEDIUM — diese Woche

4. **NACHT-PAUSE-Decisions:**
   - `auth-token-issue` Function-Strategie (CRITICAL — `docs/diagnose/NACHT-PAUSE-S6-NACHT-rate-limit-auth-token-issue.md`)
   - Schema-Library-Wahl (HIGH — `docs/diagnose/NACHT-PAUSE-S6-MEGA-schema-validation-library.md`)

5. **PLANNED-Migration in Dev testen:** `supabase/migrations/PLANNED_2026-05-02_rls_audit_findings.sql`

6. **DSGVO-Anwalt-Termin** buchen + 6 Compliance-Files reviewen lassen

7. **Webhook-Health monitoren** während Pilot-Phase:
   ```bash
   npm run stripe-status   # täglich morgens checken
   ```

---

## 🎬 Was als nächstes nach Test-Käufen

### Phase A — Pilot-Akquise (Tage 9-15)
- Marcel sendet 5-10 personalisierte Pilot-Einladungen
- Tracking in eigenem Sheet (Workflow-Doku)
- Erste Pilot-Signups erwartet innerhalb 7 Tagen

### Phase B — Pilot-Onboarding-Calls (Tage 9-22)
- Wöchentliche 30-Min-Calls pro aktiven Pilot-SV
- Bug-Sammlung in BACKLOG.md
- Feature-Requests in `docs/strategie/PROVA-MARKETING-ROADMAP.md`

### Phase C — Cron-Email-Worker (Folge-Sprint, falls Pilot-Bedarf)
- Aktuell: Trial-Welcome / Trial-Ending / Founding-Welcome werden NICHT automatisch versendet
- audit_trail-Eintrag ist da (`stripe.pilot.trial_started` etc.)
- Cron-Worker-Script (Folge-Sprint) liest audit_trail → versendet Templates via Resend
- Bis dahin: Marcel manuell senden

### Phase D — Erste Pilot-Auswertung (Tag 22-30)
- 5+ aktive Pilots als Pflicht für Phase D
- Mid-Pilot-NPS abfragen
- Bug-Fix-Sprint 11+

### Phase E — Trial-Ende-Wave (Tag 90+)
- Erste Pilot-SVs werden automatisch gepaid
- Webhook `invoice.payment_succeeded` triggert Welcome-Email
- Marcel verifiziert via `npm run stripe-status`

---

## ⚠️ Bekannte Limitationen (Folge-Sprint-Backlog)

### Cron-Email-Worker
- **Aktuell:** Email-Templates existieren, werden aber nicht automatisch versendet
- **Nötig:** Edge-Function oder pg_cron + Resend-API-Call
- **Workaround:** Marcel sendet manuell aus audit_trail-Trigger
- **Priorität:** MEDIUM (Pilot-Phase erträglich, vor Skalierung Pflicht)

### Pilot-Frontend-Code-Reviews
- **`pilot.html`** verwendet `import { supabase }` aus `/lib/supabase-client.js`
- **`prova-pseudo.js`** Frontend-Edit für Pilot-Status-Display nicht implementiert
- **Priorität:** LOW (funktioniert, kann besser werden)

### Founding-Coupon-Race-Condition
- 11 simultane Pilot-Signups könnten 11. Coupon-Slot bekommen (Stripe-API ist eventually-consistent)
- **Mitigation:** Stripe selbst lehnt 11. Redemption ab (max_redemptions hard-cap)
- **User-Experience:** 11. SV bekommt Stripe-Error statt Pre-Flight-410
- **Priorität:** LOW (Race-Window ist sehr kurz, Marcel kann ohnehin nur 10 SVs gleichzeitig akzeptieren)

---

## 🧠 Wachstums-Notizen

### Was gut funktioniert hat
1. **Mock-Test-Pattern wieder benutzt:** founding-pilot.test.js nutzt das Module-Cache-Pattern aus stripe-webhook.test.js — 9 Tests in <30 Min geschrieben
2. **Pilot-Page Inline-CSS:** keine framework-Abhängigkeit, Vanilla-JS-konsistent mit PROVA-Doktrin
3. **Founding-Coupon-Pre-Flight:** verhindert Stripe-Error-Roundtrip, gibt Frontend klare Plätze-Info
4. **Decision-File-Pattern für Tot-Code:** Marcel kann in 2 Min entscheiden, klare Optionen mit Pros/Cons

### Lessons für nächste Sessions
1. **Email-Templates-Verzeichnis:** `email-templates/founding/` etabliert. Folge-Sprints sollten gleiche Struktur nutzen (`email-templates/<workflow>/`).
2. **Pilot-Page-Pattern:** kann als Vorlage für andere Signup-Flows dienen (z.B. Webinar-Anmeldung, Newsletter-Confirm)
3. **`stripe-webhook-status.js` als Daily-Tool:** Marcel kann das täglich morgens laufen — pre-emptive Health-Check vor User-Beschwerden

### Memory-Adds für Marcel-Profile
- Marcel ehrt "Tot-Code-Decision"-Files mit klarer Empfehlung — nicht "B oder C, Marcel entscheidet" sondern "**Empfehlung: A**, hier sind Pros/Cons der Alternative"
- Marcel will **persönliche** Email-Tonalität ("Ehrlich gesagt: ich kann denen kein Geld abnehmen wenn sie für mich testen!") — keine Marketing-Sprache
- Marcel-Direktive "max Vertrauen" + "ich antworte sofort" — Catch-Up-Sprints können schnell laufen

---

## 🏷️ Tag-Status

**Kein neuer Tag** in diesem Sprint. `v204-security-hardening-done` aus Mega-Mega-Sprint bleibt aktuell.

**Empfehlung für nächsten Tag:** `v205-founding-pilot-live` nach erstem erfolgreichen Pilot-Signup (Marcel verifiziert + setzt).

---

*Catch-Up-Sprint abgeschlossen 03.05.2026 mittag · Marcel kann jetzt Pilot-SVs einladen*
