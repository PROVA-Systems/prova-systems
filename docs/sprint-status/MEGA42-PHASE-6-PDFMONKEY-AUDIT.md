# MEGA⁴² Phase 6 — PDFMonkey Live-Audit

**Datum:** 2026-05-08
**Branch:** `mega42-live-verify-pilot-ready`

---

## 🎯 Approach

M⁴¹ P9 baute Lambda `admin-pdfmonkey-inventory.js` für Audit. M⁴² P6 ergänzt:
- Local-Run-Script für Marcel
- 14 Pure-fn-Tests für Audit-Logic
- Comprehensive Runbook mit Drift-Behebungs-Pattern

---

## 📦 Deliverables

| File | Zweck | LOC |
|------|-------|-----|
| `scripts/pdfmonkey-audit-runner.js` | Local-Run-Wrapper | 130 |
| `tests/pdfmonkey-audit/m42-p6-audit-runner.test.js` | 14 Tests | 130 |
| `docs/runbook/PDFMONKEY-AUDIT.md` | Runbook + Drift-Behebung | 110 |

---

## 📊 Was getestet wird (14 Pure-fn Tests)

- **computeDrift (5 Tests):** matched-detection, missing_in_supabase, missing_in_pdfmonkey, empty-inputs, ignore-rows-without-id
- **checkCompliance (5 Tests):** §407a counter, EU-AI-Act counter, gpt-4o offenders, body+identifier+name combine, empty
- **API Existence (4 Tests):** exports, shebang, Lambda existiert, Runbook existiert

---

## 🚀 Live-Run Anleitung

```bash
PDFMONKEY_API_KEY=mky_xxx \
SUPABASE_URL=$SUPABASE_URL \
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  node scripts/pdfmonkey-audit-runner.js
```

ODER via deployed Lambda:
```bash
curl -H "Authorization: Bearer $PROVA_ADMIN_TOKEN" \
     https://prova-systems.de/.netlify/functions/admin-pdfmonkey-inventory
```

---

## ✅ Acceptance

| Item | Status |
|------|--------|
| Audit-Runner local | ✅ |
| Pure-fn Tests grün | ✅ (14/14) |
| Runbook + Drift-Behebungs-Pattern | ✅ |
| **Live-Audit gegen PDFMonkey-API durchgeführt** | 🔴 PENDING — Marcel-Pflicht |
| **Drift-Liste behoben** | 🔴 PENDING — Marcel-Pflicht |

---

## 🔴 Marcel-Pflicht (Live-Audit)

1. Lokal: `PDFMONKEY_API_KEY=xxx node scripts/pdfmonkey-audit-runner.js` → Drift-Liste sehen
2. Bei `gpt-4o`-Offenders: Templates updaten (deprecated)
3. Bei `missing_in_supabase`: dokument_templates Tabelle erweitern
4. Bei `missing_in_pdfmonkey`: Templates anlegen oder Refs entfernen
5. Bei §407a/AI-Act < 80%: Templates ergänzen
6. Resultat in M⁴² Phase 13 dokumentieren

---

## 🎯 Phase 6 Status

**ACCEPTANCE ERFÜLLT (Code)** — Audit-Runner + Tests + Runbook.
**🔴 LIVE-AUDIT PENDING** — Marcel braucht PDFMONKEY_API_KEY-Setup + Drift-Behebung.

---

*MEGA⁴² Phase 6 — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
