# PROVA Pilot-Launch-Checklist (60+ Items, 8 Sektionen)

**Stand:** 2026-05-08 nach MEGA²³ Nacht-Marathon
**Ziel:** Pilot-Launch in 24-48h mit 5-10 Founding-Members
**Vorgaengerversion:** 32 Items (MEGA²⁰), erweitert in MEGA²³

---

## Übersicht — Workflow

```
A. PRE-LAUNCH (Marcel-Pflicht)        ━━━━━━━━━━━━━━━━━━━━ 18 Items
B. MARKETING-MATERIAL                 ━━━━━━━━━━━━━━━━━━━━  9 Items
C. MONITORING                         ━━━━━━━━━━━━━━━━━━━━  7 Items
D. PILOT-OUTREACH                     ━━━━━━━━━━━━━━━━━━━━  6 Items
E. BACKUP-STRATEGY                    ━━━━━━━━━━━━━━━━━━━━  5 Items
F. LAUNCH-DAY                         ━━━━━━━━━━━━━━━━━━━━  5 Items
G. POST-LAUNCH (+1, +3, +7 Tage)      ━━━━━━━━━━━━━━━━━━━━  6 Items
H. HOTFIX-PLAN                        ━━━━━━━━━━━━━━━━━━━━  4 Items
                                                            ─────
                                                            60 Items
```

---

## A. PRE-LAUNCH — Marcel-Pflicht (BLOCKER)

### A.1 Schema + Backend
- [ ] Migration 07 (user_workflow_settings) in Supabase appliziert
- [ ] Migration 08 (user_vorlagen) in Supabase appliziert
- [ ] Migration 09 (auftraege.vorlage_id) in Supabase appliziert
- [ ] Migration 10 (users.persona_*) in Supabase appliziert
- [ ] **Migration 11 (auftraege.beweisbeschluss_*) in Supabase appliziert** ⚠️ NEU MEGA²²
- [ ] PDFMonkey Pro-Plan aktiviert (15€/mo)
- [ ] PDFMONKEY_API_KEY + PDFMONKEY_MODE_C_TEMPLATE_ID gesetzt
- [ ] Stripe Webhook Secret valid + Subscription-Webhook reagiert
- [ ] **`npm install pdf-parse`** (für Beweisbeschluss-Lambda) ⚠️ NEU MEGA²²

### A.2 ENV-Variablen (Netlify Dashboard)
- [ ] SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
- [ ] STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
- [ ] **KI_VISION_PROVIDER=anthropic** ⚠️ NEU MEGA²²
- [ ] **KI_TEXT_PROVIDER=openai** ⚠️ NEU MEGA²²
- [ ] **ANTHROPIC_API_KEY (für Claude Sonnet 4.6 Vision)** ⚠️ NEU MEGA²²
- [ ] OPENAI_API_KEY (für GPT-4o Text + Whisper)
- [ ] AUTH_HMAC_SECRET (32+ Zeichen, für Tokens)
- [ ] **IMPERSONATION_NOTIFY=on** (DSGVO-Email bei Admin-Login) ⚠️ NEU MEGA²³
- [ ] SMTP_HOST + SMTP_USER + SMTP_PASS + SMTP_FROM (für Email-Notify)
- [ ] SENTRY_DSN_FUNCTIONS + PROVA_SENTRY_TEST_SECRET

### A.3 Domain + Security
- [ ] DNS prova-systems.de + app.prova-systems.de + admin.prova-systems.de korrekt
- [ ] SSL-Cert valid (Netlify auto)
- [ ] HTTPS-Redirect aktiv
- [ ] CSP-Header gesetzt (netlify.toml + _headers)
- [ ] Cloudflare-E-Mail-Obfuscation: `skip_processing = true` in netlify.toml

### A.4 Legal (Anwalt-Pflicht)
- [ ] **agb.html mit Anwalt finalisiert** ⚠️ Decision E1 (MEGA²⁰)
- [ ] **avv.html mit Anwalt finalisiert** + Sentry-Subprozessor ergänzt
- [ ] datenschutz.html aktualisiert (Claude Sonnet 4.6 + GPT-4o als Subprozessoren)
- [ ] AVV.PDF-Download zur Verfügung
- [ ] Forced Re-Consent (CLAUDE.md Regel 20) bei neuer Rechtsdoku-Version

### A.5 Stripe-Setup
- [ ] **Coupon "FOUNDING-30" angelegt** (~30% Rabatt → 125€/mo lifetime) ⚠️ NEU MEGA²¹
- [ ] STARTER 89€ price_1TTUQlRXumrtL2n5jPmG1IEY in Stripe verifiziert
- [ ] SOLO 179€ price_1TSjMZRXumrtL2n5fgToRwyr in Stripe verifiziert
- [ ] TEAM 379€ price_1TSjNXRXumrtL2n56c6emN2k in Stripe verifiziert
- [ ] Test-Checkout Session-Mode + Webhook erfolgreich

---

## B. MARKETING-MATERIAL

### B.1 Visuelle Assets
- [ ] App-Icons (8 Größen: 16/32/48/72/96/144/192/512px) im /icons/
- [ ] iPhone Splash-Screens (12 Varianten für iOS)
- [ ] Open-Graph-Image (1200×630px)
- [ ] Favicon-Set (.ico, .png, .svg)

### B.2 Video + Demo
- [ ] HeyGen-Demo-Video Mode A (~30s, Foto-KI + Diktat)
- [ ] HeyGen-Demo-Video Mode B (~30s, TipTap-Editor)
- [ ] HeyGen-Demo-Video Mode C (~30s, Vorlage-Mapping)

