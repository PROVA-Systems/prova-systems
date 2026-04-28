# Mega-Sprint #4 — K-1 AUDIT + CLEANUP + F1 + F2 + F3 — COMPLETE

**Branch:** `sprint-k-1-mega-4-audit-cleanup-und-features`
**Datum:** 28.04.2026 · **Dauer:** ~2.5 h autonome Arbeit
**Status:** TEILWEISE FERTIG (5/6 Phasen grün, 1 NACHT-PAUSE bewusst)

---

## Phase-Status

| Phase | Status | Notiz |
|---|---|---|
| 1. Audit | ✅ | 10 Items gefunden (5 KRITISCH + 3 WICHTIG + 2 NICE) |
| 2. Cleanup | ✅ | 4 KRITISCH + 3 WICHTIG gefixt, NICE bewusst übersprungen |
| 3. F1 PDF-Audit | ✅ | Schema-Match verifiziert, Test-Doku für Marcel |
| 4. F2 Dashboard | ⚠️ NACHT-PAUSE | Architektur-Konflikt prova-config.js — eskaliert |
| 5. F3 K-2 Vorb | ✅ | 2 Master-Doks (Cleanup-Plan + Marcel-Checklist) |
| 6. Schlussmeldung | ✅ | diese Datei + sw.js v236 final-Bump |

---

## 1. Was gefunden wurde (Audit-Findings)

| Pri | File | Issue | Fix-Status |
|---|---|---|---|
| 🔴 | `gutachterliche-stellungnahme.html:73` | `data-page="technische-stellungnahme"` | ✅ CLEANUP.1 |
| 🔴 | `gutachterliche-stellungnahme-logic.js:24` | Kommentar `AZ bleibt TS-` (irreführend) | ✅ CLEANUP.1 |
| 🔴 | `tools/test-pilot-kurzstellungnahme.html:195` | `az: 'TS-2026-TEST'` | ✅ CLEANUP.1 |
| 🔴 | `tools/test-pilot-kurzstellungnahme.html:240` | Payload `'TS-2026-TEST'` | ✅ CLEANUP.1 |
| 🔴 | `docs/CUTOVER-RUNBOOK.md:39` | Stale `/technische-stellungnahme.html` (404) | ✅ CLEANUP.2 |
| 🟡 | `docs/K-1-4-PAGE-MIGRATION-GUIDE.md:12,129` | Pilot-Verweise stale | ✅ CLEANUP.2 |
| 🟡 | `docs/audits/technische-stellungnahme.html-AUDIT.md` | Filename alt | ✅ CLEANUP.3 |
| 🟡 | `sw.js v234` | Pflicht-Bump | ✅ CLEANUP.4 + Final.5 |
| 🟢 | localStorage-Keys `prova_ts_*` | semantisch alt | ⏳ NICE — übersprungen (kein Impact) |
| 🟢 | Historische Sprint-Docs | `technische-stellungnahme` Refs | ⏳ NICE — Kontext-Erhalt > Drift-Fix |

Plus identifiziert (nicht in Phase 2 gefixt):
- ⚠️ **`window.PROVA_CONFIG`-Konflikt** zwischen `prova-config.js` (Root, AIRTABLE_BASE) und `lib/prova-config.js` (Supabase). Beide direkter Assignment, kein Merge → Hybrid-Pages broken wenn beide geladen. Eskaliert in Phase 4 NACHT-PAUSE.

---

## 2. Was gefixt wurde (Commits)

