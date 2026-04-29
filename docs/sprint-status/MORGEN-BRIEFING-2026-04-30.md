# MORGEN-BRIEFING — 2026-04-30

> **Für Marcel beim Sprint-Start am Morgen.** Stand der Nacht-Sprints,
> live-verifizierte Ergebnisse, gemergte vs. offene Branches,
> Empfehlung der nächsten Reihenfolge.

---

## 🟢 Live-Verifikation 30.04. 00:30 Uhr — X3 GRÜN

Marcel hat den X3-Hotfix (`brief-generate` Storage-RLS) live getestet:

- briefe.html → Empfänger Anna Mustermann + Template K-01 + Variables
  → "PDF generieren" geklickt
- **HTTP 200** + Result-Card "Brief generiert · 138 KB · gespeichert in Akte"
- PDF in Supabase Storage `sv-files` unter
  `sv-{workspace_id}/dokumente/briefe/...`
- **X3 ist gemerged + deployed + LIVE in Produktion**

**Beobachtung von Marcel** (im Status für Cutover-Sprint vorgemerkt):
Der Link "→ Akte GS-2026-001" auf briefe.html leitet zu
`/app-login.html` (alter Netlify-Identity-Login) weiter statt auf die
Akte-Page. Erwartet — Hybrid-Auth-Bug, gehört in **K-1.5 Block 3
(60+ HTML-Pages Migration)**.

---

## Nacht-Sprints-Ergebnis

### N2 — X4 pdf-generate Pattern-Replikat ✅

**Branch:** `hotfix-k-ui-x4-pdf-generate-rls` (gepusht, **nicht gemerged**)
**Commits:**
- `60adc01` — pdf-generate: Service-Role-Client + sv-Prefix (X3-Pattern)
- `7c2e265` — Status-File K-UI-X4-STATUS.md

**Marcel-TODO:**
1. `supabase functions deploy pdf-generate --project-ref cngteblrbpwsyypexjrv`
   (`SUPABASE_SERVICE_ROLE_KEY` ist bereits in Secrets seit X3)
2. Schadensgutachten-Workflow durchspielen → PDF-Output
3. Bei grün: Branch in main mergen + push

X4 ist **nicht direkt im Browser testbar** — pdf-generate wird vom
Schadensgutachten-Wizard aufgerufen (mehrstufig: Diktat, Befunde, Freigabe).
Erst nach Flow-Through grün-melden.

### N7 — Dieses Briefing

**Branch:** `nacht-n7-morgen-briefing` (gepusht)

---

## 🚦 HÖCHSTE PRIORITÄT für Cutover-Sprint K-1.5

Aus Live-Verifikation und Brief-Workflow ergibt sich folgende
**Cutover-Reihenfolge-Empfehlung**:

### A) `lib/auth-guard.js` ✅ DONE
Block 1 ist auf `sprint-k-1-5-cutover` Commit `349722b`. LOGIN_PAGE-Konstante
auf `/auth-supabase.html`, LOGOUT_REDIRECT auf `/`.

### B) **akte.html** ⚠️ NEU HOCHGESTUFT
Sehr hohe Prio wegen Brief-Workflow:
> Marcel generiert einen Brief in briefe.html → Result-Card zeigt
> "→ Akte GS-2026-001"-Link → klick → **Hybrid-Auth-Bug, redirect
> zu /app-login.html**

Solange akte.html nicht im neuen Auth-Stack läuft, hängt der Brief→Akte-
Roundtrip im Hybrid-Limbo. Marcel kann nach Brief-Generierung nicht
zurück in den Vorgang. **akte.html-Migration sollte VOR allen anderen
Pages stattfinden**, weil briefe.html bereits live im Pilot-Flow ist.

Empfohlener akte.html-Patch:
- `<script src="auth-guard.js">` raus (Legacy)
- `<script src="prova-fetch-auth.js">` raus (Legacy-Token-Helper)
- `<script type="module">` mit `import { runAuthGuard } from '/lib/auth-guard.js'` rein
- Alle Auth-Header-Helper im akte-logic.js auf supabase-Session umstellen

