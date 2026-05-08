# MEGA³⁵ P0 — Schema-Apply Migrations 18-21

**Datum:** 2026-05-07 19:13 GMT+2
**Methode:** Supabase MCP `apply_migration` + `list_tables` + `execute_sql`

## Before

`list_tables` Stand vor Apply: cookie_consents/ical_tokens/onboarding_mails_sent/incidents **NICHT** vorhanden in Live-DB. Migrations 18-21 waren als SQL-Files committed aber nie deployed.

## Apply (4 Migrationen via MCP)

| # | Migration | Status |
|---|---|---|
| 1 | m34_a1_cookie_consents | ✅ success |
| 2 | m34_a4_ical_tokens | ✅ success |
| 3 | m34_b2_onboarding_mails_sent | ✅ success |
| 4 | m34_b3_incidents | ✅ success |

## After (execute_sql Verify)

```sql
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('cookie_consents','ical_tokens','onboarding_mails_sent','incidents')
  AND relnamespace = 'public'::regnamespace;
```

| Tabelle | RLS aktiv |
|---|---|
| cookie_consents | ❌ false |
| ical_tokens | ❌ false |
| onboarding_mails_sent | ❌ false |
| incidents | ❌ false |

## Befund

✅ **Alle 4 Tabellen jetzt live in DB.**
🔴 **Alle 4 ohne RLS** — DSGVO-Risk → wird in C2 Migration 22 geschlossen + applied.

## Nächster Schritt

C1 (foto-upload Lambda) parallel zu C2 (RLS-Migration 22 + Apply).

---

*MEGA³⁵ P0 — Co-Authored-By Claude Opus 4.7*
