# Sprint K-1.3 + K-1.4 + K-1.5 — MEGA-PROMPT #2 für Claude Code

**Voraussetzung:** Sprint K-1.1 + K-1.2 sind GRÜN (alle Migrations-Counts stimmen, alle 8 Edge Functions Health-Check grün).

**Dauer-Schätzung:** 4-7h autonomer Wallclock-Lauf für ~30 Blöcke
**Modus:** Auto-Run mit Push nach jedem Block, NACHT-PAUSE bei Konflikt
**Branch:** Neuer Branch `sprint-k-1-3-4-5-frontend-cutover` (von `main` ausgehend, NACHDEM K-1.1+K-1.2 in main gemerged sind)

---

## ANWEISUNG AN MARCEL

**WANN diesen Prompt rausschicken:**
- ✅ Erster Mega-Prompt (K-1.1+K-1.2) ist durchgelaufen
- ✅ Migrations-Counts grün: `node scripts/migrate/validate.js` zeigt 8/8
- ✅ Edge Functions Health-Check grün: tools/test-edge-functions.html alle 8 Buttons ✅
- ✅ Tag gesetzt: `v180-k-1-1-und-1-2-done`
- ✅ In `main` gemerged

**Wenn auch nur EINER dieser Punkte rot ist:** STOP. Ersten Sprint reparieren. Zweiten Prompt NICHT pasten.

**Wenn alle grün sind:**
1. `git checkout main && git pull && git checkout -b sprint-k-1-3-4-5-frontend-cutover`
2. Diesen Prompt KOMPLETT (von "PROMPT START" bis "PROMPT ENDE") in Claude Code pasten
3. Shift+Tab für Auto-Accept
4. Schlafen / Kaffee / nächste Aufgabe — Claude Code läuft 4-7h durch

---

## PROMPT START