### C) **app.html** (Schadensgutachten-Wizard, häufigste Page)
Nach akte.html. Marcel öffnet app.html für jeden Schadensfall —
Frequenz-King aller Pages.

### D) Profil + Kontakte + Briefe — **bereits Supabase-only** ✅
profil-supabase.html, kontakte-supabase.html, briefe.html laufen schon
auf `lib/auth-guard.js`. Nichts zu migrieren — alte
`profil.html`/`kontakte.html`/`briefvorlagen.html` sind Parallel-Pages
und werden nach Cutover deprecaten.

### E) Rest in Frequenz-Reihenfolge
Vorschlag (Marcels typischer Tagesablauf):
1. dashboard.html (Landing nach Login)
2. archiv.html (Aufträge-Liste)
3. termine.html (Kalender)
4. rechnungen.html
5. einstellungen.html
6. freigabe.html, stellungnahme.html (Workflow-Pages)
7. baubegleitung.html, beratung.html, wertgutachten.html, ortstermin-modus.html
8. Werkzeuge: jveg.html, normen.html, textbausteine.html, positionen.html
9. Sonstige: jahresbericht.html, kostenermittlung.html, hilfe.html, etc.

Die in `nav.js` referenzierten 14 Sidebar-Pages haben Vorrang vor allen
nicht-verlinkten (z.B. effizienz.html, mahnung.html, stellungnahme-v3.1.html).

---

## Aktiver Branch-Stand

| Branch | Stand | Aktion |
|---|---|---|
| `main` | X3 + X2 + X1 + K-UI gemerged | Marcel: X4 mergen, danach N7 |
| `hotfix-k-ui-x4-pdf-generate-rls` | 2 Commits, gepusht | Deploy + Test → merge |
| `nacht-n7-morgen-briefing` | dieses File, gepusht | Marcel: lesen, danach merge |
| `sprint-k-1-5-cutover` | Block 1 (auth-guard) committed | Auf X4+N7-Merge warten, dann rebase |

---

## Bekannte Risiken Stand 30.04.

1. **X4 ist Pattern-Replikat aber nicht live verifiziert.** Wahrscheinlichkeit
   dass X3-Pattern für pdf-generate genauso funktioniert: hoch (gleicher
   Bug-Typ, gleiche Helper-Function, gleicher Fix-Approach). Aber:
   pdf-generate wird vom mehrstufigen Schadensgutachten-Workflow
   aufgerufen — wenn ein anderer Schritt vorher hängt, sieht Marcel den
   X4-Fix nicht. Marcel sollte X4 erst grün melden nach Flow-Through.

2. **`pdf-generate` ist Edge-Function ohne Frontend-Pendant in K-UI.**
   Aufrufer sind die alten Pages (stellungnahme.html, freigabe.html,
   etc. — alle noch im Hybrid-Auth-Stack). Wenn Marcel diese Pages
   testet, läuft auch die Auth-Hybrid-Logik durch. X4 fixt nur die
   Edge-Function, nicht die Aufruf-Pages.

3. **Der akte.html-"Akte öffnen"-Bug** macht den Brief-Workflow für
   Pilot-SVs broken-feeling, obwohl X3 selbst sauber ist. Hoch-prior
   für Cutover.

4. **Letzter Sprint-Status K-UI-X3 erwähnt SUPABASE_SERVICE_ROLE_KEY in Secrets**
   — wenn X3-Deploy ohne Probleme lief, ist der Key gesetzt. Für X4 keine
   Aktion nötig.

---

## Empfohlener Marcel-Morgen-Workflow

1. **Briefing lesen** (dieses File)
2. **X4 deployen + Schadensgutachten-Test** (15 min)
3. **Bei grün: X4 + N7 in main mergen** (5 min)
4. **Cutover-Sprint K-1.5 wieder aufnehmen** mit Reihenfolge A-E oben
   - sprint-k-1-5-cutover-Branch rebasen auf main
   - Block 2 fortsetzen (301-Redirect /app-login.html → /auth-supabase.html)
   - **Block 3 priorisiert auf akte.html** (statt alphabetisch)
   - Danach app.html
   - Rest in Frequenz-Reihenfolge

