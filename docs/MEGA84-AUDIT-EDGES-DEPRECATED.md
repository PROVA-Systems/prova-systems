# MEGA⁸⁴/⁸⁵ Pass 2c Block G — Audit-Edges Deprecation

**Stand:** 2026-05-17 · Pass 2c · Konsolidierung 5 → 1

## Ausgangslage

Im Repo existieren historisch gewachsen mehrere Audit-Edges, die alle in `audit_trail` schreiben:

| # | Edge / Function | Zeilen | Zweck (historisch) | Status |
|---|---|---|---|---|
| 1 | `supabase/functions/audit-write/index.ts` | 97 | Generisch (mit Rate-Limit + feature_event) | **deprecate** |
| 2 | `supabase/functions/audit-log/index.ts` | 50 | Generisch (mit IP-Hint) | **deprecate** |
| 3 | `supabase/functions/audit-trail-write/index.ts` | 40 | Minimal (workspace_id+action+payload) | **deprecate** |
| 4 | `supabase/functions/audit-source-log/index.ts` | 36 | Mit Source-Code-Tracking | **deprecate** |
| 5 | `netlify/functions/prova-audit.js` | — | Frontend-Bridge (legacy, vor Edge-Migration) | **deprecate** (siehe `audit-write` Sprint K-1.2.B8 Doku) |

Nicht in Scope (separater Zweck, bleiben):

- `audit-narrative-v1` — generiert KI-Narrative aus audit_trail, kein Writer
- `admin-audit-trail` — Admin-Read-Endpoint
- `admin-pseudonymisierung-audit` — Admin-Test-Endpoint

## Neue Edge

**`supabase/functions/audit-log-v1/index.ts`** — Single-Endpoint mit Task-Router:

| `task` | Mapped audit_action | Kategorie | Pflichtfelder |
|---|---|---|---|
| `ki_request` | `ki_request` / `ki_response` | `KI` | action, payload (model, tokens_in/out) |
| `login` | `login` / `logout` / `login_failed` | `AUTH` | action |
| `gdpr_export` | `data_export_dsgvo` | `DSGVO` | entity_typ=`user`, entity_id=user_id |
| `gdpr_delete` | `data_delete_dsgvo` | `DSGVO` | entity_typ=`user`, entity_id=user_id |
| `admin_action` | (eigene) | `ADMIN` | **reason** (min 5 chars), action |
| `generic` | (eigene) | (null) | action |

### Integrity-Hash-Kette

Jeder Eintrag bekommt:
- `prev_hash` = `integrity_hash` des letzten audit_trail-Eintrags pro `workspace_id`
- `integrity_hash` = `sha256(prev_hash || canonicalJson({workspace_id, user_id, action, entity_*, payload, source, task}))`

Tampering wird sichtbar: ein nachträglich geänderter Eintrag bricht die Kette für alle Folgeeinträge. Reine Append-Only-Erkennung — kein Replacement für Backup-Lösungen.

### Rate-Limit

200 events/min/user (vs. 100 bei `audit-write` — gerechtfertigt durch Single-Endpoint-Konsolidierung).

### Request-Format

```json
{
  "task": "ki_request",
  "action": "ki_request",
  "entity_typ": "auftrag",
  "entity_id": "<uuid>",
  "payload": { "modell": "gpt-5.5", "tokens_in": 1200, "tokens_out": 350 },
  "ki_model": "gpt-5.5",
  "ki_confidence": 0.87,
  "eu_ai_act_disclosed": true,
  "source": "freigabe-wizard",
  "kategorie": "KI"
}
```

### Response-Format

```json
{
  "ok": true,
  "audit_id": "<uuid>",
  "created_at": "2026-05-17T...",
  "integrity_hash": "ab12...",
  "prev_hash": "fe34...",
  "chain_intact": true,
  "task": "ki_request"
}
```

## Migration-Pfad für 5 alte Caller

Caller können **ohne Breaking-Change** schrittweise migrieren. Alte Edges bleiben funktional (NICHT löschen), neue Calls landen auf `audit-log-v1`.

### Caller-Inventory (grep `supabase.functions.invoke('audit-`)

