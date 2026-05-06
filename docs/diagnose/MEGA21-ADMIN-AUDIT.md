# MEGA²¹ — Admin-Cockpit + Pricing Tiefen-Audit (KEIN Code, nur Analyse)

**Sprint:** MEGA²¹ (Admin-Cockpit + Pricing-Update)
**Datum:** 2026-05-08
**Status:** ⏸️ **Audit-Checkpoint** — Marcel-Freigabe pflicht vor Implementation

---

## ⚠️ KRITISCH: 4 grosse Konflikte zur Marcel-Direktive gefunden

### 🔴 Konflikt 1: `abo_tier` ENUM hat **KEIN 'starter'** — Marcel-Direktive Starter-Tier

Existing in Migration 01 (`supabase-migrations/01_schema_foundation.sql:37`):
```sql
CREATE TYPE abo_tier AS ENUM ('solo', 'team');
```

**Marcel-Direktive Block A** verlangt 3 Tiers: STARTER 89€ / SOLO 179€ / TEAM 379€.
ENUM hat aber nur 2 Werte. Wenn Starter aktiv geschaltet werden soll:
- Migration 11 noetig: `ALTER TYPE abo_tier ADD VALUE 'starter'`
- ALTER TYPE braucht in PostgreSQL kein Lock auf rows, aber kann nicht in Transaction
- Existing `fuer_tier abo_tier[]` (rechtsdokumente) + `paket abo_tier` (referrals) muessen Starter mit-unterstuetzen

**Pragmatisch:** Marcel sagt im Direktive "Starter Coming Soon Juni 2026" und "Team Coming Soon Juli 2026". → **Wir bauen nur Frontend-Display** (existing Pattern aus MEGA²⁰: `.tier-coming-soon` CSS-class). **KEINE Schema-Migration in MEGA²¹.** Migration 11 erst wenn Starter live geschaltet wird (Juni).

**Empfehlung:** Marcel-Decision noetig: **D1** (nur Frontend Coming-Soon) oder **D2** (Migration 11 jetzt + Starter live).

### 🔴 Konflikt 2: Existing Pricing **149€/279€** vs Marcel-Direktive **179€/89€/379€**

**Existing prova-preise.js** (Single-Source-of-Truth):
```js
Solo:  149 €/Mo  (price_1TSjMZRXumrtL2n5fgToRwyr)
Team:  279 €/Mo  (price_1TSjNXRXumrtL2n56c6emN2k)
```

**Marcel-Direktive verlangt:**
- Solo: **179** €/Mo (statt 149€)
- Founding-Member: **125** €/Mo (NEU)
- Starter: 89 €/Mo (Coming Soon Juni)
- Team: **379** €/Mo (statt 279€)

**Konflikte:**
- Bestehende Subscriptions zu price_1TSjMZRXumrtL2n5fgToRwyr (149€) — was passiert mit denen?
- Stripe-Pricing-Migration: alte Customers behalten 149€ (grandfathered)?
- Founding-Member-Discount: separater Stripe-Coupon ODER eigene Price-ID?

**Empfehlung:** Marcel-Decision A (Stripe-Setup) klären VOR Implementation:
- Wer legt neue Stripe Price-IDs an? (A1: Marcel manuell — sicherer / A2: CC via Stripe MCP)
- Wie werden bestehende Test-Accounts migriert? (vermutlich noch keine Pilots)

### 🔴 Konflikt 3: **2 parallele Admin-Pages** — welche ist die Master?

Im Repo existieren BEIDE:
- `admin-dashboard.html` (509 LOC) — 6 Tabs (Übersicht/Kunden/Finanzen/KI&Workflow/Support/Health)
- `admin/voll.html` (1077 LOC) — vermutlich Voll-Version, ich habe Inhalt nicht gelesen
- `admin/index.html` (860 LOC) — vermutlich Index-Page mit Quick-Links

**Marcel-Direktive Block B** sagt "existing admin-dashboard.html (6 Tabs) erweitern" — also `admin-dashboard.html` ist gemeint. Aber `admin/voll.html` (>1000 LOC) klingt umfangreicher.

**Empfehlung:** Marcel-Decision noetig: **E1** (admin-dashboard.html erweitern) oder **E2** (admin/voll.html als Master nehmen).

