# AUDIT-FOLLOWUP 2026-05-07 — MEGA³⁵-Patch-Plan

**Auditor:** Claude Code Opus 4.7
**Modus:** PURE PLAN — kein Build, kein Commit
**Branch:** mega34-final-100-percent (unverändert)
**Vorgänger:** `AUDIT-2026-05-07-MEGA34-CODE-COMPLETENESS.md` (4 🔴 + 7 🟡)

---

## C1-Verify-Antworten

| Frage | Antwort |
|---|---|
| foto-upload-v2.js existiert? | ✅ + foto-upload-v2-ui.js + .css |
| Welche Libs referenzieren `/foto-upload`? | lib/foto-upload-mobile.js (M³² C2 P4) + lib/foto-upload-v2.js |
| Storage-Bucket | **`sv-files`** (CLAUDE.md) |
| Pseudonymisierungs-Lib | `netlify/functions/lib/prova-pseudo.js` (Server-side) |
| EXIF-Strip-Lib | ❌ KEINE in package.json — entweder `npm install exifr` (~50KB) ODER Pure-JS-JPEG-APP1-Strip |
| `fotos`-Tabelle | ✅ in 03_schema_artefakte_storage.sql mit 5 360°-FKs (auftrag/ortstermin/kontakt/eintrag/dokument) + `exif_stripped` BOOLEAN + **RLS bereits aktiv** |

**Bonus:** RLS auf `fotos` bereits da. Migration 22 muss nur 4 neue Tabellen abdecken.

---

## BLOCK C — Patch-Plan (Reihenfolge nach Priorität)

### 🔴🔴 C1 — `netlify/functions/foto-upload.js` (KRITISCH)

**Acceptance:**
- POST `/foto-upload` mit base64-encoded multipart-payload (Netlify-Lambda 6MB-Limit beachten)
- requireAuth + workspace_id-Resolve via JWT
- EXIF-Strip Server-Side (Pure-JS JPEG-APP1-Marker-Strip; kein npm install)
- Upload zu Supabase Storage Bucket `sv-files` mit Path `<workspace_id>/<auftrag_id>/<uuid>.jpg`
- DB-Insert in `fotos`-Tabelle mit `exif_stripped=TRUE`, `workspace_id`, `auftrag_id`, `storage_path`, `geo_lat`/`geo_lng`/`geo_accuracy` (aus form-data)
- Pseudonymisierung der `beschreibung` vor jeglichem KI-Caption-Call (Defense-in-Depth)
- Returns `{ foto_id, storage_path, public_url, exif_stripped: true }`
- Defensive: bei Lambda-Limit-Überschreitung 413 mit klarer Message
- Tests `tests/foto-upload/c1-server-upload.test.js` mit ≥10 Cases

**Files (Anzahl):**
- 1× neue Lambda
- 1× Test-File
- evtl. 1× Schema-Patch falls `fotos.geo_*` fehlt (verify zuerst)

**LOC-Schätzung:** ~250 Lambda + ~120 Tests = ~370 Zeilen
**Zeit-Schätzung:** **60-90 Min**

**Risiken:**
- Multipart-Parser nicht trivial in Node ohne busboy/formidable. Empfehlung: `busboy` als Dependency ODER base64-form-data von Frontend (Frontend muss umgebaut werden — größerer Scope)
- JPEG-EXIF-Strip via Pure-JS: APP1-Marker (0xFFE1) suchen + überspringen. Funktioniert nicht für PNG/HEIC.
- HEIC-Support fehlt → Mobile iOS-Fotos sind oft HEIC. Empfehlung: Reject HEIC mit klarer User-Message ("Bitte JPEG/PNG").

**Compounding-Lesson:**
Vor Commit: `curl -X POST -F file=@test.jpg http://localhost:8888/.netlify/functions/foto-upload` ausführen + Response prüfen. Pattern-Match-Tests reichen nicht.

---

### 🔴 C2 — `supabase-migrations/22_enable_rls_mega34_tables.sql`

**Acceptance:**
- ENABLE ROW LEVEL SECURITY auf 4 Tabellen
- CREATE POLICY pro Tabelle nach folgendem Pattern:

