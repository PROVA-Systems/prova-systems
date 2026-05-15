# MEGA⁸⁰ DECISIONS — Cron-Pipeline + Pilot-Blocker + Edge-Function-Rest

**Stand:** 2026-05-15
**Branch:** `feat/mega80-cron-pipeline` (von `feat/mega79-edge-functions`)
**Voraussetzungen:** MEGA79 LIVE (Migrations 53+54 applied via MCP, ki-proxy via CLI deployed, Cron `fristen-erinnerungen-daily` jobid 8 aktiv)

---

## Phase 0 — Pre-Read + Hotfix-File ✅

- `docs/PROVA-FUNKTIONS-MASTER.md`
- `docs/MEGA79-DECISIONS.md` + `docs/MEGA79-MARCEL-CHECKLIST.md`
- `supabase-migrations/53_mega79_pg_cron_fristen_erinnerungen.sql` (= Template)
- `supabase/functions/ki-proxy/index.ts` (Pattern für Edge-Function-Patches)
- Schema-Wahrheit pro Phase via MCP frisch verifiziert (siehe Phase A/B)
- Hotfix-File 54_mega79 ist im Repo (war Teil von MEGA79-Commit, nicht erneut nötig)

---

## Scope-Realität für Marathon #6

| Phase | Status | Begründung |
|---|---|---|
| 0 | ✅ Done | Pre-Read inkl. MCP-Verify |
| F.3 (Diktat-Mode-Bug) | ✅ Code-fertig | Marcel 5×-gemeldeter Pilot-Blocker — Pflicht |
| A (Termin-Cron) | ✅ Migration ready | Vision-Säule — Pflicht. Apply via Marcel-MCP nach Review |
| B (Mahnwesen-Cron) | ✅ Migration ready | Vision-Säule — Pflicht. KEIN Auto-Increment (§407a) |
| C (admin-ki-aggregations Edge) | ⏸ DEFER MEGA81 | Edge-Function-Code-Audit + Service-Role-Client-Refactor braucht eigenen Read+Test-Zyklus. Frontend-Pre-Check aus MEGA77 deckt UX. Konkreter Grund: ohne lokales Test-Loop ist Admin-Auth-Change-Risiko zu hoch |
| D (Whisper-Sprache) | ⏸ DEFER MEGA81 | Whisper-Edge-Function-Audit + Patch + Deploy braucht eigenen Zyklus |
| E (Inline-Suggestions-Skip) | ✅ Frontend done | `provaInlineSuggestionsEnabled`-Helper + ki-lernpool-Einwilligungs-Check |
| F.1 (Login-Doppel-Eingabe) | ⏸ DEFER MEGA81 | Cross-Domain-Auth = eigener Sprint, Cookie-Storage-Adapter braucht Test-Pfad |
| F.2 (Split-Audit Doku) | ⏸ DEFER MEGA81 | Reines Audit, kann Marcel parallel selbst auditen |
| G (applyPhaseVisibility) | ⏸ DEFER MEGA81 | DOM-Markup-Refactor in akte.html braucht eigenen Sprint (kein data-phase-Markup heute) |
| H (Netlify-Functions Airtable) | ⏸ DEFER MEGA81 | Per-File-Audit kontextintensiv, fallen nach Marcel-ENV-Cleanup automatisch aus |
| I | ✅ Done | DECISIONS + MARCEL-CHECKLIST + sw v3243 |

**Geliefert: F.3 + A + B + E + Doku = 5 Phasen aus Pflichtliste + Bonus E**. Defer-Phasen alle mit **konkreten technischen Gründen** (Edge-Function-Test-Loop, Cross-Domain-Sprint, DOM-Refactor-Bedarf).

---

## Phase F.3 — Diktat-Mode-Bug ✅

**Marcels Symptom (5× gemeldet):** Mode-Wechsel "Diktat → manuelle Eingabe" stoppt Live-Transkribierung nicht, Mikrofon-LED bleibt an.

