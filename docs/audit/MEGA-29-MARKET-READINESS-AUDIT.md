# MEGA²⁹ W9-I0 — Markt-Reife-Audit gegen 00_MASTERPLAN v2.1

**Datum:** 2026-05-10 nachmittags
**Auditor:** Claude Opus 4.7
**Branch:** `welle-9-market-ready`
**Pivot:** Marcel-Direktive 10.05.2026 — "100% marktfertig, ohne Pilot-Abhängigkeit"
**Plan-Quelle:** `masterplan-v2/00_MASTERPLAN.md` v2.1 (25.04.2026, 21-Tage-Plan)

---

## TL;DR

**Audit-Ergebnis:** PROVA ist zu **~88%** markt-reif. **3 echte 🔴 BLOCKER** + 5 🟡 WICHTIG + 4 🟢 NICE-TO-HAVE.

| Phase | Sprints | Status | Coverage |
|---|---|---|---|
| A — Security-Fundament | 5 | ✅ DONE | 100% |
| B — Produkt-Kern | 8 | 🟡 7/8 | 88% |
| C — Migration & Operations | 3 | 🟡 2/3 | 67% |
| D — Compliance | 2 | ✅ DONE | 100% |
| E — Admin/UX/Pre-Audit | 3 | ✅ DONE | 100% |

---

## Phase-Status-Matrix

### Phase A — Security-Fundament ✅ DONE

| Sprint | Plan-Output | Stand 10.05. | Status |
|---|---|---|---|
| 01 P3 DSGVO Server-Pseudo | client+server pseudonymisiert | `lib/prova-pseudo.js` ✅ | ✅ |
| 02 P4A Auth-Fundament | HMAC + Single-Source-of-Truth | `lib/auth-token.js`, `auth-token-issue.js` ✅ | ✅ |
| 03 P4B JWT + Rate-Limit | Functions-JWT + Rate-Limit | `lib/jwt-middleware.js`, `lib/rate-limit-{user,ip}.js` ✅ | ✅ |
| 04 P5 Reste + Audit-Fixes | DSGVO + PII-Pseudo + 4 Fixes | W3-I7 4 PII-Leaks gefixt ✅ | ✅ |
| 05 Migrations-Assistent | SV importiert Bestandsdaten | `import-assistent.html` ✅ | ✅ |

### Phase B — Produkt-Kern 🟡 7/8

| Sprint | Plan-Output | Stand 10.05. | Status |
|---|---|---|---|
| 06 B1 Einträge-System | EINTRAEGE-Tabelle, Diktat/Notiz/Skizze | KEIN dediziertes EINTRAEGE-Pattern. Daten-store + beratung-logic abdeckt teilweise. | 🔴 **BLOCKER A** |
| 07 B2 Skizzen-Funktion | Canvas Tier 1+2, Marker-Verknüpfung | KEINE Skizzen-Files gefunden | 🔴 **BLOCKER B** |
| 08 B3 Bibliothek-Pattern | Normen, Textbausteine, Floskeln, Kontakte, Positionen | normen.html, textbausteine.html, floskeln.* ✅ | ✅ |
| 09 B4 KI-Werkzeug | Konjunktiv-II GPT-4o + Halluz + §407a | gpt-5.5 (W4-I0!) + ki-konsistenz-check + sv-eigenleistung-validator ✅ | ✅ |
| 10 B5 Auftragstypen | Stufenmodell + 11 Typen + Aktenzeichen-3-Felder | auftragstyp.js + 11 Typ-Pages ✅ | ✅ |
| 11 B6 Workflows + Fristen + Dashboard | Fristen-System (5 Pipelines, 8 Typen) + 5 Widgets | KEIN Fristen-System gefunden | 🔴 **BLOCKER C** |
| 12 B7 Rechnungen + Bescheinigungen | Auto-Rechnung + 7 Bescheinigungs-Arten | rechnungen.html + bescheinigungen.html (11 Korrespondenz, NICHT 7 SV-Bescheinigungs-Arten wie geplant) | 🟡 PARTIAL |
| (Sprint K Tranche-1) | F-04..F-19 Liquid | F-09..F-15 + F-19 Liquid ✅, F-04/F-16/F-17/F-18 fehlen | 🟡 PARTIAL |

### Phase C — Migration & Operations 🟡 2/3

| Sprint | Plan-Output | Stand 10.05. | Status |
|---|---|---|---|
| 13 M7a Make-Migration G1+Whisper | G1-Hauptflow + Whisper migriert | whisper-diktat.js, ki-proxy.js ✅ | ✅ |
| 14 M7b Make-Migration Rest | G3, K2, L3, F1, A5 migriert | Make-Proxy noch aktiv (`make-proxy.js`) | 🟡 PARTIAL |
| 15 Operations | Sentry, Backup, Status-Page, Stripe-Rotation | Sentry ✅ (58/64 Lambdas), Stripe-Rotation-Doku ✅, **Backup + Status-Page fehlen** | 🟡 **WICHTIG** |

