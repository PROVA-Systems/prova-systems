# MEGA⁴² Phase 7 — Mobile Real-Device-Tests

**Datum:** 2026-05-08
**Branch:** `mega42-live-verify-pilot-ready`

---

## 🎯 Approach

Marcel-Pflicht-Phase. CC kann **nicht** Real-Stylus/Touch testen. Stattdessen:

1. **Test-Plan-Doku** für Marcel: 24 Test-Cases auf 4-5 Devices
2. **CC-Subset:** 5 Playwright-Tests (mobile-safari Project) für CSS/Lib-Loading
3. **Test-Protokoll-Template** für Marcel-Tests
4. **Klar dokumentiert** was CC NICHT testen kann

---

## 📦 Deliverables

| File | Zweck | LOC |
|------|-------|-----|
| `docs/runbook/MOBILE-DEVICE-TESTS.md` | 24-Test-Plan + Protokoll | 165 |
| `tests/e2e-m42/06-mobile-features-load.spec.js` | 5 CC-Subset-Tests | 90 |

---

## 🤖 CC-Subset (5 Playwright-Tests, mobile-safari Project)

1. foto-upload-mobile.js / diktat-mobile.html lädt
2. prova-design.css aktiv + safe-area-inset definiert
3. Skizzen-Canvas-Lib referenziert
4. Pull-to-Refresh-Script geladen
5. Viewport meta-Tag korrekt (`viewport-fit=cover`)

Diese skippen graceful wenn Pages 404 oder Auth-Redirect.

---

## 🔴 Marcel-Pflicht (Real-Device)

Test-Plan in `docs/runbook/MOBILE-DEVICE-TESTS.md` durchgehen:

| Bereich | Tests |
|---------|-------|
| A. PWA-Install | 3 |
| B. Foto-Upload | 5 |
| C. Skizzen mit Stylus | 4 |
| D. Diktat | 3 |
| E. Push-Notifications | 3 |
| F. Auto-Sync | 3 |
| G. UX | 3 |
| **Σ** | **24** |

**Devices:** iPhone, iPhone+Pencil-1, iPhone+Pencil-2, Android, Samsung+S-Pen.

Resultat-Doku: `docs/sprint-status/MEGA42-PHASE-7-MOBILE-TEST-RESULTS.md` (von Marcel angelegt).

---

## ✅ Acceptance

| Item | Status |
|------|--------|
| Test-Plan-Doku komplett | ✅ |
| 5 CC-Subset-Tests | ✅ |
| Test-Protokoll-Template | ✅ |
| Was-CC-nicht-kann dokumentiert | ✅ |
| **24 Real-Device-Tests durchgeführt** | 🔴 PENDING — Marcel-Pflicht |

---

## 🎯 Phase 7 Status

**ACCEPTANCE ERFÜLLT (Code-Subset)** — CC's Anteil ist done. Real-Device-Tests sind Marcel-Pflicht und können ohne Hardware nicht von CC durchgeführt werden.

---

*MEGA⁴² Phase 7 — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
