# PROVA Chat-Transport v35

**Stand:** 30.04.2026 später Vormittag
**Vorheriger Chat:** v34 (Cutover-Tag)

---

## TLDR

- X3 brief-generate v3 + X4 pdf-generate v3 LIVE deployed
- APP-LANDING-SPLIT Phase 3 fertig auf Branch `sprint-app-landing-split` (8 Commits)
- DNS `app.prova-systems.de` in Setup (CNAME-Fix gerade durchgeführt)
- 5 Parallel-Branches gepusht, warten auf Marcel-Review

---

## OFFENE BRANCHES (alle gepusht, NICHT in main)

1. `sprint-app-landing-split` (8 Commits, Phase 3 komplett)
2. `feature/data-store-auftraege-crud` (+41 LOC)
3. `feature/auftrags-schema-conditional` (+469 LOC)
4. `feature/sprint-06b-auftrag-neu-skeleton` (UX-Frage offen)
5. `hotfix/risssschaden-typo` (1 Zeile)
6. `feature/landing-pricing-kontakt` (pricing.html + kontakt.html)
7. `feature/smoke-test-cutover` (218 Z Bash-Script)
8. `audit/cluster-review-auto` (52 Pages analysiert)
9. `docs/marcel-selbsthilfe` (Selbsthilfe-Datei)

---

## SSL-SETUP STATUS

- IONOS CNAME `app` gefixt: `prova-systems.netlify.app` (war `prova-systems.de`)
- DNS-Propagation läuft
- Netlify HTTPS-Cert erwartet automatisch

---

## NÄCHSTE SCHRITTE (priorisiert)

1. SSL-Cert `app.prova-systems.de` grün
2. Phase 4 — Page-Tests im Inkognito
3. `sprint-app-landing-split` → main (nach grünem Test)
4. Branches 1+2 (`data-store` + `schema-conditional`) → main mergen
5. UX-Entscheidung Sprint-06b-Skeleton (Option A/B/C)
6. Schema-Migration 06b im Supabase Dashboard applizieren
7. Sprint 06c Live-Save aktivieren
8. Smoke-Test laufen lassen

---

## OPEN UX-FRAGE BRANCH 3 (sprint-06b-skeleton)

Soll der neue COCKPIT-Eintrag „Neuer Auftrag" parallel zum Sidebar-Split-Button bleiben, oder einer entfernt werden?

- **Option A:** Beide bleiben
- **Option B:** Nur COCKPIT-Eintrag
- **Option C:** Nur Split-Button (Browser-Claude-Empfehlung)

Marcel entscheidet nach Cutover.

---

## MARCEL-TODO-LISTE

- [x] X4 deployen
- [ ] DNS-Cert `app` grün verifizieren
- [ ] Branches 1+2 in main mergen (Variante 2: hotfix in feature mergen first)
- [ ] Phase 4 Page-Tests im Inkognito
- [ ] `sprint-app-landing-split` Merge nach erfolgreichem Test
- [ ] UX-Entscheidung Branch 3
- [ ] Schema-Migration 06b reviewen + applizieren
- [ ] Cluster-Review (52 Pages) — DELETE-Freigaben
- [ ] Tippfehler 'Risssschaden' Hotfix mergen
- [ ] Stripe Webhook Secret erneuern (vor Pilot)
- [ ] T3 Make-Scenario manuell aktivieren
- [ ] F1 Make-Scenario manuell aktivieren

---

## EDGE FUNCTIONS LIVE STATE

| Function | Version | Status |
|---|---|---|
| `ki-proxy` | v1 | live |
| `whisper-diktat` | v1 | live |
| `send-email` | v1 | live |
| `stripe-webhook` | v1 | live |
| `lifecycle-trigger` | v1 | live |
| `audit-write` | v1 | live |
| `ical-feed` | v1 | live |
| **`brief-generate`** | **v3 (X3 Service-Role)** | **← LIVE seit 30.04. 00:30** |
| **`pdf-generate`** | **v3 (X4 Service-Role)** | **← LIVE** |

---

## LESSONS-LEARNED HEUTE

- IONOS CNAME muss auf `prova-systems.netlify.app` zeigen (NICHT `prova-systems.de`)
- Service-Role-Pattern X3+X4 funktioniert: User-JWT für Reads, Service-Role für Storage+Insert
- DM Sans war richtig für Landing (vs Inter im App-Style)
- Pricing-Page-Diskrepanz zu `index.html` (30 vs 25 Aufträge) — `index.html` angleichen

---

## REPO-REDUKTIONS-POTENZIAL

- **24 Pages** sofort löschbar (Catalog-Reste)
- **+18 Pages** nach `app.html`-Migration
- **Bis zu 70-90 Pages Reduktion** bei voller Marcel-Freigabe (inkl. `briefe/`-Subfolder-Doppel)

---

*Chat-Transport v35 erstellt 30.04.2026, Branch `docs/chat-transport-v35`. Bei Chat-Wechsel diese Datei zuerst lesen.*
