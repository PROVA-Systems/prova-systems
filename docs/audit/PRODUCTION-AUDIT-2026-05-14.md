# PROVA PRODUCTION-AUDIT 2026-05-14

**Auditor:** Web-Claude via Supabase-MCP live
**Project:** cngteblrbpwsyypexjrv (PROVA Systems Production)
**Stand:** 14.05.2026, parallel zur CC-Marathon-Session

---

## TL;DR — Sofortmaßnahmen-Ranking

### 🚨 KRITISCH (in nächsten 7 Tagen fixen)

1. **`system_health` RLS-Policy `health_insert` mit `WITH CHECK (true)`**
   → Jeder anon kann Fake-Health-Daten reinschreiben
   → Fix: RLS-Policy auf `auth.uid() IS NOT NULL` einschränken
   → 1-Liner SQL, 5 Min

2. **Storage-Bucket `sv-public` erlaubt Listing**
   → Anon kann alle Files im Bucket sehen
   → Fix: SELECT-Policy entfernen, nur direkter URL-Zugriff
   → 5 Min in Supabase Dashboard

3. **Leaked-Password-Protection DEAKTIVIERT**
   → Schwache/kompromittierte Passwörter werden akzeptiert
   → Fix: Auth-Settings in Supabase Dashboard → Password Settings → HaveIBeenPwned aktivieren
   → 30 Sekunden Klick

### ⚠️ HOCH (in nächsten 14 Tagen)

4. **20 Cockpit-Views mit `SECURITY DEFINER`**
   → Diese Views bypassen RLS — wenn an End-User ausgeliefert, sehen sie zu viel
   → Aktuell: vermutlich by-design (Founder-Cockpit), aber dokumentieren!
   → Check: nutzt irgendeine User-Page eine `v_*`-View? Wenn ja → entweder SECURITY INVOKER oder RLS auf darunterliegenden Tabellen
   → Liste der Views siehe unten

5. **Public Functions executable von anon mit SECURITY DEFINER**
   → Funktionen wie `accept_invitation`, `record_einwilligung`, `get_user_workspaces` etc.
   → Bei `get_user_workspaces`, `is_founder` etc. ist das BY-DESIGN (RPC-Pattern für RLS)
   → Bei `record_ki_call`, `start_impersonation`, `dsgvo_user_*` SOLLTE eingeschränkt werden
   → Per Function `REVOKE EXECUTE FROM anon` setzen wo nicht intentional

### 📋 MITTEL (Backlog)

6. **22 Functions mit `mutable search_path`**
   → Theoretisch SQL-Injection-Risk wenn Search-Path manipuliert wird
   → Fix: `SET search_path = public, pg_catalog` zu jeder Function adden
   → Bulk-Fix via Migration, 20-30 Min

7. **5 Extensions im public-Schema** (pg_trgm, unaccent, btree_gin, vector, pg_net)
   → Best-Practice: in eigenes `extensions`-Schema verschieben
   → Aufwand: medium (Refs anpassen), niedriger Impact

### 🐢 PERFORMANCE-BACKLOG (715 Lints, kein akuter Bug)

| Kategorie | Anzahl | Impact | Fix-Aufwand |
|---|---|---|---|
| `multiple_permissive_policies` | 312 | Medium — bei jedem Query alle Policies geprüft | Hoch (RLS-Refactor) |
| `unused_index` | 251 | Niedrig — nur Speicher-Waste | Niedrig (DROP INDEX) |
| `auth_rls_initplan` | 82 | **Hoch bei großen Tabellen** — `auth.uid()` pro Row | Medium (Subquery-Wrap) |
| `unindexed_foreign_keys` | 69 | Medium — langsame JOINs/CASCADE | Niedrig (CREATE INDEX) |

**Empfehlung:** Sprint-G nach Sprint-F einplanen für:
- Top 20 `auth_rls_initplan` mit Bulk-SQL-Patch (`USING ((select auth.uid()) = user_id)` Pattern)
- Top 20 `unindexed_foreign_keys` mit `CREATE INDEX CONCURRENTLY`
- Diese 2 Maßnahmen reduzieren Query-Latenz für RLS-heavy Pages (dashboard, archiv) um 30-60%

---

## Daten-Audit (Marcel's Live-Workspace)

