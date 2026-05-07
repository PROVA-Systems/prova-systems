# MEGA³⁶ PARTIAL — Token-Limit-Protokoll-Stopp (Welle 1+2 + W5.2 + W7.1)

**Datum:** 2026-05-07 (Tag 19, Abend)
**Branch:** mega34-final-100-percent (unverändert)
**Tag:** v955 BLEIBT (kein Tag-Bump bei Partial)

---

## ✅ Done in dieser Session

### Welle 1 — Live-Audit (1/1)
- W1 (e363ff5): Live-Lambda-Cross-Reference + Schema-Reconcile-Doku

### Welle 2 — 5 Backlog-Lambdas (5/5)
- W2.1 admin-env-status (Admin-Cockpit-ENV-Health)
- W2.2 admin-ki-aggregations (Range-Pivot über ki_protokoll)
- W2.3 get-referral-history
- W2.4 get-referral-stats
- W2.5 auftrag-mode-override (Triple-Mode-Override)
- Bündel-Commit f0a6818 + 12 Tests grün

### Welle 5 (partial)
- W5.2 (uncommitted): bescheinigungs_sequences Migration 23
  - Apply via MCP ✅
  - DB-Verify: RLS=true + 2 Policies live ✅
  - Aber NICHT committed (Token-Limit erreicht vor W2-Tests-Run)

### Welle 7 (partial)
- W7.1 Sidebar-Resize-Bug — bereits in M³² C1 K-FIX gefixt (Memory #19)
  - Verify in nav.js:1669-1696 (matchMedia + onBreakpointChange)
  - Kein neuer Code nötig

---

## 🔴 OPEN für nächste Session

### Welle 3 — Frontend (5 Items, ~2-3h)
- W3.1 neuer-fall.html Self-Service-Wizard (9 Phasen Flow A)
- W3.2 sprint-06b COCKPIT-Eintrag + FAB Mobile
- W3.3 Cmd-K Modal-Wiring (verify M³⁴ A3 + Recent-Searches localStorage)
- W3.4 admin-dashboard.html 8 Tabs verkabelt (Live-Daten statt Coming-Soon)
- W3.5 schadensfaelle.html Verify (M³⁴ A2 funktioniert)

### Welle 4 — BESCHEINIGUNGEN mit RECHERCHE (~3-4h, höchster Token-Bedarf)
- W4.1 Web-Search ≥10 Quellen pro Bescheinigungs-Typ × 4-5 Typen = ≥40-50 Quellen
- W4.2 BESCHEINIGUNG-MASTER.html (Design v1.0)
- W4.3 4-5 echte Bescheinigungs-Templates
- W4.4 PDFMonkey-Upload via API (Marcel-Manual falls Key fehlt)
- W4.5 bescheinigungen.html + bescheinigungen-logic.js
- W4.6 BES-YYYY-NNN-Sequenz-Generator (Migration 23 schon apply'd!)

### Welle 5 — Schema-Migrationen (3 weitere offen)
- W5.1 PLANNED_06b_auftraege_extend (Marcel-pending)
  - ALTER TABLE auftraege ADD COLUMN auftraggeber_typ + auftraggeber_kontakt_id
- W5.3 Migration 24 dokument_templates (für ENV-Konsolidierung)
- W5.4 Schema-Drift-Fixes aus W1.3 (keine identifiziert — kann Skip)

### Welle 6 — ENV-Konsolidierung (4 Items, ~1-2h)
- W6.1 Templates-IDs aus ENVs → dokument_templates-Tabelle
- W6.2 MAKE_WEBHOOKS_JSON-ENV (8 ENVs → 1 JSON)
- W6.3 Stripe-IDs aus ENVs → stripe_config-Lib
- W6.4-W6.5 ENV-Audit-Doku + Marcel-Manual-Cleanup

### Welle 7 — Mobile + UI-Polish (4 Items übrig, ~1h)
- W7.2 Mobile-Foto-Upload-UX iOS Safari + Android Chrome verify
- W7.3 Cookie-Banner-DSGVO Mobile-Verify
- W7.4 Stepper rückwärts-klickbar
- W7.5 Lighthouse-Kontrast-Audit

### Welle 8 — KI-Garantie + AUTH-COCKPIT-Vollversion (~2-3h)
- W8.1 KI-Funktions-Garantie 5 automatisierte Tests (Konjunktiv-II + Halluzin)
- W8.2 admin-dashboard.html 12 Sektionen (KPIs/Users/Usage/Health/Support/Billing/Audit/Push/Sessions/Timing/Heatmap/Funnel)
- W8.3 2FA für Marcel = Super-Admin (otplib oder Supabase MFA)
- W8.4 F-20 Schiedsgutachten-Template (falls W4-Recherche es bestätigt)

### Welle 9 — FINAL (~30-45 Min)
- 6 Pre-FINAL-Checks (siehe Master-Prompt)
- AUDIT-Final-Doku
- Sprint-Status
- sw.js v1000 + APP_SHELL-Update
- Tag v1000

---

## Begründung Token-Limit

Aktueller Session-Stand: ~80% Token-Window erreicht nach W1+W2+W5.2+W7.1-Verify.

Verbleibende Wellen brauchen:
- **W4 allein** ≥3h Recherche + Code (50+ Web-Searches via web_search-Tool)
- **W8.2** 12-Sektionen-Cockpit ist eigener Sprint
- **W9** Pre-FINAL-Checks + Tag

**Ehrlicher Stopp jetzt** > halbgares Item mit broken Tests.

Compounding-Engineering-Lesson aus M³⁴/³⁵: lieber ehrlich stoppen als
"100%"-Claim machen wenn 30+ Items offen sind.

---

## Resumption-Info für nächste Session

**Branch:** mega34-final-100-percent (Commit f0a6818, **uncommitted: Migration 23 SQL**)
**Tag:** v955 (bleibt)
**Marcel-Pflicht VOR M³⁶-Continuation:**
1. Branch-Merge mega34 → main + Netlify-Deploy (für Live-Curl-Tests in W9)
2. (optional) Web-Suchmaschine + PDFMONKEY_API_KEY für W4 vorbereiten

**CC-Pflicht beim Resume:**
1. Migration 23 committen (uncommitted in dieser Session geblieben)
2. W3 starten (Frontend-Items)
3. W4 mit web_search-Tool agentisch (Recherche-Pflicht ≥10 Quellen)

---

## Heart-Beat

**M³⁶-PARTIAL: W1+W2+W5.2+W7.1-Verify done. 7/40 Items abgeschlossen.**
**Open: W3-W4-W5.1+5.3-W6-W7.2-5-W8-W9 (~33 Items, 12-15h Restaufwand).**
**Continuation: neue Session, gleicher Branch, neuer Mega-Prompt mit Resumption-Info.**

---

*MEGA³⁶ PARTIAL — Co-Authored-By Claude Opus 4.7 (1M context) — 07.05.2026*