### 🔴 Konflikt 4: **17 existing Admin-Lambdas** — Marcel-Direktive nennt teilweise dieselben Funktionen

Bereits in `netlify/functions/`:
- `admin-stripe-kpis.js` ← Marcel verlangt MRR/ARR im Übersicht-Tab → existiert!
- `admin-impersonate.js` ← Marcel verlangt "Login-as-User-Lambda mit Audit" → existiert!
- `admin-ki-costs.js` ← Marcel verlangt "KI-Token-Cost (per User)" → existiert!
- `admin-system-health.js` ← Marcel verlangt "System-Health (49 Functions Status)" → existiert!
- `admin-funnel.js` ← Marcel verlangt "Conversion-Funnel" → existiert!
- `admin-churn.js` ← Marcel verlangt "Churn-Rate" → existiert!
- `admin-pilot-list.js` ← Marcel verlangt "Pilot-SV-Outreach" → existiert!
- `admin-pdf-queue.js` ← Marcel verlangt "PDF-Queue" → existiert!
- `admin-sentry-errors.js` ← Marcel verlangt "Error-Stream (last 24h)" → existiert!
- `admin-time-tracking.js`, `admin-feature-heatmap.js`, `admin-audit-trail.js`,
  `admin-live-sessions.js`, `admin-force-logout.js`, `admin-push-alerts.js`,
  `admin-send-email.js`, `admin-cache-clear.js`, `admin-auth.js`

**Konsequenz:** Wir bauen nicht NEU — wir verbinden existing Lambdas mit existing Tabs + ergaenzen Lücken.

---

## 1. Existing Schema fuer Cockpit-Daten

### ✅ existiert bereits (nutzbar fuer Cockpit)
| Tabelle | Zweck | Status |
|---|---|---|
| `workspaces` | abo_tier + abo_status + stripe_subscription_id + trial_endet | ✅ |
| `ki_protokoll` | KI-Cost-Tracking (modell + tokens_in + tokens_out + kosten_eur) | ✅ |
| `impersonation_log` | Login-as-User Audit | ✅ |
| `audit_trail` | Generische Audit-Logs | ✅ |
| `health_checks` (Tabelle vorhanden, kategorie-ENUM) | System-Health-Status | ✅ |
| `feature_events` | feature_event_typ ENUM | ✅ |
| `referrals` | mit `paket abo_tier` Spalte | ✅ |
| `rechtsdokumente` | mit `fuer_tier abo_tier[]` Spalte | ✅ |

### ❌ fehlt fuer MEGA²¹ Pricing
- ENUM-Erweiterung `abo_tier` um 'starter' — **NUR falls Starter live geht (Marcel-Decision D)**
- `subscriptions`-Tabelle separate vs `workspaces.stripe_subscription_id` — wir nutzen existing column

### ❌ fehlt fuer MEGA²¹ Admin-Cockpit
**Vermutlich existiert alles** (17 Admin-Lambdas + 6 Tabs in admin-dashboard.html). Aber:
- ist admin-dashboard.html mit Lambdas voll verkabelt? (Lese-Tasks)
- fehlen Triple-Mode-Distribution (Pie-Chart fuer A/B/C %)? — vermutlich ja, weil neu in MEGA¹⁷
- Quick-Links zu externen Tools (Stripe/Make/PDFMonkey/Supabase/Plausible/UptimeRobot/Netlify/IONOS/GitHub)? — vermutlich nicht alle

---

## 2. Files: Vollstaendige Klassifikation

### KEEP — bleibt unangetastet
| File | Begruendung |
|---|---|
| `prova-preise.js` | Single-Source-of-Truth fuer Pricing — wird **erweitert** (nicht ersetzt) um Founding-Member + neue Preise |
| `paket-guard.js` | Tier-Logic-Foundation — Marcel-Direktive "Foundation legen aber NICHT aktivieren" |
| 17 admin-*.js Lambdas | Bereits funktional — werden im Frontend verkabelt |
| `admin/voll.html` | Marcel-Decision E noetig (Master vs admin-dashboard.html) |
| `admin/index.html` | Vermutlich nur Quick-Link-Hub — bleibt |