```
PROVA Sprint K-1.3 + K-1.4 + K-1.5 — Frontend-Pilot + Frontend-Refactor + Cutover-Vorbereitung
(Mega-Sprint #2, autonomer Modus)

ROLLE:
Du bist Senior-Fullstack-Engineer für PROVA Systems. Du arbeitest autonom 
in einem Mega-Sprint #2 mit ~30 Blöcken über 3 Phasen. Marcel testet und 
pastet zwischendurch — bei Konflikten oder Unsicherheit: STOP + 
NACHT-PAUSE.md, NICHT raten.

PFLICHT-LEKTUERE (zwingend in dieser Reihenfolge lesen):
1. CLAUDE.md im Repo-Root
2. SPRINT-K-1-0-COMPLETE.md (Foundation)
3. SPRINT-K-1-1-und-K-1-2-COMPLETE.md (Migration + Edge Functions)
4. lib/supabase-client.js
5. lib/data-store.js (kennt alle Tabellen)
6. lib/template-registry.js (PDFMonkey-IDs)
7. lib/prova-config.js (window.PROVA_CONFIG)
8. PROVA-VISION-MASTER.md (4-Flow-Architektur, Tier-Strategie, Pattern A)
9. PROVA-REGELN-PERMANENT.md (Disziplin, sw.js-Bump, KI-Regeln)
10. PROVA-ARCHITEKTUR-MASTER.md (8 Hauptobjekte + Beziehungen)
11. nav.js (Sidebar-Logik)
12. page-template.css (Layout zentral)
13. airtable.js (das ersetzen wir — gut zu kennen)
14. login.html (das ersetzen wir mit auth-supabase.html)

KONTEXT:
PROVA-Stack-Reduktion ist fast fertig:
- ✅ K-1.0: Foundation (Supabase-Client, Data-Store, Auth)
- ✅ K-1.1: Daten-Migration Airtable → Supabase
- ✅ K-1.2: Edge Functions ersetzen Make.com
- 🔄 K-1.3: 1 Pilot-Page komplett auf Supabase (Kurzstellungnahme)
- 🔄 K-1.4: Alle restlichen Pages auf Supabase
- 🔄 K-1.5: Cutover-VORBEREITUNG (Marcel führt manuell aus)

Zielzustand nach diesem Mega-Sprint:
- Kurzstellungnahme als Pilot-Page läuft auf Supabase (Beweis-of-Concept)
- Alle 25+ HTML-Pages refactored (kein airtable.js mehr im Frontend)
- auth-supabase.html ist die finale Login-Page
- Cutover-Skripte bereit (Make-Scenarios deaktivieren, Netlify Identity raus)
- Cutover-Doku vollständig
- ABER: Cutover wird NICHT live ausgeführt — Marcel macht das manuell

WICHTIG — SCOPE-DISZIPLIN:

IST scope:
✅ HTML-Pages refactoring (airtable.js → data-store.js)
✅ Logic-JS-Files refactoring (auf data-store + edge functions umstellen)
✅ auth-supabase.html als finale Login-Page
✅ nav.js Auth-Check umstellen
✅ sw.js APP_SHELL erweitern + CACHE_VERSION bumpen (am ENDE!)
✅ scripts/cutover/* (Cutover-Skripte für Marcel)
✅ docs/CUTOVER-RUNBOOK.md
✅ SPRINT-K-1-3-4-5-COMPLETE.md

IST NICHT scope:
❌ Make.com Scenarios live deaktivieren (Marcel macht das manuell)
❌ Netlify Identity Subdomain abschalten (Marcel)
❌ Airtable Base löschen (NIE löschen — nur Read-only setzen)
❌ /supabase-migrations/ Schema-Files ändern
❌ scripts/migrate/* aus K-1.1 ändern
❌ supabase/functions/* aus K-1.2 ändern (außer minor Patches falls nötig)
❌ CLAUDE.md / masterplan-v2/ ohne Marcel-OK
❌ Stripe Live-Mode Webhook-URL ändern (Marcel)

============================================================
PHASE A: K-1.3 FRONTEND-PILOT KURZSTELLUNGNAHME (Blöcke A1-A7)
============================================================

ZIEL:
EINE Page (Kurzstellungnahme) komplett auf Supabase migrieren als 
Beweis-of-Concept. Bevor wir 25+ Pages refactoren, soll EINE perfekt 
funktionieren — als Vorlage für K-1.4.

PILOT-PAGE-WAHL:
Kurzstellungnahme hat 3 Phasen statt 9 → niedrige Komplexität, 
guter Pilot. Datei: technische-stellungnahme.html (existiert bereits 
als Skeleton aus Sprint 04f, hat 3-Phasen-Wizard).

ALTERNATIV (falls technische-stellungnahme.html zu unfertig):
ergaenzung.html (auch 3-4 Phasen) oder beratung.html (3 Phasen).

----------------------------------------
Block A1: Pilot-Page-Auswahl + Pre-Audit
----------------------------------------
1. Lese technische-stellungnahme.html + technische-stellungnahme-logic.js
2. Identifiziere: 
   - Welche Airtable-Calls aktuell drin sind (über airtable.js)
   - Welche prova-audit.js / prova-context.js / prova-pseudo.js verwendet werden
   - Welche Make-Webhooks getriggert werden (PDF-Generation, Lifecycle)
   - Welche fetch() zu Netlify Functions gehen
3. Schreibe technische-stellungnahme.html-AUDIT.md (im /docs/audits/ Ordner)
   mit Liste der Refactor-Punkte + erwartetem Aufwand

WENN technische-stellungnahme.html zu unfertig: STOP + NACHT-PAUSE-K-1-3.md
mit Begründung + Vorschlag alternativer Pilot.

Commit: "K-1.3.A1: Pilot-Page-Audit für Kurzstellungnahme"

----------------------------------------
Block A2: Refactor technische-stellungnahme-logic.js auf data-store
----------------------------------------
- Alle airtable.js-Calls durch data-store.js-Calls ersetzen
- workspace_id wird automatisch aus aktueller Session gelesen
- Auth-Check: nutzt supabase-client.getCurrentUser() statt Netlify Identity
- Auto-Save weiter alle 30s (jetzt gegen Supabase)
- ki-Calls gehen jetzt an Edge Function ki-proxy (nicht mehr Netlify Function)
- PDF-Generation: Edge Function pdf-generate (nicht mehr Make Webhook)
- Audit: Edge Function audit-write (nicht mehr Netlify Function prova-audit.js)

Wichtig: Das Frontend-Verhalten bleibt 100% gleich. Nur das Backend wechselt.

Pre-Flight:
- Lese aktuelle technische-stellungnahme-logic.js komplett
- Identifiziere alle externen Calls
- Mappe jeden Call auf data-store-Methode oder Edge-Function-Endpoint
- Bei unklaren Mappings: NACHT-PAUSE.md (NICHT raten!)

Commit: "K-1.3.A2: technische-stellungnahme-logic.js refactor → data-store + Edge Functions"

----------------------------------------
Block A3: technische-stellungnahme.html Imports anpassen
----------------------------------------
- <script src="airtable.js"> entfernen
- <script src="prova-pseudo-send.js"> entfernen (Pseudonymisierung passiert jetzt server-side in Edge Function)
- <script src="lib/prova-config.js"> ergänzen (vor allen ESM-Modulen)
- <script type="module" src="lib/supabase-client.js"> ergänzen
- <script type="module" src="lib/data-store.js"> ergänzen
- Auth-Guard-Snippet einfügen: bei nicht-eingeloggt → redirect auf /auth-supabase.html

Commit: "K-1.3.A3: technische-stellungnahme.html Imports auf Supabase"

----------------------------------------
Block A4: Auth-Guard zentral als lib/auth-guard.js
----------------------------------------
Datei: lib/auth-guard.js
Inhalt:
- runAuthGuard(): prüft Supabase-Session, redirect zu /auth-supabase.html falls nicht eingeloggt
- requireWorkspace(): prüft workspace_id, redirect zu /onboarding falls nicht
- bindLogoutButton(): bindet Logout-Logic an alle [data-action="logout"]-Elemente

Wird in K-1.4 in alle Pages integriert. Hier nur Modul anlegen.

Commit: "K-1.3.A4: lib/auth-guard.js zentral"

----------------------------------------
Block A5: Browser-Test-Skript für Pilot
----------------------------------------
Datei: tools/test-pilot-kurzstellungnahme.html
Inhalt:
- Setup-Banner für Anon-Key (gleich wie K-1.0 test-supabase-login.html)
- Login-Box
- 6 Test-Buttons:
  1. Auftrag anlegen (Test-Daten via data-store.auftraege.create())
  2. Auftrag laden + bearbeiten
  3. KI-Strukturierung triggern (Mock-Diktat)
  4. PDF generieren (BRIEF-Template)
  5. Audit-Log prüfen (letzte 5 Events)
  6. Logout
- Output-Box pro Test mit Status

Commit: "K-1.3.A5: tools/test-pilot-kurzstellungnahme.html"

----------------------------------------
Block A6: Workspace-Onboarding-Page
----------------------------------------
Datei: onboarding-supabase.html + onboarding-supabase-logic.js
Zweck: Bei erstem Login (kein workspace) → User legt sein Workspace an

Flow:
1. SV-Daten erfassen (Name, IHK-Bestellung, Adresse)
2. Tier wählen (Solo/Team) — kann später geändert werden
3. data-store.workspaces.create() + workspace_users.create()
4. Redirect auf /index.html (Cockpit)

Wird in K-1.5 zur finalen Onboarding-Page.

Commit: "K-1.3.A6: onboarding-supabase.html + Logic"

----------------------------------------
Block A7: K-1.3-Doku
----------------------------------------
Datei: SPRINT-K-1-3-PILOT-COMPLETE.md
Inhalt:
- Was wurde refactored
- Wie der Pilot zu testen ist
- Welche Pattern für K-1.4 als Vorlage dienen (das ist der Hauptzweck dieser Doku!)
- Bekannte Limitierungen
- Marcel-TODO: Browser-Test mit tools/test-pilot-kurzstellungnahme.html

Commit: "K-1.3.DONE: Pilot-Page Kurzstellungnahme komplett auf Supabase"

============================================================
AKZEPTANZ-GATE A — vor PHASE B prüfen
============================================================

Nach Block A7, BEVOR mit Block B1 weitergemacht wird, prüfen:

1. technische-stellungnahme.html lädt ohne Console-Errors (nutze Browser-Devtools-Headless-Check oder syntax-check)
2. Alle imports stimmen (lib/prova-config.js, supabase-client, data-store, auth-guard)
3. Keine Reste von airtable.js oder prova-pseudo-send.js in technische-stellungnahme.html
4. Keine direkten Netlify-Function-Calls mehr (alle gehen über Supabase Edge Functions)
5. node --check für alle JS-Files
6. tools/test-pilot-kurzstellungnahme.html existiert + syntax-check OK

WENN GATE-FAILS:
- NACHT-PAUSE-K-1-3.md schreiben
- Letzten sicheren Stand committen + pushen
- STOP — keine Phase B starten

WENN GATE-GREEN:
- Commit "K-1.3.GATE: Pilot-Akzeptanz-Gate grün, Phase B (Refactor) startet"
- Phase B starten

============================================================
PHASE B: K-1.4 FRONTEND-REFACTOR REST (Blöcke B1-B15)
============================================================

ZIEL:
Alle restlichen 24 HTML-Pages auf Supabase umstellen, nach gleichem 
Pattern wie Pilot. Pages werden in 4 Tranchen abgearbeitet.

TRANCHE 1: Auftragstyp-Pages (8 Pages)
TRANCHE 2: Cockpit + Akte + Archiv (4 Pages)
TRANCHE 3: Briefe + Rechnungen + Bescheinigungen (5 Pages)
TRANCHE 4: Settings + Onboarding + Restliche (7 Pages)

WICHTIG:
- Pro Page: backup als <pagename>.html.bak vor erstem Edit (für Rollback)
- Pro Page: gleiches Pattern wie Pilot anwenden
- Bei Special-Cases (z.B. multi-page-Workflow): NACHT-PAUSE statt raten

----------------------------------------
Block B1: TRANCHE 1.1 — app.html (Schadensgutachten, 9 Phasen)
----------------------------------------
Hauptseite, komplexest. Refactor analog Pilot.

WICHTIG: app.html hat 27.8 KB Inline-CSS (Backlog aus Sprint 04f). 
NICHT die Inline-CSS reduzieren — Scope ist nur Backend-Migration!

Commit: "K-1.4.B1: app.html Schadensgutachten refactor (Tranche 1.1)"

----------------------------------------
Block B2: TRANCHE 1.2 — ergaenzung.html + widerspruch-gutachten.html
----------------------------------------
Beide ähnliche Struktur wie app.html.

Commit: "K-1.4.B2: ergaenzung.html + widerspruch-gutachten.html (Tranche 1.2)"

----------------------------------------
Block B3: TRANCHE 1.3 — stellungnahme.html (§6 Fachurteil-Editor)
----------------------------------------
Hat 35.5 KB Inline-CSS (Backlog) — nicht reduzieren!

Wichtig: stellungnahme.html ist NICHT technische-stellungnahme.html!
- stellungnahme.html = §6 Fachurteil-Editor (Phase 4 von Schadensgutachten)
- technische-stellungnahme.html = eigenständiger Auftragstyp (war Pilot)

Commit: "K-1.4.B3: stellungnahme.html §6 Editor refactor (Tranche 1.3)"

----------------------------------------
Block B4: TRANCHE 1.4 — wertgutachten.html + schiedsgutachten.html
----------------------------------------
Flow B (Wertgutachten) + Sonderfall Schied.

Commit: "K-1.4.B4: wertgutachten.html + schiedsgutachten.html (Tranche 1.4)"

----------------------------------------
Block B5: TRANCHE 1.5 — beratung.html + baubegleitung.html
----------------------------------------
Flow C (Beratung 3 Phasen) + Flow D (Baubegleitung 3+n).

Commit: "K-1.4.B5: beratung.html + baubegleitung.html (Tranche 1.5)"

----------------------------------------
GATE B-1 (zwischen Tranche 1 und 2)
----------------------------------------
- Alle 8 Auftragstyp-Pages refactored
- node --check für alle Logic-Files OK
- Falls Probleme: NACHT-PAUSE.md, sonst weiter

Commit: "K-1.4.GATE-1: Tranche 1 (8 Auftragstyp-Pages) refactored"

----------------------------------------
Block B6: TRANCHE 2.1 — index.html (Cockpit)
----------------------------------------
Cockpit nutzt dashboard-logic.js (5 Module aus v98).
- KPI-Cards aus master_cockpit-View (existiert in Supabase)
- Aufträge-Liste aus auftraege
- Termine aus termine

Commit: "K-1.4.B6: index.html Cockpit refactor (Tranche 2.1)"

----------------------------------------
Block B7: TRANCHE 2.2 — akte.html + archiv.html
----------------------------------------
Akte = Detail-View pro Auftrag mit 9-Phasen-Timeline
Archiv = abgeschlossene Aufträge

Commit: "K-1.4.B7: akte.html + archiv.html (Tranche 2.2)"

----------------------------------------
Block B8: TRANCHE 2.3 — kontakte.html + termine.html
----------------------------------------
Kontakt-Liste + Termin-Kalender.

Commit: "K-1.4.B8: kontakte.html + termine.html (Tranche 2.3)"

----------------------------------------
GATE B-2
----------------------------------------
Commit: "K-1.4.GATE-2: Tranche 2 (4 Cockpit-Pages) refactored"

----------------------------------------
Block B9: TRANCHE 3.1 — schnelle-rechnung.html + briefvorlagen.html
----------------------------------------
Standalone Werkzeuge, nicht auftragsgebunden.

Commit: "K-1.4.B9: schnelle-rechnung.html + briefvorlagen.html (Tranche 3.1)"

----------------------------------------
Block B10: TRANCHE 3.2 — Rechnungen + Mahnungen + Bescheinigungen
----------------------------------------
Falls separate Pages existieren — checken in Page-Liste.
Falls nicht: skip dieses Block, weiter mit B11.

Commit: "K-1.4.B10: Rechnungen + Mahnungen + Bescheinigungen (Tranche 3.2)"

----------------------------------------
GATE B-3
----------------------------------------
Commit: "K-1.4.GATE-3: Tranche 3 (Korrespondenz-Pages) refactored"

----------------------------------------
Block B11: TRANCHE 4.1 — settings.html + Sub-Settings
----------------------------------------
Settings-Page nutzt:
- workspace + workspace_users (User-Mgmt)
- Stripe-Customer-Portal-Link (Edge Function call)
- Onboarding-Tour-State (in profiles)

Commit: "K-1.4.B11: settings.html + Sub-Settings (Tranche 4.1)"

----------------------------------------
Block B12: TRANCHE 4.2 — login.html → auth-supabase.html als Replacement
----------------------------------------
- login.html in login.html.bak umbenennen (Backup)
- auth-supabase.html zur finalen login.html upgraden:
  - branding-rich (PROVA-Logo, Hero, Trust-Badges)
  - "Passwort vergessen"-Flow
  - "Account anlegen"-Flow
  - Magic-Link-Option
- Auth-Logic erweitert in auth-supabase-logic.js

Commit: "K-1.4.B12: login.html → Supabase Auth (Tranche 4.2)"

----------------------------------------
Block B13: TRANCHE 4.3 — Restliche Pages (FAQ, Hilfe, etc.)
----------------------------------------
Static-Pages ohne Backend-Calls bleiben unverändert. Nur Auth-Guard-
Snippet einfügen falls Login-Pflicht.

Commit: "K-1.4.B13: Restliche Pages mit Auth-Guard (Tranche 4.3)"

----------------------------------------
Block B14: nav.js Auth-Check umstellen
----------------------------------------
nav.js prüft aktuell Netlify Identity. Umstellen auf:
- supabase-client.getCurrentUser()
- workspace + tier aus data-store
- "Logout"-Button bindet auf supabase-client.signOut()

Commit: "K-1.4.B14: nav.js auf Supabase-Auth umstellen"

----------------------------------------
Block B15: K-1.4-Doku
----------------------------------------
Datei: SPRINT-K-1-4-REFACTOR-COMPLETE.md
Inhalt:
- Liste aller 25+ refactored Pages mit .bak-Backup-Hinweis
- Welche Pages noch NICHT refactored wurden + Begründung
- Bekannte Issues + Workarounds
- Marcel-TODO: Browser-Test pro Tranche

Commit: "K-1.4.DONE: Frontend-Refactor komplett"

============================================================
AKZEPTANZ-GATE B — vor PHASE C prüfen
============================================================

Nach Block B15:

1. Alle 25+ HTML-Pages haben kein <script src="airtable.js"> mehr
2. Alle Logic-JS-Files sind syntax-check OK
3. nav.js läuft auf Supabase
4. login.html ist Supabase-basiert
5. .bak-Files für alle modifizierten Pages existieren
6. Keine direkten Netlify-Function-Calls mehr im Frontend (außer wo Marcel das explizit braucht)

WENN GATE-FAILS:
- NACHT-PAUSE-K-1-4.md schreiben
- letzten sicheren Stand committen + pushen
- STOP — keine Phase C starten

WENN GATE-GREEN:
- Commit "K-1.4.GATE: Refactor-Akzeptanz-Gate grün, Phase C (Cutover-Vorb.) startet"
- Phase C starten

============================================================
PHASE C: K-1.5 CUTOVER-VORBEREITUNG (Blöcke C1-C8)
============================================================

ZIEL:
Skripte und Doku vorbereiten, mit denen Marcel den finalen Cutover 
manuell durchführen kann. NICHTS wird live geschaltet — alles ist 
Vorbereitung.

CUTOVER-ABLAUF (für Marcel später):
1. sw.js CACHE_VERSION bumpen
2. Deploy auf Netlify
3. Make.com Scenarios deaktivieren (T3+F1+L3+L8+L10+G1+G3+K2+A5)
4. Stripe Webhook-URL auf Supabase Edge Function umstellen
5. Netlify Identity disabled
6. airtable.js entfernen
7. Smoke-Tests
8. Bei OK: Tag v180-k-1-cutover-done

----------------------------------------
Block C1: scripts/cutover/01-deactivate-make.md
----------------------------------------
Datei: scripts/cutover/01-deactivate-make.md
Inhalt:
- Liste aller Make-Scenarios mit ID + Funktion
- Schritt-für-Schritt-Anleitung wie sie deaktiviert werden:
  1. T3 (5147519) — Termin-Reminder, ersetzt durch Edge Function
  2. F1 (5192002) — Finanzen, ersetzt durch Edge Function
  3. L3 (5038113) — Lifecycle, ersetzt durch lifecycle-trigger
  4. L8 (5147509) — Lifecycle, ersetzt durch lifecycle-trigger
  5. L10 (5158552) — Lifecycle, ersetzt durch lifecycle-trigger
  6. G1 (4867125) — Gutachten, ersetzt durch pdf-generate
  7. G3 (4790180) — Gutachten PDF, ersetzt durch pdf-generate
  8. K2 (4920914) — Komm/Email, ersetzt durch send-email
  9. A5 (5147393) — Admin, ersetzt durch audit-write
- Rollback: Scenarios reaktivieren falls Probleme

NICHT autonom deaktivieren — nur DOKUMENTIEREN.

Commit: "K-1.5.C1: scripts/cutover/01-deactivate-make.md"

----------------------------------------
Block C2: scripts/cutover/02-stripe-webhook-update.md
----------------------------------------
Datei: scripts/cutover/02-stripe-webhook-update.md
Inhalt:
- Aktuelle Stripe Webhook-URL: https://prova-systems.de/.netlify/functions/stripe-webhook
- Neue URL: https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/stripe-webhook
- Schritte im Stripe Dashboard:
  1. Login Stripe → Developers → Webhooks
  2. Aktuellen Endpoint auswählen
  3. URL updaten (oder neuen Endpoint anlegen + alten parallel laufen lassen)
  4. Webhook-Secret kopieren → Supabase secrets set STRIPE_WEBHOOK_SECRET=...
  5. Test-Event triggern → in Supabase Dashboard prüfen ob ankommt
- Rollback: alten Endpoint reaktivieren

Commit: "K-1.5.C2: scripts/cutover/02-stripe-webhook-update.md"

----------------------------------------
Block C3: scripts/cutover/03-netlify-identity-disable.md
----------------------------------------
Datei: scripts/cutover/03-netlify-identity-disable.md
Inhalt:
- Schritte im Netlify Dashboard:
  1. Site → Identity → Settings
  2. "Disable Identity" (NICHT delete — falls Rollback nötig)
  3. ENV-Vars NETLIFY_IDENTITY_REDIRECT_URL entfernen (oder belassen — schadet nicht)
- Frontend: alle Reste von Netlify Identity Widget aus HTML entfernen
  (sollte schon in B12+B14 passiert sein — hier nur Verification-Schritt)

Commit: "K-1.5.C3: scripts/cutover/03-netlify-identity-disable.md"

----------------------------------------
Block C4: scripts/cutover/04-airtable-readonly.md
----------------------------------------
Datei: scripts/cutover/04-airtable-readonly.md
Inhalt:
- Airtable NIE löschen — nur Read-only setzen
- Schritte:
  1. Airtable Base appJ7bLlAHZoxENWE → Manage Base
  2. Permissions → "Read only" für alle User
  3. Backup-Snapshot erstellen + lokal speichern
- AIRTABLE_PAT in Netlify ENV-Vars belassen (für Re-Migration falls nötig)

Commit: "K-1.5.C4: scripts/cutover/04-airtable-readonly.md"

----------------------------------------
Block C5: scripts/cutover/05-cleanup-frontend.sh
----------------------------------------
Datei: scripts/cutover/05-cleanup-frontend.sh
Inhalt: Bash-Skript das nach grünem Cutover ausgeführt wird:
- airtable.js löschen
- prova-pseudo-send.js löschen (nicht mehr nötig — Edge Functions tun das)
- prova-fetch-auth.js löschen (Auth über Supabase)
- Alle .bak-Files löschen (nach 30 Tagen, mit Datum-Check)
- netlify/functions/ki-proxy.js löschen
- netlify/functions/whisper-diktat.js löschen
- netlify/functions/pdf-proxy.js löschen
- netlify/functions/airtable.js löschen
- ... (alle Netlify Functions die durch Edge Functions ersetzt sind)

Skript NICHT autonom ausführen — Marcel führt es nach grünem Cutover aus.

Commit: "K-1.5.C5: scripts/cutover/05-cleanup-frontend.sh"

----------------------------------------
Block C6: sw.js CACHE_VERSION + APP_SHELL Update
----------------------------------------
Datei: sw.js
- CACHE_VERSION bumpen auf den nächsten freien Wert (siehe letzte Version, vermutlich v225+)
- APP_SHELL erweitern um:
  - lib/prova-config.js
  - lib/supabase-client.js
  - lib/data-store.js
  - lib/template-registry.js
  - lib/auth-guard.js
  - auth-supabase.html (war login.html — beide bleiben drin für Übergang)
  - tools/test-supabase-login.html
  - tools/test-edge-functions.html
  - tools/test-pilot-kurzstellungnahme.html
- Alte Refs auf airtable.js etc. entfernen

WICHTIG: Diese Änderung ist die EINZIGE die wirklich live geht (Cache-Bump 
zwingt alle Browser zum Reload). Marcel muss VORHER alles andere getestet 
haben.

Commit: "K-1.5.C6: sw.js CACHE_VERSION bump + APP_SHELL Update"

----------------------------------------
Block C7: docs/CUTOVER-RUNBOOK.md
----------------------------------------
Datei: docs/CUTOVER-RUNBOOK.md
Inhalt:
- Pre-Cutover-Checklist (alle K-1.x Sprints grün)
- Cutover-Reihenfolge:
  1. Smoke-Test alle Edge Functions
  2. Smoke-Test alle migrierten Pages (Browser-Inkognito)
  3. Stripe Webhook-URL umstellen (scripts/cutover/02)
  4. Make Scenarios deaktivieren (scripts/cutover/01)
  5. Netlify Identity disable (scripts/cutover/03)
  6. Airtable read-only (scripts/cutover/04)
  7. Smoke-Test wieder
  8. sw.js bumpen + Deploy
  9. Browser-Test wartenden Stand
  10. Cleanup-Skript ausführen (scripts/cutover/05)
- Rollback-Plan:
  - Vor sw.js-Bump: Alles reversibel via "alte Make-Scenarios reaktivieren"
  - Nach sw.js-Bump: Browser-Cache zwingt zu altem Stand → schwerer rollback
  - Bei kritischem Bug nach Cutover: NACHT-PAUSE + Marcel + Schema-Snapshot-Restore
- Cutover-Tag setzen: v180-k-1-cutover-done

Commit: "K-1.5.C7: docs/CUTOVER-RUNBOOK.md"

----------------------------------------
Block C8: SPRINT-K-1-3-4-5-COMPLETE.md
----------------------------------------
Datei: SPRINT-K-1-3-4-5-COMPLETE.md
Inhalt nach Pattern wie K-1.0-COMPLETE.md:
- TLDR was Marcel tun muss
- Akzeptanz-Check Tabelle (Phase A + B + C)
- Architektur-Entscheidungen
- Was funktioniert / was nicht
- Bekannte offene Punkte
- Marcel-TODO sortiert:
  1. Pilot-Browser-Test (technische-stellungnahme + tools/test-pilot)
  2. Tranche-1-Browser-Test (8 Auftragstyp-Pages)
  3. Tranche-2-Test (Cockpit + Akte)
  4. Tranche-3-Test (Briefe + Rechnungen)
  5. Tranche-4-Test (Settings + Login)
  6. Cutover-Vorbereitung lesen
  7. Cutover ausführen (manuell, mit Runbook)
  8. Tag setzen v180-k-1-cutover-done

Commit: "K-1.3+1.4+1.5.DONE: Mega-Sprint #2 Doku"

============================================================
PRE-FLIGHT vor JEDEM Block
============================================================

1. Page lesen + Logic-File lesen
2. Externe Calls identifizieren (airtable, fetch, Make-Webhook, Netlify Function)
3. Mapping-Plan: jeder Call → data-store-Methode oder Edge Function
4. Bei Multi-Page-State: Wie wird state weitergegeben? (URL-Params, localStorage, sessionStorage)
5. node --check / syntax-check
6. .bak vor erstem Edit
7. Bei Unsicherheit: NACHT-PAUSE.md statt raten

============================================================
KONFLIKT-PROTOKOLL (NACHT-PAUSE)
============================================================

Wenn ein Block nicht eindeutig lösbar ist:

1. STOP. Nicht raten.
2. Schreibe NACHT-PAUSE-K-1-X.md (X = 3, 4 oder 5) mit:
   - Block-Nummer
   - Was Du gebraucht hättest aber nicht eindeutig im Repo gefunden hast
   - Was Du als Vermutung notiert hast
   - Welche Entscheidung Marcel treffen muss
3. Letzten sicheren Stand committen + pushen
4. STOP — Mega-Sprint pausieren

Beispiele für Konflikt-Auslöser:
- Page hat eigene Datenbank-Logik die nicht im data-store-Skeleton ist
- Multi-Page-Workflow mit komplexem State (z.B. app.html 9 Phasen)
- Logic-File hat Direkt-Zugriff auf undokumentierte Airtable-Felder
- KI-Funktionen die spezifisches Prompt-Template brauchen

============================================================
WORKING-TREE-DISZIPLIN
============================================================

NICHT antasten ohne Marcel-OK:
- CLAUDE.md
- masterplan-v2/
- /supabase-migrations/ Schema-Files
- scripts/migrate/* (aus K-1.1)
- supabase/functions/* (aus K-1.2 — außer Bug-Fix mit Begründung)
- README.md im Repo-Root
- AUDIT-LAYOUT-*.md (Marcels Domain)
- NACHT-PAUSE.md (alte aus früheren Sprints — Marcels Domain)

Du DARFST anfassen:
- Alle HTML-Pages
- Alle *-logic.js-Files
- nav.js
- sw.js (am Ende, mit Bump!)
- airtable.js (in K-1.5 löschen via cleanup-Skript)
- prova-audit.js, prova-pseudo-send.js, prova-context.js, prova-fetch-auth.js (alle obsolet — durch lib/* + Edge Functions ersetzt, in C5 cleanup)
- netlify/functions/* (in C5 cleanup, NICHT vorher)

============================================================
COMMITS-FORMAT
============================================================

Pattern: "K-1.X.YN: Beschreibung"
- X = 3, 4 oder 5 (Phase)
- Y = A, B oder C (passend zu Phase)
- N = Block-Nummer

Beispiele:
"K-1.3.A2: technische-stellungnahme-logic.js refactor → data-store"
"K-1.4.B6: index.html Cockpit refactor (Tranche 2.1)"
"K-1.4.GATE-2: Tranche 2 (4 Cockpit-Pages) refactored"
"K-1.5.C7: docs/CUTOVER-RUNBOOK.md"
"K-1.3+1.4+1.5.DONE: Mega-Sprint #2 Doku"

Push nach JEDEM Commit.

============================================================
KEIN AUTOMATISCHER TAG
============================================================

Tag setzt nur Marcel nach Browser-Tests:
- v180-k-1-3-pilot-done (nach Pilot-Test grün)
- v180-k-1-4-refactor-done (nach allen Tranchen grün)
- v180-k-1-cutover-done (NACH manuellem Cutover, nicht autonom!)

============================================================
FINAL CHECK vor Sprint-Ende
============================================================

Nach allen Blöcken + GATES + Doku:
1. Branch sprint-k-1-3-4-5-frontend-cutover ist gepusht
2. Alle ~30 Commits sind sichtbar in git log
3. SPRINT-K-1-3-4-5-COMPLETE.md liegt im Repo-Root
4. Keine NACHT-PAUSE.md (oder explizit dokumentiert)
5. Working-Tree clean
6. Sw.js bump ist drin (Block C6)

============================================================
SCHLUSS-MELDUNG an Marcel (am Ende generieren)
============================================================

Format:
🎯 Mega-Sprint #2 (K-1.3+1.4+1.5) durchgelaufen — STOP für Marcel-Tests

Branch: sprint-k-1-3-4-5-frontend-cutover · Commits: <N> · Status: Code grün, wartet auf Cutover

[Liste der Commits gruppiert nach Phase]

Akzeptanz: <X>/<Y> ✅, <Z> ⏳ Marcel-Tests

VOLLSTÄNDIG VORBEREITET:
- Pilot-Page (technische-stellungnahme) auf Supabase
- ~25 weitere Pages refactored
- Cutover-Skripte + Runbook
- sw.js bumped (vXXX)

NOCH NICHT LIVE:
- Make Scenarios (Marcel deaktiviert manuell)
- Stripe Webhook-Umstellung (Marcel macht in Stripe-Dashboard)
- Netlify Identity disable (Marcel im Netlify-Dashboard)
- Cleanup-Skript (Marcel führt nach grünem Cutover aus)

Marcel-TODO heute (in SPRINT-K-1-3-4-5-COMPLETE.md ausführlich):
1. Browser-Test Pilot (tools/test-pilot-kurzstellungnahme.html)
2. Browser-Test alle Tranchen (Inkognito + 5 Stichproben pro Tranche)
3. CUTOVER-RUNBOOK.md lesen
4. Cutover Schritt-für-Schritt durchführen
5. Smoke-Test nach Cutover
6. Tag setzen: v180-k-1-cutover-done

K-1 ist FERTIG. Voll-Supabase-Refactor abgeschlossen. Danach: Stripe re-registration, Audit-Phase starten, Pilot-Outreach beginnen.

Glückwunsch, Marcel — der größte Refactor Deines Lebens ist durch. 🚀
```

