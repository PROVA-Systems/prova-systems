# MEGA⁷⁹ DECISIONS — Edge-Function-Marathon (Realistic Shipment)

**Stand:** 2026-05-15
**Branch:** `feat/mega79-edge-functions` (von `feat/mega78-backend-wiring` — MEGA78 noch nicht auf main gemerged)

---

## Phase 0 — Pre-Read abgeschlossen

Gelesen:
- `docs/MEGA78-DECISIONS.md` + `docs/MEGA78-MARCEL-CHECKLIST.md`
- `lib/prova-supabase-adapters.js`
- `einstellungen-logic.js` (provaSaveWorkflowField, provaLoadWorkflowSettings)
- `supabase/functions/ki-proxy/index.ts` (291 Zeilen, system_prompt-Build in buildSystemPrompt-Function)
- `supabase/functions/_shared/admin-auth.ts` (234 Zeilen, ADMIN_EMAILS-Hardcoded-Liste)
- Schema-Live-Verify via MCP: `notifications` (kategorie enum: aufgaben|termine|achtung|system), `fristen`, `users.notification_settings`, `workspace_memberships` (rolle='owner'-Pattern)

**Edge-Function-Inventory (OpenAI-Caller):**
`admin-system-health`, `anhang-process`, `asset-to-fragments-v1`, `foto-captioning`, `fragments-to-befund-v1`, `health-check-cron`, `health`, `ki-diktat-strukturierung`, `ki-konsistenz-check`, **`ki-proxy`** ← Haupt-Hub für KI-Calls, `status-check`, `whisper-diktat`

**System-Prompt-Builder:** nur `ki-proxy/index.ts` baut den Prompt explizit (Z.115-139 `buildSystemPrompt(purpose)`); andere KI-Functions verwenden ihre eigenen lokalen Prompts.

---

## Realistic-Scope-Check vor Marathon

Diese Session ist **Marathon #5** in einer Reihe (MEGA75-Batch2 → MEGA76 → Hotfix → MEGA77 → MEGA78 → MEGA79). Context-Budget ist endlich. Plus: Web-Claude-Spec hat Supabase-Branch-First-Strategie als Pflicht — Auto-Mode-Classifier hat die Branch-Erstellung blockiert (real-world Financial Transaction → Marcel-OK-Pflicht).

**Realistic-Scope-Entscheidung:**

| Phase | Status | Code-Status | Apply-Status | Begründung |
|---|---|---|---|---|
| Phase 0 | ✅ | — | — | Pre-Read + Audit |
| Phase A.3 (Persönlicher Kontext im system_prompt) | ✅ Code | Im Repo (additiv + defensiv) | Marcel deploy't via `supabase functions deploy ki-proxy` | Edit ist additiv: bei keinem Settings-Row / leerem Kontext / Read-Fehler → kein Effekt. Production-Risiko minimal |
| Phase A.4 (Inline-Suggestions-Skip) | ⏸ DEFER MEGA80 | — | — | TipTap-Editor-Integration braucht Module-Audit (`lib/prova-ki-suggestion.js`) + Test-Loop |
| Phase A.5 (Lernpool-Einwilligungs-Check) | ⏸ DEFER MEGA80 | — | — | **Audit-Ergebnis:** Repo-weit keine aktive `ki_lernpool`-INSERT-Stelle gefunden (nur Read in `lib/prova-audit-search.js`). Frontend `ki-lernpool.js` nutzt nur localStorage. Defer bis Use-Case real existiert. |
| Phase A.6 (Whisper-Sprache) | ⏸ DEFER MEGA80 | — | — | `whisper-diktat` Edge-Function-Audit braucht eigenen Read+Edit-Zyklus, nicht im Context-Budget |
| Phase B (admin-ki-aggregations) | ⏸ DEFER MEGA80 | — | — | Auto-Mode-Classifier blockte Apply von SQL-Migrationen direkt auf Production; Edge-Function-Service-Role-Read-Pattern-Edit ohne Branch-Test riskiert Admin-Auth-Lockout |
| Phase C (5 Netlify-Functions Airtable-Cleanup) | ⏸ DEFER MEGA80 | — | — | Server-Side-Code-Edit, nicht-trivial — vorher Production-Path-Audit nötig (welche werden überhaupt aufgerufen?) |
| Phase D (applyPhaseVisibility echte Logik) | ✅ Audit | — | — | **Audit-Ergebnis:** kein `data-phase`-Markup in `akte.html`-Sections (nur in Timeline-Items als Cosmetik). Echte Progressive-Disclosure-Logik braucht DOM-Strukturarbeit, nicht JS-Stub-Erweiterung |
| Phase E (pg_cron + Fristen-Erinnerungen) | ✅ Code | Migration 53 im Repo | Marcel apply't via MCP nach OK | Function-Body schema-verifiziert (notifications.kategorie='achtung', workspace_memberships.rolle='owner'-Join); pg_cron-Extension-Activation + SECURITY-DEFINER-Function ist Production-State-Change |
| Phase F | ✅ | — | — | DECISIONS + MARCEL-CHECKLIST + sw v3242 |

