# 🌅 MEGA⁴² — LIVE-VERIFIED + 100% PILOT-READY

**Owner:** Marcel Schreiber
**Branch:** `mega42-live-verify-pilot-ready`
**Tag:** v1400 → v1500 (nur bei N/N Live-Verified-Acceptance)
**Modus:** AUTONOMOUS
**Geschätzt:** 30-40h CC-Zeit + 4-6h Marcel-Real-Device-Tests, 6-8 Sessions

---

## 🚨 EXECUTIVE CONTEXT

M⁴¹ hat alle 13 Audit-Punkte auf **Code-Done** gehoben. Web-Claude-Auswertung zeigt: viele Acceptance-Items wurden zu Source-Inspection-Tests gewandelt statt Live-Behavior-Tests. M⁴² schließt diese Lücken.

**Web-Claude-Auswertung (Pflicht):**
> "Code-Done ≠ Live-Verified. Du hast einen Code-Pilot-Ready State, nicht einen Live-Pilot-Ready State."

**M⁴¹-Lücken die M⁴² schließt:**
1. Phase 8 Stepper: Foundation gebaut, 4 Workflows NICHT migriert
2. Performance-Tests: 0 Messungen
3. Playwright-E2E-Suite: nicht existiert
4. Push-Alerts: ENV+pg_cron+VAPID-Setup unverifiziert
5. PDFMonkey Live-Audit: nicht durchgeführt
6. Mobile Real-Device-Tests: 0
7. Auth-Audit über alle neuen Lambdas: 0
8. DSGVO Email-Roundtrip: 0
9. Pilot-Onboarding-Material: nicht existent
10. Production-Runbook: nicht existent

**Self-Scoping-Entscheidung Branch-Setup:**
Master-Prompt sagte "von main post-M⁴¹-Merge". Da M⁴¹ noch nicht zu main gemerged war (Marcel-Pflicht laut CLAUDE.md), Branch direkt von `mega41-pre-pilot-completion` (Tag v1400). Marcel kann später mega41 → main mergen, dann mega42 darauf.

---

## 🛡️ ANTI-ABKÜRZUNGS-REGELN

```
1.  Phase 0 PFLICHT — Live-State-Audit auf prova-systems.de
2.  Per-Item-Push (1 funktionales Item = 1 Commit)
3.  Heart-Beat alle 5 Items
4.  Token-Limit ehrlich bei <15%
5.  KEIN Branch-Merge zu main durch CC (Marcel-Pflicht)
6.  KI-Modelle: gpt-5.5 + gpt-5.5-instant (NIEMALS gpt-4o)
7.  Performance-Messungen MIT Zahlen dokumentieren
8.  Marcel-Pflicht-Items klar markiert mit 🔴 MARCEL-MANUAL
9.  sw.js CACHE_VERSION in JEDEM Commit bumpen
10. Working-Tree-Disziplin
11. Bei Live-Tests: Screenshot oder Konsolen-Output dokumentieren
12. Acceptance = "Live-Verified" oder "🔴 Marcel-Pflicht erklärt"
```

---

## 🎯 PHASEN-ÜBERSICHT

| Phase | Bereich | Aufwand | Tests-Ziel |
|-------|---------|---------|------------|
| 0 | Live-State-Audit | 1-2h | – |
| 1 | Komplett-Test-Run + Bug-Fixes | 2-3h | 0 Failures |
| 2 | Stepper-Migration 4 Workflows | 5-7h | 20+ |
| 3 | Playwright E2E-Suite Live | 5-7h | 5 .spec.js |
| 4 | Performance-Measurement-Suite | 3-4h | 6 Perf-Tests |
| 5 | Push-Alerts End-to-End-Verify | 2-3h | – |
| 6 | PDFMonkey Live-Audit | 3-4h | 30+ Renders |
| 7 | Mobile Real-Device-Tests | 2-3h + 🔴 | – |
| 8 | Auth-Sicherheits-Audit | 3-4h | 15+ |
| 9 | DSGVO Roundtrip-Tests | 2-3h | 10+ |
| 10 | Pilot-Onboarding-Material | 3-4h | – |
| 11 | Production-Runbook + Monitoring | 2-3h | – |
| 12 | Compound-Live-Tests | 2-3h + 🔴 | – |
| 13 | FINAL + Tag v1500 | 1h | – |

---

## 🚨 TOKEN-LIMIT-PROTOKOLL

```
Session 1: Phase 0 + 1 (Live-State + Tests)              ~3-5h
Session 2: Phase 2 (Stepper-Migration 4 Flows)           ~5-7h
Session 3: Phase 3 (Playwright)                          ~5-7h
Session 4: Phase 4 + 5 (Performance + Push-Alerts)       ~5-7h
Session 5: Phase 6 + 7 (PDFMonkey + Mobile-Setup)        ~5-7h
Session 6: Phase 8 + 9 (Auth + DSGVO)                    ~5-7h
Session 7: Phase 10 + 11 (Onboarding + Runbook)          ~5-7h
Session 8: Phase 12 + 13 (Compound + FINAL)              ~3-4h
```

---

## 🎯 ERFOLGS-MESSUNG

Nach M⁴²-FINAL erfüllt PROVA:

```
✅ 561 + 50+ neue Auth/Performance/E2E-Tests grün
✅ 4 Workflows konsistent auf wizard-stepper migriert
✅ Performance-Zahlen für 6 kritische Pfade
✅ Playwright-E2E-Suite läuft (5/5 oder dokumentierte Issues)
✅ Push-Alerts kommen tatsächlich auf Marcel's Gerät an
✅ PDFMonkey-Live-Audit grün, alle Templates render-getestet
✅ Real-Device-Tests durchgeführt
✅ Auth-Audit grün auf 50+ Lambdas
✅ DSGVO-Roundtrip live verifiziert
✅ 5-Mail-Welcome + Tutorial + Demo-Daten + Vereinbarung
✅ Production-Runbook + Monitoring-Dashboard
✅ Compound-Live-Tests von Marcel selbst durchlaufen
```

= **ECHT 100% Pilot-Ready. Live-Verified. Mit Performance-Zahlen.**

---

*Vollständiger Master-Prompt: siehe Marcel-Übergabe-Nachricht 2026-05-08.
Dieses File ist eine Kurz-Referenz. Die Acceptance-Detail-Items sind in den jeweiligen
docs/sprint-status/MEGA42-PHASE-N-*.md beschrieben.*

🚀 **GO.**
