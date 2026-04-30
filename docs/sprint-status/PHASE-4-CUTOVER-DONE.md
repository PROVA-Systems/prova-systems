# Phase 4 Cutover — DONE

**Datum:** 30.04.2026
**Tag:** `v200-app-landing-split-done`
**Smoke-Test:** 15 PASS / 0 FAIL ✅

---

## ✅ Gemerged in main

| # | Branch | Merge-Commit | Was |
|---:|---|---|---|
| 1 | `sprint-app-landing-split` | `cbce703` | Phase 2 File-Inventory + Phase 3 Routing-Foundation (netlify.toml v6.0, _redirects, login.html, auth-guard, nav.js, sw.js v244, +Pricing/Kontakt-Aliase) |
| 2 | `feature/data-store-auftraege-crud` | `d0a7f5a` | Sprint 06b — `lib/data-store.auftraege.createDraft` + `listDrafts` |
| 3 | `feature/auftrags-schema-conditional` | `8265c17` | Sprint 06b — `lib/auftrags-schema.js` (469 LOC, inkl. Risssschaden-Fix via FF-Merge des Hotfix in den Feature-Branch) |
| 4 | `feature/landing-pricing-kontakt` | `5625f07` | `pricing.html` + `kontakt.html` Marketing-Pages |
| 5 | `feature/smoke-test-cutover` | `eca36f5` | `scripts/smoke-test-cutover.sh` CI-Test-Script |
| 6 | `audit/cluster-review-auto` | `583fba6` | `docs/sprint-status/CLUSTER-REVIEW-AUTO.md` (52 Pages analysiert) |
| 7 | `hotfix/redirect-precedence` | `e122d73` | App-Pfade in netlify.toml host-spezifisch (Variante B), sw.js v245 |

---

## ⏸️ NICHT gemerged (warten auf Entscheidung)

| Branch | Grund | Was fehlt? |
|---|---|---|
| `feature/sprint-06b-auftrag-neu-skeleton` | UX-Frage offen | Marcel: COCKPIT-Eintrag + Split-Button parallel (A) oder einer raus (B/C)? |
| `docs/marcel-selbsthilfe` | Branch existiert noch nicht | Marcel-File ist lokal vorhanden (`docs/PROVA-MARCEL-SELBSTHILFE.md` untracked), Branch + Commit + Push wartet |
| `docs/chat-transport-v35` | Doku-only, separat | Kann direkt in main, niedrige Prio |
| `hotfix/risssschaden-typo` | Funktional in Schema-Branch enthalten | Branch kann nach Bestätigung gelöscht werden |

---

## 🌐 Live-URLs (Stand 30.04.2026 nach Tag)

### LANDING (prova-systems.de)

| URL | Erwartung | Stand |
|---|---|---|
| `https://prova-systems.de/` | Marketing-Hero | ✅ 200 |
| `https://prova-systems.de/pricing` | Preise (Solo + Team) | ✅ 200 (über `_redirects`-Alias) |
| `https://prova-systems.de/kontakt` | Mailto-Form | ✅ 200 |
| `https://prova-systems.de/datenschutz` | Legal | ✅ 200 |
| `https://prova-systems.de/impressum` | Legal | ✅ 200 |
| `https://prova-systems.de/agb` | Legal | ✅ 200 |
| `https://prova-systems.de/avv` | Legal | ✅ 200 |
| `https://prova-systems.de/login` | Cross-Domain-Redirect | ✅ 301 → `app.prova-systems.de/login` |
| `https://prova-systems.de/dashboard` | Cross-Domain-Redirect | ✅ 301 → `app.prova-systems.de/dashboard` |
| `https://prova-systems.de/akte` etc. | Cross-Domain-Redirect | ✅ 301 → app.prova-systems.de |

### APP (app.prova-systems.de)

| URL | Erwartung | Stand |
|---|---|---|
| `https://app.prova-systems.de/` | App-Root → /dashboard | ✅ 301 → `/dashboard` |
| `https://app.prova-systems.de/login` | Login-Page (PROVA-Branding, login.html) | ✅ 200 |
| `https://app.prova-systems.de/dashboard` | Dashboard (auth-protected, JS-Guard) | ✅ 200 (server) → JS leitet bei fehlender Session auf `/login` |
| Alle anderen App-Pfade (`/akte`, `/briefe`, `/profil`, `/kontakte`, `/auftrag-neu`, …) | Auth-protected | ✅ erreichbar via host-spezifische Rewrites in netlify.toml |