## PROMPT ENDE

---

## 🎯 Was nach Sprint K-1 Cutover passiert

```
✅ K-1 KOMPLETT (Voll-Supabase, Make weg, Netlify Identity weg)
─────────────────────────────────────────────────────────────
⏳ Stripe-Webhook-Re-Registration (Marcel manuell)
⏳ Audit-Phase Beschaffung (siehe PROVA-AUDIT-BESCHAFFUNG.md)
⏳ Marketing-Aufbau parallel (siehe PROVA-MARKETING-MASTER.md)
⏳ Audit-Findings fixen
⏳ Pilot-Outreach starten
⏳ ERSTE PILOT-SVS ONBOARDEN
─────────────────────────────────────────────────────────────
🚀 PROVA = LIVE-SAAS-PRODUKT
```

---

## 📋 Marcel — Der finale Workflow für den großen Wurf

### Heute Nacht (du gehst gleich schlafen)
1. K-1.0 Browser-Test grün machen — wenn nicht heute, dann morgen früh
2. Tag v180-k-1-0-done
3. Merge in main + neuer Branch sprint-k-1-1-und-k-1-2
4. **Mega-Prompt #1** rauslassen (K-1.1 + K-1.2)
5. Schlafen 🌙

### Morgen früh
6. Aufwachen, Sprint-K-1.1+1.2-Status checken
7. Browser-Tests:
   - Migrations-Validierung (`node scripts/migrate/validate.js`)
   - Edge Functions Health-Check (tools/test-edge-functions.html)
