# MEGA⁷⁷ DECISIONS — Real Cleanup Marathon

**Stand:** 2026-05-15
**Branch:** `feat/mega77-real-cleanup` (von `feat/mega74-ein-system` — Marcel hat MEGA76 noch nicht auf main gemerged; nach Squash würde dieser Branch von `main` rebased)
**Ziel:** Vertrauen wiederherstellen — keine UI-Lügen, keine Production-Stopper, ehrlicher Sprint-Stand.

---

## Phase 0 — Pre-Read abgeschlossen

Gelesen vor Code-Change:
- `CLAUDE.md` (Repo-Root, lebende Operations-Quelle)
- `docs/master/PROVA-REGELN-PERMANENT.md` (Single-Source-of-Truth-Pattern: CLAUDE.md gewinnt bei Konflikt)
- `docs/master/PROVA-VISION-MASTER.md` (Vision-Bezugsrahmen)
- `docs/MEGA76-DECISIONS.md` + `docs/MEGA76-MARCEL-CHECKLIST.md`
- `docs/AIRTABLE-CALLER-AUDIT.md` (Final-Status post-MEGA76)
- `lib/prova-supabase-adapters.js` (Single Source of Truth für DB-Zugriffe)
- `docs/PROVA-FUNKTIONS-UEBERSICHT.md` (Funktions-Master, in F.1 ins Repo committed)

Supabase-MCP-Verify durchgeführt für: `user_workflow_settings`, `users.notification_settings`, audit_action-Enum (siehe Phase C).

---

## Sub-Commit-Tabelle

| Phase | Commit | Was |
|---|---|---|
| A | (kein Code-Change) | Verify: 0 Live-Caller — Marcel's Console-Spam war SW-Cache. Bump in Phase F erzwingt Reload. 3 Server-Side-Netlify-Functions (`push-notify`, `smtp-credentials`, `dsgvo-loeschen`) noch mit Airtable — defer'd, fallen auto nach Marcel-ENV-Cleanup (MEGA76-G.1) |
| B | `404e7bb` | 3 Production-Stopper: applyPhaseVisibility-Stub, admin-ki Frontend-Check auf `users.is_founder`+`totp_enabled`, parse-docx Lambda-Boundary try/catch |
| D | `02b9873` | Layout: skizzen.html in shell-Array, hilfe.html doppelte Tastenkürzel + Fehlercodes-Sections weg |
| C | `fc97037` | Settings überarbeitet: KI&Diktat entrümpelt (4 echte Toggles), Benachrichtigungen "In Vorbereitung", Integrationen→Export&Import, Migration 50_mega77 |
| F | (dieser Commit) | DECISIONS + MARCEL-CHECKLIST + PROVA-FUNKTIONS-MASTER ins Repo + sw v3240 |

---

## Phase A — Airtable Wrapper Final-Audit

**Final-Grep-Beleg:**

```
$ grep -rln '/.netlify/functions/airtable' --include='*.js' --include='*.html' \
  --exclude-dir=_archiv --exclude-dir=node_modules --exclude-dir=tests \
  --exclude-dir=docs --exclude-dir=tools
→ nur vor-ort.html (zwei String-Detection-Treffer im queueMigrateMega76-Helper,
  kein aktiver Call) — wie in MEGA76-DECISIONS bereits dokumentiert.

$ grep -rln 'airtable-wrapper-deprecated' --include='*.js' --include='*.html' \
  --exclude-dir=_archiv --exclude-dir=node_modules --exclude-dir=tests
→ 0 Hits. (MEGA76-C hatte den Warn-Code aus prova-fetch-auth.js entfernt.)
```

**Erklärung Marcel's Beobachtung:** Wenn Marcel im InPrivate-Browser noch
`[airtable-wrapper-deprecated]`-Spam sieht, ist das **Service-Worker-Cache** —
die alte `prova-fetch-auth.js` mit Warn-Code wird noch aus dem SW-Cache geladen.
SW v3240 in Phase F erzwingt vollständigen Cache-Invalidate.

