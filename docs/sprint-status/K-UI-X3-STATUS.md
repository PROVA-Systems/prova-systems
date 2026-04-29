# Hotfix K-UI/X3 — brief-generate Storage-Upload RLS-Violation

**Branch:** `hotfix-k-ui-x3-brief-generate-rls`
**Datum:** 2026-04-30
**Bearbeiter:** Claude Code + Marcel

---

## Bug

`POST /functions/v1/brief-generate` -> HTTP 500
Response-Body: `{"error": "Storage upload: new row violates row-level security policy"}`

PDFMonkey generierte das PDF erfolgreich. brief-generate konnte das PDF
aber nicht in den Supabase Storage hochladen, weil die RLS-Policy auf
`storage.objects` blockierte.

---

## Pre-Flight (4 Fragen)

| # | Frage | Antwort |
|---|---|---|
| 1 | Welcher Storage-Bucket? | `sv-files` (`brief-generate/index.ts:36` — `STORAGE_BUCKET`) |
| 2 | Welcher Pfad? | `${workspaceId}/dokumente/briefe/${azSlug}/${template_key}-${ts}.pdf` — workspace_id-Prefix vorhanden, aber **kein `sv-`-Prefix** wie von der RLS erwartet |
| 3 | Welcher Client? | **User-JWT-Client** via `createSupabaseClient(req)` aus `_shared/supabase.ts:20` (RLS aktiv) |
| 4 | RLS-Policies sv-files? | 4 Policies in `supabase-migrations/03_schema_artefakte_storage.sql:849-878` (SELECT/INSERT/UPDATE/DELETE), alle nutzen `storage_path_to_workspace_id(name)` |

---

## Root Cause

`storage_path_to_workspace_id(p_path)` ist eine SQL-Helper-Function
(`03_schema_artefakte_storage.sql:822`). Sie zerlegt den Storage-Pfad
und sucht nach dem Pattern `sv-{uuid}/...`:

```sql
v_first_part := split_part(p_path, '/', 1);
IF v_first_part LIKE 'sv-%' THEN
    RETURN substring(v_first_part FROM 4)::UUID;
ELSE
    RETURN NULL;
END IF;
```

`brief-generate` schickte aber `{workspaceId}/dokumente/briefe/...`
ohne den `sv-`-Prefix. → Function returnte `NULL` →
`NULL IN (SELECT get_user_workspaces())` ist `false` → RLS lehnt
INSERT ab.

**Zusatz-Befund:** `pdf-generate/index.ts:120` hat denselben latenten
Bug (gleiches Pfad-Pattern) — wurde nur noch nicht getroffen weil pdf-
generate seit Apply der Storage-RLS noch nicht produktiv getestet wurde.

---

## Fix (Marcels Präferenz: Service-Role-Client)

Architektur-Entscheidung: statt User-JWT + RLS-Trick fuer den Pfad,
nutzt brief-generate jetzt den Service-Role-Client fuer alle Writes.
Begründung (Marcel): "Edge Functions sind serverseitig + JWT-verifiziert
+ workspace_id ist aus dem User-Token bekannt. Eine zweite RLS-Schicht
via User-JWT-Client ist redundant und brittle."

**Aenderungen in `supabase/functions/brief-generate/index.ts`:**

```diff
-import { createSupabaseClient } from '../_shared/supabase.ts';
+import { createSupabaseClient, createServiceClient } from '../_shared/supabase.ts';

-const sb = createSupabaseClient(req);
+const sbUser  = createSupabaseClient(req);   // User-JWT, RLS aktiv
+const sbAdmin = createServiceClient();       // Service-Role, RLS bypass

-const letterhead = await resolveLetterhead(sb, ctx.user.id);
+const letterhead = await resolveLetterhead(sbUser, ctx.user.id);

-const storagePath = `${workspaceId}/dokumente/briefe/${azSlug}/${body.template_key}-${ts}.pdf`;
-const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(...)
+const storagePath = `sv-${workspaceId}/dokumente/briefe/${azSlug}/${body.template_key}-${ts}.pdf`;
+const { error: upErr } = await sbAdmin.storage.from(STORAGE_BUCKET).upload(...)

-const { data: docRow } = await sb.from('dokumente').insert({...})
+const { data: docRow } = await sbAdmin.from('dokumente').insert({...})

-const { data: signed } = await sb.storage.from(STORAGE_BUCKET).createSignedUrl(...)
+const { data: signed } = await sbAdmin.storage.from(STORAGE_BUCKET).createSignedUrl(...)

-await logAuditEvent(sb, {...})
-await trackFeatureEvent(sb, workspaceId, ...)
+await logAuditEvent(sbAdmin, {...})
+await trackFeatureEvent(sbAdmin, workspaceId, ...)
```

**Pfad-Konvention `sv-{workspace_id}/...` beibehalten:** auch wenn
Service-Role den INSERT bypassed, soll die `SELECT`-RLS fuer spaetere
User-Reads weiter greifen. Damit kann ein User mit User-JWT seine
eigenen Brief-PDFs lesen.

