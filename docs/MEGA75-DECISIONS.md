# MEGA⁷⁵ DECISIONS

**Stand:** 2026-05-14
**Branch:** `feat/mega74-ein-system`
**Sprints:** A (RLS workspace_id), B (fristen SyntaxError), C (parse-docx 501) …

---

## Sprint A — RLS workspace_id Fix

**Problem:** INSERT auftraege scheiterte mit 403 an RLS-Policy `auftraege_insert`
(WITH CHECK `workspace_id IN get_user_workspaces()`). Frontend-Payload hatte kein
`workspace_id`, `localStorage.prova_workspace_id` war nie gesetzt.

**Entscheidung:** Login-Flow setzt `prova_workspace_id` aus dem bereits existenten
`workspace_memberships`-Join in `_completeLogin()`, mit zusätzlichem Fallback-Query.
Submit nutzt den bestehenden `getCurrentWorkspaceId()`-Helper aus
`lib/prova-supabase-adapters.js` (localStorage → Live-Query). Logout räumt den Key
in `supabase-client.signOut()` + `auth-guard.clearSession()` auf.

**Alternative verworfen:** Workspace-Switcher-UI — out-of-scope (`Sprint A`-Grenze
explizit "KEINE Multi-Workspace-UI").

**Bekannte Limit:** Nur erste aktive Membership wird gepickt. Für Solo-User OK.

**Commit:** `31d365b`

---

## Sprint B — fristen.html SyntaxError

**Problem:** `Uncaught SyntaxError: Unexpected string` an `fristen.html:229:140`.
Template-Literal nutzte `\\''+f.id+'\\'` — JS las das `\\` als Single-Char-Backslash,
das nachfolgende `'` schloss den JS-String, dann zwei adjazente String-Literals ohne
`+` → Parse-Fehler.

**Entscheidung:** `\\'` → `\'` (echtes Apostroph-Escape). Output ist jetzt der
intendierte `onclick="markErfuellt('frist-id')"`-Aufruf.

**Commit:** `79d27ae`

---

## Sprint C — parse-docx 501