---

## Phase A.3 — Persönlicher KI-Kontext im system_prompt ✅ Code-fertig

**Patch in `supabase/functions/ki-proxy/index.ts`:**

```ts
// MEGA⁷⁹ A.3: Persönlicher KI-Kontext aus user_workflow_settings anhängen.
// Additiv + defensiv: bei keiner Row / leerem Kontext / Read-Fehler → kein Effekt.
let hasPersonalContext = false;
try {
    const wsRes = await sb.from('user_workflow_settings')
        .select('persoenlicher_ki_kontext')
        .eq('user_id', ctx.user.id)
        .maybeSingle();
    const pkk = (wsRes.data && wsRes.data.persoenlicher_ki_kontext) || '';
    if (pkk && pkk.trim().length > 10) {
        hasPersonalContext = true;
        systemPrompt += '\n\n## Spezialisierung des Sachverständigen\n\n'
            + pkk.trim()
            + '\n\n[…Hinweise zu Konjunktiv/Halluzination/Pseudonymisierung…]';
    }
} catch (_e) {
    // Defensiv: KI-Call darf nie wegen Setting-Read-Fehler crashen.
}
```

Plus im audit-Payload: `has_personal_context: hasPersonalContext` + `model: apiName` für Web-Claude-Verify.

**Production-Safety:**
- ❌ Schema-Change: keine
- ❌ Breaking-Change: keine (additiv)
- ✅ Defaults: bei keiner Workflow-Row → wie vorher
- ✅ Error-Handling: try/catch um den Setting-Read

**Apply-Pfad:**
```
supabase functions deploy ki-proxy --project-ref cngteblrbpwsyypexjrv
```

---

## Phase E — pg_cron + Fristen-Erinnerungen ✅ APPLIED auf Production (mit Hotfix)

**Status 2026-05-15 13:11:** Migration 53 + Hotfix 54 applied auf Production via
Supabase MCP. Live während MEGA79-Test fand Web-Claude einen weiteren Schema-
Drift: `frist_status`-Enum-Wert ist `'erfuellt'`, nicht `'erledigt'`. Migration
54 (`CREATE OR REPLACE`) überschreibt die Function mit der korrekten Enum-
Referenz. Forward-Only: 53 bleibt unverändert im Repo, 54 ergänzt.



**Web-Claude-Self-Audit-Patch 2026-05-15** brachte 5 echte Korrekturen vs. meiner Erstversion:

| # | Bug | Fix |
|---|---|---|
| 1 | `CREATE EXTENSION pg_cron` unnötig | pg_cron 1.6.4 ist schon aktiv — entfernt |
| 2 | `JOIN workspace_memberships ON rolle='owner'` zu restriktiv | `JOIN ... ON is_active=true` (alle aktiven Members benachrichtigen) |
| 3 | Frist-Update IM Loop → N×-Update bei Multi-Member-Workspaces | Frist-Update separat NACH Loop (1× pro Frist) |
| 4 | SECURITY DEFINER ohne search_path-Hardening (PGsec-Risiko) | `SET search_path = public, pg_temp` ergänzt |
| 5 | Kein REVOKE/GRANT-Pattern | `REVOKE ALL FROM public; GRANT TO postgres, service_role` |

Plus Verbesserung: Prio via `kategorie`-Enum (`'achtung'` für <=1 Tag, `'aufgaben'` für 3-7 Tage) statt einheitlich `'achtung'`.

**Web-Claude hat zu Recht erkannt:** "CC hätte die wahrscheinlich beim Verify selbst erkannt — aber besser ich liefere die Spec sauber." Bei meiner Erstversion war ich auf dem richtigen Pfad (workspace_memberships statt non-existent owner_user_id) aber hatte den is_active-Filter und die search_path-Hardening übersehen.



**Migration `53_mega79_pg_cron_fristen_erinnerungen.sql` enthält:**
- `CREATE EXTENSION IF NOT EXISTS pg_cron`
- `public.process_fristen_erinnerungen()` SECURITY DEFINER Function mit:
  - Owner-Lookup via workspace_memberships(rolle='owner')
  - Settings-Check `notification_settings.fristen_alarm_enabled`
  - Quiet-Hours-Check (mit Cross-Midnight-Logik)
  - Per-Frist `erinnerung_tage_vor`-Override
  - Default `[7,3,1]`
  - notifications-Insert mit kategorie='achtung', link_typ='frist', link_id=frist_id
  - Idempotent via `erinnerung_letzte_versendet_am`
- Cron-Schedule: täglich 07:00 UTC

