# GitHub-Release-Notes — v208-tech-debt-marathon-done

> **Hinweis:** `gh` CLI nicht verfügbar. Marcel kopiert Inhalt nach
> https://github.com/PROVA-Systems/prova-systems/releases/new + Tag
> `v208-tech-debt-marathon-done`.

---

## 🌙 PROVA Systems v208 — Tech-Debt-Marathon

POST-POST-MEGA-MEGA. 7 Sub-Sprints in einer Nacht. 6 Commits. Senior-Engineering-Behavior:
defensive Fixes wo Bugs, Doku + NACHT-PAUSE wo Big-Bang-Risiko.

### Was ist neu

#### 🔧 O1 — Tech-Debt-Bug-Fixes (`d67924c`)
- `prova-context.js` atFetch Default-Sort 'Timestamp' entfernt (RECHNUNGEN-422 Root-Cause)
- `onboarding-tour.js` defensive Pre-Checks fuer STEPS-Array
- `nav.js` debounced Resize-Listener als matchMedia-Fallback (Sidebar 768-1100px)
- sw.js v256 → v257

#### 📄 O2 — IHK-SVO 4-Teile-Templates (`af4bafa`) ⚡ CRITICAL
- F-04 KURZSTELLUNGNAHME als Liquid-templated Goldstandard erstellt
- 4-Teile-Struktur IHK-SVO § 9 Abs. 3 + EU AI Act Art. 50 + § 407a Abs. 2+3 ZPO
- Migrations-Doku mit 5-Schritt-PDFMonkey-Plan
- F-09/F-15 Liquid-Migration als BACKLOG (NACHT-PAUSE-Decision)

#### 🔐 O4 — AUTH-PERFEKT 2.0 (`ef3f124`)
- 2FA-Pflicht fuer Admin-Endpoints (AAL2 enforced server-side)
- AAL-Claim aus Supabase-JWT durchgereicht
- UI-Banner-Warnung bei AAL1-Login
- Globaler Notfall-Schalter via `PROVA_ADMIN_REQUIRE_2FA=false`

#### 📊 O6 — Sentry-Polish (`a408a9f`)
- Workspace-ID + user_pseudo Tags (DSGVO-konform)
- Slow-Call-Sampling: Calls > 3s als 'warning' captureMessage
- Sentry-Init in 6 weiteren Pages (dashboard/akte/freigabe/archiv/einstellungen/stellungnahme)

#### 📋 O3 + O5 + O7 — Doku + Strategie
- AIRTABLE-DRIFT Priorisierungs-Matrix (Sprint-K-2-Bundles)
- Flow B Status-Doku (war bereits gepusht)
- 2 NACHT-PAUSE-Files mit Marcel-Decision-Optionen
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)

### Bricht das was?

**Nein.** Reine additive + defensive Fixes. Kein Big-Bang-Refactor.

⚠ **Eine Verhaltens-Aenderung:** Admin-Endpoints erfordern jetzt AAL2 (2FA).
Ohne aktiviertes 2FA: 403 mit code `AAL2_REQUIRED` + Hint.
Notfall-Override via `PROVA_ADMIN_REQUIRE_2FA=false` ENV.

### Marcel-Pflicht vor Pilot-Einladungen

1. `PROVA_SENTRY_TEST_SECRET` in Netlify ENV setzen (war pending seit M3)
2. Supabase MFA fuer Founder-Account aktivieren (TOTP-App)
3. Re-Login Admin-Cockpit (AAL2-Session)
4. F-04 PDFMonkey-Migration (siehe IHK-SVO-TEMPLATES-MIGRATION.md)
5. NACHT-PAUSE-Files lesen (F09-F15-Liquid + AIRTABLE-Migration) → Decision

### Bekannte Limitationen (BACKLOG Sprint K-2)

- AIRTABLE-MIG-01..04 bundles (~17-22h) — Production-Stabilitaet > Drift-Cleanup pre-Pilot
- H-25..H-30 Auth-Backlog (Cutover, Register, Reset, Identity-Cleanup)
- F-09/F-15 Liquid-Migration (Demo-Werte funktionieren bei Pilot-Tests)
- Sentry-Init in 30+ restlichen Pages (~1h)

### Tag-Liste

- v200-app-landing-split-done
- v203-vollcutover-airtable-out
- v204-security-hardening-done
- v206-skalierung-mega-done
- v207-pilot-launch-ready (POST-MEGA-MEGA)
- → **v208-tech-debt-marathon-done** (POST-POST-MEGA-MEGA, dieser Release)

### Files-Stats

```
7 commits · 25+ files modified · 8 docs created · 2 NACHT-PAUSE files
~5000 LOC neu (davon ~1500 LOC Doku, ~600 LOC Liquid-Template, ~200 LOC
Auth-Hardening, ~150 LOC Sentry-Polish, Rest Bug-Fixes + Sentry-Init)
```

---

🤖 Erstellt im POST-POST-MEGA-MEGA Tech-Debt-Marathon, 03.05.2026 nacht.
Co-Authored-By: Claude Opus 4.7 (1M context)