```sql
-- cookie_consents: User sieht eigene + anonyme (vor Login)
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY cookie_consents_self_read ON public.cookie_consents
  FOR SELECT USING (
    user_id IS NULL  -- anonyme Pre-Login-Einwilligungen
    OR user_id = auth.uid()
  );

CREATE POLICY cookie_consents_self_insert ON public.cookie_consents
  FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

-- ical_tokens: User sieht nur eigene
ALTER TABLE public.ical_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY ical_tokens_self ON public.ical_tokens
  USING (user_id = auth.uid());

-- onboarding_mails_sent: Service-Role-Only (Cron)
ALTER TABLE public.onboarding_mails_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_mails_admin ON public.onboarding_mails_sent
  USING (auth.role() = 'service_role');

-- incidents: Public-Read (Status-Page!) + Service-Role-Write
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY incidents_public_read ON public.incidents
  FOR SELECT USING (true);
CREATE POLICY incidents_service_write ON public.incidents
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

- Idempotent via `DROP POLICY IF EXISTS` vor CREATE
- Tests `tests/rls/c2-mega34-rls.test.js`: SQL-File-Pattern-Check + Counts

**LOC-Schätzung:** ~80 SQL + ~50 Tests = ~130 Zeilen
**Zeit-Schätzung:** **30-45 Min**

**Risiken:**
- `auth.role() = 'service_role'`-Pattern muss in PROVA-Setup verifiziert werden (Pattern aus existierenden Migrations kopieren)
- `cookie_consents` mit `user_id IS NULL`: anonyme User können fremde anonyme Consents lesen. Akzeptabel? (Marcel-Antwort)

---

### 🔴 C3 — `user-workflow-settings` RENAME (Welcome-Wizard!)

**Acceptance:**
- 3 Lib-Files patchen: `lib/onboarding-trigger.js`, `lib/welcome-wizard.js` (2 Stellen)
- Replace: `/user-workflow-settings` → `/workflow-settings`
- Verify: `grep -rn "user-workflow-settings" --include="*.js"` liefert 0 Treffer
- Test `tests/workflow-rename/c3-no-orphan-refs.test.js` (5 Cases)

**LOC:** 3 Code-Lines + ~30 Test-Lines
**Zeit:** **5-10 Min**

**Risiken:** keine (reiner String-Replace)

---

### 🟡 C4 — `list-auftraege` Verify-First-Pattern

**Schritt 1 (Verify, 5 Min):** Lese `lib/data-store.js` — wenn `listAuftraege()` zuverlässig existiert + workspace-RLS-konform ist → Lambda nicht nötig, nur User-facing-Error in Fallback-Pfad.

**Schritt 2A (wenn data-store reicht):**
- schadensfaelle-logic.js: Fallback-Pfad zeigt klaren Error-Toast statt 404-Stille
- LOC: ~10
- Zeit: 5 Min

**Schritt 2B (wenn Lambda nötig):**
- Neues Lambda mit GET `?typen=...&page=...&limit=50`
- RLS via JWT
- Returns `{ rows, total, page, total_pages }`
- LOC: ~80 + 60 Tests
- Zeit: 20-30 Min

**Empfehlung:** Schritt 1 IMMER zuerst. Wahrscheinlich reicht 2A.

---

### 🟡 C5 — `dsgvo-loeschen-antrag` HTML-Patch

**Vorausgesetzt:** Marcel sagt Direct-Delete reicht (siehe Block A Frage).

**Acceptance:**
- `dsgvo-mein-konto.html:117` öffnen
- Ändere Endpoint: `/dsgvo-loeschen-antrag` → `/dsgvo-loeschen`
- Verify dass `dsgvo-loeschen.js` 4 Bedingungen erfüllt:
  - [ ] User-Identitäts-Check (auth)
  - [ ] 30-Tage-Soft-Delete oder Backup-Snapshot (DSGVO Art. 17 Abs. 3)
  - [ ] Audit-Trail-Eintrag
  - [ ] Bestätigungs-Email an User
- Falls eine Bedingung fehlt → entweder ergänzen ODER Antrag-Variante bauen

**LOC:** 1 HTML-Line + Verify-Tests
**Zeit:** 5-15 Min (je nach Verify-Aufwand)

---

### 🟢 C6 — `termine-ical-token.js` (NICE-TO-HAVE)

Klein. Kann nach Pilot.

- Wrapper um `signToken` aus existing `termine-ical-export.js`
- POST → erzeugt token + Insert in `ical_tokens` + Returns `{ subscribe_url }`
- LOC: ~80 + 40 Tests
- Zeit: 15-20 Min

---

### C-FINAL — sw.js v955 + Audit-Re-Run + Tag

**Acceptance:**
- sw.js CACHE_VERSION → `prova-v955-mega35-patch`
- APP_SHELL-Update falls neue Pages
- `docs/audit/AUDIT-2026-05-07-MEGA35-PATCH-FINAL.md` mit Re-Run der Cross-Reference-Methode
- 7-Punkte-Acceptance (siehe Block D.5) alle ✅
- Tag v955 setzen + pushen
- `docs/sprint-status/MEGA-35-PATCH-FINAL-2026-05-07.md`

**LOC:** ~150 Doku + sw.js bump
**Zeit:** 15-20 Min

---

## BLOCK D — Sprint-Empfehlung

### D.1 Sprint-Aufteilung

| Phase | Items | Sequenz | Zeit |
|---|---|---|---|
| P1 Pilot-Critical | C1 + C2 | parallel | ~2h |
| P2 Schnell-Fixes | C3 + C5 | sequenziell | 15-20 Min |
| P3 Verify-First | C4 (verify, dann entscheiden) | nach P2 | 5-30 Min |
| P4 Optional | C6 | wenn Zeit | 15-20 Min |
| P5 FINAL | sw.js + Audit + Tag v955 | letzte | 15-20 Min |

**Total:** ~3-4h Continuous-Run

### D.2 Risk-Assessment

**🟠 Service-Worker-Cache-Conflict bei Version-Bump**
- Mitigation: jeder Item-Commit bumpt sw.js sofort (CLAUDE.md Regel 30)
- Test: Hard-Reload nach M³⁵ + Network-Tab "Disable cache" + Reload

**🟠 Frontend-Ladefehler-Recovery**
- Symptom: 404 zeigt Stille statt Toast
- Neue Regel für M³⁵: kein neuer fetch() ohne user-facing Error-Handler
- Code-Pattern dokumentieren in CLAUDE.md

**🟠 netlify-dev-Smoke-Test wurde nie gemacht**
- Pre-FINAL-Pflicht: 10-Min-Smoke-Test-Liste (D.3) durchklicken
- Alternativ: curl-Test pro neuem Lambda

### D.3 Marcel-Manual-Smoke-Test (10-15 Min)

```bash
netlify dev
# Browser-Klicks:
http://localhost:8888/                       → Cookie-Banner?
http://localhost:8888/login.html             → Login-Form?
http://localhost:8888/dashboard.html         → 0× 404 in Network?
http://localhost:8888/schadensfaelle.html    → Liste lädt?
http://localhost:8888/neuer-fall.html        → Phase-Indicator?
http://localhost:8888/akte.html?id=DEMO-001  → Foto-Upload-Test!
http://localhost:8888/termine.html           → Subscribe-URL-Modal?
http://localhost:8888/demo.html              → 6-Step-Tour?
http://localhost:8888/public-status.html     → Status-Cards?
http://localhost:8888/cookie-einstellungen.html → Widerruf-Button?
# DevTools → Console: 0× Uncaught Errors
# DevTools → Network: 0× 404, 0× 500
```

### D.4 Empfehlung an Marcel

**Option A — CC baut M³⁵-Patch jetzt (3-4h Continuous-Run):**
- ✅ Pilot-Blocker geschlossen
- ✅ Tag v950 bleibt als "behauptetes 100%"-Marker
- ✅ Tag v955 markiert "echtes 100%"
- ✅ Marcel macht Branch-Merge erst nach M³⁵-FINAL — saubere PR-Story

**Option B — Marcel macht erst Branch-Merge zu main, dann M³⁵:**
- ❌ M³⁵ landet auf main-PR (komplexerer Merge-Conflict-Risk)
- ❌ v950-Tag bleibt unvollständig in main

**Option C — M³⁵ später / nicht in dieser Session:**
- ❌ foto-upload bleibt tot bei Pilot-Demo (Show-Stopper)
- ❌ DSGVO-Risk auf 4 neuen Tabellen offen

**CC-Empfehlung: Option A** — wenn Marcel "ja" sagt, kann CC den 3-4h-Run direkt starten.

### D.5 Acceptance für "echtes 100%"-Claim in M³⁵-FINAL

CC darf NUR sagen "echtes 100%" wenn:
- [ ] foto-upload Lambda live + curl-getestet (nicht nur Pattern-Match)
- [ ] RLS auf 4 neuen Tabellen via SQL-Verify (`SELECT * FROM pg_policies WHERE tablename IN (...)`)
- [ ] user-workflow-settings Refs alle umgestellt (`grep -rn "user-workflow-settings" --include="*.js"` = 0 Treffer)
- [ ] dsgvo-loeschen-antrag Frontend zeigt entweder Direct-Delete oder Antrag (klar definiert)
- [ ] netlify dev Smoke-Test-Liste (D.3) durchgelaufen — Network 0× 404
- [ ] sw.js v955 + APP_SHELL-Update im selben Commit
- [ ] Cross-Reference-Re-Audit: `comm -23 actual_calls.txt files.txt` zeigt nur 🟢-CLEANUP-Refs (airtable + auftrag-mode-override)

**Ohne diese 7 Häkchen kein "100%"-Claim.** Compounding-Engineering-Lesson aus M³⁴: Pattern-Match-Tests reichen nicht für Production-Claims.

---

## Marcel-Antworten benötigt vor Sprint-Start

| # | Frage | Default-Annahme falls keine Antwort |
|---|---|---|
| Q1 | Reicht `dsgvo-loeschen.js` Direct-Delete oder braucht es Antrags-Workflow? | Direct-Delete (HTML-Patch in C5) |
| Q2 | `cookie_consents` anonymous_id-Pattern: dürfen anonyme User andere anonyme Consents lesen? | Nein, nur INSERT für Anonyme; SELECT erst nach Login |
| Q3 | EXIF-Strip-Lib: `npm install exifr` (~50KB, sauber) oder Pure-JS-JPEG-Strip? | Pure-JS (kein neuer Dependency) |
| Q4 | HEIC-Support für iOS-Fotos: jetzt bauen oder später? | Später — Reject mit Message in M³⁵ |
| Q5 | Branch-Strategie: M³⁵ auf `mega34-final-100-percent` (Option A) oder neuer Branch? | Option A (kein Branch-Wechsel) |

---

*Co-Authored-By Claude Opus 4.7 (1M context) — 07.05.2026*
