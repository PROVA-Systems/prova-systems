# PROVA Chat-Transport v35 (FINAL)

**Stand:** 30.04.2026 abend
**Vorheriger Chat:** v34 (Cutover-Tag)
**Status:** APP-LANDING-SPLIT komplett LIVE · Tag `v200-app-landing-split-done` gesetzt

---

## TLDR

- ✅ **Phase 4 Cutover abgeschlossen** — `v200-app-landing-split-done` Tag gepusht
- ✅ **Smoke-Test 15/15 PASS** — alle Cross-Domain-Redirects funktionieren
- ✅ **Marcel-Login-Test grün** — Workspace-ID `65b25a13-17b7-45c0-b567-6edee235dd98` aktiv
- ✅ **Hotfix `redirect-precedence`** — Variante B (App-Pfade host-spezifisch in netlify.toml)
- ⏳ **Schema-Migration 06b** als nächster konkreter Schritt (Marcel im Supabase-Dashboard)

---

## ✅ HEUTE GEMERGED (Phase 4 + Hotfix)

| Branch | Merge-Commit | Inhalt |
|---|---|---|
| `sprint-app-landing-split` | `cbce703` | Phase 2 Inventory + Phase 3 Routing-Foundation (netlify.toml v6.0, login.html, auth-guard, nav.js, sw.js v244) |
| `feature/data-store-auftraege-crud` | `d0a7f5a` | Sprint 06b — `auftraege.createDraft` + `listDrafts` (+41 LOC) |
| `feature/auftrags-schema-conditional` | `8265c17` | Sprint 06b — `lib/auftrags-schema.js` (+469 LOC, inkl. Risssschaden-Typo-Fix via FF) |
| `feature/landing-pricing-kontakt` | `5625f07` | `pricing.html` + `kontakt.html` Marketing-Pages |
| `feature/smoke-test-cutover` | `eca36f5` | `scripts/smoke-test-cutover.sh` CI-tauglich |
| `audit/cluster-review-auto` | `583fba6` | `CLUSTER-REVIEW-AUTO.md` — 52 Pages analysiert |
| `hotfix/redirect-precedence` | `e122d73` | App-Pfade in netlify.toml host-spezifisch (Variante B), sw.js v245 |

---

## 🌐 LIVE-URLs (verifiziert via Smoke-Test)

### LANDING — `prova-systems.de`

| URL | Status |
|---|---|
| `/` | ✅ 200 Marketing-Hero |
| `/pricing` (+ `/preise`) | ✅ 200 (Solo 149€, Team 279€, Founding-99) |
| `/kontakt` (+ `/contact`) | ✅ 200 (Mailto-Form) |
| `/datenschutz` `/impressum` `/agb` `/avv` | ✅ 200 Legal |
| `/login` `/dashboard` `/akte` `/briefe` `/archiv` … | ✅ 301 → `app.prova-systems.de/...` |
| `/app-login.html` `/auth-supabase.html` | ✅ 301 → `app.prova-systems.de/login` |

### APP — `app.prova-systems.de`

| URL | Status |
|---|---|
| `/` | ✅ 301 → `/dashboard` |
| `/login` | ✅ 200 PROVA-Branding (login.html) |
| `/dashboard` | ✅ 200 (server) → JS-Auth-Guard schickt unauth User auf `/login` |
| `/akte` `/briefe` `/profil` `/kontakte` `/auftrag-neu` … | ✅ via host-spezifische Rewrites in netlify.toml |

---

## 📦 OFFENE BRANCHES (gepusht, NICHT in main)

| Branch | Was | Warum offen |
|---|---|---|
| `feature/sprint-06b-auftrag-neu-skeleton` | 4-Phasen-Wizard Skeleton (LocalStorage-Draft) | UX-Entscheidung Marcel: COCKPIT-Eintrag + Split-Button parallel (A) oder einer raus (B/C)? |
| `docs/marcel-selbsthilfe` | Selbsthilfe-Datei | Branch existiert noch nicht — File ist lokal in `docs/PROVA-MARCEL-SELBSTHILFE.md` (untracked), Branch + Commit + Push wartet |
| `docs/chat-transport-v35` | Diese Datei | wird mit diesem Update zu Master-Update fertig |
| `hotfix/risssschaden-typo` | Tippfehler-Fix | funktional in Schema-Branch enthalten, Branch kann nach Bestätigung gelöscht werden |