| Commit | Scope | Files | Impact |
|---|---|---|---|
| `3b5e722` | K-1.AUDIT.1 | docs/sprints/K-1-AUDIT-2026-04-28-MEGA-4.md | Findings-Doku 248 LOC |
| `bcedb61` | K-1.CLEANUP.1 | gutachterliche-stellungnahme.html + Logic + tools/test-pilot | 4 KRITISCH-Items, Code-Konsistenz |
| `189ebd3` | K-1.CLEANUP.2 | docs/CUTOVER-RUNBOOK.md, docs/K-1-4-PAGE-MIGRATION-GUIDE.md | Stale 404-Refs in Live-Doku |
| `152177a` | K-1.CLEANUP.3 | docs/audits/ (rename) | Audit-File auf neuen Pilot-Namen |
| `92e808d` | K-1.CLEANUP.4 | sw.js | v234 → v235 Pflicht-Bump |
| `31837b9` | K-1.F1.1 | docs/sprints/K-1-PDF-TEST-VORBEREITUNG.md | 284 LOC PDF-Test-Doku |
| `b0c54cf` | K-1.F2.NACHT-PAUSE | NACHT-PAUSE-DASHBOARD.md | Architektur-Konflikt eskaliert |
| `ef94ed5` | K-1.F3.1 | docs/sprints/K-2-CLEANUP-PLAN.md + K-2-MARCEL-CUTOVER-CHECKLIST.md | 577 LOC K-2-Vorbereitung |
| (final) | K-1.FINAL | sw.js v235 → v236, diese Doku | Sprint-Schluss |

**8 Commits** im Mega-Sprint #4. Alle gepusht.

---

## 3. Was offen bleibt (für nächste Session)

| Priorität | Item | Aufwand |
|---|---|---|
| 🟠 | **prova-config.js / lib/prova-config.js Merge-Pattern** (Variante A aus NACHT-PAUSE) | 15 Min |
| 🟠 | **Dashboard-Migration K-1.7-Sprint** voll-refactor (Variante B) | 4-6 h |
| 🟢 | localStorage-Keys `prova_ts_*` migrieren | 30 Min |
| 🟢 | Historische Sprint-Docs Banner-Hinweise | 10 Min |
| 🟢 | `prova-config.js` in K-2-Cleanup-Plan ergänzen | bereits in Phase 5 dokumentiert |
| 🟢 | Edge Functions die in K-2 NEU gebaut werden müssen (workspace-invite, dsgvo-handler, error-log-edge, onboarding-create-workspace) | 1-2 h |

---

## 4. Marcel-TODO (manuell zu testen vor Tag-Setzung)

```
[ ] 1. Browser-Test Pilot-Page (siehe docs/sprints/K-1-PDF-TEST-VORBEREITUNG.md):
       - Login auth-supabase.html
       - gutachterliche-stellungnahme.html Phasen 1-3
       - Versenden → PDF-Generation → Akte-Redirect
       - Erwartet: 200 OK in 5-15s, signed PDF-URL kommt zurück

[ ] 2. Decision NACHT-PAUSE-DASHBOARD.md Variante A/B/C:
       A) Hotfix lib/prova-config.js erweitern (15 Min, empfohlen)
       B) Eigener Sprint K-1.7 für Dashboard-Volrefactor (4-6h)
       C) Hybrid bleibt bis K-2 (0 Aufwand)

[ ] 3. Edge Functions deployed?
       supabase functions list
       Erwartet: 8 Functions (ki-proxy, whisper-diktat, pdf-generate,
                              send-email, stripe-webhook, lifecycle-trigger,
                              audit-write, ical-feed)

[ ] 4. Secrets gesetzt?
       supabase secrets list
       Erwartet: OPENAI_API_KEY, PDFMONKEY_API_KEY, RESEND_API_KEY,
                 STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
                 PROVA_SYSTEM_TOKEN, PROVA_ICAL_SECRET, PROVA_MAIL_FROM

[ ] 5. PDFMonkey-Template '4233F240' (kurzstellungnahme) published?

[ ] 6. Bei grünem PDF-Test: git tag v180-mega-sprint-4-done && git push --tags
```

---

## 5. PDF-Test Checklist (aus Phase 3)

→ Vollständig in `docs/sprints/K-1-PDF-TEST-VORBEREITUNG.md`

Kurz-Workflow:
1. Login `auth-supabase.html`
2. `gutachterliche-stellungnahme.html` → Phasen ausfüllen
3. „Versenden →" klicken → PDF-Generation 5-15s
4. Toast „✓ PDF fertig" + Redirect zu `/akte.html?id=...`