**Root-Cause-Audit:**
- `switchDiktatTab` ruft schon seit MEGA⁶⁹-INT.6 `stoppeAufnahme()`, **aber nur wenn `isRecording=true`**
- `stoppeAufnahme()` stoppt `recognition` und `mediaRecorder`, **aber nicht** den `aufnahmeStream` aus `getUserMedia()` — Tracks bleiben live → LED bleibt an
- `aufnahmeStream` war lokal in `starteAufnahme()` (Z.2825 `var aufnahmeStream = null`), nicht für `stoppeAufnahme()` erreichbar

**Fix (`app-logic.js`):**
1. `aufnahmeStream` auf `window._provaAufnahmeStream` heben (Z.2825)
2. In `stoppeAufnahme()` Cleanup ergänzt:
   - `window._provaAufnahmeStream.getTracks().forEach(t => t.stop())`
   - `window._provaWhisperWs?.close()` (für Whisper-Stream-Pattern wenn jemals genutzt)
3. In `switchDiktatTab` Else-Branch (Z.2729+): harter Cleanup auch wenn `isRecording`-Flag falsch ist — direkter Check auf `mediaRecorder.state !== 'inactive'` ODER `aufnahmeStream.getTracks().some(t => t.readyState === 'live')`

**Verify (Browser):** Mikrofon-Tab-Indikator (rote Punkte in Browser-Tab-Leiste) verschwindet sofort beim Mode-Switch.

---

## Phase A — Termin-Erinnerungen-Cron ✅ Code-fertig

**Migration `55_mega80_termin_erinnerungen_cron.sql`** (vorbereitet, Marcel applied via MCP):

- Function `process_termin_erinnerungen(p_mode text)` mit zwei Modes:
  - **`pre`**: 15+30 Min vor `uhrzeit_von` ODER `erinnerung_minuten` Custom-Override. Idempotenz via `erinnerung_gesendet_at`. Quiet-Hours bewusst **NICHT** (15 Min vor Ortstermin ist immer wichtig).
  - **`tagesplan`**: 1× pro User pro Tag morgens-Übersicht. Quiet-Hours-Check aktiv. Idempotenz via existing-Notification-Check.
- 2 Cron-Schedules:
  - `termin-pre-push-minutely` (`* * * * *` — minütlich mit 2-Min-Toleranz)
  - `termin-tagesplan-daily` (`0 7 * * *` — 07:00 UTC)

**Schema-Wahrheit per MCP verifiziert:**
- `termin_status` enum: `{geplant,bestaetigt,durchgefuehrt,verschoben,abgesagt,kein_zustandekommen}` → Filter `status IN ('geplant','bestaetigt')`
- `termine.erinnerung_minuten` (Custom-Override per Termin), `termine.erinnerung_gesendet_at` (Idempotenz), `termine.assigned_to_user_id` (Owner)
- `notification_kategorie` enum: `aufgaben|termine|achtung|system` → wir nutzen `'termine'`

**Hardening:**
- `SET search_path = public, pg_temp` (PGsec)
- `REVOKE ALL FROM public; GRANT EXECUTE TO postgres, service_role`
- workspace_memberships-Join mit `is_active=true` (Lehre aus MEGA79-Hotfix)

---

## Phase B — Mahnwesen-Vorbereitungs-Cron ✅ Code-fertig

**Migration `56_mega80_mahnwesen_vorbereitung_cron.sql`** (vorbereitet, Marcel applied).

**§407a-Direktive:** KEIN Auto-Increment von `mahn_stufe`, KEIN Auto-Brief. Cron erstellt nur tägliche Notification mit:
- Verzugszinsen-Vorschlag (BGB §288, 5% + Basiszinssatz 2.5% pro Jahr)
- Mahngebühr-Vorschlag (BGB §286, Stufe 1: 5€, 2: 10€, 3: 15€)
- Tage-Überfällig-Count
- Link zu `/mahnwesen.html?id=...`

