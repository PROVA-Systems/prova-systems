# MEGA⁸⁴/⁸⁵ Pass 2c DECISIONS — Audit-Konsolidierung + Bibliothek + Sprint-Final

**Stand:** 2026-05-17 · Branch: `feat/mega84-85-pass2c-audit-bibliothek`
**Pass 2c:** ~2h Code · 1 Commit · Block G + H + I (Sprint-Final)

---

## Pre-Read ✅

- `docs/MEGA84-85-PASS2A-DECISIONS.md` (additive Strategy als Pattern)
- `docs/MEGA84-85-PASS2B-DECISIONS.md` (PDF-Compliance, Trial, Global-Search-v2-Foundation)
- 5 alte Audit-Edges + `_shared/audit.ts`
- `audit_trail`-Schema (integrity_hash + prev_hash bereits vorhanden)
- `audit_action`-ENUM (18 Werte)
- `bibliothek.html` (existing 540 Z, Normen+Textbausteine bereits funktional)
- `user_vorlagen` + `dokument_typ`-ENUM (13 Bescheinigungs-Varianten)

---

## Block G — Audit-Edges Konsolidierung ✅

### G.1 — `supabase/functions/audit-log-v1/index.ts` ✅ NEU
- `task`-Router mit 6 Typen: `ki_request | login | gdpr_export | gdpr_delete | admin_action | generic`
- `resolveAction()` mappt task → `audit_action`-ENUM-Wert (mit Override via `action` im Body)
- `defaultKategorie()`: KI / AUTH / DSGVO / ADMIN
- **admin_action**: `reason` (min 5 chars) Pflicht — wird in `payload.admin_reason` persistiert
- Rate-Limit 200/min/user (vs 100 bei `audit-write` — Konsolidierungs-Aufschlag)
- Nutzt existing `_shared/cors.ts` + `_shared/auth.ts` + `_shared/supabase.ts`

### G.2 — Integrity-Hash-Kette ✅
- `prev_hash` = `integrity_hash` des letzten audit_trail-Eintrags pro `workspace_id`
- `integrity_hash` = `sha256(prev_hash || canonicalJson({workspace_id, user_id, action, entity_typ, entity_id, payload, source, task}))`
- `canonicalJson()` sortiert Keys → stabile Hashes über Re-Serialisierung
- Tampering wird sichtbar: ein nachträglich geänderter Eintrag bricht die Kette für alle nachfolgenden — reine Append-Only-Erkennung, kein Backup-Replacement

### G.3 — Deprecation-Doku ✅
`docs/MEGA84-AUDIT-EDGES-DEPRECATED.md`:
- Caller-Inventory (5 alte Writer + 3 nicht-Writer wie audit-narrative-v1/admin-audit-trail/admin-pseudonymisierung-audit)
- Migrations-Snippet "vorher/nachher" für Frontend-Calls
- 3-Phasen-Deprecation-Policy (A: jetzt parallel · B: Header-Warning · C: Delete nach 0 Calls/Woche)
- Deploy-Snippet (MCP `deploy_edge_function`)
- Verify-SQL für Hash-Kette

### G.4 — Was wir NICHT angefasst haben
- 5 alte Edges bleiben unverändert funktional (additive Strategy)
- `_shared/audit.ts` `logAuditEvent()` bleibt — wird von `audit-write` weiter genutzt
- Keine Frontend-Caller migriert — das passiert organisch bei nächstem Touch

---

## Block H — Bibliothek-Funktion ✅

### H.1 — Tabs ausgebaut: 2 → 5 ✅
| Tab | Quelle | Modus |
|---|---|---|
| 📐 Normen | `normen_bibliothek` | Existing — unverändert |
| 📝 Textbausteine | `textbausteine` (inkl. global) | Existing — unverändert |
| 📨 Brief-Vorlagen | `user_vorlagen` (per-user via RLS) | **NEU** |
| 📋 Bescheinigungen | 12 Static-Templates aus `dokument_typ`-ENUM | **NEU** |
| 🔎 360°-Suche | `global_search_v2` RPC (Pass 2b) | **NEU** |

### H.2 — Brief-Vorlagen
- Liest aus `user_vorlagen` (id, name, source_filename, variables, is_active)
- Karten zeigen Name + Quell-Datei + Variablen-Count
- Detail-Modal verlinkt nach `/briefe.html?vorlage_id=...` zum Brief-Editor

### H.3 — Bescheinigungen
- 12 Hardcoded-Templates aus `dokument_typ`-ENUM (`BESCHEINIGUNGS_TEMPLATES`-Array)
- Kategorien: Identität / Termin / Auftrag / Zustand / Beweissicherung / Schaden / Statik / VOB
- Detail-Modal leitet weiter zu `/bescheinigungen.html?typ=<dokument_typ>` (Generator)
- "+ Neu"-Button für diesen Tab ausgeblendet (Marcel kann keine eigenen ENUM-Werte anlegen)