Bei Fail: Risiko-Liste in Test-Vorbereitung-Doku (4 Risiken + Fix-Vorschläge).

---

## 6. Dashboard-Migration Status (aus Phase 4)

**STATUS: NACHT-PAUSE — Marcel-Decision needed**

→ Vollständig in `NACHT-PAUSE-DASHBOARD.md`

**Konflikt:** zwei Files setzen `window.PROVA_CONFIG` mit direktem Assignment statt Merge:
- `prova-config.js` (Root, AIRTABLE_BASE)
- `lib/prova-config.js` (Supabase URL+KEY)

**Lösungs-Optionen:** A (Hotfix-Erweiterung 15 Min) | B (Eigener Sprint 4-6h) | C (Hybrid bleibt)

---

## 7. Sprint K-2 Vorbereitung (aus Phase 5)

| Doku | Status |
|---|---|
| `docs/sprints/K-2-CLEANUP-PLAN.md` | ✅ 6 Phasen detailliert |
| `docs/sprints/K-2-MARCEL-CUTOVER-CHECKLIST.md` | ✅ 10 Schritte mit Smoke-Test + Rollback |

Kombiniert mit existierenden `docs/CUTOVER-RUNBOOK.md` + `scripts/cutover/01-05` ist Cutover komplett dokumentiert.

---

## 8. Empfehlung für nächste Session

### Sofort (vor Cutover)
1. **Marcel testet Pilot-PDF** — wenn grün: Mega-Sprint #4 erfolgreich abgeschlossen
2. **Variante-Decision NACHT-PAUSE-DASHBOARD** — A oder B oder C?
3. Bei A: 15 Min Hotfix `lib/prova-config.js` auf Merge-Pattern

### Nächste Session (1-2 Tage später)
4. **Sprint K-1.7-DASHBOARD** falls Variante B gewählt — fokussierter 4-6h Sprint
5. **Edge Functions deployen** falls noch nicht (kritisch vor Cutover!)
6. **Secrets-Audit** in Supabase

### Mittelfristig (1-2 Wochen)
7. **Cutover-Window** (Sonntag früh, 2-2.5h Block)
8. **K-2 Cleanup-Sprint** starten (siehe K-2-CLEANUP-PLAN)
9. **Audit-Phase + Marketing parallel** (Sprint K-2.x)

---

## Files-Bilanz Mega-Sprint #4

```
Hinzugefügt:
  docs/sprints/K-1-AUDIT-2026-04-28-MEGA-4.md            (248 LOC)
  docs/sprints/K-1-PDF-TEST-VORBEREITUNG.md              (284 LOC)
  docs/sprints/K-2-CLEANUP-PLAN.md                       (~270 LOC)
  docs/sprints/K-2-MARCEL-CUTOVER-CHECKLIST.md           (~310 LOC)
  docs/sprints/K-1-MEGA-SPRINT-4-COMPLETE.md             (diese Datei)
  NACHT-PAUSE-DASHBOARD.md                               (172 LOC)

Geändert:
  gutachterliche-stellungnahme.html                      (data-page Attribut)
  gutachterliche-stellungnahme-logic.js                  (Kommentar)
  tools/test-pilot-kurzstellungnahme.html                (2× AZ-Prefix)
  docs/CUTOVER-RUNBOOK.md                                (1 stale Ref)
  docs/K-1-4-PAGE-MIGRATION-GUIDE.md                     (2 stale Refs)
  sw.js                                                  (v234 → v235 → v236)

Renamed:
  docs/audits/technische-stellungnahme.html-AUDIT.md
  → docs/audits/gutachterliche-stellungnahme.html-AUDIT.md
```

**~1300 LOC neuer Doku** + 5 KRITISCH-Code-Fixes + 3 stale-Doku-Fixes.

---

🎯 **Mega-Sprint #4 grün ausgelaufen — 1 NACHT-PAUSE bewusst (Architektur-Konflikt eskaliert).**

🚀 **Marcel: bitte Pilot-PDF-Test + NACHT-PAUSE-Decision A/B/C, dann nächste Session.**
