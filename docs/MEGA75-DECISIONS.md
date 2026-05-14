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
**Commit:** wird gleich gemacht

---