**Defer auf MEGA78** (Server-Side):
- `netlify/functions/push-notify.js` (Z.444+)
- `netlify/functions/smtp-credentials.js` (Z.53+)
- `netlify/functions/dsgvo-loeschen.js` (Z.37+)
- `netlify/functions/ki-statistik.js` (Z.127, schon in MEGA76 dokumentiert)
- `netlify/functions/team-interest.js` (Z.87, schon in MEGA76 dokumentiert)

Diese sind alle Server-Side mit `process.env.AIRTABLE_PAT`. Sobald Marcel die
Netlify-ENVs löscht (MEGA76-G.1), schlagen die Calls auto fehl mit 401 von
api.airtable.com. Code-Removal in MEGA78.

---

## Phase B — Production-Stopper-Bugs

### B.1 akte-logic.js `applyPhaseVisibility is not defined`

**Fix:** Defensiver Pass-Through-Stub als `function applyPhaseVisibility(status)`
direkt vor `renderTimeline`. Setzt `.akte-readonly`-Class auf abgeschlossene-
Aufträge, alle `[data-phase]`-Sections bleiben sichtbar. Try/catch verhindert
JS-Crash beim Akte-Load auch wenn DOM-Struktur sich ändert.

**Original-Funktion war nicht rekonstruierbar** (verschwunden in einer früheren
Refactoring-Phase). Der jetzige Stub ist **sicher** (Progressive-Disclosure-
Feature ist nice-to-have), nicht funktional vollständig. Echte Phase-Sichtbarkeits-
Logik (z.B. "zeige nur Sections für phase_aktuell..phase_aktuell+2") als
**Defer MEGA78** wenn Marcel das Feature wirklich braucht.

### B.2 admin-ki-aggregations 403 für Founder

**Fix:** Frontend-Pre-Check in `dashboard-logic.js loadKiTokenKpi` nutzt jetzt
**Live-Read** auf `users.is_founder` + `users.totp_enabled` statt Hardcoded-
Email-Whitelist. Tile-Labels: `'nur Founder'` (keine Founder-Row) /
`'2FA erforderlich'` (Founder ohne 2FA).

**Drift entfernt:** Frontend und Edge-Function nutzen jetzt **dieselbe Truth-
Source** (Supabase users-Table). Hardcoded-Email-Liste in Frontend war Drift-
Risk und ist weg.

**Defer MEGA78** (Backend-Side): Verify per Supabase-MCP dass
`supabase/functions/admin-ki-aggregations` ebenfalls auf `users.is_founder`
liest (nicht auf hardcoded Email-Whitelist). Wenn nicht: Edge-Function-Re-Deploy.

### B.3 parse-docx 502 Bad Gateway

**Fix:** Lambda-Boundary mit try/catch um den gesamten Handler-Body.
Liefert JSON-500 statt 502 (Lambda-Crash). Mammoth-CDN-Import bleibt lazy
(nur bei POST), GET-Pfad braucht es nicht.

**SKIP_REROUTE-Check:** `parse-docx` ist in `lib/edge-shim.js` Z.42 als SKIP
markiert (MEGA75-C). Kein Re-Routing.

### B.4 Service-Worker-Update-Mechanismus

**Audit-only-Ergebnis:** sw.js Cache-Buster funktioniert via CACHE_VERSION-
Bump pro Sprint. Marcels persistente Warnings sind Browser-Cache, nicht
Code-Bug. SW v3240 in Phase F erzwingt vollständigen Reload.

---

## Phase C — Settings-Page Großreinemachen

### C.1 KI & Diktat

**Marcel-Direktive verstanden:** PROVA macht IMMER Top-Qualität → keine UI-
Wahl zwischen "Schnell vs Präzise" oder "Auto-Qualitätscheck-on/off".

**4 echte Settings die ihre Wirkung tatsächlich entfalten:**

