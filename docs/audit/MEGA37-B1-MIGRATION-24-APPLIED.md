# MEGA³⁷ B1 — Migration 24 APPLIED

**Datum:** 2026-05-08
**Status:** ✅ APPLIED via Supabase MCP (Marcel-Authorization gegeben)
**Migration:** `m37_b1_seed_dokument_templates`

---

## Verifikation in Live-DB

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE pdfmonkey_template_id LIKE 'K-%') AS k_count,
       count(*) FILTER (WHERE pdfmonkey_template_id LIKE 'F-%') AS f_count,
       count(*) FILTER (WHERE is_default_for_typ = TRUE) AS defaults
FROM public.dokument_templates;
```

| total | k_count | f_count | defaults |
|-------|---------|---------|----------|
| 14    | 8       | 6       | 3        |

### Erwartung vs IST
- ✅ Total: 14
- ✅ K-XX (eigene PROVA-Codes): 8 (K-01..K-05 + K-07..K-09)
- ✅ F-XX (PDFMonkey-IDs für Mahnungen + Gutachten): 6 (F-04, F-06, F-07, F-08, F-09, F-10)
- ✅ Defaults: 3 (F-04, F-09, F-10 — `is_default_for_typ = TRUE`)

### Idempotenz-Verify
SQL hat `ON CONFLICT (name) DO NOTHING`. Erneute Anwendung wäre no-op.

---

## Phase B1 abgeschlossen
14 Templates sind live, ready für `lib/dokument-templates-cache.js` (M³⁶ W6.1).

*— M³⁷ B1 — 2026-05-08 — applied via Supabase MCP*