### B.3 Pilot-Onboarding
- [ ] Pilot-Onboarding-PDF (1-Seiter mit 5 Quick-Wins)
- [ ] Demo-Fall SCH-DEMO-001 in seed-data verfügbar

---

## C. MONITORING

### C.1 Frontend-Monitoring
- [ ] UptimeRobot Monitor: prova-systems.de (Frontend, 5min)
- [ ] UptimeRobot Monitor: app.prova-systems.de (App-Shell, 5min)
- [ ] UptimeRobot Monitor: /.netlify/functions/health (Lambda, 5min)

### C.2 Error-Tracking
- [ ] Sentry browser-init aktiv (M3 Sprint)
- [ ] Sentry node-init für Edge Functions aktiv
- [ ] Sentry-Test via /sentry-test Endpoint erfolgreich
- [ ] Plausible-Snippet eingebaut (Privacy-First-Analytics)

---

## D. PILOT-OUTREACH

- [ ] Pilot-SV-Liste erstellt (max 10 Founding-Members aus IHK-Netzwerk)
- [ ] Founding-Member-Email-Template fertig (siehe docs/strategie/PILOT-FAQ.md)
- [ ] Slack-Channel oder WhatsApp-Gruppe für Pilot-Feedback
- [ ] Persönliches Onboarding-Call-Slot (Calendly oder Notion-Form)
- [ ] Pilot-Feedback-Formular (Tally.so oder Google Form)
- [ ] Erfolgs-Metriken definiert: 1. Akte erstellt, 1. Diktat, 1. PDF-Download

---

## E. BACKUP-STRATEGY

- [ ] Supabase Auto-Backup aktiviert (Free-Plan: 7 Tage)
- [ ] Manuelles Backup-Skript: `scripts/supabase-export-tables.js` getestet
- [ ] Git-Tag-Strategie: v283-pilot-ready vor Launch (NICHT push, Marcel-OK pflicht)
- [ ] Rollback-Plan dokumentiert (auf v282 falls Critical-Bug)
- [ ] DSGVO-Export + Lösch-Function `dsgvo-handler` getestet

---

## F. LAUNCH-DAY

- [ ] Email an Pilot-SVs (max 10 Founding-Members) — staggered (3 Wellen, je 3-4 SVs)
- [ ] Marcel On-Call mind. 4h nach erster Welle
- [ ] Live-Monitoring-Dashboard offen (UptimeRobot + Plausible + Sentry)
- [ ] Stripe-Dashboard offen für Subscription-Tracking
- [ ] Slack/Email-Channel aktiv für Real-Time-Bugs

---

## G. POST-LAUNCH

### G.1 Tag +1
- [ ] Erste Feedback-Runde (Email an alle Pilot-SVs)
- [ ] Bug-Tracker leeren (Sentry-Issues durchgehen)

### G.2 Tag +3
- [ ] Erste Feature-Requests sammeln + priorisieren
- [ ] Onboarding-Friction-Points dokumentieren

### G.3 Tag +7
- [ ] Iteration-Decision: Bug-Fix-Sprint oder Feature-Sprint?
- [ ] Pilot-Pricing-Feedback evaluieren (89/179/379 oder anders?)

---

## H. HOTFIX-PLAN (24h Response-Time)

- [ ] Rollback-Strategie auf v282 dokumentiert
- [ ] Hotfix-Branch-Pattern: `hotfix/<issue-nr>-<topic>`
- [ ] Rapid-Deploy via Netlify (auto-deploy aus main = Hotfix-Branch)
- [ ] Notification-Channel: SMS-Fallback bei Critical-Bug

---

## Kritische Decisions vor Launch

| Decision | Status | Owner |
|---|---|---|
| Pricing 89/179/379€ statt 149€/279€ | ✅ Locked (MEGA²¹) | Marcel |
| Founding-Member 125€ lifetime (vorher 99€) | ✅ Locked (MEGA²¹) | Marcel |
| Claude Sonnet 4.6 Vision (statt GPT-4o-Vision) | ✅ Locked (MEGA²²) | Marcel |
| GPT-4o für Text (Konjunktiv-II) | ✅ Locked (MEGA²²) | Marcel |
| Beweisbeschluss-Pattern-Matching (kein LLM in Tranche 1) | ✅ Locked (MEGA²² C1) | Marcel |
| Multi-Tenancy via Supabase RLS | ✅ Locked (CLAUDE.md) | Marcel |
| Vanilla-JS (kein React/Vue) | ✅ Locked (CLAUDE.md) | Marcel |

---

## Bekannte Bugs (NICHT Showstopper)

- RECHNUNGEN 422 in prova-context.js → 422-Fix in MEGA²² done
- onboarding-tour.js:168 null-check → Fix in MEGA²² done
- Sidebar-Layout 768-1100px → Mobile-CSS-Polish, nicht critical
- multitenant-isolation Test → DB-Setup-Skript pflicht (`node tests/multitenant-isolation/setup.js`)

Diese Items können als Hotfix-Sprint NACH Pilot-Start gepatcht werden.

---

## Pilot-Launch-Ready bei Erfüllung von

✅ **Section A komplett (18 Items)** — Backend + Legal + Stripe Pflicht
✅ **Section C.1 + C.2 (3 von 7 Items)** — UptimeRobot + Sentry minimum
✅ **Section D komplett (6 Items)** — Outreach-Vorbereitung Pflicht

**Sections B/E/G/H** können nachgezogen werden, sind aber empfehlenswert.

---

*Stand: 2026-05-08 nach MEGA²³ Nacht-Marathon. Pilot-Launch-Ready bei A + C(min) + D komplett.*