---

## 🔧 LESSONS-LEARNED (heute)

### Hotfix `redirect-precedence` — Netlify Path-Order

**Problem:** Smoke-Test 1 (post-Phase-4-Merge): 5/15 FAIL — Cross-Domain-Redirects für `/login`, `/dashboard`, `/akte`, `/briefe`, `/archiv` lieferten 200 statt 301. Die 2 funktionierenden (`/app-login.html`, `/auth-supabase.html`) waren genau die OHNE `_redirects`-Path-Alias.

**Root-Cause:** `_redirects` path-only Aliase (z.B. `/login → /login.html 200`) feuern in Netlify VOR `netlify.toml`-host-conditioned 301-Redirects. Die Path-Aliase überstimmen die Cross-Domain-Logik.

**Fix (Variante B):** App-Page-Aliase aus `_redirects` entfernt → 37 host-spezifische Rewrites in `netlify.toml` (Block C-pre, jeweils `https://app.prova-systems.de/<path> → /<file>.html 200`). `_redirects` hält nur noch LANDING-Pfade.

**Smoke-Test 2:** 15/15 PASS ✅.

### IONOS CNAME-Zirkelbezug

CNAME `app` muss auf `prova-systems.netlify.app` zeigen — **NICHT** auf `prova-systems.de` (das wäre Zirkel und SSL-Cert wird nicht ausgestellt). Marcel selbst diagnostiziert.

### Service-Role-Pattern X3+X4 funktioniert

Edge Functions mit Multi-Tenant-Writes: User-JWT für Reads, Service-Role-Key für Storage+Insert. Voraussetzung: workspace_id ist server-side aus User-JWT verifiziert. Pattern dokumentiert in X3-/X4-Status-Files.

### DM Sans für LANDING

Inter+JetBrains-Mono ist APP-Style. LANDING (index, impressum, pricing, kontakt) nutzt DM Sans + navy-palette für visuelle Kohäsion.

### Pricing-Diskrepanz

`pricing.html` sagt 30 Aufträge (Marcel-Direktive), `index.html` Zeile 1809 sagt noch 25 Aufträge. **TODO:** angleichen vor Pilot-Live.

---

## ⏳ MARCEL-TODO-LISTE (post-Cutover)

```
✅ X4 deployen
✅ DNS-Cert app.prova-systems.de grün
✅ Branches 1+2 in main mergen
✅ Marketing-Pages mergen
✅ Smoke-Test mergen + grün laufen lassen
✅ Phase 4 Cutover komplett
✅ Tag v200-app-landing-split-done gesetzt + gepusht
✅ Hotfix redirect-precedence durchgezogen
⏳ Schema-Migration 06b im Supabase-Dashboard applizieren
⏳ Sprint 06c Live-Save aktivieren (auftrag-neu-logic.js auf createDraft)
⏳ UX-Entscheidung Sprint-06b-Skeleton (COCKPIT vs Split-Button)
⏳ Cluster-Review-Freigaben (24 Sofort-Deletes)
⏳ Stripe Webhook Secret erneuern (vor Pilot)
⏳ Make-Scenario T3 (Trial-Reminders) manuell aktivieren
⏳ Make-Scenario F1 (Founding-Coupon) manuell aktivieren
⏳ index.html Pricing-Diskrepanz angleichen (25 → 30 Aufträge)
⏳ Branch-Cleanup: hotfix/risssschaden-typo löschen (in Schema-Branch enthalten)
```

---

## 🚀 EDGE FUNCTIONS — Live-State