---

## 🔧 Kritischer Hotfix-Lerneffekt

**Smoke-Test 1 (post-Phase-4-Merge):** 5/15 FAIL — Cross-Domain-Redirects für `/login`, `/dashboard`, `/akte`, `/briefe`, `/archiv` lieferten 200 statt 301.

**Root-Cause:** `_redirects` path-only Aliase (z.B. `/login → /login.html 200`) feuern VOR den host-conditioned 301-Redirects in `netlify.toml`. Die 2 funktionierenden Cross-Domain-Routen (`/app-login.html`, `/auth-supabase.html`) waren genau die OHNE `_redirects`-Path-Alias.

**Fix (Variante B):** App-Page-Aliase aus `_redirects` entfernt, stattdessen 37 host-spezifische Rewrites in `netlify.toml` (Block C-pre, jeweils `https://app.prova-systems.de/<path> → /<file>.html 200`). `_redirects` hält jetzt nur noch LANDING-Pfade (Marketing, Legal, Admin, Edge-Function-Aliase).

**Smoke-Test 2 (post-Hotfix):** 15/15 PASS ✅.

**Lerneffekt für ähnliche Splits:** Bei Cross-Domain-Setups in Netlify ALLE Path-Rewrites host-explizit machen — entweder via `from = "https://<host>/<path>"` in `netlify.toml` oder via absolute-URL-from-Syntax in `_redirects`. Path-only-Rewrites (`/path /file.html 200`) konkurrieren gegen host-conditioned Redirects und können sie überstimmen.

---

## 🚀 Nächste Sprints (Priorität)

1. **Schema-Migration 06b applizieren** — `PLANNED_06b_auftraege_extend.sql` reviewen, in versioniertes File umbenennen (`07_06b_auftraege_extend.sql`?), im Supabase-Dashboard SQL-Editor ausführen. Voraussetzung für Sprint 06c.

2. **Sprint 06c Live-Save aktivieren** — `auftrag-neu-logic.js` LocalStorage-Draft auf `auftraege.createDraft()` umstellen, Beteiligte-Picker statt Plaintext, Kontakt-Picker auf Phase 1A. Setzt 06b-Schema voraus.

3. **UX-Entscheidung Sprint-06b-Skeleton** — COCKPIT-Eintrag „Neuer Auftrag" + Sidebar-Split-Button: parallel halten (A) oder einer entfernen (B/C)? Browser-Claude-Empfehlung: C (nur Split-Button).

4. **Cluster-Review-Freigaben** — Marcel reviewt `CLUSTER-REVIEW-AUTO.md`:
   - 24 Pages sofort löschbar
   - 6 INVESTIGATE-Pages klären (vorlage-09, mahnung-1/2/3, mahnwesen, schnelle-rechnung)
   - 2 pdfmonkey-Templates: löschen oder nach `docs/templates-source/`?

5. **Pilot-Onboarding-Vorbereitung:**
   - Stripe-Webhook-Secret erneuern (Produktiv-Setup)
   - Make-Scenario T3 (Trial-Reminders) manuell aktivieren
   - Make-Scenario F1 (Founding-Coupon) manuell aktivieren
   - Pricing-Discrepancy `index.html` 25 Aufträge ↔ `pricing.html` 30 Aufträge angleichen

6. **Branch-Cleanup** — `hotfix/risssschaden-typo` löschen (in Schema-Branch enthalten), `sprint-app-landing-split` ggf. archivieren (nach 1 Woche stable).

---

## 📊 Statistik

- **9 Merge-Commits** auf main seit Phase-4-Start (`a2b9e61` → `e122d73`+1 für diesen Doc-Commit)
- **+~3.500 LOC** brutto über alle gemergten Branches
- **−71 LOC** netto durch Hotfix (cleaner als Phase-3-Original)
- **15/15 Smoke-Test PASS** — Cutover funktional verifiziert
- **DNS + SSL grün** für `app.prova-systems.de`
- **0 Konflikte** beim Mergen, **0 Reverts** nötig

---

*Phase 4 Cutover abgeschlossen 30.04.2026 · Tag `v200-app-landing-split-done` · Repo bereit für Pilot-Onboarding.*
