# MEGA⁸² PROPOSAL — Was als nächstes ansteht

**Stand:** 2026-05-15 (Vorschlag, nicht final-spec'd)
**Zweck:** Synthese aller offenen Defers + Pilot-Blocker zu einem realistischen Marathon-Plan.

---

## Defer-Liste-Pool (aus MEGA77-81 zusammengetragen)

### Pilot-kritisch (must-have)

| Item | Aus | Aufwand | Risiko |
|---|---|---|---|
| F.1 Login Cross-Domain Cookie-Adapter | MEGA77+78+80+81 | groß (eigener Sprint!) | hoch |
| applyPhaseVisibility echte DOM-Logik | MEGA78+79+80+81 | mittel | mittel |

### Repo-Hygiene (should-have)

| Item | Aus | Aufwand | Risiko |
|---|---|---|---|
| Edge-Function-Reaping (5 sichere Deletes) | MEGA81 Inventar | klein | mittel (Cloud-Action!) |
| Edge-Function-Audit (11 Kandidaten) | MEGA81 Inventar | mittel | klein (read-only) |
| `-supabase`-Suffix-Cleanup (3 Files) | MEGA82-Audit | klein | mittel |
| `editor-demo.html` killen wenn dead | MEGA82-Audit | klein | klein |
| `auftrag-ablehnen` vs `auftrag-ablehnung` Dedup | MEGA82-Audit | klein | klein |

### Nice-to-have

| Item | Aus | Aufwand | Risiko |
|---|---|---|---|
| Brief-HTMLs in `/briefe/`-Subfolder | MEGA82-Audit | groß | groß |
| Pre-Push-Minutely Termin-Cron (re-evaluate) | MEGA80+81 | klein | klein |
| H Netlify-Functions Airtable-Cleanup | MEGA76+80+81 | mittel | klein (ENV-dependent) |
| `vorlage-XX` Auth-Gate | MEGA82-Audit | mittel | klein |

---

## Vorschlag: MEGA82 = "Pilot-Ready-Marathon"

**Marathon-Ziel:** Pilot-blockierende Items + cheap Repo-Hygiene-Items.

### Phase 0 — Pre-Read (10 Min)
- MEGA81-DECISIONS + MEGA82-LANDING-APP-SPLIT-AUDIT
- Marcel-Apply-Verify: Migration 57 + Edge-Deploys live?

### Phase A — Login Cross-Domain (60-90 Min) **HEAVY**

F.1 aus MEGA77+ — der einzige verbliebene Pilot-Blocker.

Problem: Login auf prova-systems.de fragt 2× (einmal Landing, dann Redirect zu app., dann nochmal Auth-Cookie).

Lösung-Skizze:
- Cookie-Domain auf `.prova-systems.de` setzen (statt `app.prova-systems.de`)
- Supabase auth-cookie-storage-adapter mit `domain: '.prova-systems.de'`
- Test: Login auf Landing → Direkt auf App eingeloggt
- Risk: kann Login auf ANDEREN Subdomains beeinflussen (admin.) — Test-Pfad essentiell

**Defer-Triple-Check:** Web-Claude müsste explizit absegnen, dass Branch + Test-Path da sind.

### Phase B — Audit-Cleanup (45 Min) **CHEAP**

3 Frontend-Greps + Cleanup:
1. `kontakte.html` vs `kontakte-supabase.html` — Caller-Sweep + Konsolidierung
2. `profil-supabase.html` — Refs auf `profil.html` checken
3. `editor-demo.html` — Linkage prüfen, dann ggf. `git rm`

### Phase C — Edge-Function-Reaping (30 Min) **MEDIUM-RISK**

5 sichere Deletes per `supabase functions delete`:
1. `global-search`
2. `fristen-reminder-cron`
3. `mahnwesen-cron`
4. `migrate-normen-airtable`
5. `migrate-textbausteine-airtable`

**Pre-Check pro Function:**
- Frontend-Grep über Top-Level-Files: 0 Caller in Production-Code
- Cloud-Logs 24h: kein Traffic
- Edge-Function-Code archivieren in `_archiv/edge-functions/<name>/`
- Dann `supabase functions delete <name>`

### Phase D — applyPhaseVisibility (30-45 Min) **MEDIUM**

Aus MEGA77/78/79/80/81 deferred. Heute Stub.

Plan:
1. akte.html Sections mit `data-phase="1"..."5"` markieren
2. JS-Helper `applyPhaseVisibility(phase)` macht `display: none` für nicht-aktive Sections
3. Phase-Wechsel triggert Re-Apply

Risiko: DOM-Refactor kann andere Selektoren brechen — Test-Pfad in Browser nötig.

### Phase E — Docs + Push (15 Min)
- MEGA82-DECISIONS.md
- MEGA82-MARCEL-CHECKLIST.md
- sw v3245
- Push

**Geschätzter Marathon-Aufwand:** 3-4h
**Pflicht:** 0, B, E
**Stark empfohlen:** A, C
**Optional:** D

---

## Alternativ-Vorschlag: MEGA82 = "Edge-Function-Reaping + Hygiene"

Wenn F.1 (Login Cross-Domain) zu groß für Marathon: nur die schnellen Items.

### Phasen
- A — Edge-Function-Reaping (5 sichere + Archive)
- B — Frontend-Grep + `-supabase`-Suffix-Konsolidierung
- C — `auftrag-ablehnen` vs `auftrag-ablehnung` Dedup
- D — `editor-demo.html` + `integration-template.html` Audit + Delete

**Aufwand:** 1-2h. Liefert "sauberes Repo + sauberes Cloud-State" als Pre-Pilot-Hygiene.

---

## Was Marcel jetzt entscheiden sollte

1. **MEGA82-Scope:** Pilot-Ready (mit F.1) ODER Hygiene-only?
2. **F.1 Risiko-Akzeptanz:** Bist du bereit, Cross-Domain-Cookie-Tests in Production zu machen (Branch-Strategie verfügbar)?
3. **Reaping-Cloud-Action:** OK dass ich `supabase functions delete` für die 5 sicheren Functions vorschlage als Code im Sprint? (Marcel führt aus, nicht ich)

Antwort an Web-Claude → Web-Claude spec'd MEGA82 → CC führt aus.
