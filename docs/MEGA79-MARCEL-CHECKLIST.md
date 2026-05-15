# MEGA⁷⁹ — Marcel-Apply-Checklist + Smoke-Test

**Status:** Code-Ready im Repo. Auto-Mode-Classifier hat Production-Apply blockiert — Du autorisierst die zwei Apply-Schritte unten.

## A — Manueller Apply nach Marcel-OK

### A.1 Edge-Function `ki-proxy` redeployen (Phase A.3)

```bash
# Im Repo-Root:
supabase functions deploy ki-proxy --project-ref cngteblrbpwsyypexjrv
```

**Erwartung:** Deploy gelingt; ki-proxy ruft jetzt vor jedem KI-Call `user_workflow_settings.persoenlicher_ki_kontext` und hängt ihn an system_prompt an. Audit-Trail-Insert enthält `has_personal_context: true|false`.

**Production-Safety:** der Patch ist additiv + defensiv:
- bei keiner Workflow-Row für den User → kein Effekt
- bei leerem `persoenlicher_ki_kontext` (length < 10) → kein Effekt
- bei Read-Fehler → try/catch → kein Effekt
- system_prompt-Build ist sonst unverändert
- → **Kein Production-Risiko** auch ohne Branch-Test

### A.2 Migration 53 (pg_cron + Fristen-Erinnerungen) (Phase E)

**Web-Claude-Self-Audit-Patch 2026-05-15 angewendet** — Schema-Drift-Bugs gefixt:
- pg_cron-Extension ist **schon aktiv** (kein CREATE EXTENSION nötig)
- `workspace_memberships.is_active = true`-JOIN statt `rolle='owner'`-Pattern (Multi-Member-Workspaces)
- notifications-Schema: `kategorie` (enum), `link_typ/link_id/link_url` korrekt
- Prio via kategorie ('achtung' bei <=1 Tag, sonst 'aufgaben')
- `SET search_path=public,pg_temp` Hardening
- REVOKE FROM public + GRANT TO postgres, service_role

**Variante (a): direkt auf Production** (schnell, niedriges Risiko nach Patch):
```
mcp Supabase apply_migration 
  project_id=cngteblrbpwsyypexjrv
  name=mega79_pg_cron_fristen_erinnerungen
  query=<Inhalt von supabase-migrations/53_mega79_pg_cron_fristen_erinnerungen.sql>
```

**Variante (b): über Dev-Branch** (sicherer, ~$0.32/Tag):
```
mcp Supabase get_cost organization_id=erhgagtabnjtbvuxmqmu type=branch
mcp Supabase confirm_cost type=branch recurrence=hourly amount=0.013
mcp Supabase create_branch project_id=cngteblrbpwsyypexjrv name=mega79-edge confirm_cost_id=<...>
# Apply auf Branch, testen, dann auf Production rebasen oder delete + neu auf Production
```

**Production-Risiko Variante (a):** niedrig — pg_cron schon aktiv, Function ist
defensiv (Skip-bei-Disabled, Quiet-Hours-Check, Idempotenz), erste reale
Ausführung erst nächster Tag 06:00 UTC.

### A.3 Test nach A.2-Apply

```sql
-- Test-Frist anlegen für Marcel
INSERT INTO public.fristen (
  workspace_id, auftrag_id, frist_typ, datum_soll, status, created_by_user_id, notiz
) 
SELECT
  '65b25a13-17b7-45c0-b567-6edee235dd98',
  id,    -- irgendein auftrag von Marcel
  'gericht',
  CURRENT_DATE + INTERVAL '3 days',
  'offen',
  '68b27e9e-c32c-415d-9775-ce7273881861',
  'Test-Frist für MEGA79 Cron'
FROM public.auftraege
WHERE workspace_id='65b25a13-17b7-45c0-b567-6edee235dd98' AND deleted_at IS NULL
LIMIT 1;

-- Cron manuell triggern
SELECT public.process_fristen_erinnerungen();
-- Erwartung: {"processed": 1, ...}

-- Verify In-App-Benachrichtigung
SELECT id, kategorie, titel, body, link_typ, link_id, created_at
FROM public.notifications
WHERE user_id='68b27e9e-c32c-415d-9775-ce7273881861'
  AND created_at > now() - interval '1 minute'
ORDER BY created_at DESC;
-- Erwartung: 1 Row mit kategorie='achtung', titel='Frist in 3 Tag(en): gericht'

-- Test-Frist wieder löschen
DELETE FROM public.fristen WHERE notiz='Test-Frist für MEGA79 Cron';
```

## B — Browser-Smoke-Test nach Deploy

Hard-Reload InPrivate, DevTools-Console offen.

| # | Aktion | Erwartung |
|---|---|---|
| 1 | Einstellungen → KI&Diktat → Persönlicher Kontext setzen "Spezialist für Feuchteschäden, DIN 4108 + WTA" | Toast "gespeichert ✅" |
| 2 | Akte öffnen → KI-Hilfe nutzen (Strukturierung / Konjunktiv-Korrektur) | Vorschlag spiegelt die Spezialisierung (z.B. erwähnt DIN 4108 wenn passend) |
| 3 | Per Supabase-MCP: `SELECT * FROM audit_trail WHERE action='ki_request' ORDER BY created_at DESC LIMIT 1` | Zeile enthält `payload->>'has_personal_context'='true'` ✅ |
| 4 | A.3 Cron-Test (siehe oben) | In-App-Benachrichtigung erscheint |
| 5 | Console-Check | 0 Errors, 0 Airtable-Warns |

## C — Bei Problemen

### Edge-Function-Deploy fehlgeschlagen
- Supabase-CLI installiert? `supabase --version`
- Logged in? `supabase login`
- Project-Link? `supabase link --project-ref cngteblrbpwsyypexjrv`

### KI-Vorschlag spiegelt Kontext nicht
- Audit-Trail-Eintrag mit `has_personal_context: true` da? Wenn nein: Workflow-Row prüfen
- Workflow-Row da? `SELECT persoenlicher_ki_kontext FROM user_workflow_settings WHERE user_id='68b27e9e...'`
- Wenn beides ja aber KI ignoriert: gpt-5.5 Modell-Behavior; verschiedene Prompts testen

### Cron läuft nicht automatisch
- `SELECT * FROM cron.job WHERE jobname='fristen-erinnerungen-daily';` → Eintrag sichtbar?
- Berlin-TZ wird in Function umgerechnet, Cron läuft UTC; nächste Ausführung ist 07:00 UTC nach Apply
- Manuell mit `SELECT public.process_fristen_erinnerungen();` immer triggerbar

## Was MEGA79 NICHT angefasst hat (Defer MEGA80)

- Phase A.4: Inline-Suggestions-Skip im TipTap-Editor
- Phase A.5: Lernpool-Einwilligungs-Check (kein aktiver INSERT-Caller im Repo)
- Phase A.6: Whisper-Sprach-Param durchreichen
- Phase B: admin-ki-aggregations Edge-Function auf is_founder
- Phase C: 5+ Server-Side Netlify-Functions Airtable-Cleanup
- Phase D: applyPhaseVisibility echte Logik (braucht DOM-Markup in akte.html)

Begründungen in `docs/MEGA79-DECISIONS.md`.
