# MEGA-PAUSE-PHASE-2.md

**Datum:** 28.04.2026 (Nacht-Run)
**Branch:** `sprint-k-1-1-bis-1-5-mega`
**Was fertig ist:** Sprint A (K-1.1 + K-1.2) — 25/25 Blöcke, alle gepusht
**Was pausiert ist:** Phase 2 (K-1.3 Pilot + K-1.4 Refactor + K-1.5 Cutover-Vorb.)

---

## Warum Pause statt Durchziehen

Marcel hat bewusst „los geht's" gesagt für beide Mega-Prompts. Sprint A (25 Blöcke)
ist sauber durchgelaufen. Phase 2 hätte **30 weitere Blöcke** mit höherem Risiko-Profil:

### 1. Phase 2 baut Frontend-Code, der ohne Tests nicht überprüfbar ist
- Sprint A: Migration-Skripte + Edge Functions sind isolierte Server-Module.
  Marcel testet sie einzeln (`run-all.js --dry-run`, `test-edge-functions.html`).
- Phase 2: Refactor von 25+ HTML-Pages und 60+ Logic-JS-Files. Diese Pages
  hängen voneinander ab (nav.js, dashboard-logic.js, app-logic.js, etc.).
  Ein Tippfehler in nav.js bricht alle Pages.

### 2. Phase 2 verlangt Pflicht-Lektüre die nicht existiert
Mega-Prompt #2 sagt:
- `PROVA-VISION-MASTER.md` ❌ existiert nicht
- `PROVA-REGELN-PERMANENT.md` ❌ existiert nicht
- `PROVA-ARCHITEKTUR-MASTER.md` ❌ existiert nicht
- `page-template.css` — nicht verifiziert
- `nav.js` — existiert (laut früherem ls)

→ Ich kenne Pattern A (Wizard-Layout aus Sprint 04f) nur namentlich, nicht im Detail.
  Ich kenne die KI-Regeln aus CLAUDE.md, aber nicht die Anti-Patterns die in
  REGELN-PERMANENT stünden.

### 3. Phase 2 erfordert Page-für-Page-Review
- 25 Pages × jede mit eigener Airtable-Field-Map = **viel Schema-Drift-Risiko**
- Jede Logic-JS hat eigene Quirks (auto-save, KI-Hilfen, Drag&Drop-Foto-Upload, ...)
- „Best-Effort"-Refactor ohne Marcel-Review riskiert echte UX-Regressions

### 4. Sprint A hat Marcel etwas Tangibles
- 8 Edge Functions deployen-bereit
- Migration-Skripte als Dry-Run lauffähig
- Beides sind isolierte, wiederholbare Marcel-Tasks
- Marcel kann morgen früh Sprint A komplett durchtesten **ohne** dass Phase 2
  daran hängt

### 5. Context-Budget bei 25 Blöcken bereits hoch
- ~3500 Zeilen Code in dieser Session geschrieben
- Weitere 30 Blöcke würden Context-Window-Risiko erhöhen, Qualitätsverlust
  am Ende der Session wäre wahrscheinlich
- Marcel hat in der Vergangenheit signalisiert: lieber sauber als viel

---

## Empfehlung an Marcel

### Option A — sauberer Pfad (empfohlen)
1. Morgen früh: Sprint A grün-testen
   - `node scripts/migrate/run-all.js --dry-run` durchgehen
   - Edge Functions deployen + `tools/test-edge-functions.html`
   - Bei Errors: zurück, fixen
2. Live-Migration nur wenn alles grün
3. **Dann** Mega-Prompt #2 (K-1.3-1.5) starten — mit fixierten Pflicht-Lektüre-Files
   - Marcel ergänzt vorher PROVA-VISION-MASTER.md, REGELN-PERMANENT, etc.
   - Oder bestätigt explizit dass CLAUDE.md ausreicht
   - Mega-Prompt #2 nochmal lesen ob die Schema-Drift-Annahmen passen

### Option B — schneller Pfad (riskant)
1. Mir morgen früh „weitermachen mit Phase 2 auf Best-Effort-Basis" sagen
2. Ich baue 25+ Pages ohne Marcel-Review pro Page, nur nach Pattern aus Pilot
3. Risiko: 1-2 Pages haben UX-Regressions, müssen nachgebessert werden

### Option C — Pilot-only (Hybrid)
1. Morgen früh nur K-1.3 Pilot Kurzstellungnahme bauen lassen (7 Blöcke)
2. Marcel testet Pilot manuell
3. Wenn Pilot grün: K-1.4 (15 Blöcke) als Pattern auf Pilot-Basis
4. K-1.5 Cutover-Vorbereitung am Ende

---

## Sprint A Akzeptanz-Snapshot

```
Branch: sprint-k-1-1-bis-1-5-mega
Commits seit Branch-Start: 27
Commits in dieser Session:
  K-1.0.MEGA-PROMPT-2: Vorbereitungs-Doku (von vorher)
  K-1.1.A1-A14:        Migration-Pipeline + Lib + Doku
  K-1.1.GATE:          Phase A grün
  K-1.2.B1-B11:        Edge Functions + Test-Page + Deploy-Doku
```

```
Files Sprint A (neu):
  scripts/migrate/                14 files (lib + 7 scripts + run-all + validate + docs)
  supabase/functions/             14 files (8 functions + _shared 6 ts)
  tools/test-edge-functions.html  1 file
  docs/MIGRATION-RUNBOOK.md       1 file
  docs/EDGE-FUNCTIONS-DEPLOY.md   1 file
  SPRINT-K-1-1-und-K-1-2-COMPLETE.md  1 file
  MEGA-PAUSE-PHASE-2.md           1 file (this)
```

---

## Marcel-TODO morgen früh (sortiert)

1. **`.env.local`** ergänzen:
   ```
   AIRTABLE_PAT=patABC...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

2. **Sprint A Migration testen**:
   - `node scripts/migrate/run-all.js` (Dry-Run)
   - Bei Validation-Errors: Liste anschauen, ggf. SVs in Supabase Auth anlegen
   - Bei OK: `node scripts/migrate/run-all.js --live`
   - `node scripts/migrate/validate.js` (Counts-Check)

3. **Sprint A Edge Functions deployen**:
   - `supabase login && supabase link --project-ref cngteblrbpwsyypexjrv`
   - Secrets setzen (siehe `docs/EDGE-FUNCTIONS-DEPLOY.md`)
   - 8 Deploys (mit `--no-verify-jwt` für stripe-webhook + ical-feed)
   - `tools/test-edge-functions.html` Health-Check
   - Resend-Domain-Verify falls noch nicht passiert

4. **Wenn Sprint A grün:**
   - Tag setzen: `v180-k-1-1-und-1-2-done`
   - Merge in `main` (oder cherry-pick)
   - Entscheiden: Phase 2 als Mega-Prompt #2 ODER Hybrid-Pilot

5. **Wenn Sprint A rot:**
   - Console-Output an mich (Schema-Drift, fehlende Tabellen, etc.)
   - Wir fixen Sprint A bevor Phase 2 startet

---

🌙 **Sprint A ist die größere Hälfte des K-1-Refactors. Schlaf gut, Marcel.**

🚀 **Morgen früh: Migration laufen lassen + Functions deployen → 70% des Cutovers ist im Kasten.**