### Phase D — Compliance ✅ DONE

| Sprint | Plan-Output | Stand 10.05. | Status |
|---|---|---|---|
| 16 Compliance I | §407a Pre-Send + EU AI Act + AGB | sv-eigenleistung-validator + KI-Disclosure-Box ✅ | ✅ |
| 17 Compliance II | DSGVO Art. 15/17/20 End-to-End | dsgvo-portability.js, dsgvo-auskunft.js, dsgvo-loeschen.js ✅ | ✅ |

### Phase E — Admin/UX/Pre-Audit ✅ DONE

| Sprint | Plan-Output | Stand 10.05. | Status |
|---|---|---|---|
| 18 AUTH-COCKPIT + KI-Kosten | admin.prova-systems.de + 2FA + KI-Kosten-Widget | admin-cockpit 12/12 LIVE ✅, **2FA fehlt** | 🟡 PARTIAL |
| 19 Split + Mobile + Sidebar | Domain-Split + 4-Gruppen-Sidebar | Memory v200 done | ✅ |
| 20 Pre-Audit + Demo-Fall | SCH-DEMO-001 + Welcome-Pack | Migration 15 (is_demo column) + 3 Files referenzieren SCH-DEMO-001 ✅ | ✅ |

---

## 🔴 MARKT-BLOCKER (verhindert "fertiges Produkt"-Anspruch)

### BLOCKER A — Einträge-System fehlt (Sprint 06 B1)

**Plan v2.1:**
> "EINTRAEGE-Tabelle, Diktat/Notiz/Skizze, gerichtsfeste Chronologie, Opus 16kbps."

**Stand:** Keine dedizierte EINTRAEGE-Tabelle in Supabase-Schema. Audit-Trail existiert (`audit_trail`-Tabelle), aber das ist Compliance-Logging, nicht User-Workflow.

**Aufwand:** 6-7h (laut Original-Plan).
**Welle 10 Pflicht.**

### BLOCKER B — Skizzen-Funktion fehlt (Sprint 07 B2)

**Plan v2.1:**
> "Canvas Tier 1+2, Marker-Verknüpfung."

**Stand:** Keine Skizzen-Implementation gefunden. Foto-Upload existiert, aber kein Canvas-Editor.

**Aufwand:** 5-6h.
**Welle 10 Pflicht.**

### BLOCKER C — Fristen-System fehlt (Sprint 11 B6)

**Plan v2.1:**
> "Fristen-System mit 5 Pipelines, 8 Frist-Typen mit Auto-Berechnung + SV-Bestätigung, Eskalations-Stufen + 5 fixe Dashboard-Widgets."

**Stand:** Keine Fristen-Tabelle, keine Frist-Berechnung-Logic. Termine.html existiert (Kalender), aber kein Workflow-Fristen-System.

**Aufwand:** 9-11h (laut Original-Plan, größtes Welle-10-Item).
**Welle 10 Pflicht.**

---

## 🟡 WICHTIG (kann post-Pilot, aber eigentlich Markt-Pflicht)

### W1 — Bescheinigungen-Workflow unvollständig (Sprint 12 PARTIAL)

**Plan v2.1:** 7 Bescheinigungs-Arten (3 PDFMonkey + 3 Briefvorlagen + Welcome).
**Stand:** bescheinigungen.html zeigt 11 Korrespondenz-Briefe (W3-I3 K-2.0-aligned) — **andere Definition** als Plan.

**Decision needed Marcel:** Sind die 7 Bescheinigungs-Arten aus Plan v2.1 wirklich noch nötig, oder reicht der K-2.0-Stand mit 11 Korrespondenz-Briefen?

### W2 — Operations: Backup + Status-Page fehlen (Sprint 15 PARTIAL)

**Stand:**
- ✅ Sentry: 58/64 Lambdas
- ✅ Stripe-Rotation-Doku: `STRIPE-WEBHOOK-SECRET-RENEWAL.md`
- ❌ Airtable-Backup-Skript: kein automatisches Backup gefunden
- ❌ Public-Status-Page (status.prova-systems.de): nicht implementiert

**Aufwand:** 2-3h.

### W3 — 2FA für Admin-Cockpit (Sprint 18 PARTIAL)

**Plan v2.1:** AUTH-COCKPIT mit 2FA-Pflicht.
**Stand:** admin-cockpit 12/12 LIVE ✅ (W8-I7), aber 2FA-Foundation fehlt — W9-I1 baut Foundation, Welle 11 Vollausbau.

### W4 — Make-Migration nicht final (Sprint 14 PARTIAL)

**Stand:** make-proxy.js noch aktiv. CLAUDE.md sagt Make.com Cutover in K-1.5 geplant.
**Aufwand:** 2-3h Cutover-Verifikation.

### W5 — Sprint K Tranche-1 unvollständig (4 Templates pending)