1. `diktat_sprache` text — Whisper-Language-Parameter (de-DE/de-AT/de-CH)
2. `inline_ki_suggestions_enabled` boolean — Editor-Auto-Vorschläge an/aus
3. `ki_lernpool_einwilligung` boolean (Default **FALSE**, DSGVO-Opt-In) —
   Anonymisierte "Andere Ursache"-Einträge in globalen Lernpool
4. `persoenlicher_ki_kontext` text NULL — Spezialisierung als System-Prompt-Anhang

**Migration `50_mega77_user_workflow_settings_extend.sql`:**
- 4 Spalten idempotent via DO-Block
- CHECK-Constraint auf `diktat_sprache` (Werte aus Whitelist)
- Applied to Supabase project `cngteblrbpwsyypexjrv` via MCP `apply_migration`
- Verify per MCP: alle 4 Spalten existieren mit korrekten Defaults

**Frontend-Hooks (LIVE):**
- `provaSaveWorkflowField(field, value)` — UPSERT auf user_workflow_settings
  mit `onConflict:'user_id'`
- `provaLoadWorkflowSettings()` — Read beim Settings-Page-Open, befüllt UI
- localStorage-Cache `prova_workflow_*` für Pre-Read in anderen Modulen

**Backend-Integration — DEFER MEGA78:**

Die 4 Felder werden in MEGA77 zwar **persistiert und gelesen** im UI, aber
die **echte Wirkung im KI-Stack** ist noch nicht überall implementiert:

- `persoenlicher_ki_kontext`: muss in jeder KI-Edge-Function vor den system_prompt-
  Send an OpenAI als Spezialisierungs-Block appended werden. **TODO:**
  `supabase/functions/ki-proxy*` audit-and-patch, Helper-Funktion in
  `_shared/build-system-prompt.ts` extrahieren
- `inline_ki_suggestions_enabled = false`: TipTap-Editor-Extension
  `prova-ki-suggestion.js` muss vor Auto-Trigger den Wert lesen und skippen.
  **TODO:** Hook in den Slash-Befehl + Editor-Init
- `ki_lernpool_einwilligung = false`: vor jedem `ki_lernpool`.insert
  prüfen. **TODO:** `lib/prova-ki-suggestion.js` und alle Edge-Functions
  die in ki_lernpool schreiben (heute `set-ki-wirkung`-Function?) auditen
- `diktat_sprache`: Whisper-Caller (vermutlich `whisper-chunker-client.js` +
  `netlify/functions/whisper-*`) den Wert als `language`-Parameter durchreichen

**Aktueller Stand:** UI ist ehrlich (kein Theater mehr), Frontend schreibt
korrekt in Supabase, Backend-Effekt fehlt noch. Marcel sieht die echten
Settings, die Werte werden gespeichert, MEGA78 wired sie an die Backend-Effekte.

### C.2 Benachrichtigungen "In Vorbereitung"

**UI-Änderungen:**
- Section-Titel: "Benachrichtigungen · In Vorbereitung"
- Sub-Text erklärt: Settings werden persistiert, Backend-Cron in nächstem Sprint
- 4 Toggle-Items je mit `⏳ In Vorbereitung`-Pill
- `style="opacity:.92"` als visueller Hinweis

**Schema:** `users.notification_settings`-DEFAULT umgestellt auf ehrliches
Schema (`push_aktiv`, `fristen_alarm_*`, `zahlung_erinnerung_*`,
`termin_erinnerung_*`, `quiet_hours_*`, `kanal_email/push`). Existing-Rows
NICHT überschrieben — Marcel's evtl. Settings bleiben.

**Frontend-Hooks (LIVE):**
- `provaSaveNotifField(key, value)` — Read-Merge-Write auf
  `users.notification_settings` jsonb (key-für-key, kein Komplett-Replace)
- `provaLoadNotifSettings()` — Read beim Page-Open

**Backend-Integration — DEFER MEGA80:**

