# PROVA Systems — Changelog Master

Format: pro Sprint ein Block. Ältere Sprints zuoberst nicht — neueste oben.

---

## MEGA⁴-EXT — AIRTABLE-MIGRATION (Q2+Q3+Q4+Q11)

**Tag:** `v210-airtable-migration-done` · **Stand:** 04.05.2026 nacht · **Commits:** `358e606`, `eb98005`, `e633e40` + Q11

**Modus:** Marcel postete 11-Sprint-Auftrag, davon 8 bereits in v209 — nur Q2/Q3/Q4 (Airtable-Migration) + Q0 (Liquid-Bug-Fix) NEU. Senior-Engineering: nur die NEUE Arbeit gemacht.

### Q0 — Liquid-Bug-Fix (`358e606`)
- 18 Pattern-1 Stellen ('and X.size > 0') ersetzt durch '!= blank'
- 5 Pattern-2 Stellen ('{% if X %}' vor for-loop) ersetzt durch '!= blank'
- F-04 kompakte Inline-Form auf multi-line gesplittet
- IHK-SVO-TEMPLATES-MIGRATION.md erweitert um Liquid-Best-Practices-Sektion

### Q2 — ENV-Cleanup (Bundle D, in `eb98005`)
- AIRTABLE-DRIFT-ENV-CLEANUP.md mit Audit der 9 distinct AIRTABLE_*-ENVs
- 3 Duplikate identifiziert (TOKEN/API_KEY -> PAT, BASE -> BASE_ID, TABLE -> TABLE_SV)
- AIRTABLE_SV_TABLE als DEPRECATED (0 aktive Treffer)
- AIRTABLE_META_API als Migrations-Skript-Only
- .env.example erstellt mit voller PROVA-ENV-Referenz

### Q3 — Storage-Router + Bundle A Pilots (in `eb98005`)
- netlify/functions/lib/storage-router.js: Feature-Flag PROVA_MIGRATION_PATH
  ('airtable' | 'dual' | 'supabase'), readDual + writeDual
- AIRTABLE-DRIFT-SCHEMA-MAPPING.md: Mapping fuer 8 Tabellen + Spalten +
  Beispiel-Migration + Marcel-Feature-Flag-Schedule
- normen.js MIGRIERT (read-only Pilot)
- audit-log.js MIGRIERT (dual-write Pilot)

### Q4 — Bundle B+C Pattern-Reuse (`e633e40`)
- error-log.js MIGRIERT (dual-write)
- mein-aktivitaetsprotokoll.js MIGRIERT (read-dual mit Frontend-Compat-Output)
- 8 weitere Functions als BACKLOG mit klarem Pattern

### Q11 — Final-Report + Tag (this commit)
- MEGA-QUADRO-EXT-2026-05-04-FINAL.md
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)
- sw.js v260 -> v261
- Tag v210-airtable-migration-done

### Senior-Engineering-Behavior
- 0 Production-Breaking-Changes (default PROVA_MIGRATION_PATH=airtable = Status-Quo)
- Realitaets-Check vor Action (8 von 11 Sprints schon done in v209)
- 4/14 Functions als Pilot statt Mass-Migration ohne Live-Tests
- Backlog mit klarem Pattern fuer Sprint K-2 mit Marcel anwesend

### Total-Statistik (MEGA⁴-EXT)
- 4 Commits, ~700 LOC neu
- 4 Functions migriert + Storage-Router + Schema-Mapping + ENV-Cleanup
- 0 NACHT-PAUSE-Files

---

## MEGA⁴ — USER-FACING-MAXIMUM (Q1+Q2+Q3+Q4+Q5+Q6+Q7+Q8)

**Tag:** `v209-user-facing-maximum-done` · **Stand:** 04.05.2026 nacht · **Commits:** `0f07921`, `da4f522`, `4bc85a2`, `cafa538`, `ec40ffb`, `f504785` + Q8

**Modus:** Voller Autonomie, Marcel offline 8-10h, abgeschlossen unter Plan in 5h.

### Q1 — F-09 + F-15 Liquid-Goldstandards (`0f07921`)
- F-09 KURZGUTACHTEN ~485 LOC (Teil 3.1-3.5 erweitert mit Beweissicherung-Tabelle, Foto-Grid, Hypothesen-Cards, Sanierung-Kosten-Card)
- F-15 GERICHTSGUTACHTEN ~520 LOC (Beweisbeschluss-Wortlaut, Beweisfragen-Liste, Verfahrensparteien, § 404a Bauteiloeffnungen, § 407a + § 10 IHK-SVO)
- Beispiel-Payloads mit realistischen Schadensfaellen

