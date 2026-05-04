# PROVA Pilot-Launch-Checklist (32 Items)

**Stand:** 2026-05-08 nach MEGA²⁰
**Ziel:** Pilot-Launch in 24-48h mit reduziertem Scope

---

## A. PRE-LAUNCH — Schema + Backend (Marcel-Pflicht)

- [ ] Migration 07 (user_workflow_settings) in Supabase appliziert
- [ ] Migration 08 (user_vorlagen) in Supabase appliziert
- [ ] Migration 09 (auftraege.vorlage_id) in Supabase appliziert
- [ ] **Migration 10 (users.persona_*) in Supabase appliziert** ⚠️ NEU MEGA²⁰
- [ ] PDFMonkey Pro-Plan aktiviert (15€/mo)
- [ ] PDFMONKEY_API_KEY + PDFMONKEY_MODE_C_TEMPLATE_ID gesetzt
- [ ] PDFMonkey-Templates aktiv: MODE_C_GENERIC, F-01-JVEG, F-23-SVKOSTEN, F-25-HONORAR
- [ ] Stripe Webhook Secret valid + Subscription-Webhook reagiert

## B. PRE-LAUNCH — Domain + Security

- [ ] DNS prova-systems.de + app.prova-systems.de + admin.prova-systems.de korrekt
- [ ] SSL-Cert valid (Netlify auto)
- [ ] HTTPS-Redirect aktiv
- [ ] CSP-Header gesetzt (vermutlich existing via netlify.toml)

## C. PRE-LAUNCH — Legal (Anwalt-Pflicht)

- [ ] **agb.html mit Anwalt finalisiert** ⚠️ Decision E1 aus MEGA²⁰
- [ ] **avv.html mit Anwalt finalisiert** ⚠️
- [ ] datenschutz.html aktualisiert
- [ ] AVV.PDF-Download zur Verfuegung
- [ ] Cookie-Banner aktiv (falls Cookies-Marketing/Analytics)

## D. PRE-LAUNCH — Marketing-Assets (Marcel-Tasks)

- [ ] App-Icons (8 Groessen: 16/32/48/72/96/144/192/512px)
- [ ] HeyGen-Demo-Videos produziert (3x ~30s fuer Mode A/B/C)
- [ ] Pilot-SV-Outreach-Liste erstellt (max 10 Founding-Members)
- [ ] Founding-Member-Discount-Code in Stripe aktiviert
- [ ] **Pricing-Decision: 149€ (existing) oder 179€ (MEGA²¹)** — Marcel-Decision pflicht

## E. PRE-LAUNCH — Monitoring

- [ ] UptimeRobot-Monitore aktiviert (Frontend + Lambdas + Supabase-Health)
- [ ] Plausible-Snippet eingebaut (oder eigener Analytics)
- [ ] Sentry/Error-Tracking aktiv
- [ ] Backup-Strategy verifiziert (Supabase Auto-Backup)

## F. PRE-LAUNCH — Browser-Tests

- [ ] Onboarding-Flow End-to-End:
  - [ ] login.html → Signup-Tab zeigt 3 Pflicht-Checkboxes (AGB/AVV/DSE) + Newsletter-Toggle
  - [ ] Submit-Button initial disabled, wird nach Pflicht-Cbs aktiv
  - [ ] Pricing-Strip zeigt "Solo 149/179 €" + Coming-Soon-Badges
  - [ ] Erfolgs-Email + Email-Confirm-Link
  - [ ] Erster Login → Welcome-Wizard 4-Step (Persona/Mode/Tour/Demo-Akte)
- [ ] Mode A Standard-Workflow:
  - [ ] Akte erstellen
  - [ ] Diktat-Funktion
  - [ ] KI-Hilfe (mind. 1 Aufgabe)
  - [ ] PDF-Generierung
- [ ] Mode B Editor-Workflow:
  - [ ] akte.html Notiz-Section zeigt TipTap-Editor
  - [ ] Notiz speichern syncs zurueck zu textarea
- [ ] Mode C Vorlagen-Workflow:
  - [ ] einstellungen.html → .docx hochladen
  - [ ] Auto-Open Mapping-Modal mit 🟢 Confidence-Badges
  - [ ] Mapping speichern
  - [ ] akte.html → "Mode C Vorlage" Card → Vorlage waehlen
  - [ ] "📥 PDF generieren (PDFMonkey)" → Download
  - [ ] "↻ Lokale PDF" Fallback (Browser-jsPDF)
- [ ] Mobile-Test:
  - [ ] iOS Safari + Android Chrome 375px-Width
  - [ ] Mode-C-Mobile-Fallback (Toast erscheint)
  - [ ] Welcome-Wizard Mobile-responsive
- [ ] Logout/Re-Login:
  - [ ] Forced Re-Consent funktioniert (falls einwilligungen pending)
  - [ ] Session-Persistence

## G. LAUNCH-DAY

- [ ] Email an Pilot-SVs (max 10 Founding-Members)
- [ ] Slack/Discord/Email-Channel fuer Pilot-Support eingerichtet
- [ ] Marcel On-Call (mind. 2h nach Versand)
- [ ] Live-Monitoring-Dashboard offen (UptimeRobot + Plausible + Sentry)

## H. POST-LAUNCH

- [ ] Tag +1: Erste Feedback-Runde
- [ ] Tag +1: Bug-Tracker leeren (falls Pilot-Bugs auftauchen)
- [ ] Tag +3: Feature-Requests sammeln
- [ ] Tag +7: Erste Iteration-Decision

---

**Total: 32 Items**

**Empfehlung:** Items in Reihenfolge A → H abarbeiten. **Migration 10 + agb-Anwalt + Browser-Tests sind die 3 Hauptblocker.**

Bekannte Bugs (NICHT Showstopper):
- RECHNUNGEN 422 in prova-context.js
- onboarding-tour.js:168 null-check
- Sidebar-Layout 768-1100px
- 9 Toast-Migration-Tests (Pre-existing)

Diese koennen als Hotfix-Sprint nach Pilot-Start gepatcht werden.

---

*Stand: 2026-05-08. Pilot-Launch-Ready bei Erfuellung A+C+F-Items.*