### H.4 — 360°-Suche
- Search-Input ruft `runSuche360()` mit Debouncing 240ms
- `supabase.rpc('global_search_v2', {p_workspace_id, p_query, p_limit:50})`
- Source-Icons pro Treffer: 📂 auftrag · 📄 dokument · 👥 kontakt · 📝 textbaustein · 📐 norm
- Klick auf Card → `window.location.href = row.href`
- Bei Migration-59-fehlt: User-friendly Fehlermeldung mit Pass-2b-Checklist-Hinweis

### H.5 — Context-aware-Insert via URL-Param ✅
- `parseContextFromUrl()` liest `?aktion=insert&auftrag_id=...`
- `_hydrateContextAz()` lädt AZ aus `auftraege`-Tabelle für Banner-Anzeige
- Banner oben: "Einfügen-Modus: Treffer-CTAs übernehmen den Eintrag direkt in Akte XY-2024-001" + Abbrechen-Button
- CTA-Labels ändern sich kontextabhängig: "✏ In Editor verwenden" → "📂 In Akte XY-2024-001 einfügen"
- `insertInEditor()` mit Context: schreibt `prova_bibliothek_pending_insert` (mit auftragId) in localStorage + navigiert zu `/akte.html?id=...&bib_insert=1`
- Akte-Page (existing) liest `prova_bibliothek_pending_insert` beim Mount und fügt ein

### H.6 — Was wir NICHT geändert
- Bestehende Tabs (Normen, Textbausteine) — unverändert (additive Strategy)
- Detail-Modal-Layout — keine Umstellung auf Side-Pane, weil Modal-Pattern in akte.html etabliert
- Power-Tools-Tab — nicht erweitert (separate Page)

---

## Block I — Sprint-Final ✅

### I.1 — Service-Worker
- `prova-v3550-mega84-85-pass2b-compliance-search` → `prova-v3600-mega84-85-complete`
- 3-Satz-Kommentar mit G+H+I-Zusammenfassung

### I.2 — Doku
- `docs/SW-VERSION-HISTORY.md`: neuer Eintrag "Pass 2c Sprint-Final" über Pass 2b
- `docs/MEGA84-85-PASS2C-DECISIONS.md` (dieses File)
- `docs/MEGA84-85-PASS2C-MARCEL-CHECKLIST.md`

### I.3 — CLAUDE.md
- Compounding Lesson nachgetragen: "Integrity-Hash-Kette pattern bewährt — sha256(prev||canonicalJson(payload))"

---

## Files in Pass 2c

| File | Status |
|---|---|
| `supabase/functions/audit-log-v1/index.ts` | **NEU** (~190 Z) |
| `docs/MEGA84-AUDIT-EDGES-DEPRECATED.md` | **NEU** |
| `bibliothek.html` | erweitert (~190 Z additiv) |
| `sw.js` | v3550 → v3600 |
| `docs/SW-VERSION-HISTORY.md` | erweitert |
| `docs/MEGA84-85-PASS2C-DECISIONS.md` | **NEU** (dieses File) |
| `docs/MEGA84-85-PASS2C-MARCEL-CHECKLIST.md` | **NEU** |
| `CLAUDE.md` | erweitert (Compounding Lesson) |

---

## Sprint-Bilanz MEGA⁸⁴/⁸⁵ (Pass 1 + 2a + 2b + 2c)

| Pass | Blöcke | Wesentliche Lieferung |
|---|---|---|
| Pass 1 | 0+A | Vor-Ort-Foundation: Pin-Mode + Vision-Captions + Diktat-Mapping + Bridge-Sweep |
| Pass 2a | A.5+B+C | Vor-Ort-Tabs (Skizze/Foto/Diktat Mobile) + Founder-Cockpit admin-kpis + KI-Disclosure-Audit |
| Pass 2b | D+E+F | PDF-Compliance LG-Disclosure + Trial-Guard/Coupons + Global-Search 360° |
| Pass 2c | G+H+I | Audit-Konsolidierung + Bibliothek-Funktion + Sprint-Final |

**Tag-Empfehlung:** `v3600-mega84-85-complete`

---

## Marcel-Apply-Pfad

1. `audit-log-v1` deployen via MCP (siehe MARCEL-CHECKLIST.md)
2. Smoke-Test mit curl/Postman: Hash-Kette prüfen
3. Bibliothek-Page öffnen + 3 neue Tabs durchklicken
4. `?aktion=insert&auftrag_id=<uuid>` testen
5. Branch mergen + Tag setzen `v3600-mega84-85-complete`