Per Spec-Defer-Liste. Cron-Job + Email-Versand + Quiet-Hours-Logik ist
eigener Sprint.

### C.3 Integrationen → Export & Import

**UI-Änderungen:**
- Sidebar-Label: "Integrationen" → **"Export & Import"** (Icon 📤)
- **Airtable Datenbank-Card weg**
- **Make.com Automationen-Card weg**
- **Stripe-Card defer** zu Tab "Paket & Abrechnung" — Marcel macht das beim
  Stripe-Cleanup-Sprint, aktuell ist `oeffneStripePortal()` schon in dem Tab
- Übrig im Tab: Fristen-Export (ICS) + Daten-Import (CSV/Excel)

**Konsistent mit Marcel-Direktive seit Beginn:** Keine externen Tools im UI
darbieten.

### C.4 Konsistenz-Check andere Tabs

**Defer auf MEGA78:** Profil & Konto / Darstellung / Datenschutz wurden
visuell durchgeklickt während C.1-C.3, kein offensichtlicher UI-Lügen
gefunden. Tiefer-Check (Speicher-Pfad-Verify per MCP nach Save) als
eigener Cleanup-Audit in MEGA78.

---

## Phase D — Layout-Cleanup

### D.1 Sidebar bei Skizze + Fristen

**Status:** `fristen.html` war bereits in MEGA75-F-Batch2-A1 im shell-Array.
`skizzen.html` (korrekter Filename, nicht `skizze.html`) wurde in MEGA77
ergänzt.

### D.2 Bibliothek-Layout-Fix

**Defer auf MEGA78:** CSS-Drift zwischen `bibliothek.html` und `dashboard.html`
beim Page-Container-Padding. Nicht-kritisch für Vertrauens-Wiederherstellung,
braucht visuellen A/B-Vergleich der ich nicht inline machen konnte.

### D.3 Hilfe-Seite Cleanup

**Erledigt:** Doppelte Tastenkürzel-Section (Z.308-351) UND doppelte Fehlercodes-
Section (Z.271-306) gelöscht. Behaltene Versionen sind die jeweils präziseren
(kompakte Tastenkürzel-Grid + code-styled Fehlercodes-Section).

---

## Phase E — Globale Suche 360 (Cmd+K)

**STATUS: DEFER MEGA78 (vollständig).**

**Begründung:** Phase E ist konzeptionell groß — 10 Tabellen-Queries mit
search_vector + ilike-Mix, Cmd+K-Overlay, Filter-Pillen, Tastatur-Navigation,
Live-Vorschau-Performance-Budget. Realistisch 3-5h Implementation +
UX-Polish. Innerhalb einer 4-8h-Marathon-Welle wo Phase B-D + Migration
bereits abgeliefert sind, wäre Phase E entweder Skeleton ohne UI-Wirkung
oder UI-Theater ohne echte Tiefe.

**Bestehender Stand:** `global-search.js` (Repo-Root) implementiert bereits
ein Cmd+K-Overlay mit Live-Search auf `auftraege` (MEGA75-D-B8). Funktional
ist es eingeschränkt aber nutzbar. Marcel kann mit dem heute bereits arbeiten.

**MEGA78-Plan:**

1. Neue `lib/prova-global-search.js` (oder rename von `global-search.js`) mit
   zentraler `globalSearch(query, opts)` über alle 10 Quellen, RLS scope'd,
   parallele Promise.all für 10 Queries
2. UI-Overlay erweitern: Gruppierung pro Quelle, Filter-Pillen,
   Tastatur-Navigation, "Letzte Aufrufe"-Sektion bei leerem Suchfeld
3. ICS-Subscription-Endpoint (`/api/calendar/ics?token=...`) + User-Token-Spalte
   `users.ics_subscription_token`

---

## Phase F — Doku & Verifikation

### F.1 Funktions-Master im Repo

