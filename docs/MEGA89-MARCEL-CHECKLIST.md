# MEGA⁸⁹ — Marcel-Checklist (8-Punkte-Smoke)

**Tag:** `v3950-mega89-pilot-security`

---

## Pre-Apply

1. **5 Migrationen applien** via MCP in Reihenfolge:
   - 67_mega89_workspace_is_writable
   - 68_mega89_rls_writable_lock
   - 69_mega89_cron_lock_expired_trials
   - 70_mega89_record_user_login
   - 71_mega89_suspicious_activity_view

2. **Edge deployen:** `admin-suspend-workspace`

3. **Sofort-Cleanup**: `SELECT public.cron_lock_expired_trials();` → JSON mit `locked_count` zurück, Leon's Workspace landet darin

---

## 8-Punkte-Smoke

| # | Acceptance | Test | OK? |
|---|---|---|---|
| 1 | RLS Hard-Lock | Leon-Login simulieren (`impersonate`) → in DevTools-Console: `await supabase.from('auftraege').insert({...workspace_id: leon_ws})` → **Policy-Violation Error** | ☐ |
| 2 | Read funktioniert weiter | Gleicher Leon-Sim: `await supabase.from('auftraege').select('*').eq('workspace_id', leon_ws)` → liefert Daten | ☐ |
| 3 | Auto-Expiry Cron | `SELECT * FROM cron.job WHERE jobname='lock-expired-trials';` → 1 Eintrag mit schedule `0 2 * * *` | ☐ |
| 4 | Login-Tracking | Marcel-Logout + Login → `SELECT last_login_at FROM users WHERE id=marcel_uid;` → aktuell. `SELECT * FROM user_sessions WHERE user_id=marcel_uid ORDER BY started_at DESC LIMIT 1;` → neue Row | ☐ |
| 5 | Cockpit-2FA-Anzeige | `/admin-kpis.html` → Workspace-Liste zeigt: marcel-mit-2FA: ✓, marcel-ohne-2FA: ⚠, Leon: ⚠ → **1 von 3 mit 2FA** (statt 3 von 3) | ☐ |
| 6 | Suspicious-Activity | Cockpit zeigt Leon in Suspicious-Section mit Level `medium_suspicion` oder `high_suspicion` | ☐ |
| 7 | Sperren-Action | Klick "🔒 Sperren" auf Leon → Confirm-Modal → Reason eingeben → Edge-Call → Leon's abo_status=pausiert + Owner-Ban 30d | ☐ |
| 8 | Funnel-Section | Cockpit zeigt Conversion-Funnel mit 5 Steps + Drop-off-% pro Stufe | ☐ |

---

## Self-Verify SQL-Queries

```sql
-- 1. workspace_is_writable existiert
SELECT proname, prosrc FROM pg_proc WHERE proname='workspace_is_writable';

-- 2. Policies enthalten workspace_is_writable
SELECT tablename, policyname FROM pg_policies
WHERE schemaname='public' AND (qual::text LIKE '%workspace_is_writable%' OR with_check::text LIKE '%workspace_is_writable%')
ORDER BY tablename, policyname;
-- Erwartung: ~30 Treffer

-- 3. Cron-Job aktiv
SELECT * FROM cron.job WHERE jobname='lock-expired-trials';

-- 4. View liefert Daten
SELECT * FROM public.suspicious_activity_v1 ORDER BY suspicion_level DESC;

-- 5. Leon-Status nach cron-Run
SELECT id, name, abo_status, abo_trial_endet_am, kuendigung_grund_kategorie
FROM public.workspaces
WHERE name ILIKE '%leon%' OR name ILIKE '%genius%';
```

---

## Bei Fehler

- **Migration 68 Policy-Conflict**: Existing Policy-Name anders als erwartet → SQL-Audit erforderlich, einzelne DROP/CREATE pro Tabelle
- **pg_cron blockt**: Extension nicht in Schema cron — `CREATE EXTENSION IF NOT EXISTS pg_cron;` manuell ausführen
- **Cron-Job nicht visible**: `SELECT * FROM cron.job;` ist nur für service_role sichtbar
- **Cockpit-2FA-Query schlägt fehl**: Inner-Join filtert Workspaces ohne owner-Membership raus. Wenn Leon kein workspace_memberships hat → unsichtbar. Marcel checkt manuell.
- **Edge admin-suspend-workspace 403**: Marcel-Email nicht in SUPER_ADMINS-Set in Edge — Edge re-deployen mit korrigierter Liste.

---

## Nach grünem Test

1. PR mergen auf main
2. Tag setzen: **`v3950-mega89-pilot-security`**
3. **Pilot ist sicher.** Bei nächstem Trial-Expiry läuft Auto-Lock binnen 24h.
