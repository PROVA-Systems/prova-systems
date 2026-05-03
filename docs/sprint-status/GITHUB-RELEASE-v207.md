# GitHub-Release-Notes — v207-pilot-launch-ready

> **Hinweis:** `gh` CLI war im POST-MEGA-MEGA-Sprint nicht verfügbar. Marcel
> kopiert diesen Inhalt in https://github.com/PROVA-Systems/prova-systems/releases/new
> und waehlt Tag `v207-pilot-launch-ready`.

---

## 🚀 PROVA Systems v207 — Pilot-Launch-Ready

PROVA ist bereit fuer den ersten Founding-Pilot-Launch. 5 Sprints in 24h
abgeschlossen, voller Autonomie-Modus, Marcel offline.

### Was ist neu

#### 🧪 Automated Stripe-Test-Suite (N1, `acf4045`)
- 8 Test-Szenarien: Solo, Team, Founding-Pilot, Pilot-Coupon-Pre-Check,
  Add-on 5F, Failed-Payment, 3DS-Challenge, SEPA
- Live-Mode-Gate via `CONFIRM_LIVE_CHECKOUT=ja`
- `npm run test:stripe-suite` produziert JSON-Report
- Email-Template-Render-Check via `npm run test:emails`
- 27/27 Stripe-Tests grün (founding-pilot.test.js fix nach M2-zod-Validation)

#### 📧 Onboarding-Drip-Campaign (N2, `22c4df5`)
- 7 persoenliche Pilot-Email-Templates: Day 2/3/7/14/30/60/88
- Make.com-Scenario als JSON-Backup
- pg_cron-Alternative dokumentiert
- Re-Engagement-Logik fuer Inaktivitaet

#### 🔧 Admin-Cockpit MVP (N3 + N3-EXT, `23b23f7` + `ea48974`)
- Marcel-only Single-Page-Cockpit unter `/admin/`
- 5 Tabs: Pilot-Liste · Stripe-KPIs · Sentry-Errors · Audit-Trail · Quick-Actions
- 7 Backend-Functions mit `withSentry+requireAdmin`-Pattern
- Defense-in-Depth: Email-Whitelist (hardcoded) · Rate-Limit · Audit-Trail bei JEDER Aktion
- Quick-Actions: Read-only Impersonation (30 Min TTL) · Send-Email (11 Templates) · Force-Logout · CSV-Export · Auto-Refresh

#### 📋 Pre-Launch-Doku (N4, `01e6c66`)
- `PILOT-LAUNCH-CHECKLIST.md` — 11 Sektionen, 100+ Checkpoints
- `PILOT-LAUNCH-BRIEFING.md` — Marcel-Founder-Briefing inkl. Pilot-Einladungs-Vorlage
- `POST-MEGA-MEGA-PILOT-READY-2026-05-03-FINAL.md` — Executive Summary

### Bricht das was?

Nein. Reine additive Änderungen. Keine Schema-Änderungen in Production.
sw.js v255 → v256 (Cache-Invalidation Browser).

### Marcel-Pflicht vor Pilot-Einladungen

1. `PILOT-LAUNCH-CHECKLIST.md` Sektion 1-11 abarbeiten (~60-90 Min)
2. `PROVA_SENTRY_TEST_SECRET` in Netlify ENV setzen
3. Stripe Live-Mode-Switch + Webhook-Test
4. Eigener Founder-Account-Test + Admin-Cockpit-Login
5. Erste 5 Pilot-Einladungen versenden

### Bekannte Limitationen (Backlog Sprint K-2)

- 2FA fuer Admin-Cockpit nicht erzwungen (Marcel-Aktivierung optional)
- Impersonation-Frontend-Read-only-Modus benoetigt Anpassung der Auftrags-Pages
- Email-Drip-Campaign Live-Schaltung benoetigt Make.com ODER pg_cron-Setup
- Sentry-Pagination > 10 Issues
- Notes-Feature pro Pilot (erfordert `admin_notes` Tabelle)

### Tag-Liste seit letztem Release

- v206-skalierung-mega-done (M-Sprints, Sicherheit + Validation + Sentry + pilot.html)
- v204-security-hardening-done
- v203-vollcutover-airtable-out
- v200-app-landing-split-done
- → **v207-pilot-launch-ready** (dieser Release)

### Files-Stats

```
5 commits · 13 new functions · 2 new docs · 1 new admin frontend
~3000 LOC neu, davon ~1400 LOC Frontend, ~1000 LOC Backend, ~600 LOC Docs
```

---

🤖 Erstellt im POST-MEGA-MEGA-PILOT-LAUNCH-FINAL Sprint, 03.05.2026 nacht.
Co-Authored-By: Claude Opus 4.7 (1M context)