**Problem:** `GET /functions/v1/parse-docx 501 (Not Implemented)` beim Settings-Load.
Frontend ruft `/.netlify/functions/parse-docx`, `edge-shim.js` rerouted das
automatisch zu Supabase Edge — wo nur ein **501-DEFERRED-Stub** liegt
(`supabase/functions/parse-docx/index.ts`: "mammoth ist Node-spezifisch, Migration
nach Pilot-Start").

**Pfad-Analyse:**

| Pfad | Aufwand | Wirkung |
|---|---|---|
| A1 SKIP_REROUTE in edge-shim | ~5 min | Netlify-Function (voll implementiert) reaktiviert |
| A2 Supabase-Edge implementieren (Deno + DOCX-Parser) | ~60 min | Würde Netlify-Function überflüssig machen, aber mammoth ist Node, @std/* DOCX-Parser noch nicht stable |
| B Frontend-Call deaktivieren | ~10 min | Letterhead-Import komplett tot, user_vorlagen-Daten unzugänglich |

**Entscheidung: Pfad A1 — `parse-docx` in `SKIP_REROUTE`-Set in `lib/edge-shim.js`.**

**Gründe:**
- Netlify-Function `netlify/functions/parse-docx.js` ist seit MEGA¹⁶ W45 voll implementiert
  (mammoth via esm.sh dynamic-import, magic-bytes-check, GET/POST/PUT/DELETE,
  user_vorlagen-Persistierung, audit_trail-Log).
- `user_vorlagen`-Tabelle live (Migration 08), Frontend-UI in `einstellungen.html`
  läuft schon (Liste, Upload, Mapping, Soft-Delete).
- Der Supabase-Edge-Stub war von Anfang an als „Welle 7 DEFERRED" markiert — das
  edge-shim-Reroute war ein versehentlicher Production-Stopper, nicht der Migrations-
  Status.
- `SKIP_REROUTE` ist genau das dokumentierte Pattern für solche Fälle (Comment
  in `edge-shim.js:38`: "Functions, die NICHT umgeroutet werden sollen
  (z.B. Netlify-only)").

**Pfad A2 (Supabase-Edge-Implementierung) bewusst aufgeschoben:** Migration nach
Pilot-Start, wenn DOCX-Parsing-Volumen Edge-Latenz rechtfertigt. Solange Netlify
funktioniert, ist Reroute-Skip die richtige Wahl. Kein Mehrwert in der Edge-
Variante zum jetzigen Zeitpunkt.

**Pfad B bewusst verworfen:** Letterhead-Import ist nicht Pilot-blockierend, aber
funktional fertig und Marcel sammelt damit DOCX-Vorlagen. Komplette Abschaltung
wäre Feature-Regression ohne Gegenwert.

**Files:** `lib/edge-shim.js`, `sw.js`
**Commit:** `c419117`

---

## Sprint D — Dashboard 4 Endpoint-Bugs

### Bug 1 — `get-referral-stats` 401

**Problem:** Endpoint existiert nirgendwo — weder `netlify/functions/get-referral-stats.js`
noch `supabase/functions/get-referral-stats/index.ts`. MEGA⁵⁶-FUNCTION-MAP-Dokument
behauptet "ACTIVE" (Z.68), die Files wurden aber nie deployed/committed. Frontend
ruft sie aus `lib/referral-system.js:186` bei jedem Dashboard-Load → 401-Spam in
Console.

**Entscheidung:** Pfad B (defensives Deaktivieren). `getStats()` und `getHistory()`
in `lib/referral-system.js` liefern jetzt Resolve-Promises mit Empty-Defaults statt
fetch. Die Dashboard-Card mit Status-Counts zeigt "0 versendet, 0 belohnt" — exakt
der Zustand für einen neuen User.

**Pfad A (Endpoint bauen) verworfen:** Out-of-scope für mega75-D (Sprint-Grenze
"KEINE neuen KPI-Tiles oder Widget-Features"). Sobald die Endpoints tatsächlich
gebaut werden, hier den fetch-Call wieder reaktivieren.

**File:** `lib/referral-system.js`

### Bug 2 — `rechnungen` 404

**Problem:** `lib/prova-dashboard-widgets.js widgetMahnungen()` rief `sb.from('rechnungen')`
— diese Tabelle existiert nicht. Rechnungen sind als rows in `dokumente` mit
`typ IN ('rechnung','rechnung_jveg','rechnung_stunden')` modelliert (siehe
`supabase-migrations/03_schema_artefakte_storage.sql:163`). Spalten heißen
`doc_nummer` (statt `rechnungsnr`), `mahn_stufe` (statt `mahnung_stufe`),
`faelligkeit` (statt `faellig_am`). Status-Enum hat `versendet|ueberfaellig`
(kein `mahnung_1/2/3` — Mahnungen sind separate dokumente-Rows mit
`typ IN ('mahnung_1','mahnung_2','mahnung_3')`).

**Entscheidung:** Widget direkt auf `dokumente` umgestellt mit korrekten
Filter-Werten. Sprint-Scope-konform — kein Schema-Wechsel, nur Frontend-Query
an existierendes Schema angepasst.

**File:** `lib/prova-dashboard-widgets.js`

### Bug 3 — `fristen` 400

**Problem:** Gleiche Klasse von Schema-Drift wie Bug 2. `lib/prova-dashboard-widgets.js
widgetFaelligeFristen()` nutzte `faellig_am` und `titel` — beide existieren nicht.
Reale Spalten laut `supabase/migrations/2026_05_11_w12_fristen_system.sql:35-52`:
`datum_soll DATE`, `frist_typ`, `notiz`, plus `deleted_at TIMESTAMPTZ NULL`.

**Entscheidung:** Spalten auf reale Schema-Namen umgestellt, `.is('deleted_at', null)`
ergänzt, Label-Fallback `notiz || frist_typ || 'Frist'`. ISO-Date statt ISO-Timestamp
(DATE column).

**File:** `lib/prova-dashboard-widgets.js`

### Bug 4 — `admin-ki-aggregations` 403

**Problem:** Edge-Function `admin-ki-aggregations` ist via
`supabase/functions/_shared/admin-auth.ts requireAdmin()` admin-only — hardcoded
Email-Whitelist + `PROVA_ADMIN_REQUIRE_2FA=true`. Marcel ist drin, aber 403 trotzdem
wahrscheinlich wegen stale-AAL/2FA-Session. Für Non-Admin-User gibt's keinen Grund,
den Call überhaupt zu machen.

**Entscheidung:** Pfad (b)+(c)-Hybrid. Frontend-Pre-Check gegen die selbe
Hardcoded-Email-Liste in `dashboard-logic.js loadKiTokenKpi()`: Wenn
`localStorage.prova_sv_email` nicht in der Liste → Tile zeigt '—' / 'nur Admin'
silent (kein 403). Wenn drin: Call läuft normal, existing catch-Block übernimmt
falls 2FA-stale.

**Pfad (a) verworfen:** Function-Policy auf Owner ausweiten widerspricht
Daten-Sensibilität (globale KI-Token-Stats über alle Workspaces).

**Trade-off:** Doppelte Hardcoded-Liste (Frontend ↔ Edge). Akzeptiert, weil sie
sich faktisch nie ändert (5 Marcel-Aliase). TODO bei Multi-Admin-Rollout: über
Edge-Function exponieren oder im JWT als Custom-Claim.

**File:** `dashboard-logic.js`

### Sprint-D Commit & sw.js
**Files:** `lib/referral-system.js`, `lib/prova-dashboard-widgets.js`,
`dashboard-logic.js`, `sw.js`, `docs/MEGA75-DECISIONS.md`
**CACHE_VERSION:** v3233 → v3234
**Commit:** `9bdfc3c`

---

## Sprint E — Multiple GoTrueClient Singleton-Dedup

**Problem:** Jeder Page-Load warf 3-5× `Multiple GoTrueClient instances detected
in the same browser context`. Ursache: 23 Frontend-Files erstellten je einen
eigenen `createClient(...)` per dynamic-import von `esm.sh`, statt das zentrale
Singleton aus `lib/supabase-client.js` zu reusen. Jeder dieser GoTrueClients hat
seinen eigenen Refresh-Token-Loop + Storage-Layer — produzierte unter Last
undefined behavior (Session-Drift, Race-Conditions beim Token-Refresh).

**Entscheidung:** Alle 23 Files auf `await import('/lib/supabase-client.js')`
umgestellt. Damit fließt jeder Read/Write durch denselben GoTrueClient mit
`storageKey: 'prova-auth-token'` + `crossDomainStorage` (Cookie für
`.prova-systems.de` + localStorage-Mirror).

**Pattern (17 lib/prova-* mit `_getSb._c` Cache):**
```js
const mod = await import('/lib/supabase-client.js');
_getSb._c = mod.supabase || (mod.getSupabase && mod.getSupabase());
```
Bulk-sed-Refactor in einem Pass — 2 Zeilen-Pattern identisch.

**Files dedupelt (23):**

| Datei | Vorher | Nachher |
|---|---|---|
| `lib/prova-anhang-lightbox.js` | `_getSb._c = mod.createClient(...)` | `mod.supabase \|\| mod.getSupabase()` |
| `lib/prova-audit-search.js` | dito | dito |
| `lib/prova-audit-trail-view.js` | dito | dito |
| `lib/prova-befund-generator.js` | dito | dito |
| `lib/prova-beweisfragen-panel.js` | dito | dito |
| `lib/prova-dashboard-widgets.js` | dito | dito |
| `lib/prova-externe-dokumente.js` | dito | dito |
| `lib/prova-foto-picker.js` | dito | dito |
| `lib/prova-global-search.js` | dito | dito |
| `lib/prova-ki-wire.js` | dito | dito |
| `lib/prova-kontakt-360.js` | dito | dito |
| `lib/prova-mein-protokoll.js` | dito | dito |
| `lib/prova-versand-historie.js` | dito | dito |
| `lib/prova-versand-modal.js` | dito | dito |
| `lib/prova-versand-smtp.js` | dito | dito |
| `lib/prova-version-history.js` | dito | dito |
| `lib/prova-wikilink-source.js` | dito | dito |
| `lib/prova-asset-trigger.js` | `_getSupabase._cache = ...` | Singleton |
| `lib/prova-fragment-sidebar.js` | `this._sb = ...` | Singleton |
| `lib/prova-skizze-editor.js` | `this._sb = ...` | Singleton |
| `lib/extensions/prova-ki-suggestion.js` | throwaway client für session | Singleton |
| `lib/extensions/prova-norm-citation.js` | `_getSupabase()` return | Singleton |
| `lib/extensions/prova-skizze-embed.js` | inline createClient | Singleton |
| `mahnwesen.html` | `window.__mhSb = ...` | Singleton |

**Bewusst nicht migriert:**

- `lib/supabase-client.js` selbst — das IST das Singleton.
- `netlify/functions/**` und `scripts/**` — server-side mit Service-Role-Key,
  läuft nie im Browser, keine GoTrueClient-Konkurrenz.
- `admin/index.html` und `admin/voll.html` — Admin-Pages haben eigenen
  Auth-Flow mit Service-Role-Pattern (out-of-scope für Pilot).
- `app-logic.js` Z.580 — nur ein Kommentar, kein eigentlicher Aufruf.

**Side-Effect (gewollt):** Alle ehemals isolierten Clients teilen jetzt die
Session aus `prova-auth-token`. Vorher hat z.B. `prova-dashboard-widgets`
eigentlich ohne Session-Header gefeuert (eigener Client mit Default-Storage =
"sb-cngteblrbpwsyypexjrv-auth-token") — RLS-Queries lief deshalb anonym
durch. Nach dem Fix erbt jeder Caller den eingeloggten User → RLS funktioniert
korrekt workspace-scoped.

**Files:** 23 Frontend-Files + `sw.js` + `docs/MEGA75-DECISIONS.md`
**CACHE_VERSION:** v3234 → v3235

---