**Sicherheits-Boundary bleibt korrekt:**
- `verifyJwt()` validiert die JWT-Signatur
- `getWorkspaceId()` prueft `workspace_memberships` mit User-JWT-Client
  (RLS aktiv — User kann nur eigene Memberships lesen)
- `workspace_id` wird im Storage-Pfad + `dokumente.workspace_id` aus
  dieser User-verifizierten Quelle gesetzt
- Keine User-Input-Pfade — alle Pfad-Bestandteile Server-konstruiert

---

## Bilanz pro Block

| Block | Status | Inhalt |
|---|---|---|
| B1 Pre-Flight | ✅ | 4 Fragen oben beantwortet |
| B2 Service-Role-Switch | ✅ | commit `bf3540e` |
| B3 Migration nötig? | ✅ | Nein — RLS-Policies bleiben, Service-Role bypassed |
| B4 Deploy | ⚠️ Marcel-TODO | `supabase functions deploy brief-generate` |
| B5 Status-File | ✅ | dieser Commit |

---

## Marcel-TODO

### Pflicht (vor Re-Test):

1. **SUPABASE_SERVICE_ROLE_KEY** in Edge-Function-Secrets verifizieren:
   ```bash
   supabase secrets list --project-ref cngteblrbpwsyypexjrv
   ```
   Erwartet: `SUPABASE_SERVICE_ROLE_KEY` ist gesetzt. Falls nicht:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key-aus-dashboard> \
     --project-ref cngteblrbpwsyypexjrv
   ```

2. **Deploy:**
   ```bash
   supabase functions deploy brief-generate \
     --project-ref cngteblrbpwsyypexjrv
   ```

3. **Re-Test im Browser:**
   - briefe.html oeffnen
   - Empfaenger Anna Mustermann picken (oder manuell ausfuellen)
   - K-01 Auftragsbestaetigung
   - Variables ausfuellen mit irgendwas
   - "PDF generieren" -> erwartet 200 + PDF-Link in Result-Card
   - PDF im Browser oeffnen, visueller Check (Stempel/Logo aus
     letterhead_config sollten erscheinen wenn Profil befuellt)

### Verifikation in Supabase-Dashboard:

- Storage → Bucket `sv-files` → Pfad `sv-{deine-workspace-uuid}/dokumente/briefe/...`
  muss neue PDF-Datei zeigen
- DB → `dokumente`-Tabelle → neue Row mit `typ='brief'`,
  `workspace_id` = deine workspace-UUID, `storage_path` = oben
- DB → `audit_trail` → neue Row mit `action='pdf_generate'`

---

## Backlog (eigener Hotfix oder K-1.4)

### `pdf-generate` hat denselben latenten Bug

`supabase/functions/pdf-generate/index.ts:120`:
```typescript
const storagePath = `${workspaceId}/dokumente/${datePath}/${body.template_key}-${created.id}.pdf`;
```

Gleiche Konstellation:
- User-JWT-Client (`createSupabaseClient(req)`)
- Pfad ohne `sv-`-Prefix
- → wird beim ersten produktiven Test mit derselben RLS-Violation
  fehlschlagen

**Empfehlung:** in einem separaten X4-Hotfix analog patchen
(Service-Role + sv-Prefix). Wollte ich nicht hier ungefragt
mitfixen — Marcels X3-Spec sagte explizit nur `brief-generate`.

### CLAUDE.md-Update sinnvoll?

PROVA-Regel 4: "Service-Role-Key NUR Server-Side ... NIE im Frontend".
Das bleibt gueltig. Aber das Pattern "Edge Functions nutzen
Service-Role fuer Multi-Tenant-Writes via verifiziertem
workspace_id" wuerde sich als Doku-Eintrag in CLAUDE.md anbieten —
sonst gerät die Architektur-Entscheidung in Vergessenheit.

---

## Bekannte Risiken

1. **SUPABASE_SERVICE_ROLE_KEY muss in Edge-Function-Secrets sein.**
   `createServiceClient()` wirft `Error: SUPABASE_SERVICE_ROLE_KEY
   not set` falls fehlt. `withErrorHandling` returnt das als 500
   mit Message — Marcel sieht es im Browser-Network-Tab als JSON.

2. **Service-Role-Key-Leak-Risiko bleibt theoretisch.** Edge Function
   ist serverseitig, Key wird nie an den Client gesendet, ist mit
   Supabase-Project-Secrets verschluesselt — Risiko praktisch null
   solange Repo + CI sauber bleiben.

3. **Bestehende `dokumente`-Rows mit altem Pfad-Pattern** (ohne `sv-`)
   gibt es nicht — alle vor X3 fielen ja in den RLS-Block. Tabelle
   sollte 0 Brief-Dokumente enthalten.

---

## Commits

```
bf3540e K-UI/X3.B2: brief-generate — Service-Role-Client fuer Storage+DB
```

(B5 Status-File-Commit folgt direkt nach.)