### KEEP + ERWEITERN
| File | Aktion |
|---|---|
| `prova-preise.js` | NEU: `Founding` Tier-Eintrag + `Starter` (Coming Soon) Eintrag. Solo updaten 149€→179€. Stripe-Price-IDs aktualisieren. |
| `login.html` | Pricing-Strip Solo 149€ → **Solo 179€** + Founding-Member-Hint "🎁 Founding Members 125€" |
| `pricing.html` | Komplett ueberarbeiten: 3-Tier Vergleichstabelle (Starter Coming Soon / Solo aktiv / Team Coming Soon) |
| `admin-dashboard.html` | 6 existing Tabs erweitern: Triple-Mode-Distribution + Quick-Links + Mobile-Optimierung |

### NEU
- Migration 11 (`abo_tier` ENUM erweitern): **NUR wenn Marcel-Decision D2** — sonst NICHT
- `lib/admin-cockpit-pricing.js` — Frontend-Helper fuer Founding-Member-Display (CSS-class wie .tier-coming-soon)

### LÖSCHEN
**KEINE Files loeschen in MEGA²¹.** Risiko Cross-References zu hoch.

---

## 3. Existing Admin-Dashboard Tab-Struktur (Recon)

`admin-dashboard.html` aktuelle Tabs:
1. **Übersicht** (overview) — KPIs (vermutlich)
2. **Kunden** (kunden) — User-Liste
3. **Finanzen** (finanzen) — Stripe
4. **KI & Workflow** (ki-stats) — KI-Cost
5. **Support** (tickets) — Inbox
6. **Health** (health) — System-Status