8. Falls grün: Tag v180-k-1-1-und-1-2-done + Merge in main + neuer Branch sprint-k-1-3-4-5-frontend-cutover
9. **Mega-Prompt #2** rauslassen (K-1.3 + K-1.4 + K-1.5)
10. Während Claude Code läuft: Marketing-Master lesen, Audit-Anfragen vorbereiten

### Morgen Mittag/Nachmittag
11. K-1.3+1.4+1.5 Status checken
12. Browser-Tests pro Tranche
13. CUTOVER-RUNBOOK.md durcharbeiten
14. **Cutover** Schritt-für-Schritt manuell ausführen
15. Tag v180-k-1-cutover-done
16. **PROVA läuft auf Voll-Supabase** ✅

---

## ⚠️ Wichtige Disziplin

**Mega-Prompt #2 NUR rauslassen wenn:**
- ✅ Migrations-Counts 100% stimmen (validate.js zeigt alle ✅)
- ✅ Edge Functions alle 8 Health-Check ✅
- ✅ Keine NACHT-PAUSE-K-1-1.md oder NACHT-PAUSE-K-1-2.md im Repo

**Wenn auch nur EINER der drei Punkte rot ist:**
- STOP. Mega-Prompt #2 NICHT pasten.
- Erst K-1.1+1.2 reparieren.
- Erst dann weitermachen.

Sonst baut Claude Code 25+ Frontend-Pages auf einer kaputten Foundation.

---

## 📊 Volume-Schätzung Gesamt

| Sprint | Blöcke | Wallclock |
|---|---|---|
| K-1.0 | 7 | ✅ ~3h (durch) |
| K-1.1 + K-1.2 | ~25 | ~2-3h (heute Nacht) |
| K-1.3 + K-1.4 + K-1.5 | ~30 | ~4-7h (morgen) |
| **Total K-1** | **~62 Blöcke** | **~9-13h Claude Code** |

Plus Marcel-Browser-Tests: ~3-5h verteilt über morgen.

→ **Spätestens morgen Abend ist der komplette Voll-Supabase-Refactor durch.**

---

🎯 **Marcel — Du nutzt Claude Code's Speed maximal aus. Genau das war der Sinn.**

🚀 **Schlaf gut. Morgen Abend ist die alte Stack-Hybridität Geschichte.**

*Ende SPRINT-K-1-3-4-5-MEGA-PROMPT.md*