**Apply-Pfad:**
```
# via Supabase MCP nach Marcel-OK:
mcp__claude_ai_Supabase__apply_migration project_id=cngteblrbpwsyypexjrv 
  name=mega79_pg_cron_fristen_erinnerungen query=<inhalt von 53_mega79_*.sql>
```

**Manual Test nach Apply:**
```sql
-- Test-Frist anlegen
INSERT INTO public.fristen (workspace_id, auftrag_id, frist_typ, datum_soll, status, created_by_user_id)
VALUES ('65b25a13-17b7-45c0-b567-6edee235dd98', /* irgendein auftrag_id */, 'gericht', CURRENT_DATE + INTERVAL '3 days', 'offen', '68b27e9e-c32c-415d-9775-ce7273881861');

-- Cron manuell triggern
SELECT public.process_fristen_erinnerungen();
-- Erwartung: {"processed": 1, ...}

-- Verify
SELECT * FROM public.notifications WHERE user_id='68b27e9e-c32c-415d-9775-ce7273881861' AND created_at > now() - interval '1 minute';
```

---

## Phase D — applyPhaseVisibility Audit-Ergebnis

**DOM-Audit ergab:**
- `grep -rn 'data-phase' --include='*.html'` → 0 Treffer in akte.html
- `grep -rn 'data-phase' --include='*.js'` → nur akte-logic.js Z.296 (Timeline-Item-Render, KEINE Sections)
- beratung.html Z.166+ hat `data-phase-step` (anderer Attribut-Name) für Phasen-Indikator-Pills

**Konsequenz:** Spec-Annahme "akte-Sections mit data-phase markiert" stimmt nicht. Echte Progressive-Disclosure-Logik braucht erst DOM-Strukturarbeit in akte.html (welche Sections gehören zu welcher Phase 1-5/9?).

**Pass-Through-Stub aus MEGA77 ist korrekt** — der hide-nothing-Behavior matched die Realität. Verbesserung erst sinnvoll wenn DOM-Markup steht. Defer-Reason: **Architektonisch fehlende Information**, nicht Code-Refactor.

---

## Phase B — admin-ki-aggregations Edge-Function Audit

**Audit `supabase/functions/_shared/admin-auth.ts`:**
- 234 Zeilen, enthält ADMIN_EMAILS-Hardcoded-Array (siehe MEGA75-D Spiegelung)
- Service-Role-Read-Migration zu `users.is_founder` braucht:
  - Service-Role-Client-Setup (vermutlich existiert via supabase.ts)
  - Auth-Flow-Change in Function (`requireAdmin()` o.ä.)
  - **Test-Loop mit Marcels JWT** — ohne Branch + curl-Test nicht safe

**Defer-Grund:** ohne Branch-Setup ist Production-Edit der zentralen Admin-Auth-Logik in Marathon-#5-Session zu riskant. MEGA80 mit Branch-Pre-Test.

---

## Phase C — Server-Side Netlify-Functions Audit

Per `grep -rln 'api\.airtable\.com\|AIRTABLE_PAT' netlify/functions/`:

Aktive Airtable-Callers in netlify/functions: audit-log, dsgvo-auskunft, dsgvo-loeschen, error-log, health, ki-statistik, lib/prova-fachwissen, lib/prova-subscription, mein-aktivitaetsprotokoll, normen, ...

**Defer-Grund:** Per-File-Production-Path-Audit (wird das ENV überhaupt benutzt? Ist die Function noch aufgerufen?) ist Kontext-intensiv. Plus: nach Marcel-ENV-Cleanup (MEGA76-G.1) fallen die Calls auto auf 401 → kein User-Impact. Code-Removal/Migration ist Cleanup, nicht akut.

---

## sw.js CACHE_VERSION

v3241 → **v3242-mega79-edge-functions** (Kurzkommentar gemäß Marcel-Direktive MEGA76-G.5).

---

## Defer-Liste für MEGA80+

| Sprint | Inhalt |
|---|---|
| **MEGA80** | Phase A.4 (Inline-Suggestions-Skip im TipTap-Editor), Phase A.5 (Lernpool-Einwilligungs-Check sobald INSERT-Caller existiert), Phase A.6 (Whisper-Sprach-Param), Phase B (admin-ki Edge-Function via Branch-Test), Phase C (Server-Side Airtable-Cleanup), Phase D wenn DOM-Markup für Phasen-Sections steht |
| **MEGA80** | Mahnwesen-Cron (analog Phase E für überfällige Rechnungen), Termin-Erinnerungen-Cron |
| **MEGA81** | Flow B/C/D Vollausbau, Gerichtsdokumente-Extraktion, Import-Assistent-Mappings |
| Eigener | OpenAI Modell-Upgrade gpt-5.5-Validation |
| **MEGA83** | Founder-Cockpit |
| **MEGA84** | AUTH-PERFEKT 2.0 |