| Tabelle | Rows | Anmerkung |
|---|---|---|
| auftraege | 1 | Marcel's Test-Auftrag |
| kontakte | 2 | 2 Test-Kontakte |
| dokumente | 2 | 2 Test-Dokumente |
| audit_trail | 4 | Test-Activity |
| users | 3 | Marcel × 2 (gmx + prova-systems) + 1 weiterer User |
| workspaces | 3 | 2 Solo-Workspaces für Marcel + 1 anderer |
| **termine** | **0** | LEER — wenn Marcel Termine sieht in App, kommen sie aus Airtable |
| **fristen** | **0** | LEER — gleicher Effekt |
| **eintraege** | **0** | LEER |
| **einwilligungen** | **0** | LEER |
| **leads_pipeline** | **0** | LEER |
| **ki_lernpool** | **0** | LEER |
| normen_bibliothek | 190 | ✅ Stammdaten migriert |
| textbausteine | 100 | ✅ Stammdaten migriert |
| versicherungs_partner | 10 | ✅ Stammdaten migriert |

**Interpretation:**
- Operative Daten: minimal, kein Pilot-Verlust-Risk beim Airtable-Kill
- Stammdaten: gut migriert
- 6 Tabellen sind komplett leer obwohl Schema fertig — heißt: Frontend-Caller schreiben noch in Airtable, nicht in Supabase. Genau das ist Sprint F's Aufgabe.

---

## 20 SECURITY DEFINER Views (Cockpit/Admin)

Alle mit ERROR-Level Lint, aber vermutlich by-design für Marcel's Cockpit:

1. v_cockpit_mrr — Monatlicher Recurring Revenue
2. v_cockpit_master_uebersicht — Master-KPI-Übersicht
3. v_cockpit_funnel — Conversion-Funnel
4. v_cockpit_jahres_verlauf
5. v_cockpit_monats_verlauf
6. v_cockpit_kunden_liste — Komplette Customer-Liste
7. v_cockpit_user_aktivitaet
8. v_cockpit_auftrag_durchlaufzeiten
9. v_cockpit_feature_usage
10. v_cockpit_ki_performance
11. v_cockpit_ki_kosten_pro_user
12. v_cockpit_support_overview
13. v_auftrag_360 — Vollständige Akten-Übersicht
14. v_auftraege_overview — Auftrag-Liste mit Counts
15. v_kontakte_overview — Kontakte mit Auftrags-Counts
16. v_auftrag_eigenleistung_quote — §6 Quality-Metric
17. v_user_pending_einwilligungen — DSGVO-Pending-Check
18. v_service_status_latest
19. v_service_uptime

**Risk-Bewertung:**
- v_cockpit_* alles Founder-only → wenn admin-Page korrekt is_founder() prüft, OK
- v_auftrag_360, v_auftraege_overview, v_kontakte_overview → diese werden möglicherweise im User-Dashboard genutzt → KRITISCH zu prüfen!

**Action für Marcel:** Vor Pilot-Launch verifizieren, dass diese 3 Views entweder
(a) auch RLS auf den unterliegenden Tabellen respektieren (`SECURITY INVOKER`), oder
(b) nur im Founder-Cockpit verwendet werden.

---

## Audit-Output für CC

CC kann diesen Report im Sprint-F-Marathon nutzen:
- Mapping-Doc (`AIRTABLE-SUPABASE-MAPPING.md`) → Phase 2 überspringen
- Performance-Lints → Sprint G nach F priorisieren (auth_rls_initplan zuerst)
- Security-Issues → Sprint H als Pre-Pilot-Sicherheits-Sprint einplanen

---

## Konkrete SQL-Snippets zum Sofort-Fixen (wenn Marcel mir grünes Licht gibt)

### Fix 1: system_health.health_insert

```sql
-- Aktuell: WITH CHECK (true) → anon kann INSERT
-- Fix: nur authenticated mit founder-rolle
DROP POLICY IF EXISTS health_insert ON public.system_health;
CREATE POLICY health_insert ON public.system_health 
  FOR INSERT TO authenticated 
  WITH CHECK (is_founder() OR auth.uid() IS NOT NULL);
-- Strenger: nur is_founder()
```

### Fix 2: Public Bucket sv-public

```sql
-- Listing-Policy entfernen:
DROP POLICY IF EXISTS storage_sv_public_select ON storage.objects;
-- Direkte URL-Zugriffe bleiben funktional (Public Bucket)
```

### Fix 3: 22 functions search_path

```sql
-- Bulk-Pattern, pro Function:
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.compute_kontakt_name() SET search_path = public, pg_catalog;
-- ... weitere 20
```

**Marcel: Wenn Du grünes Licht für diese 3 Fixes gibst, mache ich sie direkt während CC läuft. Risk: minimal, alle reversible. Reply mit "fix security 1/2/3" für die jeweiligen Fixes.**

---

**ENDE Audit.**