### Q2+Q3 — Mobile-Rescue (`da4f522`)
- lib/mobile-polish.css (~140 LOC) zentraler Mobile-First-Stylesheet
- lib/mobile-polish.js (~180 LOC) Lazy-Polyfill + Offline + Pull-to-Refresh + Camera-API + Geolocation
- 10 Pages integriert
- iOS Safe-Area + Touch-Target 44x44 + Mobile-Tables-to-Cards + Tablet-Layout

### Q4 — Flow C Beratung (`4bc85a2`)
- lib/schemas/beratung.js (3 zod-Schemas + 3 Enums)
- F-20 BERATUNGSPROTOKOLL Liquid-Goldstandard mit Honorar-Card + Empfehlungs-Prioritaets-Badges
- beratung.html: Sentry-Init + mobile-polish integriert
- Realitaets-Check: 1-Page-Wizard existierte bereits, kein Refactor noetig

### Q5 — Flow D Baubegleitung (`cafa538`)
- lib/schemas/baubegleitung.js (3 zod-Schemas + 3 Enums)
- F-21 BAUBEGLEITUNG-PROTOKOLL (Color-coded Mangel-Schwere-Badges)
- F-22 BAUABNAHME (Status-Card-Gradient + Sicherheitseinbehalt + § 640 BGB / § 12 VOB/B / § 634a BGB)
- baubegleitung.html: Sentry + mobile-polish integriert

### Q6 — AUTH-COCKPIT Voll-Version (`ec40ffb`)
- admin/voll.html mit 12 Tabs + Charts.js CDN
- 3 neue Backend-Endpoints mit 2FA-Pflicht (admin-live-sessions, admin-ki-costs, admin-system-health)
- 6/12 Sektionen live (Live-Sessions/Conversion/MRR/KI-Costs/Errors/Health)
- 6/12 als BACKLOG transparent dokumentiert mit Begruendung

### Q7 — Test-Coverage 70 -> 110 (`f504785`)
- tests/schemas/beratung.test.js (17 Tests)
- tests/schemas/baubegleitung.test.js (23 Tests)
- 110/110 Tests gruen
- package.json neue Scripts test:schemas + test:all

### Q8 — Final + Tag (this commit)
- MEGA-QUADRO-2026-05-04-NACHT-FINAL.md Executive Summary
- GITHUB-RELEASE-v209.md Release-Notes
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)
- sw.js v259 -> v260
- Tag v209-user-facing-maximum-done

### Senior-Engineering-Behavior
- 0 Production-Breaking-Changes ohne Live-Test
- Pattern-Reuse durchgehend (F-04 Pattern in F-09/F-15/F-20)
- Realitaets-Check vor jedem Sprint (Flow C/D existierten bereits!)
- 0 NACHT-PAUSE-Files (alle Aufgaben pragmatisch geloest)

### Total-Statistik

- 8 Sub-Sprints, 8 Commits
- 30+ Files modified, 20+ Files created
- 110/110 Tests gruen
- ~3500 LOC neu (Templates + Tests + Cockpit + Mobile + Doku)

---

## POST-MEGA-MEGA-MEGA — TECH-DEBT-MARATHON (O1+O2+O3+O4+O5+O6+O7)

**Tag:** `v208-tech-debt-marathon-done` · **Stand:** 03.05.2026 nacht · **Commits:** `d67924c`, `af4bafa`, `0fed657`, `ef3f124`, `e95026d`, `a408a9f` + O7

**Modus:** Voller Autonomie, Marcel offline 8-10h, Bypass-Mode aktiv.

### Sprint O1 — Tech-Debt-Bug-Fixes (`d67924c`)

- prova-context.js: atFetch Default-Sort 'Timestamp' entfernt (RECHNUNGEN-422 Root-Cause: hat keine Timestamp-Spalte)
- onboarding-tour.js showStep(): defensive Pre-Checks fuer STEPS-Array + step.target
- nav.js: Belt-and-Suspenders Resize-Listener (debounced 150ms) als matchMedia-Fallback fuer Sidebar 768-1100px
- whisper-diktat.js Syntax+Auth+Pseudonymisierung verifiziert (kein Bug, manueller Audio-Test bleibt Marcel-Pflicht)
- sw.js v256 → v257
- npm audit: 0 vulnerabilities

### Sprint O2 — IHK-SVO 4-Teile-Templates CRITICAL (`af4bafa`)