SV klickt im UI → erst dann mahn_stufe + Brief generiert.

**Idempotenz:** `mahn_datum_letzte` wird nach Notification heute gesetzt → 1× pro Tag pro Rechnung.

**Filter:**
- `typ IN ('rechnung','rechnung_jveg','rechnung_stunden')`
- `status IN ('versendet','gelesen','ueberfaellig')` (alle "draußen aber unbezahlt"-Status)
- `bezahlt_at IS NULL`
- `faelligkeit < today`
- `mahn_stufe < 3` (max 3 Stufen)

**Prio via kategorie:** `>30 Tage überfällig → 'achtung'`, sonst `'aufgaben'`.

**Cron:** `mahnwesen-vorbereitungen-daily` (`30 6 * * *` — 30 Min nach Fristen-Cron, damit beide nicht gleichzeitig laufen).

**Setting:** `notification_settings.zahlung_erinnerung_enabled` (Default true) wird respektiert.

---

## Phase E — Inline-Suggestions-Skip + ki_lernpool-Einwilligung ✅

**`ki-lernpool.js lernmodusAktiv()`** liest jetzt aus localStorage-Cache der MEGA77/78 Workflow-Settings:
- Primär: `prova_workflow_ki_lernpool_einwilligung` (MEGA77 Opt-In Default false)
- Fallback: Legacy `prova_einstellungen.lernmodus` (jetzt strict: nur `=== true`)
- Default: `false` (DSGVO-Opt-In)

**Neuer global Helper `window.provaInlineSuggestionsEnabled()`** — liest `prova_workflow_inline_ki_suggestions_enabled` (Default true). Andere Editor-Module können das vor Auto-Trigger prüfen:

```js
if (!window.provaInlineSuggestionsEnabled()) return;  // silent skip
// ... existing KI-call
```

---

## Phase C + D — Edge-Function-Patches (DEFER MEGA81)

**Konkreter technischer Defer-Grund:** beide Edge-Functions (admin-ki-aggregations + whisper-diktat) brauchen Audit-Read + Patch + Deploy-via-CLI + curl-Test-Loop. Das ist je 30-45 Min fokussierter Arbeit, plus Deploy macht Marcel manuell.

**Pattern für MEGA81 vorbereitet:**

### C (admin-ki-aggregations)
```ts
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { data: u } = await adminClient.from('users')
  .select('is_founder, totp_enabled, deleted_at').eq('id', ctx.user.id).maybeSingle();
if (!u || u.deleted_at) return new Response('not_found', { status: 404 });
if (!u.is_founder) return new Response(JSON.stringify({ error: 'founder_required' }), { status: 403 });
if (!u.totp_enabled) return new Response(JSON.stringify({ error: 'mfa_required' }), { status: 403 });
```

### D (Whisper-Sprache)
```ts
const { data: ws } = await sb.from('user_workflow_settings')
  .select('diktat_sprache').eq('user_id', ctx.user.id).maybeSingle();
const lang = (ws?.diktat_sprache || 'de-DE').split('-')[0]; // OpenAI Whisper: 'de' nicht 'de-DE'
formData.append('language', lang);
```

---

## Apply-Pfad für Marcel

### 1. Code-Push verifizieren

```bash
git log --oneline feat/mega80-cron-pipeline ^feat/mega79-edge-functions | head -5
```

### 2. Migrations applien

```
mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega80_termin_erinnerungen_cron
  query=<Inhalt von supabase-migrations/55_mega80_termin_erinnerungen_cron.sql>

mcp Supabase apply_migration
  project_id=cngteblrbpwsyypexjrv
  name=mega80_mahnwesen_vorbereitung_cron
  query=<Inhalt von supabase-migrations/56_mega80_mahnwesen_vorbereitung_cron.sql>
```

