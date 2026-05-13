# Airtable-Migration-Status (MEGA⁷⁰ Phase 3.3)

**Datum:** 2026-05-13
**Auftrag:** Welche Airtable-Tabellen brauchen noch Migration nach Supabase?

---

## ✅ Erledigt (MEGA⁶⁹-INTEGRATION-PATCH-2)

| Airtable-Tabelle | Supabase-Ziel | Edge Function | Status |
|---|---|---|---|
| `NORMEN` (tblnceVJIW7BjHsPF) | `normen_bibliothek` | `migrate-normen-airtable` | ✅ deployed (Marcel-Trigger pending) |
| `TEXTBAUSTEINE` (tbljPQrdMDsqUzieD) | `textbausteine` is_global=TRUE | `migrate-textbausteine-airtable` | ✅ deployed |
| `TEXTBAUSTEINE_CUSTOM` (tblDS8NQxzceGedJO) | `textbausteine` workspace_id=Marcel | gleiche Edge Fn | ✅ deployed |

---

## ⏳ Offen (Audit MEGA⁷⁰)

### POSITIONEN_DATENBANK
**Aktuell:** Vermutlich noch in Airtable (Standard-Schadenpositionen mit Preis-Ranges).
**Supabase-Ziel:** Existing-Tabelle prüfen, evtl. neue Migration nötig.
**Verwendung:** `kostenermittlung.html` Position-Liste.
**Empfehlung:** Audit per `execute_sql` ob `positionen` oder `positionen_datenbank` in Supabase existiert. Falls nein: Edge Fn analog `migrate-textbausteine-airtable` schreiben.
**Priorität:** 🟡 MITTEL (kostenermittlung wird in Pilot von wenigen SVs genutzt).

### KI_PROMPT_LIBERY
**Aktuell:** Airtable als Master für KI-Prompts (vermutet).
**Supabase-Ziel:** Existing `KI-PROMPTS-MASTER.md` ist Doku, keine DB-Tabelle.
**Verwendung:** ki-proxy Edge Fn nutzt hardcoded Prompts.
**Empfehlung:** Tabelle `ki_prompts` einführen (id, purpose, prompt, modell, aktiv, version) — erlaubt Marcel Prompts ohne Code-Deploy zu ändern. **Eigener Mini-Sprint nach Pilot.**
**Priorität:** 🟢 NIEDRIG (existing hardcoded reicht für Pilot).

### VERSICHERUNGS_PARTNER
**Aktuell:** Airtable als Master für Versicherungs-Verträge + AVV-Kontakte.
**Supabase-Ziel:** Spalte `versicherungs_partner` in audit_trail bereits referenziert (siehe MEGA⁶² Migration), aber separate Tabelle fehlt vermutlich.
**Verwendung:** `avv.html` Sub-Processor-Liste, Workspace-Versicherungs-Anbindung.
**Empfehlung:** Audit Schema. Falls Tabelle fehlt: Migration + Backend `versicherungs-partner-list` Edge Fn.
**Priorität:** 🟡 MITTEL (DSGVO-AVV relevant, vor erstem echten Pilot-SV).

---

## 🔍 Weitere Airtable-Restpfade im Code

```bash
grep -r "appJ7bLlAHZoxENWE" --include="*.html" --include="*.js" | wc -l
```

**Stand 13.05.2026:** ~35 Files mit hardcoded `appJ7bLlAHZoxENWE` (laut AKTUELLE-ABWEICHUNGEN.md Z.303 "Folge-Sprint").

Hauptkandidaten:
- `jahresbericht-logic.js` (Z.58: `/.netlify/functions/airtable`) — bleibt bis K-1.5-Cutover
- `akte-lightbox.js`, `akte-logic.js`, `404.html` — Legacy-Reads
- `abnahmeprotokoll-formal.html` — Standalone-Page

**Cutover-Plan (K-1.5):** Sprint K-1.5 deaktiviert alle Airtable-Reads + entfernt Make.com-Scenarios. Vorher: Pilot fährt Hybrid (Supabase primary, Airtable read-only-Fallback für Legacy-Pages).

---

## Action-Items für Marcel

1. **Sofort:** Klick `/tools/migrate-bibliothek-airtable.html` → 2 Klicks → Normen + Textbausteine in Supabase
2. **Vor Pilot-Start:** Schema-Check via Supabase MCP für `positionen`, `versicherungs_partner` — Migration falls Lücke
3. **Nach Pilot:** `ki_prompts`-Tabelle für KI-Prompt-Management ohne Code-Deploy
4. **K-1.5 Cutover:** Sprint zur kompletten Airtable-Deaktivierung (eigener Marathon)

---

## Status MEGA⁷⁰ Phase 3.3

✅ Doku erstellt
🟡 3 weitere Tabellen identifiziert mit Priorität
⏳ Schema-Audit + Migration: Backlog (Marcel-Entscheidung post-Pilot)