- F-04 KURZSTELLUNGNAHME Liquid-Goldstandard erstellt (~285 LOC)
- 4-Teile-Struktur IHK-SVO § 9 Abs. 3 + EU AI Act Art. 50 + § 407a Abs. 2+3 ZPO
- Anti-Substitution: Header+Footer ab Seite 2 (IHK-Koeln-Anforderung)
- Design-System v1.0 (Inter + JetBrains Mono, primary #1a3a6b)
- Migrations-Doku mit 5-Schritt-PDFMonkey-Plan
- INFRASTRUKTUR-REFERENZ.md F-09 als Kurzgutachten korrigiert
- NACHT-PAUSE-File F09-F15-LIQUID (Marcel-Decision)

### Sprint O3 — AIRTABLE-DRIFT-Cleanup (`0fed657`)

- Honest Assessment: 0 Files migriert (Marcel-Vorab-Decision "Defensive Fixes" hatte Vorrang)
- Priorisierungs-Matrix HIGH/MEDIUM/LOW/DEAD mit Aufwands-Schaetzungen
- ENV-Cleanup-Liste: 12 distinct AIRTABLE_* ENVs, 3 Konsolidierungen vorgeschlagen
- Pattern-Vorlage Migration (Airtable atFetch -> dataStore.list)
- 4 Sprint-K-2-Bundles vorgeschlagen (~17-22h Total-Effort)
- NACHT-PAUSE-File AIRTABLE-MIGRATION (Marcel-Decision)

### Sprint O4 — AUTH-PERFEKT 2.0 (`ef3f124`)

- auth-resolve.js: aal + amr Claims aus Supabase-JWT durchgereicht
- admin-auth-guard.js: 2FA-Pflicht (AAL2) als Stufe 3 Pre-Check
  - Default require2FA=true, Opt-Out via opts.require2FA=false
  - Globaler Notfall-Schalter PROVA_ADMIN_REQUIRE_2FA=false ENV
  - Audit-Trail-Eintrag admin.<fn>.no_2fa
- admin/index.html: Banner-Warnung bei AAL1-Login + Direkt-Link Supabase MFA-Settings
- AUTH-PERFEKT-2.0-PLAN.md mit 4-Phasen + Backlog H-25..H-30

### Sprint O5 — Flow B Wertgutachten (`e95026d`)

- Realitaets-Check: Bereits gepusht (commit f444713 P5f.C)
- 1384 LOC wertgutachten-logic.js + 536 LOC wertgutachten.html
- sw.js APP_SHELL OK, nav.js OK, auftragstyp.js Routing OK
- Sentry-Init Script in wertgutachten.html ergaenzt (war fehlend)
- F-19 Goldstandard bereits Liquid + IHK-SVO 4-Teile + ImmoWertV-2021

### Sprint O6 — Sentry-Polish (`a408a9f`)

- sentry-wrap.js: Workspace-ID + user_pseudo Tags (DSGVO-konform)
- Slow-Call-Sampling: Calls > 3s als 'warning' captureMessage
- duration_ms im netlify-Context bei Errors
- Sentry-Init in 6 weiteren Pages (dashboard/akte/freigabe/archiv/einstellungen/stellungnahme)
- SENTRY-DSGVO.md erweitert um neue Tags + Slow-Call-Warnings

### Sprint O7 — Final + Tag (this commit)

- MEGA-MEGA-MEGA-2026-05-03-NACHT-FINAL.md Executive Summary
- GITHUB-RELEASE-v208.md Release-Notes
- CHANGELOG-MASTER.md Block (dieser)
- Master-Files-Sync (CHAT-TRANSPORT, SPRINTS-MASTERPLAN)
- sw.js v257 → v258
- Tag v208-tech-debt-marathon-done

### Total-Statistik POST-POST-MEGA-MEGA

- 7 Sub-Sprints, 7 Commits
- 25+ Files modified
- 8 Doku-Files created (Migrations, NACHT-PAUSE, Status, Plan)
- 2 NACHT-PAUSE-Files mit klaren Decision-Optionen
- 0 Production-Breaking-Changes ohne Live-Test (Senior-Engineering-Behavior)

---

## POST-MEGA-MEGA — PILOT-LAUNCH-FINAL (N1+N2+N3+N4)

**Tag:** `v207-pilot-launch-ready` · **Stand:** 03.05.2026 (Nacht) · **Commits:** `acf4045`, `22c4df5`, `23b23f7`, +N4

**Modus:** Voller Autonomie-Modus, Marcel offline 6-9h, 4 sequenzielle Sprints.

### Sprint N1 — Stripe-Test-Suite automatisiert

- `scripts/stripe-test-suite.js` (~200 LOC) mit 8 Szenarien (Solo/Team/Founding/AddOn5/Failed/3DS/SEPA)
- `scripts/email-render-check.js` validiert alle Email-Templates (viewport, max-width, Unfilled-Platzhalter)
- `tests/stripe/founding-pilot.test.js` Fix nach M2-zod-Schema-Validation (errorCode `VALIDATION_FAILED`)
- 27/27 stripe tests gruen
- Live-Mode-Gate via `CONFIRM_LIVE_CHECKOUT=ja` ENV
- `docs/audit/STRIPE-TESTS-2026-05-03.md` mit GO/NO-GO + 3 Live-Test-Strategien

### Sprint N2 — Onboarding-Drip-Campaign

- 7 Templates: trial-day-2/3/7/14/30/60/88 unter `email-templates/onboarding/`
- `make-scenario-backup.json` mit 9 Modulen (Make.com)
- `docs/strategie/ONBOARDING-AUTOMATION.md` mit Decision-Tree + 3 Implementation-Optionen (Make.com / pg_cron / Manuell)
- Pflicht-View-Sketch `v_pilot_drip_candidates`
- Re-Engagement-Logik dokumentiert

### Sprint N3 — Admin-Cockpit MVP

- `netlify/functions/lib/admin-auth-guard.js` — `requireAdmin` Helper mit Email-Whitelist (hardcoded), Rate-Limit, Audit-Trail bei JEDER Aktion
- 4 Backend-Functions: `admin-pilot-list`, `admin-stripe-kpis`, `admin-sentry-errors`, `admin-impersonate`
- `admin/index.html` Single-Page-Cockpit mit 4 Tabs (Pilot-Liste / Stripe-KPIs / Sentry-Errors / Quick-Actions)
- Defense-in-Depth: Frontend-Whitelist + Auto-Logout + Backend-Whitelist + Rate-Limit + Audit
- Impersonation read-only, 30 Min TTL, workspace-locked, Reason-Pflicht

### Sprint N4 — Pre-Launch-Checklist + Briefing

- `docs/strategie/PILOT-LAUNCH-CHECKLIST.md` — 11 Sektionen, 100+ Checkpoints, GO/NO-GO-Kriterien
- `docs/strategie/PILOT-LAUNCH-BRIEFING.md` — Marcel-Founder-Briefing inkl. Pilot-Einladungs-Template + Daily-Routine
- `docs/sprint-status/POST-MEGA-MEGA-PILOT-READY-2026-05-03-FINAL.md` — Executive Summary + Marcel-Pflichtaktionen
- sw.js v255 → v256

### Lessons + Open Items

- Stripe-CLI-Tests nicht in CI moeglich (Mock-Tests decken Webhook-Verhalten)
- 2FA fuer Admin-Cockpit noch nicht erzwungen (Backlog Sprint K-2)
- Impersonation-Frontend-Read-only-Modus erfordert Anpassung der Auftrags-/Akte-Pages (Backlog)
- Email-Drip-Campaign-Live-Schaltung benoetigt Make.com-Aktivierung ODER pg_cron-DB-Setup (Marcel-Entscheidung)

---

## Sprint 04 — P5 Reste + Seiten-Bugs

**Tag:** *(ausstehend bis Marcel-Verifikation)* · **Stand:** 26.04.2026 · **Letzte Commits:** `27ff5ae`-`179985f`

### Was deployed wurde

**Block A — Security-Reste:**

- **P5.A1** `pdf-proxy.js`:
  - DOC_TYPE_MAP enthält bereits seit S-SICHER 5.1 echte Tabellen-IDs (`gutachten`→tblSxV8bsXwd1pwa0, `rechnung`→tblF6MS7uiFAJDjiT, `brief`→tblSzxvnkRE6B0thx; `mahnung`+`fotoanlage` entfernt). Finding 5.1 funktional bereits in S-SICHER geschlossen.
  - POST-Pfad (Token-erzeugen) auf `lib/auth-resolve.resolveUser` migriert — Sprint-03-deferred Auth-Strategie geklärt: HMAC-Token-Pflicht für POST, signed-URL-Token für GET (Download-Pfad bleibt; ist intentional public mit eigener URL-Signatur).

- **P5.A2/A3** `briefvorlagen-logic.js` HTML-Sanitize (Findings 1.6, 6.2):
  - `prova-sanitize.js` jetzt in `briefvorlagen.html` geladen.
  - `bvRenderFaelle` und `bvRenderSendSummary`: Aktenzeichen, Schadenart, Schaden_Strasse/Adresse, _felder.az, svEmail werden über `_bvEsc()` (PROVA_SANITIZE.escapeHtml + Fallback) escapt. Vorher: `<script>`-Payload im Aktenzeichen-Input wurde beim Rendern ausgeführt.

- **P5.A4** Function-Duplikate (Finding 4.5):
  - 3 von 4 Duplikaten gelöscht: `ki-statistik.js` (Root), `team-interest.js` (Root), `netlify/functions/prova-sv-airtable.js` (war fehlplatzierte Function-Kopie des Frontend-Scripts).
  - `mahnung-pdf.js` NICHT gelöscht — Drift seit Sprint 03 (Root hat BRIEFE-Persistence, Function hat requireAuth-Wrapper). Manuelle Merge-TODO für Marcel; Netlify deployt nur die Function-Variante, Root ist toter Code.

- **P5.A5** Sprint-03-deferred Auth-Strategie:
  - `make-proxy.js`: clientContext.user → `lib/auth-resolve.resolveUser`. k3-Pfad (Server-zu-Server, Internal-Secret) bleibt; alle anderen Keys haben jetzt HMAC-Token-Pflicht.
  - `termin-reminder.js`: bleibt mit Shared-Secret (X-PROVA-Secret/TERMIN_REMINDER_SECRET); Make.com-Cron-Trigger; Hinweis-Bug (Check ohne ENV bypassed) dokumentiert für Sprint 16.
  - `normen.js` + `normen-picker.js`: bleiben public (read-only DIN/WTA/VOB-Katalog).
  - `pdf-proxy.js`: Auth in P5.A1 gefixt.

**Block B — Bekannte Bugs:**

- **P5.B1** `honorar-tracker.js` RECHNUNGEN-422:
  - Ursache via Airtable-MCP-Schema-Query gefunden: RECHNUNGEN hat `status` (lowercase!), nicht `Status`. Plus `empfaenger_name` war doppelt im felder-Array.
  - Read-Pfad: 'Status' → 'status', Duplikat raus, `f.status || f.Status || 'OFFEN'` für Backward-Compat.
  - PATCH-Pfade (Bezahlt/Mahnung/Storniert): alle 3 auf lowercase `status` + `bezahlt_am` umgestellt. Die Felder `Mahnungen` und `Letzte_Mahnung` existieren im Schema NICHT — auf `mahnstufe` (Number) umgemappt, `Letzte_Mahnung` raus (kein Zielfeld).

- **P5.B2** `onboarding-tour.js`: defensive Null-Checks im MutationObserver-Monkey-Patch. `T = window.PROVA_TOUR; if (!T) return;` verhindert TypeError wenn PROVA_TOUR zwischen Init und Tooltip-Render entfernt wurde.

- **P5.B3** `bescheinigungen.html` entfernt:
  - Sidebar-Link in `nav.js` raus, `bescheinigungen.html` + `bescheinigungen-logic.js` `git rm`, `sw.js` APP_SHELL um die zwei Einträge bereinigt, `netlify.toml` 301-Redirect `/bescheinigungen.html` und `/bescheinigungen` → `/dashboard.html`.

- **P5.B4** `jahresbericht.html` innerHTML-Error:
  - Pre-Flight-Audit deckte auf: HTML hatte NUR Topbar/Drawer/Bottom-Nav, der gesamte Report-Content-Section fehlte. Logic warf "Cannot set properties of null" bei jedem `getElementById('loading-state').innerHTML`.
  - HTML-Patch: `<main>`-Section mit allen vom Logic-File erwarteten Containern (loading-state, report-content, year-bar, bericht-subtitle, kpi-grid, monat-chart, monat-labels, art-chart) eingefügt.
  - Logic-Patch: Alle `getElementById`-Calls über `_jb$()`-Helper + Null-Guard. Sections die in der HTML noch fehlen (status-chart, zeit-card-body, faelle-tbody, etc. — geplant für Sprint 13) werden übersprungen statt zu werfen.

- **P5.B5** Unklar-Tabellen geklärt:
  - `tblaboaRkJjrX3Z4J` = PASSWORD_RESET_TOKENS (token_hash, sv_email, expires_at, …)
  - `tbli4t2WDLeBfuBB2` = LOGIN_ATTEMPTS (email, success, ip_address, failure_reason)
  - Beide bewusst NICHT in `airtable.js`-Whitelist (Backend-only, Direkt-Access via login.js / password-reset-request.js mit env-PAT). Kommentar in `airtable.js:55-58` dokumentiert das korrekt — kein Code-Change.

**Block C — Tests + Audit:**

- **P5.C1** Playwright-Tests an HMAC-Token-Workflow angepasst:
  - 7 Test-Files (01-login, 02-authenticated-smoke, 03-core-workflow, 04-e2e-workflow, 05-security, 06-mobile-ortstermin, 07-doppelklick) bekommen im `addInitScript` einen mock-HMAC-Token: `base64url(JSON-payload).mocksig`.
  - `verifyProvaToken` (Client) prüft nur Format + exp — Sig wird server-seitig geprüft, irrelevant für Page-Render-Tests. `mocksig` ist offensichtlich falsch, sodass Tests die versehentlich Function-Calls machen, klar an 401 erkennen wann's an der falschen Sig liegt.

- **P5.C2** `AUDIT-REPORT.md` Status-Spalte:
  - Alle 36 Findings durchgegangen. **26 ✅ erledigt**, **8 🟡 akzeptiert** (Bridge / dokumentiert), **2 🔴 offen** (Finding 1.7 BASE_ID-Zentralconfig → Sprint 18+; Finding 3.2 Import-Assistent-localStorage → Sprint 5 Datenmigration).

### Cache-Versionen

`prova-v211` (Start) → `v212` (P5.A2/A3 sanitize) → `v213` (P5.B1-B5).

Vorher P5: P4B.8c-Hotfix `v210→v211`.

### Lessons Learned

- **Pre-Flight-Audit ist Gold:** B4 wäre als „Date-Range-Bug" misdiagnostiziert worden, wenn ich nicht erst die HTML auf existierende IDs gegrept hätte. Tatsächlich fehlte die ganze Content-Section. Marcels Pre-Flight-Regel (`grep -l "<script.*[file].*>" *.html`) hat sich erneut bewährt.
- **Schema-Query first:** B1 wurde via Airtable-MCP `list_tables_for_base` in 30 Sekunden gefixt statt in 30 Minuten Browser-DevTools-Trial-and-Error. `Status`/`status`-Schreibweise war auf den ersten Blick nicht offensichtlich.

---

## Sprint 03 — S-SICHER P4B · Function-JWT + Rate-Limit

**Tag:** `v180-ssicher-p4b-done` · **Stand:** 26.04.2026 · **Letzter Commit:** `ad526ea`

### Was deployed wurde

- **Drei neue Backend-Libraries** unter `netlify/functions/lib/`:
  - `jwt-middleware.js` — `requireAuth(handler)` Wrapper. Liest Bearer-Token aus `Authorization`-Header oder Cookie `prova_auth=…`, verifiziert via `lib/auth-token`, packt `tokenPayload` als `context.user` und `context.userEmail` in den Handler. OPTIONS-Preflight wird ohne Auth durchgereicht. Mismatch → 403, fehlend/invalid → 401.
  - `rate-limit-user.js` — In-Memory Rate-Limit-Bucket pro Token-sub. `check(userEmail, max, windowSec, opts)` retourniert `{allowed, retryAfter}`; Lib loggt selbst Audit-Eintrag bei Hit, wenn `opts.event` und `opts.functionName` mitgegeben werden. Bucket-Sharing: provisional + verified + emergency-Tokens teilen sich denselben Bucket per Email — by design, verhindert Notfall-Token-Bypass.
  - `auth-resolve.js` — `resolveUser(event)` mit Token + optionalem `body._userEmail`-Cross-Check (Mismatch → 403). `logAuthFailure(reason, event, extras)` mit pseudonymisierter Email (ProvaPseudo.apply) für Konsole + AUDIT_TRAIL-Insert (typ=`Auth-Required` / `Auth-Mismatch` / `Rate-Limit-Hit` / `Origin-Block`).

- **JWT-Pflicht in 24 user-protected Functions:**
  - Mit Rate-Limit: `ki-proxy` (20/60s), `whisper-diktat` (10/60s), `foto-captioning` (30/60s)
  - Ohne Rate-Limit: `foto-upload`, `airtable`, `akte-export`, `audit-log`, `brief-pdf-senden`, `brief-senden`, `dsgvo-auskunft`, `dsgvo-loeschen`, `emails`, `foto-anlage-pdf`, `foto-pdf`, `jahresbericht-pdf`, `ki-statistik`, `mahnung-pdf`, `mein-aktivitaetsprotokoll`, `rechnung-pdf`, `smtp-senden`, `stripe-checkout`, `stripe-portal`, `zugferd-rechnung`
  - Mit zusätzlichem Origin-Check: `push-notify` — nur Calls von `prova-systems.de`/`app.`/`admin.`/`www.`/`netlify.app`/localhost werden akzeptiert. Origin-Block → 403 ohne Hint warum.

- **`airtable.js` STRICT-Modus:** `body._userEmail`-Pfad und Netlify-Identity-`clientContext.user.email`-Pfad komplett entfernt. HMAC-Token ist Pflicht. Schliesst Audit-Finding 1.1 endgültig (kompletter Multi-Tenant-Bypass via curl + `_userEmail`-Body war Sprint-02 nur als Bridge gelassen).

- **Frontend `provaFetch`-Helper** (`prova-fetch-auth.js`, neu) injiziert `Authorization: Bearer <prova_auth_token>` automatisch in jeden Call zu `/.netlify/functions/`. Bei 401 wird `prova_auth_token` + `prova_user` + `prova_session_v2` gelöscht und zur Login-Page weitergeleitet (`?reason=token_expired`). Sweep über 52 Frontend-JS-Files: alle `fetch('/.netlify/functions/...')` → `provaFetch('...)`. Verifikations-Grep nach Sweep komplett leer. 54 HTML-Dateien laden den Helper über `<script src="prova-fetch-auth.js">` vor `auth-guard.js`.

- **`auth-guard.js` V2-Session weg.** `isValidSession()` von ~70 auf ~15 Zeilen reduziert. HMAC-Token (`prova_auth_token`) ist einziger Auth-Anker. `provaCreateSession` bleibt als no-op-Stub für Backward-Compat (app-login-logic.js ruft das defensiv hinter typeof-Guard). `provaGetSession` liefert jetzt `prova_user` (statt das tote `prova_session_v2`-Objekt). Schliesst Audit-Findings 7.1 / 7.2 / 7.3 endgültig.

### Cache-Versionen

`prova-v208` (Start) → `v209` (P4B.8 provaFetch + Sweep) → `v210` (P4B.9 V2-Session weg).

### Live-Verifikation nach Deploy

```
curl -X POST /.netlify/functions/airtable -d '{"method":"GET","path":"/v0/.../..."}'
→ 401 "Authentifizierung erforderlich"

curl -X POST /.netlify/functions/ki-proxy -d '{}'
→ 401 "Authentifizierung erforderlich"
```

### Akzeptanz-Test-Plan für Marcel (morgen früh)

1. `curl` ohne Token gegen ki-proxy → 401 ✓ (oben verifiziert)
2. `curl` mit Garbage-Token (z.B. `Authorization: Bearer foo`) → 401
3. `curl` mit Notfall-Token gegen ki-proxy → 200 / 4xx je nach Body, kein 401
4. 21 schnelle ki-proxy-Calls in 60s → 21. = 429 + `Retry-After`-Header
5. `fetch` zu push-notify mit `Origin: https://evil.example.com` → 403
6. Browser-App-Tour: Inkognito → Dashboard / Akte / Diktat / Foto / Archiv / Einstellungen / Rechnungen / Termine / Kontakte. Network-Tab muss `Authorization: Bearer eyJ…` in JEDEM `/.netlify/functions/`-Call zeigen. Console keine roten Errors.
7. AUDIT_TRAIL Tabelle: Einträge `typ=Auth-Required` aus Tests 1+2 sichtbar; `typ=Rate-Limit-Hit` aus Test 4.

### Nicht durch — explizit deferred

- **`pdf-proxy.js`** hat eigenen signed-URL-Mechanismus für GETs (Token im Query). POST-only-requireAuth wäre strukturell OK, aber riskant ohne expliziten Test des bestehenden Download-Flows → Sprint 04.
- **`termin-reminder.js`** vermutlich Cron / Make.com-Webhook, nicht user-getriggert → braucht eigene Auth-Strategie (geteiltes Secret oder Stripe-style Signatur).
- **`make-proxy.js`** Make.com-Webhook mit eigener Auth → separate Auth-Strategie.
- **`normen.js` / `normen-picker.js`** Read-only Katalog, öffentlich zugänglich → kein User-Bind, JWT-Pflicht würde Anonyme blocken.
- **Identity-Recovery-Flow:** wenn Marcel nach `recovery_token` im URL-Hash via Identity-Widget passwort zurücksetzt, hat er KEINEN HMAC-Token. Er muss sich danach ein zweites Mal einloggen (über das normale Login-Form). Akzeptiert für Pilot, AUTH-PERFEKT 2.0 macht's sauber.

### Vergangene Iterationen / Lessons Learned

- **P4B.1 → P4B.1d Hotfix.** Initial waren Audit-Logs in den Caller-Functions (ki-proxy etc.) verteilt. Marcel verlangte mid-sprint dass das in den Libs zentral passiert (rate-limit-user lib ruft `logAuthFailure` selbst, alle Caller passen `{event, functionName}` als opts). Plus Pseudonymisierung der Emails vor jedem Logging (Defense-in-Depth gegen Angreifer-Payloads in den Logs). Hotfix bedeutet: keine Aenderung von Funktionalitaet, nur Verlagerung der Verantwortung in die Libs.
- **18 Functions in P4B.7b als Sammel-Commit.** Marcel's Plan listete `ki-proxy/whisper/foto-*/push-notify/airtable` einzeln und den Rest als `~20 weitere Functions`. Sammel-Commit-Pattern ist einfacher zu reviewen als 18 separate Commits, gleicher Effekt.

---

## Sprint 02 — S-SICHER P4A · Auth-Fundament

**Tag:** `v180-ssicher-p4a-done` · **Stand:** 26.04.2026 · **Letzter Commit:** `2dfbc9d`

### Was deployed wurde

- **HMAC-Token-Infrastruktur live** — `lib/auth-token.js` (sign/verify mit `AUTH_HMAC_SECRET` aus Netlify ENV, base64url-Format `payload.signature`, timing-safe Compare). Token-TTL 7 Tage normal, 90 Tage Notfall.
- **Login-Endpoints** — `auth-token-issue` (POST `{email,password}` → HMAC-Token + SV-Daten aus Airtable; provisional-Fallback für unconfirmed Identity-Accounts als Brücke bis AUTH-PERFEKT 2.0) und `auth-token-verify` (POST/GET Token-Verify für Cross-Function-Use).
- **auth-guard.js komplett umgestellt** — primärer Auth-Anker ist jetzt `prova_auth_token` (HMAC, client-seitiger Format+exp-Check, echte Verify server-seitig). V2-Session bleibt als sekundärer Pfad. Legacy-Migration aus `prova_user`-localStorage **entfernt** (Audit-Finding 7.1, "Schwerstes Auth-Problem im Code").
- **Browser-seitiger Identity-Bypass geschlossen** — `app-login.html` nutzte einen Inline-`window.login`, der auf Identity-400 + "confirm" eine eigene Session ohne Server-Token erzeugte (Finding 7.2). Login geht jetzt ausschliesslich über `auth-token-issue`. Provisional-Logik lebt server-seitig (Brücke).
- **Inline-Login-Architektur aufgeräumt** — `app-login.html` Inline-Scripts (170 Zeilen) externalisiert nach `app-login-logic.js`. `app-login.html` jetzt 423 statt 592 Zeilen. `netlifyIdentity.on('login')`-Handler entfernt (Parallel-Pfad weg, nur noch ein Login-Pfad).
- **airtable.js Hybrid-Cross-Check** — neue `resolveUser(event)`-Funktion liest HMAC-Token aus `Authorization: Bearer …` oder Cookie `prova_auth=…`, verifiziert server-seitig, vergleicht `token.sub` gegen `body._userEmail` und `clientContext.user.email`. Mismatch → 403 + AUDIT_TRAIL-Eintrag (typ=`Auth-Mismatch`). Token-sub gewinnt.
- **`_userEmail`-Bridge bleibt** — Sprint 03 (P4B) entfernt den Pfad komplett, dann ist HMAC-Token PFLICHT für jede Function.
- **Notfall-Bookmarklet** — `scripts/generate-emergency-token.js` (90-Tage-Token, `emergency:true`-Marker für AUDIT-Filter). Token wird NIE ins Repo geschrieben — Marcel speichert selbst im Passwort-Manager. Doku in `docs/EMERGENCY-BOOKMARKLET.md`.
- **CLAUDE.md Regel 27** — neue Pflicht: jede Frontend-JS/CSS-Änderung erfordert `sw.js` CACHE_VERSION-Bump im selben Commit (kein Sammel-Bump). Nach verlorenem Block-B-Anlauf hart festgeschrieben.

### Cache-Versionen

`prova-v204` (Start) → `v205` (P4A.4) → `v206` (P4A.5) → `v207` (P4A.5-v2) → `v208` (P4A.6).

### Nicht durch — explizit ausgeklammert

- **Identity-Confirmation-Hintertür** — Marcels Account ist in Netlify Identity *unconfirmed*. `auth-token-issue` hat einen Provisional-Fallback (Identity-400 → Airtable-SV-Lookup → Token mit `verified:false, provisional:true`). Das ist **Brücke**, nicht Endzustand. AUTH-PERFEKT 2.0 (nach Pilot-Phase) baut den Account-Lifecycle korrekt: Bestätigungs-Mail + verifiziertes Login als einziger Pfad. Bis dahin: Provisional-Marker im Token, Frontend kann ein "Bitte E-Mail bestätigen"-Banner darauf bauen.
- **HMAC-Token-only-Auth** — V2-Session als sekundärer Auth-Pfad in `auth-guard.js` bleibt vorerst, weil das Identity-Widget bei Recovery-Reset einen Login triggern kann, der dann über V2-Session aufgefangen wird. Sprint 03 (P4B) entfernt V2 und macht HMAC-Token zum einzigen Anker.
- **`_userEmail` aus airtable.js** — Bridge bleibt bis Sprint 03. Cross-Check schlägt schon bei Mismatch zu, also ist der Schutz aktiv. Vollständige Entfernung wenn alle Frontend-Calls auf Bearer-Header umgebaut sind.

### Vergangene Iterationen / Lessons Learned

- **Block B v1 fehlgeschlagen** — erste Implementierung von P4A.5 modifizierte `app-login-logic.js`, ohne zu verifizieren ob die Datei überhaupt geladen wird. Ergebnis: `app-login.html` lud die Datei nicht via `<script src=…>`, der echte Login lebte inline in der HTML, P4A.5-Edits hatten null Effekt. Rollback durchgeführt, P4A.5-v2 als saubere Externalisierung.
- **Drei Diagnose-Hypothesen** (SW-Cache / `ladePaketUndWeiterleiten` / CORS) waren alle ohne reale Daten — das Problem war ein Vierter, den keine der Hypothesen abdeckte: Editor-Target war tote Datei. Lehre: vor Code-Änderungen `grep -rln "<filename>" --include="*.html"` als Sanity-Check, mindestens.

---