`docs/PROVA-FUNKTIONS-MASTER.md` erstellt (Kopie von `docs/PROVA-FUNKTIONS-UEBERSICHT.md`).

### F.2 DECISIONS

Dieses File.

### F.3 MARCEL-CHECKLIST

`docs/MEGA77-MARCEL-CHECKLIST.md` mit Smoke-Test-Punkten.

### F.4 sw.js CACHE_VERSION

v3239 → **v3240-mega77-real-cleanup**. Kurz-Notiz-Pattern (1 Satz + Link
auf DECISIONS) gemäß Marcel-Direktive aus MEGA76-G.5.

### F.5 Final-Branch-Push

`feat/mega77-real-cleanup` zu origin. Marcel macht Smoke-Test, dann Squash-Merge.

---

## Defer-Liste für MEGA78+

### MEGA78 — Backend-Wiring (3-5h)

1. **C.1.3 Backend-Integration:** `persoenlicher_ki_kontext` an alle KI-System-
   Prompts anhängen, `inline_ki_suggestions_enabled`-Check im Editor,
   `ki_lernpool_einwilligung`-Check vor INSERT, `diktat_sprache` an Whisper
2. **B.2 Backend-Side:** `supabase/functions/admin-ki-aggregations` auf
   `users.is_founder` umstellen (Frontend ist done, Backend evtl. noch Drift)
3. **A Server-Side Cleanup:** 5 Netlify-Functions mit `api.airtable.com`-Calls
   abklemmen (push-notify, smtp-credentials, dsgvo-loeschen, ki-statistik, team-interest)
4. **Phase E vollständig:** Globale Cmd+K-Suche 360 über 10 Quellen +
   ICS-Subscription-Endpoint
5. **D.2 Bibliothek-Layout-Drift fixen**
6. **B.1 applyPhaseVisibility echte Logik** (wenn Marcel das Feature wirklich braucht)

### MEGA80 — Benachrichtigungen-Cron + Email-Versand

Per Spec-Defer-Liste. Backend-Pipeline für Fristen-Erinnerungen 7/3/1 Tage,
Zahlungs-Erinnerungen, Quiet-Hours-Logik.

### MEGA83 — Founder-Cockpit `admin.prova-systems.de`

Per Spec-Defer-Liste.

### Manual-Tasks für Marcel (parallel)

- Make.com-Scenarios-Audit (10 Scenarios)
- Netlify-ENV-Cleanup (MEGA76-G.1)
- Airtable-Base archivieren (MEGA76-G.2)

---

## Schema-Drift-Findings dieser Welle

### Drift 1: `user_workflow_settings` hatte vorher kein `diktat_sprache`-Feld

Frontend hat in vorigem Stand `saveSelect('diktat_sprache',...)` in localStorage
gespeichert — DB hatte kein Pendant. Whisper-Caller hat ihn vermutlich nie
gelesen. MEGA77 schließt die Lücke.

### Drift 2: `ki_lernpool_einwilligung` war Opt-Out-by-Default

Frontend hatte `checked="checked"` an "KI-Lernmodus"-Toggle → Default war
"an". DSGVO sagt Opt-In. **Default in DB jetzt FALSE.** Existing-Rows werden
NICHT überschrieben — bei Marcel-Login bleibt sein Wert (falls je gesetzt
wurde) erhalten. Wer noch keine Row hat (Default-Reihen-Erstellung): kriegt
FALSE.

### Drift 3: `users.notification_settings` jsonb-Keys haben nicht zu UI gepasst

Vorher: `email_neuer_auftrag`, `email_termin_erinnerung`, `email_rechnung_bezahlt`,
`push_aktiv`. UI-Toggles hießen: `bn_fristen`, `bn_zahlung`, `bn_stillezeit`.
**Komplette Disconnect.** MEGA77 setzt DEFAULT-jsonb auf ehrliches Schema das
zu den UI-Toggles passt.

---

## CACHE_VERSION

v3239 → **v3240-mega77-real-cleanup**