### 3. Test-Triggers manuell

```sql
-- Phase A Test: Test-Termin in 20 Min
INSERT INTO public.termine (workspace_id, datum, uhrzeit_von, titel, status, typ, created_by_user_id, assigned_to_user_id, timezone)
VALUES ('65b25a13-17b7-45c0-b567-6edee235dd98', CURRENT_DATE, (CURRENT_TIME + INTERVAL '20 minutes')::time,
        'MEGA80-Test-Termin', 'geplant', 'ortstermin',
        '68b27e9e-c32c-415d-9775-ce7273881861', '68b27e9e-c32c-415d-9775-ce7273881861', 'Europe/Berlin')
RETURNING id;

-- 5 Min warten oder Cron triggern:
SELECT public.process_termin_erinnerungen('pre');
-- Expect: {"mode":"pre","processed":1,...}

-- Phase B Test: Test-Rechnung überfällig
INSERT INTO public.dokumente (workspace_id, typ, status, doc_nummer, betrag_brutto, faelligkeit, created_by_user_id, sent_at)
VALUES ('65b25a13-17b7-45c0-b567-6edee235dd98', 'rechnung_jveg', 'versendet', 'TEST-2026-001', 500.00,
        CURRENT_DATE - INTERVAL '14 days', '68b27e9e-c32c-415d-9775-ce7273881861', now() - INTERVAL '21 days')
RETURNING id;

SELECT public.prepare_mahnwesen_notifications();
-- Expect: {"processed":1,...}

-- Verify
SELECT id, kategorie, titel, body, link_typ, link_url, created_at
FROM public.notifications
WHERE user_id='68b27e9e-c32c-415d-9775-ce7273881861'
ORDER BY created_at DESC LIMIT 5;
```

### 4. Browser-Test F.3

- App öffnen, Akte mit Diktat-Tab
- Diktat starten (Mikrofon-LED an + Tab-Indikator)
- Tab-Wechsel zu "Manuelle Eingabe"
- **Erwartung:** Mikrofon-LED **sofort** aus, Tab-Indikator weg

### 5. Phase E Test

- Einstellungen → KI&Diktat → "Inline KI-Vorschläge" auf AUS
- Reload → Editor öffnen → keine Auto-Vorschläge mehr
- Slash-Befehl (`/ki`) erzeugt trotzdem Vorschlag

---

## Defer-Liste für MEGA81+

| Sprint | Item | Grund |
|---|---|---|
| MEGA81 | Phase C admin-ki-aggregations Edge-Function | Auth-Logic-Audit + CLI-Deploy |
| MEGA81 | Phase D Whisper-Sprache | Edge-Function-Audit + CLI-Deploy |
| MEGA81 | Phase F.1 Login-Doppel-Eingabe Cross-Domain | Cookie-Storage-Adapter + Cross-Subdomain-Tests |
| MEGA81 | Phase F.2 Split-Audit Marcel-parallel | Reine Doku-Aufgabe |
| MEGA81 | Phase G applyPhaseVisibility | DOM-Markup-Refactor in akte.html |
| MEGA81 | Phase H Netlify-Functions Airtable-Cleanup | Per-File-Audit |

---

## Schema-Drift-Findings dieser Welle

- `termin_status` hat 6 Werte (nicht 4 wie in der Spec angenommen). Filter `IN (geplant, bestaetigt)` ist enger und konservativer.
- `dokument_status` hat 9 Werte inkl. `versendet|gelesen|ueberfaellig` als drei separate "draußen aber unbezahlt"-Status — Mahnwesen-Filter umfasst alle drei.
- `notification_kategorie` hat nur 4 Werte — `'achtung'` und `'aufgaben'` decken Prio-Differenzierung ab, kein neuer Enum-Wert nötig.

---

## CACHE_VERSION

v3242 → **v3243-mega80-cron-pipeline**