| Function | Version | Status |
|---|---|---|
| `ki-proxy` | v1 | live |
| `whisper-diktat` | v1 | live |
| `send-email` | v1 | live |
| `stripe-webhook` | v1 | live |
| `lifecycle-trigger` | v1 | live |
| `audit-write` | v1 | live |
| `ical-feed` | v1 | live |
| **`brief-generate`** | **v3 (X3 Service-Role)** | **LIVE seit 30.04. 00:30** |
| **`pdf-generate`** | **v3 (X4 Service-Role)** | **LIVE** |

---

## 📊 SPRINT 06B — Status

| Komponente | Status |
|---|---|
| `lib/data-store.auftraege.createDraft` + `listDrafts` | ✅ in main (`d0a7f5a`) |
| `lib/auftrags-schema.js` (469 LOC, conditional schema) | ✅ in main (`8265c17`) |
| Tippfehler-Fix `Setzungs-/Rissschaden` | ✅ in main (via FF in Schema-Branch) |
| `auftrag-neu.html` + `auftrag-neu-logic.js` Wizard-Skeleton | ⏸️ wartet auf UX-Entscheidung |
| Schema-Migration `PLANNED_06b_auftraege_extend.sql` (2 Spalten + 1 ENUM) | ⏳ Marcel applies |
| Sprint 06c Live-Save (LocalStorage → DB-createDraft) | ⏳ nach Schema-Migration |

---

## 📁 REPO-REDUKTIONS-POTENZIAL (aus Cluster-Review)

| Kategorie | Anzahl | Wann |
|---|---:|---|
| **DELETE sofort** | 24 | nach Marcel-Bestätigung |
| **DELETE-AFTER-WIZARD** | 18 | nach `app.html`-Migration (Cutover Block 3 Tier A) |
| **KEEP-DEPRECATE** | 2 | `briefvorlagen.html` + `kontakte.html` (Cutover-Sweep) |
| **KEEP-ACTIVE** | 1 | `mahnung.html` (16 JS-Refs im Mahn-Workflow) |
| **INVESTIGATE** | 6 | Marcel-Klärung |
| **Plus `briefe/`-Subfolder** | ~28 | Ergänzend nach Cluster-1-Freigabe |

**Gesamt-Potenzial:** 70-90 Files Reduktion bei voller Freigabe.

---

## 🧭 NÄCHSTER CHAT — Quick-Start

Marcel kopiert für den nächsten Browser-Claude-Chat: `docs/PROVA-CHAT-START-NEXT-SESSION.md`.

Erste Nachricht enthält:
1. Reading-Order (Chat-Transport, Phase-4-Cutover-Done, Master-v2-Files)
2. Aktueller Stand (APP-LANDING-SPLIT live, Tag v200)
3. 5 priorisierte nächste Sprints
4. Co-Founder-Tonalität-Reset

---

## ✍️ Architektur-Snapshot post-Cutover

```
┌────────────────────────────────────────────────────────────┐
│  prova-systems.de  (LANDING — Marketing/Legal)             │
│    /                  → index.html                          │
│    /pricing /preise   → pricing.html                        │
│    /kontakt /contact  → kontakt.html                        │
│    /datenschutz /agb /impressum /avv                        │
│    /login /dashboard /akte /…  → 301 → app.prova-systems.de │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  app.prova-systems.de  (SaaS — Login-protected)            │
│    /                  → 301 /dashboard                      │
│    /login             → login.html (PROVA-Branding)         │
│    /dashboard /akte /briefe /profil /kontakte /…            │
│      → /<page>.html via netlify.toml host-spezifisch        │
│    Service-Worker:    APP_SHELL v245                        │
│    Auth:              Supabase Session, JS-Guard            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  admin.prova-systems.de  (ADMIN — Founder-Cockpit)         │
│    Domain noch nicht aktiv — admin-dashboard.html aktuell   │
│    via path-Alias auf prova-systems.de                      │
└────────────────────────────────────────────────────────────┘
```

---

*Chat-Transport v35 final — 30.04.2026 abend. Bei Chat-Wechsel diese Datei zuerst lesen + `docs/PROVA-CHAT-START-NEXT-SESSION.md` als erste Bot-Nachricht.*