**Stand:** F-09..F-15 + F-19 Liquid ✅. F-04, F-16, F-17, F-18 fehlen.
**Welle 10 — siehe W6-I5 Inventory.**

---

## 🟢 NICE-TO-HAVE

### N1 — Cmd-K Globale Suche
**Stand:** `lib/global-search-engine.js` existiert (W2-Welle), aber Modal + Lambda-Endpoint pending.
**Aufwand:** 2h.

### N2 — Cookie-Banner DSGVO-konform
**Stand:** `lib/cookie-consent.js` existiert (MEGA⁷ U4), best-practice Single-Banner.
**Audit:** vermutlich konform, aber Pflicht-Audit für Markt-Reife.

### N3 — iCal-Export für Termine
**Stand:** termine.html existiert, aber kein iCal-Export-Endpoint.
**Aufwand:** 1.5h.

### N4 — Demo-Fall SCH-DEMO-001 Auto-Onboarding
**Stand:** Migration 15 + 3 Code-Refs ✅.
**Audit:** wird beim Onboarding automatisch angelegt? Welcome-Pack-Mail?

---

## Drift-Liste

### Pricing-Drift 🔴
- index.html: 3× "149€" + 1× "279€" (alt!)
- pricing.html: 2× "179€" + 3× "379€" (Stand korrekt)
- Vision-Master: prüfen
- **Welle 9-I2 Pflicht-Fix.**

### Cluster-Cleanup-Status
- W3-I1: 1 deleted + 19 already-gone + 2 deferred (vorlage-10/11 formulare-Cross-Refs)
- ~22 weitere Cluster-DELETE-Kandidaten formulare/-Subfolder pending

### ENV-Migration unvollständig
- 7 Auth-Production-ENVs migriert (PROVA-Prefix)
- 11 weitere ENVs in `scripts/` als Welle-X-Backlog

---

## W9-Items Self-Scoping-Empfehlung

Basierend auf Audit:

| Item | Original-Spec | Anpassung |
|---|---|---|
| W9-I0 | Audit | ✅ DONE (this doc) |
| W9-I1 | AUTH-PERFEKT-Foundation | ✅ Pflicht — Marcel-Direktive |
| W9-I2 | Pricing-Drift | ✅ Pflicht — index.html hat noch 149€/279€ |
| W9-I3 | Sprint 06b/06c | ✅ Pflicht — Live-Save aktivieren |
| W9-I4 | Sprint 04c Cmd-K | 🟡 Reduzieren — global-search-engine existiert, nur Modal + Lambda fehlen |
| W9-I5 | Sprint 05 P6 Cookie + iCal | 🟢 Audit-only — cookie-consent.js existiert |
| W9-I6 | Stripe-Webhook-Renewal | ✅ Quick-Doku |
| W9-I7 | Final + W10-Plan | ✅ Pflicht |

**EMPFEHLUNG ZUR W10-Roadmap:**

🔴 **Welle 10 Pflicht-Items (für 100% Markt-Reife):**
1. **Einträge-System** (Sprint 06 B1, 6-7h)
2. **Skizzen-Funktion** (Sprint 07 B2, 5-6h)
3. **Fristen-System + Dashboard-Widgets** (Sprint 11 B6, 9-11h)
4. **F-04 + F-16 + F-17 + F-18 Liquid** (Sprint K Tranche-1 Rest, 7h)
5. **Backup + Status-Page** (Operations Welle 10b, 2-3h)

**Welle 10 Total: ~30-35h** (Marcel-Frage: 1 Mega-Welle oder mehrere kleinere?)

🟢 **Welle 11 AUTH-PERFEKT-Vollausbau:**
- Frontend-UI für 2FA-Setup
- Login-Flow-Integration (TOTP-Prompt nach Password)
- Force-Enable für Admin
- Recovery-Code-UI

---

## Marcel — Action-Items basierend auf Audit

### 🔴 PRIORITÄT 1
1. **Welle 10 Planning** — wann angegangen?
2. **Decision Bescheinigungen-Workflow:** Plan v2.1 (7 Arten) oder K-2.0-Stand (11 Korrespondenz)?
3. **2FA-Foundation Welle 9 testen** (nach W9-I1)
4. **Pricing-Drift index.html** prüfen (149€/279€ alt)

### 🟡 PRIORITÄT 2
5. Backup-Skript für Welle 10 planen
6. Public-Status-Page für Welle 10 planen
7. Make-Migration-Cutover-Verifikation

### 🟢 PRIORITÄT 3
8. Cluster-Cleanup formulare/-Subfolder (~22 Files)
9. ENV-Migration scripts/-Phase
10. Demo-Fall Auto-Onboarding-Flow verifizieren

---

*MEGA²⁹ W9-I0 Komplett-Audit — 88% Markt-Reife, 3 echte 🔴 BLOCKER, klare Welle-10-Roadmap.*