Erwarteter Aufwand A-D: ~4h. E (Rest) je Page ~15-30 min, ~8-12h.

---

## Backlog (nicht für heute Morgen)

- **CLAUDE.md-Update**: "Edge Functions nutzen Service-Role für
  Multi-Tenant-Writes via verifiziertem workspace_id" als Doku-Eintrag.
  Sonst gerät die X3/X4-Architektur-Entscheidung in Vergessenheit.
- **Edge-Function-Audit** (Cutover-Sprint K-1.5 Block 5): alle 8 Edge
  Functions durchgehen ob sie `createSupabaseClient(req)` für Writes
  nutzen → falls ja, gleicher Service-Role-Patch wie X3/X4.
- **alte Parallel-Pages deprecaten** nach Cutover: profil.html,
  kontakte.html, briefvorlagen.html, app-login.html.

---

# 🔍 Nacht-Audit + Sprint-06b-Foundation (v3 Nacht-Sprint, 30.04.)

Marcel hat in der Nacht 5-6h autonomes Arbeiten freigegeben. Ergebnisse:

## Audit-Branches (in main gemerged)

### audit/cutover-page-inventory — `docs/sprint-status/CUTOVER-PAGE-INVENTORY.md`

Klassifikation aller **129 Root-HTML + 47 Subfolder-HTML**:
- **GREEN (Pure-Supabase):** 6 Pages
- **RED (Netlify Identity):** 6 Pages
- **YELLOW (Hybrid):** ~52 Pages
- **GRAY (vermutlich tot):** ~95 Pages, in 7 Cluster gruppiert

**Goldwert für Cutover Block 3:** Tier-A→E-Reihenfolge mit konkreten
Page-Listen. Geschätzter Aufwand 9-12h für Tier A+B+C. Plus 50-90 Pages
können nach Marcel-Review der GRAY-Cluster gelöscht werden.

**Top-3 Befunde:**
1. **akte.html ist top-Prio** — Brief-Workflow bricht aktuell darauf
2. **kontakte.html + briefvorlagen.html** sind in nav.js neben den
   neuen Supabase-Pages — **deprecaten** statt migrieren
3. **Cluster 1 (Brief-Doppel-Pages):** 28 Root + 28 briefe/-Subfolder
   sind durch K-UI/briefe.html ersetzbar — Cleanup-Sprint danach

### audit/schema-gap-06b — `SCHEMA-GAP-AUDIT.md` + `PLANNED_06b_auftraege_extend.sql`

Befund: **auftraege-Schema ist 90% bereit für Sprint 06b.** Migration
minimal — nur 2 Spalten + 1 ENUM:
- `auftraggeber_typ` ENUM (privatperson|versicherung|anwalt|gericht|behoerde|firma)
- `auftraege.auftraggeber_kontakt_id` UUID FK auf kontakte
- 2 Indexe + COMMENT-Doku für `details` und `objekt` JSONB

**Marcel-TODO:** PLANNED-Migration reviewen, in versioniertes File
umbenennen, im Dashboard SQL-Editor anwenden. Erst dann Sprint 06c
Live-Save aktivieren.

### feature/workflow-research-vorgangsdaten-korrektur

PHASEN-FELDER.json v1.0 → v1.1: Phase 1 in **1A (Stammdaten)** + **1B
(Vorgangsdaten)** gesplittet. Plus PFLICHTFELDER.md mit 6-Klassen-System
(STAMM/VORGANG/BETEILIGTE/OBJEKT/BEFUND/GUTACHTEN). README.md mit
Architektur-Prinzipien + Allianz-Beispiel.

---

## 🔧 Vorbereitete Code-Branches (Marcel-Review erforderlich, NICHT gemerged)

### feature/data-store-auftraege-crud
- `lib/data-store.auftraege.createDraft(data)` — Convenience-Wrapper
  der status='entwurf' + phase_aktuell=1 setzt
- `lib/data-store.auftraege.listDrafts()` — Wizard-Recovery (eigene Entwürfe)
- additive only — keine Änderung bestehender Funktionen