| Caller-File | Alt-Edge | Neuer Task | Kommentar |
|---|---|---|---|
| `freigabe-wizard.html` | `audit-source-log` | `generic` (source='freigabe-wizard') | KI-Datum-Setzung — siehe Pass 2b D.3 |
| `ki-proxy` (`lib/ki-proxy-call.js`) | direkt audit_trail-INSERT | `ki_request` | Migration optional, ki-proxy hat eigenes Audit |
| `dsgvo-export` Edge (Welle 6) | `audit-write` | `gdpr_export` | Auto-Migration bei nächstem Deploy |
| `dsgvo-delete` Edge (Welle 6) | `audit-write` | `gdpr_delete` | Auto-Migration bei nächstem Deploy |
| Admin-Pages (`admin-*.html`) | direkt audit_trail | `admin_action` (reason Pflicht) | Migration jede einzelne Page bei nächstem Touch |
| `login-handler.js` | direkt audit_trail-INSERT (logAuditAction) | `login` | Migration bei nächstem Auth-Refactor |
| Netlify `prova-audit.js` | (legacy) | DEPRECATE | War schon vor `audit-write` deprecated |

### Migrations-Snippet (Frontend)

**Vorher (mit `audit-source-log`):**
```js
await sb.functions.invoke('audit-source-log', {
  body: { action: 'update', entity_typ: 'auftrag', entity_id: id, source_code: 'freigabe-wizard', payload: {...} }
});
```

**Nachher (mit `audit-log-v1`):**
```js
await sb.functions.invoke('audit-log-v1', {
  body: { task: 'generic', action: 'update', entity_typ: 'auftrag', entity_id: id, source: 'freigabe-wizard', payload: {...} }
});
```

## Deprecation-Policy

- **Phase A (Pass 2c, abgeschlossen):** v1 deployed, alte Edges bleiben aktiv. Neue Aufrufer → v1.
- **Phase B (MEGA⁸⁶, 2026-05-17):** Bestehende Caller migriert. Alte Edges bleiben funktional, sollten 7-Tage-Probelauf 0-traffic erhalten.
- **Phase C (Pass 4, future):** wenn 0 Calls/Woche in `function-logs`, alte Edges löschen.

**CC darf alte Edges NICHT eigenmächtig löschen** — nur Marcel nach Telemetrie-Review.

---

## Phase-B Migration-Status (MEGA⁸⁶, 2026-05-17)

| Caller-File | Alt-Edge | Neue Edge | Status |
|---|---|---|---|
| `freigabe-logic.js:642` `logComplianceBestaetigung` | `audit-trail-write` | `audit-log-v1` task=generic action=create kategorie=COMPLIANCE | ✅ migriert |
| `lib/editor-gate.js:65` `logOverrideToAudit` | `audit-trail-write` | `audit-log-v1` task=generic action=create kategorie=COMPLIANCE | ✅ migriert |
| `lib/audit-source-tracker.js:74` `markSvUebernommen` | `audit-source-log` | `audit-log-v1` task=generic action=update kategorie=KI | ✅ migriert |
| `prova-audit.js` (3 Loggers) | direkter Supabase-Adapter (`auditTrailInsert` aus `prova-supabase-adapters.js`) | bleibt direct-Supabase | ⏭ kein Edge-Call, keine Migration nötig |
| `audit-write`-Edge selbst | — | — | ⚠️ kein Frontend-Caller mehr (war historisch ki-proxy / dsgvo-export — Backend-Edges, separate Migration) |
| `audit-log`-Edge | — | — | ⚠️ kein Frontend-Caller gefunden in Sweep — Edge bleibt für Legacy-Backend-Caller |

### Verify nach 7 Tagen
Marcel kann via Supabase-Dashboard → Edge Functions → Logs prüfen: alte Edges sollten **0 Requests / 24h** haben. Wenn nach 7 Tagen weiterhin 0 → bereit für Phase C Delete.

## Deployment

```
mcp_use claude_ai_Supabase deploy_edge_function
  project_id=cngteblrbpwsyypexjrv
  name=audit-log-v1
  files=[{ name: 'index.ts', content: <Inhalt> }]
```

## Verify nach Deploy

```sql
-- 1. Eintrag schreiben (über App oder curl)
-- 2. Kette prüfen:
SELECT id, created_at, action, kategorie,
       LEFT(prev_hash, 12) AS prev, LEFT(integrity_hash, 12) AS this
  FROM public.audit_trail
 WHERE workspace_id = '65b25a13-17b7-45c0-b567-6edee235dd98'::uuid
 ORDER BY created_at DESC LIMIT 5;
-- Erwartung: prev_hash[i] == integrity_hash[i+1] (chronologisch)
```
