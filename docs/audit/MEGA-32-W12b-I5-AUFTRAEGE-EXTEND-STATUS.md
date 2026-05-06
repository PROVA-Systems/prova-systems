# MEGA³² W12b-I5 — Auftraege-Extend Status

**Datum:** 2026-05-11
**Methode:** Schema-Verify via Supabase MCP `execute_sql`

---

## Schema-Verify-Resultat

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='auftraege' AND column_name LIKE 'auftraggeber%';
```

**Resultat:** `[]` (LEER)

→ **Spalten existieren NICHT in Production.**

## Entscheidung: NICHT applizieren (Marcel-Review-Pflicht)

**Begründung:**

1. Migration `2026_05_10_w9_06b_auftraege_extend.sql` ist explizit als **`PLANNED — DO NOT APPLY`** markiert (siehe Migration-Header Zeile 2).
2. Datei trägt Datum aber kein Datum-Prefix — Marcel-Workflow erfordert manuelle Umbenennung nach Review.
3. **Architektur-Alternative funktioniert:** `auftrag_kontakte` (M:N-Tabelle, ✅ existiert) mit `rolle='auftraggeber'` erfüllt den Use-Case.
4. CTO-Decision (Welle 12b Schema-Reconciliation): **kein Schema-Refactor ohne Marcel-OK**.

## Code-Auswirkung

**`auftrag-neu-logic.js` (Wizard) Live-Save:**
- Aktuell auftraggeber-Daten in `auftrag_kontakte` mit `kontakt_rolle='auftraggeber'`
- ODER in `auftraege.details JSONB`
- Beides funktioniert mit existing Schema

## Marcel-Action falls gewünscht

1. Migration `2026_05_10_w9_06b_auftraege_extend.sql` reviewen
2. Falls OK: umbenennen zu `2026_05_11_w12_auftraege_extend.sql`
3. Apply via Supabase MCP oder Dashboard SQL-Editor
4. Lambdas + Frontend können dann auch direkte FK-Joins nutzen (Performance)

**Bis dahin:** kein Code-Change nötig — bestehende M:N-Tabelle reicht.

---

*MEGA³² W12b-I5 — Co-Authored-By Claude Opus 4.7*
