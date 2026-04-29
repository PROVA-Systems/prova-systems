# Hotfix K-UI/X4 — pdf-generate Service-Role-Pattern (X3-Replikat)

**Branch:** `hotfix-k-ui-x4-pdf-generate-rls`
**Datum:** 2026-04-30 (Nacht-Sprint N2)
**Bearbeiter:** Claude Code + Marcel (Live-Verify pending)

---

## Kontext

X3 (`hotfix-k-ui-x3-brief-generate-rls`) wurde am 30.04. 00:30 Uhr
**live verifiziert**: brief-generate liefert HTTP 200, PDF landet in
`sv-{workspace_id}/dokumente/briefe/...`. Storage-RLS-Bug ist gefixt.

`pdf-generate/index.ts:120` hatte denselben latenten Bug — gleiches
Pfad-Pattern ohne `sv-`-Prefix, gleicher User-JWT-Client. Wurde nur
noch nicht produktiv getroffen (Marcel hat seit RLS-Migration-Apply
keinen Schadensgutachten-Wizard-Workflow mit PDF-Output durchgespielt).

X4 wendet den **identischen X3-Fix** auf pdf-generate an.

---

## Diff zu pre-X4

| Stelle | Vor X4 | Nach X4 |
|---|---|---|
| Imports | `import { createSupabaseClient }` | `import { createSupabaseClient, createServiceClient }` |
| Client | `const sb = createSupabaseClient(req)` | `sbUser = createSupabaseClient(req)` + `sbAdmin = createServiceClient()` |
| `resolveLetterhead` | `sb` | `sbUser` (eigene users-Row, RLS schützt) |
| Storage-Pfad | `${workspaceId}/dokumente/${datePath}/...` | `sv-${workspaceId}/dokumente/${datePath}/...` |
| Storage-Upload | `sb.storage.upload()` | `sbAdmin.storage.upload()` |
| dokumente-Insert | `sb.from('dokumente').insert()` | `sbAdmin.from('dokumente').insert()` |
| Signed URL | `sb.storage.createSignedUrl()` | `sbAdmin.storage.createSignedUrl()` |
| Audit + Feature-Event | `sb` | `sbAdmin` |

---

## Marcel-TODO (vor Schadensgutachten-Test)

1. **Deploy:**
   ```bash
   supabase functions deploy pdf-generate \
     --project-ref cngteblrbpwsyypexjrv
   ```
   `SUPABASE_SERVICE_ROLE_KEY` ist bereits in Secrets (X3-Setup).

2. **Live-Verifikation:** sobald Marcel einen Schadensgutachten-Workflow
   abschließt der pdf-generate ruft (vermutlich von app.html /
   stellungnahme.html), sollte PDF in `sv-{workspace_id}/dokumente/...`
   landen.

3. **Optional Visual-Check:** im Supabase-Dashboard Storage-Bucket
   `sv-files` öffnen, neuer Pfad muss erscheinen.

---

## Bekannte Risiken

1. **Anders als X3 nicht auf Knopfdruck testbar** — Schadensgutachten-
   Workflow hat mehrere Schritte (Diktat, Befunde, Freigabe, PDF). Marcel
   sollte X4 erst grün-melden wenn er einen kompletten Flow durch hat.

2. **`pdf-generate` wird auch von Edge-Function `mahnung-erstellen` und
   anderen aufgerufen** — alle die durchlaufen jetzt den neuen Pfad.
   Grep zeigt keine direkten internen pdf-generate-Imports (Edge-Funktions-
   Aufrufe gehen über `supabase.functions.invoke`), aber Wahrscheinlichkeit
   für Regression ist > 0%.

3. **`storage_path` in der `dokumente`-Tabelle** wird mit dem neuen
   `sv-`-Prefix gespeichert. Falls eine andere Page den Pfad direkt
   konkatiniert (z.B. `https://supabase.../storage/...${storage_path}`),
   würde das alte Pages mit `${workspaceId}/...`-Annahme brechen. Aber:
   pre-X3+X4 gab es keine erfolgreichen Inserts (RLS hat alles geblockt),
   Tabelle sollte 0 Brief/PDF-Rows haben.

---

## Backlog

- **Edge Functions Audit (Sprint K-1.5 Block 5):** alle 8 Edge Functions
  durchgehen ob sie `createSupabaseClient(req)` für Writes nutzen — wenn
  ja: gleiche Service-Role-Behandlung wie X3/X4. Audit-File ist Teil
  des Cutover-Sprints.
- **CLAUDE.md-Update:** "Edge Functions nutzen Service-Role für
  Multi-Tenant-Writes via verifiziertem workspace_id" als Pattern-Doku.

---

## Commit

`60adc01 N2/X4: pdf-generate — Service-Role-Client + sv-Prefix (Pattern aus X3)`