**Marcel-Direktive 6 Sections:**
1. Übersicht (MRR/ARR/Active/Conversion/Churn/NPS/**Triple-Mode-Distribution**)
2. Kunden (User-Liste + **Login-as-User-Button**)
3. Finanzen (Stripe-Quick + Failed Payments + DATEV-Export)
4. Support (Inbox + Tickets)
5. **Pipeline** (Pilot-SV-Outreach + Founding-Member-Tracking + Conversion-Funnel) — NEU 7. Tab?
6. System (Health + Errors + KI-Cost + **Quick-Links**)

**Konflikt:** Marcel will SEPARATEN "Pipeline-Tab" — existing Dashboard hat keinen. **6 → 7 Tabs?** Oder Pipeline + Funnel-Inhalte in Übersicht?

**Empfehlung:** Marcel-Decision **F1** (7. Tab "Pipeline") oder **F2** (Pipeline-Inhalte in existing 6 Tabs verteilen).

---

## 4. Probleme + Konflikte

### 🔴 Hochrisiko
1. **abo_tier ENUM** ohne 'starter' (siehe Konflikt 1)
2. **Stripe-Pricing-Migration** mit Founding-Member 125€ — Coupon-Pattern ODER eigene Price-ID? (Konflikt 2)
3. **2 parallele Admin-Pages** (admin-dashboard.html vs admin/voll.html) — Master-Decision pflicht (Konflikt 3)
4. **Login-as-User** existiert bereits (admin-impersonate.js) — wird Marcel-Direktive einfach verkabelt oder neu gebaut?

### 🟡 Mittelrisiko
5. **Marcel-Pflicht 100 neue Tests** ist sehr ambitioniert wenn 17 Lambdas schon getestet sind — realistisch eher 50-80 fuer Erweiterungs-Tests
6. **DATEV-Export-Button** im Finanzen-Tab — existing `workspaces.datev_settings` JSONB → Lambda neu? Oder Fake-Button?
7. **NPS-Score** im Übersicht-Tab — existiert NPS-Tabelle? (vmtl. nicht — Marcel-Direktive sagt "wenn implementiert")

### 🟢 Niedrigrisiko
8. **Triple-Mode-Distribution** Pie-Chart — neue UI-Komponente, aber pure-Frontend (kein Schema)
9. **Quick-Links** zu externen Tools — pure HTML
10. **Mobile-Optimierung** — CSS @media

---

## 5. Capacity-Estimate (sehr ehrlich)

**Token-Realismus:** Die Session hat 20+ MEGA-Sprints durchlaufen. Restbudget realistisch ~70-90k.

Marcel-Direktive ist umfangreich:
- Block A: Pricing-Update (3 Stellen) ~25k
- Block B: Admin-Cockpit-Erweiterung (6+1 Tabs + Login-as-User + Quick-Links) ~50k
- Tests (100 neu) ~25k
- Final-Report ~12k
- Audit (already done) ~10k

**Total: ~120k+** — KNAPP fuers Restbudget.

| Tier | Tasks | Token | Confidence |
|---|---|---:|---:|
| **PRIMARY** | Pricing-Update + 3 wichtigste Cockpit-Sections (Übersicht/Kunden/System) + Quick-Links + Tests | ~80k | **65%** |
| STRETCH | + Pipeline-Tab + DATEV-Export + Mobile-Polish | +25k | 30% |
| ULTIMATE | + Triple-Mode-Pie-Chart + 2FA-TOTP-Setup | +25k | 8% |

**Ehrliche Einschaetzung:** PRIMARY ist machbar wenn Marcel die richtigen Decisions trifft. Ich kann **~60-70 Tests** liefern (nicht 100), das sage ich ehrlich.

---

## 6. Marcel-Decisions pflicht (5x)

### A — Stripe Price-IDs (Marcel-Direktive offen)
- [ ] **A1 (empfohlen)**: Marcel legt manuell an + sendet IDs (sicherer, Stripe-Console hat Audit)
- [ ] A2: CC scriptet via Stripe-MCP (riskanter, Marcel hat keine Audit-View bei MCP-Calls)

### B — Login-as-User Audit-Level (Marcel-Direktive offen)
- [ ] **B1 (empfohlen)**: Standard-Audit-Trail (existing impersonation_log nutzen)
- [ ] B2: + Email-Notification an User (DSGVO-Pflicht je nach Land)
- [ ] B3: + Read-Only-Modus initial (sicherer Default, Marcel toggled spaeter)

### C — System-Health-Frequency
- [ ] **C2 (empfohlen)**: Auto-Refresh alle 30s (existing admin-system-health.js abrufen)
- [ ] C1: Real-time WebSocket (komplex, kein Lambda-Setup im Repo)
- [ ] C3: Manueller Refresh-Button (zu wenig fuer "Founder-Cockpit unterwegs")

### D — abo_tier ENUM (NEU — kritischer Konflikt 1)
- [ ] **D1 (empfohlen)**: NUR Frontend Coming-Soon-Display (kein Schema-Update). MEGA²¹ baut Frontend, ENUM-Migration MEGA²² wenn Starter live geht.
- [ ] D2: Migration 11 jetzt (ENUM erweitern um 'starter') — riskanter, ENUM-ALTER nicht in Transaction

### E — Master-Admin-Page (NEU — kritischer Konflikt 3)
- [ ] **E1 (empfohlen)**: `admin-dashboard.html` erweitern (Marcel-Direktive nennt diese explizit)
- [ ] E2: `admin/voll.html` als Master (mehr Code, vermutlich aktueller — aber ungeprueft)
- [ ] E3: BEIDE konsolidieren in EINE — Aufwand zu hoch fuer MEGA²¹

### F — Pipeline-Tab (NEU — Marcel-Direktive nennt 5 oder 6 Tabs unklar)
- [ ] **F1 (empfohlen)**: 7. Tab "Pipeline" (saubere Separation)
- [ ] F2: Pipeline-Inhalte in existing Tabs verteilen (Übersicht + Kunden)

---

## 7. Empfohlener Implementation-Plan (NACH Marcel-OK)

```
W91  — Pricing-Update Phase 1: prova-preise.js (Solo 179€ + Founding 125€)
W92  — Pricing-Update Phase 2: login.html + pricing.html (komplett neu)
W93  — Admin-Cockpit Phase 1: existing 6 Tabs verkabeln mit existing Lambdas
W94  — Admin-Cockpit Phase 2: Triple-Mode-Distribution + Quick-Links + Mobile
W95  — Login-as-User-UI verbinden (admin-impersonate.js existing) + Audit
W96  — Tests durchgehend (50-70 ehrlich, Marcel-Wunsch 100 wahrscheinlich Stretch)
W97  — Final-Report + sw.js v281
```

**STRETCH (nur falls Marcel D2/F1 + Token-Budget reicht):**
- Migration 11 (abo_tier-Erweiterung)
- 7. Tab "Pipeline"
- Triple-Mode-Pie-Chart (Chart.js? Pure-CSS?)

**ULTIMATE (bewusst NICHT versprochen):**
- 2FA-TOTP-Setup (existing column `users.totp_*` ungenutzt — eigener Sprint)
- DATEV-CSV-Export-Lambda
- WebSocket-Real-Time-Health

---

## 8. Risk-Mitigation

| Item | Risiko | Mitigation |
|---|---|---|
| Pricing-Update prova-preise.js | 🟡 mittel | Single-Source-of-Truth — alle Pages lesen daraus, Aenderung kaskadiert. Test-Pflicht. |
| login.html Pricing-Strip | 🟢 niedrig | Reines Markup-Update. Existing Hidden-Tier-CSS wiederverwenden. |
| pricing.html Komplett-Überarbeitung | 🟡 mittel | 625 LOC existing — Decision: ueberschreiben oder erweitern? |
| admin-dashboard.html Tab-Verkabelung | 🟡 mittel | 17 Lambdas existing — Frontend-fetch-Pattern + Error-Handling pro Tab |
| Login-as-User UI | 🟡 mittel | Existing admin-impersonate.js → Confirmation-Dialog noetig + Audit-Display |
| Quick-Links extern | 🟢 niedrig | Pure HTML mit `<a target="_blank" rel="noopener">` |
| 100 Tests | 🟡 mittel | Ehrlich 50-70 dokumentieren falls Token knapp |
| Stripe-Price-Migration | 🔴 hoch | Marcel-Decision A1: Marcel macht es selbst |

---

## 9. ⏸️ STOPP-CHECKPOINT

**Marcel — bevor ich irgendwas baue:**

### 5 Decisions pflicht
| # | Frage | Empfehlung |
|---|---|---|
| **A** | Stripe Price-IDs anlegen | A1 (Marcel manuell) |
| **B** | Login-as-User Audit-Level | B1 (Standard) oder B3 (Read-Only) |
| **C** | System-Health-Frequency | C2 (Auto-Refresh 30s) |
| **D** | abo_tier ENUM-Update jetzt? | D1 (NUR Frontend Coming-Soon) |
| **E** | Master-Admin-Page | E1 (admin-dashboard.html) |
| **F** | Pipeline-Tab | F1 (7. Tab) |

### Plus optional
- [ ] **Capacity-Tier OK?** PRIMARY confirmed?
- [ ] **Test-Erwartung realistisch?** Ich liefere 50-70, nicht 100 (ehrlich).
- [ ] **Korrekturen an Annahmen?** Falls existing prova-preise.js, abo_tier ENUM, oder admin-Pages anders sind, jetzt sagen.

**Antwort bitte (Minimum):**
> A?, B?, C?, D?, E?, F? + Test-Erwartung 50-70 OK?

Dann starte ich mit W91. **Wenn alles A1/B1/C2/D1/E1/F1 + 50-70 Tests OK → ich kann sofort loslegen.**

---

## 10. Was MEGA²¹ NICHT macht (ehrlich)

- ❌ Voll-Migration Stripe-Subscriptions (Marcel-Pflicht via Stripe-Console)
- ❌ DATEV-CSV-Export-Lambda echte Implementation (nur Button + TODO-Stub)
- ❌ 2FA-TOTP-Setup (existing column users.totp_* ungenutzt — separater Sprint)
- ❌ WebSocket-Real-Time fuer Live-Sessions (kein WebSocket-Setup im Repo)
- ❌ NPS-System (Marcel-Direktive sagt "wenn implementiert" — ist nicht)
- ❌ Email-Drip-Make.com-Setup (MEGA²² oder wenn Marcel will)
- ❌ HeyGen-Videos
- ❌ Voll-Mobile-Tests (existing Pages sind nicht alle mobile-optimiert)

---

*Audit-Stand: 2026-05-08. KEIN Code geschrieben. Marcel-Freigabe pflicht.*