### feature/auftrags-schema-conditional
- Neuer File `lib/auftrags-schema.js` (469 Zeilen)
- Pure JS, JSDoc-annotiert, keine UI-Abhängigkeiten
- Exports: AUFTRAGGEBER_TYPEN, SCHADENSARTEN, FELDER (60+ Field-Metadata)
- Helpers: getRequiredFields, getOptionalFields, validateAuftragsPayload

### feature/sprint-06b-auftrag-neu-skeleton
**Hängt ab von den 2 vorigen Branches** (sind via merge enthalten — Marcel
kann den Branch direkt browsen oder die 3 separat reviewen).

- `auftrag-neu.html`: Pattern A, 4-Phasen-Stepper, sticky Action-Footer
- `auftrag-neu-logic.js`: Field-Renderer, Phase-Renderer (1A/1B/2/3),
  Auto-Save (1500ms LocalStorage), Phase-Validation, Stepper-Navigation
- `nav.js`: COCKPIT-Eintrag "+ Neuer Auftrag" mit ➕-Icon
- `sw.js`: APP_SHELL erweitert + v241 → v242

**Skeleton — LocalStorage-Draft-only.** Live-Save in DB kommt in Sprint
06c sobald PLANNED-Migration appliziert ist.

---

## 📋 Marcel-Morgen-Reihenfolge

1. **MORGEN-BRIEFING lesen** (5 Min) — diese Datei
2. **X4 deployen + testen** (10 Min) — `supabase functions deploy
   pdf-generate --project-ref cngteblrbpwsyypexjrv` + Schadensgutachten-
   Workflow durchspielen
3. **Workflow-Research-Korrektur reviewen** (5 Min) —
   `docs/workflow-research/` ist schon in main, nur Allianz-Beispiel-
   Argumentation verifizieren
4. **Cutover-Sprint K-1.5 starten** (3-4h) — mit
   `CUTOVER-PAGE-INVENTORY.md` als Plan, **akte.html priorisiert**
5. **Mittag: Sprint-06b Code-Branches reviewen** (30 Min)
   - feature/data-store-auftraege-crud (klein, additive)
   - feature/auftrags-schema-conditional (469-Z pure JS)
   - feature/sprint-06b-auftrag-neu-skeleton (Skeleton mit den 2
     vorigen via merge)
   - Bei OK: alle 3 in main mergen
6. **Nachmittag: Schema-Migration applizieren** (15 Min) —
   PLANNED_06b → 20260501_06b umbenennen + Dashboard SQL-Editor
7. **Abend: Sprint 06b Live-Save aktivieren** (30 Min) —
   auftrag-neu-logic.js TODO durch `auftraege.createDraft()`-Calls
   ersetzen, plus `kontakteStore.create()` für neue Kontakte in Phase 1A

**Total: ~6-8h** für vollen Cutover + Sprint 06b live.

---

## Erwartetes Ergebnis am Tagesende (Marcel-Plan)

- ✅ Cutover K-1.5 abgeschlossen (akte/app/dashboard + Tier B+C)
- ✅ Old Pages deprecated (kontakte.html, briefvorlagen.html, app-login.html)
- ✅ pdf-generate live mit X4-Patch
- ✅ Sprint 06b Wizard live mit DB-Save
- 🟡 Sprint 06c (Live-Save UX-Polish + Beteiligte-M:N) als Folge-Sprint übermorgen

---

## Branch-Übersicht (Stand Nacht-Ende)

| Branch | Stand | Marcel-Aktion |
|---|---|---|
| `main` | X3 + X2 + X1 + K-UI + N1/N4/N5 gemerged | Foundation-Stand |
| `nacht-n7-morgen-briefing` | dieses File (Update) | mergen erlaubt |
| `hotfix-k-ui-x4-pdf-generate-rls` | 2 Commits | Deploy + Test → mergen |
| `feature/data-store-auftraege-crud` | createDraft+listDrafts | reviewen → mergen |
| `feature/auftrags-schema-conditional` | 469 Z pure JS | reviewen → mergen |
| `feature/sprint-06b-auftrag-neu-skeleton` | Wizard-Skeleton, 2 Branches via merge enthalten | reviewen → mergen |
| `sprint-k-1-5-cutover` | Block 1 (auth-guard) | rebase auf main, dann Block 2-7 |
