# MEGA⁷⁰-NINJA-DIFF — Ehrliche Bestandsaufnahme vs. 360-Audit v2

**Datum:** 2026-05-14 (Phase A vor MEGA⁷⁰-COMPLETE-VISION-Marathon)
**Auftrag:** Marcel-Direktive — vor Bau-Start ehrlich auditieren.
**Methode:** Schema-Check via Supabase MCP + Code-Inspektion lib/ + supabase/functions/ + stellungnahme.html
**Auditor-Self-Check:** Ich habe nach Context-Komprimierung evtl. Details der MEGA⁶²-⁶⁹-Sprints verloren. Dieser Diff ist die Verifikation gegen den realen Code-Stand.

---

## 🎯 Hauptbefund: Audit v2 war zu pessimistisch

Audit v2 markierte etliche Items als "0%" oder "30%". **Realität (via MCP + Glob verifiziert):** ~65-85% der Vision ist bereits gebaut in MEGA⁶²-⁶⁹.

**Tatsächlicher MEGA⁷⁰-Scope:** statt 47h → realistisch **15-22h** Restarbeit.

---

## 📊 GAP-für-GAP Korrektur (Audit v2 → Realität)

### GAP 1 — HERZSTÜCK 3-Ebenen-Architektur

**Audit v2 Score:** ~30%
**Realer Score:** **85%** ✅

**Verifikation via Supabase MCP:**
- ✅ `befund_fragmente` Tabelle existiert mit ALLEN NinjaAI-TEIL-B-Thema3-Feldern:
  ```
  id, auftrag_id, workspace_id, quelle_typ, quelle_asset_id, quelle_startzeit_ms,
  quelle_koordinaten, text, tags[], raumbezug, gutachten_teil, beweisfrage_bezug[],
  reihenfolge, embedding (vector), status, zusammengelegt_in, ki_generiert,
  ki_protokoll_id, created_at, updated_at, created_by, deleted_at
  ```
- ✅ `asset-to-fragments-v1` Edge Function deployed
- ✅ `fragments-to-befund-v1` Edge Function deployed
- ✅ embeddings auf befund_fragmente + normen_bibliothek + ki_lernpool

**Echte Lücke:** `fragmente.html` Page (Fragment-Bühne UI) — **fehlt**.

**Restarbeit:** Item B.3 (Fragment-Bühne UI) ~2-3h. Items B.1+B.2 (Schema + Edge Fns) sind DONE.

### GAP 2 — TipTap-Editor für §6

**Audit v2 Score:** 0%
**Realer Score:** **80%** ✅

**Verifikation in `stellungnahme.html`:**
- ✅ Line 742: `<script src="/lib/editor-tiptap-bundle.js">`
- ✅ Line 659: `window.ProvaEditor.create(...)` — Wrapper-Klasse aktiv
- ✅ Editor lädt via `?editor=mega69` Flag (default)

**Custom Nodes/Marks aus NinjaAI-ANHANG-09 (alle 8 vorhanden in lib/extensions/):**
| NinjaAI-Spec | Datei | Status |
|---|---|---|
| prova-callout | `prova-callout.js` | ✅ |
| prova-textbaustein-block | `prova-textbaustein-block.js` | ✅ |
| prova-foto-embed | `prova-foto-embed.js` | ✅ |
| prova-skizze-embed | `prova-skizze-embed.js` | ✅ (MEGA⁶⁹-FINAL-2 erweitert) |
| prova-fragment-marker | `prova-fragment-marker.js` | ✅ |
| prova-ki-suggestion | `prova-ki-suggestion.js` | ✅ |
| prova-norm-citation | `prova-norm-citation.js` | ✅ |
| prova-wikilink (bonus) | `prova-wikilink.js` | ✅ |

**3 Invocation-Patterns:**
- ✅ `lib/prova-slash-menu.js` (12+ Items)
- ✅ `lib/prova-bubble-menu.js` (Selection-Toolbar)
- ✅ `lib/prova-floating-menu.js`
- ✅ `lib/prova-cheat-sheet.js` (`?` Overlay)

**Bundle:** `lib/editor-tiptap-bundle.js` ~134 KB gzipped (MEGA⁶⁴ npm install + esbuild)

**Echte Lücken:** Kontext-Sidebar mit "Verknüpfte Belege/Literatur/Ähnliche Fälle/KI-Warnungen/Strukturübersicht" (NinjaAI-TEIL-C C.5) — **partial via prova-fragment-sidebar**, andere Slots fehlen.

**Restarbeit:** Kontext-Sidebar-Polish ~1-2h. Editor-Core ist DONE.

### GAP 3 — Two-View Audit-Trail

**Audit v2 Score:** 50%
**Realer Score:** **80%** ✅

**Verifikation:**
- ✅ `audit_trail.integrity_hash` (Hash-Chain) existiert
- ✅ `ki_protokoll.wirkung` Spalte existiert
- ✅ `supabase/functions/audit-narrative-v1` deployed
- ✅ `lib/prova-audit-trail-view.js` Two-Tab Modal (Human + Tech)

**Echte Lücke:** Tab "Historie" als **Inline** in `akte.html` 12-Tab-Bar — aktuell als **Modal** verfügbar (`prova-akte-tabs.js` mountAudit), nicht als embedded Tab-Content. MEGA⁶⁹-FINAL-3 Item 8.10 hat History-API Deep-Link gemacht, aber Inline-Mount war Self-Scoping-Defer ("libs UN-anfassbar").

**Restarbeit:** Modal→Inline-Mount für 3 Tabs ~2h. Sonst alles da.

### GAP 4 — Pattern-Matrix Pilot-Blocker

**Audit v2 Score:** ~30% (1/5 gefixt)
**Realer Score:** **20%** (Audit-v2-Wert OK, knapp pessimistischer)

**Status der 5 Pilot-Blocker:**
| Page | Status | Plan |
|---|---|---|
| kontakt-detail.html (9 Tabs) | ❌ offen | Activity-Stream + Filter-Chips + Smart-Sidebar — **echte Restarbeit ~2h** |
| stellungnahme.html (contenteditable) | ✅ TipTap aktiv seit MEGA⁶⁴ | DONE |
| freigabe.html (Form) | ❌ offen | Pre-Send-Checkliste + Compliance-Card — **~1h** |
| kostenermittlung.html (Form) | ❌ offen | Inline-Edit + Live-Total — **~1h** |
| app-wizard-innen | ✅ Single-Page-Redesign (Patch-1) | DONE |

**Restarbeit:** 3 von 5 echt offen ~4h.

### GAP 5 — 6 Universal-Module

**Audit v2 Score:** ~15%
**Realer Score:** **40%** ✅

**Echte Verteilung:**
| Modul | Status |
|---|---|
| prova-detail-sidebar | ❌ fehlt |
| prova-inline-edit | ❌ fehlt |
| prova-bubble-menu | ✅ existiert (MEGA⁶⁴) |
| prova-density-toggle | ❌ fehlt |
| prova-filter-chips | ❌ fehlt |
| prova-a11y-contrast.css | ❌ fehlt |

Plus: viele weitere Module aus 45 prova-*-Libs sind universell nutzbar (fragment-sidebar, asset-event-bus, foto-picker, etc.).

**Restarbeit:** 5 neue Module ~2-3h (Marcel-Pragmatik: 3 Must-Haves zuerst — detail-sidebar, inline-edit, filter-chips).

### GAP 6 — Cmd+K Linear-Niveau

**Audit v2 Score:** ~40%
**Realer Score:** **75%** ✅

**Verifikation in lib/:**
- ✅ `prova-command-palette.js` — Modal-Logic
- ✅ `prova-commands-registry.js` — 40+ Commands in 5+ Kategorien (page.*, new.*, sys.*)
- ✅ `prova-cheat-sheet.js` — `?` Overlay
- ✅ `prova-global-search.js` — Cmd+P Cross-Entity (separater Modus)
- ✅ `prova-audit-search.js` — Cmd+Shift+A inkl. ki_lernpool-Wissenspool (MEGA⁶⁹-FINAL-3 8.4)
- ✅ `prova-platform.js` — ⌘/Ctrl-Awareness

**Echte Lücke:** Multi-Tab-Modes (Suche / Neu / Zuletzt / Navigation / KI-Aktion) konsolidiert in 1 Palette mit Tab-Switcher. Aktuell 3 separate Modals (Cmd+K / Cmd+P / Cmd+Shift+A).

**Restarbeit:** Multi-Mode-Konsolidierung ~1-2h (oder defer: Marcel kann mit 3 separaten Shortcuts leben).

### GAP 7 — Mobile-Excellence

**Audit v2 Score:** ~50%
**Realer Score:** **60%** 

**Verifikation:**
- ✅ Mobile-CSS: `mobile.css` + `lib/mobile-polish.css` + `lib/prova-mobile.css`
- ✅ PWA Manifest existiert (siehe akte.html Z.5: `<link rel="manifest">`)
- ✅ Skizze-Editor Touch + Pencil-Support (MEGA⁶⁹-FINAL-2)
- ✅ Diktat-Mode-Bug-Fix (MEGA⁶⁹-FINAL-1 + INTEGRATION-Hotfix)
- ❌ Systematische Mobile-Bottom-Nav (nur stellenweise via einzelne Pages)
- ❌ iOS Safari Diktat-Test (Marcel manuell)
- ❌ Aktiver-Fall-Anker in Sidebar oben

**Restarbeit:** Bottom-Nav-Lib + Aktiver-Fall-Anker ~1.5h.

### GAP 8 — 360-Grad-Verknüpfungen

**Audit v2 Score:** ~60%
**Realer Score:** **75%** ✅

**Verifikation:**
- ✅ M:N `auftrag_kontakte`
- ✅ akte.html 12-Tab-Bar (MEGA⁶⁹-FINAL-1 D.5)
- ✅ `lib/prova-kontakt-360.js` Modal mit 4 Tabs (MEGA⁶⁸-FINAL-2)
- ✅ `lib/prova-wikilink-source.js` (5 Target-Typen)
- ❌ kontakt-detail.html ist noch 9-Tab-Page (siehe GAP 4)
- ❌ Aktiver-Fall-Anker oben in Sidebar fehlt
- ❌ Rechnung-/Brief-/Termin-Detail Quick-Links zu Auftrag

**Restarbeit:** Aktiver-Fall-Anker + 3 Reverse-Links ~1.5h.

### GAP 9 — Airtable-Migration

**Status:** Edge Fns deployed (MEGA⁶⁹-INTEGRATION-PATCH-2 A.1+A.2), aber Marcel hat NICHT getriggert.

**DB-Stand JETZT (verifiziert):** 0 Normen, 0 Bausteine, 0 Fragmente, 1 Auftrag, 4 Audit-Einträge.

**Restarbeit:** Marcel klickt `/tools/migrate-bibliothek-airtable.html` ~5 Min. Plus weitere Tabellen-Audit (POSITIONEN_DATENBANK, KI_PROMPT_LIBERY, VERSICHERUNGS_PARTNER) ~30 Min.

### GAP 10 — KI-Funktions-Garantie 5-Tests

**Audit v2 Score:** ~30%
**Realer Score:** **35%**

**Verifikation:**
- ✅ `tools/test-ki-garantie.html` Smoke-Tests Page (MEGA⁶⁹-FINAL-3 8.5)
- ❌ `tests/ki-functions-garantie/` Folder fehlt
- ❌ Formale 5×N Tests pro KI-Funktion fehlen

**Restarbeit:** Test-Folder + 7 Test-Files ~2-3h.

---

## 🎯 REVIDIERTER MEGA⁷⁰-SCOPE

**Audit v2:** 12 Phasen × 47h
**Realität:** ~8 Phasen × **15-22h**

### Wirklich offene Items (Realität nach Audit-Korrektur)

| Phase | Item | Realer Aufwand |
|---|---|---|
| **B** | Fragment-Bühne `fragmente.html` (3-Ebenen Pipeline-UI) | 3h |
| **D** | Tab "Historie" Inline-Mount in akte.html (statt Modal) | 2h |
| **F** | 3 Pilot-Blocker (kontakt-detail / freigabe / kostenermittlung) | 4h |
| **G** | 5 fehlende Universal-Module (detail-sidebar/inline-edit/density-toggle/filter-chips/a11y) | 3h |
| **H** | Mobile-Bottom-Nav + iOS-Safari-Audit | 2h |
| **I** | Aktiver-Fall-Anker + 3 Reverse-Links | 1.5h |
| **J** | KI-Funktions-Garantie 5×N Tests (formal) | 2h |
| **K** | Marcel-Migration + 3 Airtable-Tabellen-Audit | 1h |
| **L** | Sprint-Doku + Konsistenz-Polish | 1h |
| ~~A~~ | ~~Audit~~ ✅ DONE (dieses Dokument) | — |
| ~~B.1/B.2~~ | ~~Schema + Edge Fns~~ ✅ DONE | — |
| ~~C~~ | ~~TipTap-Editor~~ ✅ 80% DONE (Kontext-Sidebar-Polish 1h) | 1h |
| ~~E~~ | ~~Cmd+K~~ ✅ 75% DONE (Multi-Mode-Konsolidierung optional) | 1h |

**Total ehrliche Restarbeit:** **~21h** (statt 47h)

### Pilot-Critical-Minimum (Day 1, ~10h)
1. **Fragment-Bühne** B.3 (3h) — letzte Lücke des HERZSTÜCK-Vision
2. **3 Pilot-Blocker** F.1-F.3 (4h) — kontakt-detail + freigabe + kostenermittlung
3. **Aktiver-Fall-Anker** I.1 (1h)
4. **Marcel-Migration** K.1 (15 Min)
5. **Mobile-Bottom-Nav** H.1 (1.5h)

**Day 2 (~7h):** Universal-Module + Inline-Tabs + Mobile-Audit + KI-Tests
**Day 3 (~4h):** Polish + Doku

---

## 💡 EMPFEHLUNG AN MARCEL

**Variante A: Pragmatic-Pilot-Sprint** (~10h Day 1)
Nur Pilot-Critical fixen → Marcel testet → Rest in Folge-Sprint.

**Variante B: Full-Vision-Marathon** (~21h Day 1+2+3)
Alle echten Lücken (revidiert).

**Variante C: Audit-First-Confirm**
Du liest diesen Diff, bestätigst die Realität, dann entscheidest A oder B.

**Meine Empfehlung:** Variante **C** — du hast das Vision-Audit selbst auf 47h projektiert, ich melde 21h. Diese Diskrepanz MUSST du verifizieren bevor wir loslegen. Sonst riskieren wir wieder doppelte Arbeit (analog wie MEGA⁶⁹-INTEGRATION nötig wurde, weil Features sichtbar nicht ankamen).

**Konkret zu prüfen (5 Min):**
1. Öffne `stellungnahme.html?az=...&editor=mega69` — siehst du TipTap mit Slash-Menu `/`?
2. Öffne `akte.html?id=...` — siehst du die 12-Tab-Bar?
3. Cmd+K im Editor — siehst du Command-Palette mit 40+ Items?
4. Klick Skizze-Tab → siehst du 9-Tool-SVG-Editor?

Wenn alles ✅: Audit v2 war zu pessimistisch, MEGA⁷⁰ ist Lücken-Sprint nicht Marathon-Rebuild.
Wenn etwas ❌: Sag mir was, wir patchen gezielt.

---

## 📋 Verifizierte Fakten

| Check | Wert |
|---|---|
| Tabelle `befund_fragmente` | ✅ existiert, vollständige Spalten |
| Tabelle `shares` | ✅ existiert |
| Spalte `ki_protokoll.wirkung` | ✅ existiert |
| Spalte `audit_trail.integrity_hash` | ✅ existiert (Hash-Chain) |
| Vector-Embedding-Spalten (3 Tabellen) | ✅ alle vorhanden |
| Edge Fn `asset-to-fragments-v1` | ✅ deployed |
| Edge Fn `fragments-to-befund-v1` | ✅ deployed |
| Edge Fn `audit-narrative-v1` | ✅ deployed |
| Edge Fn `global-search` | ✅ deployed |
| `lib/editor-tiptap-bundle.js` | ✅ exists (134 KB gzipped) |
| 8 Custom Nodes in `lib/extensions/` | ✅ alle |
| `lib/prova-*` Module | ✅ **45 Files** |
| `lib/prova-command-palette.js` | ✅ exists |
| `lib/prova-commands-registry.js` | ✅ 40+ Commands |
| `lib/prova-cheat-sheet.js` | ✅ exists |
| `lib/prova-akte-tabs.js` | ✅ 12-Tab-Bar + History-API |
| `lib/prova-workflow-engine.js` | ✅ 10 typ-Definitionen |
| `lib/prova-skizze-editor.js` | ✅ 9-Tool SVG-Editor |
| `stellungnahme.html` nutzt TipTap | ✅ via mega69-Flag-default |
| DB-Counts | 0 Normen, 0 Bausteine, 0 Fragmente, 1 Auftrag, 4 Audit (Test-Stand) |
| `fragmente.html` Fragment-Bühne | ❌ FEHLT (echte Lücke) |
| Tab "Historie" Inline in akte | ❌ als Modal verfügbar, nicht Inline |
| `kontakt-detail.html` Redesign | ❌ noch 9-Tab-Layout |
| Mobile-Bottom-Nav | ❌ unsystematisch |
| Aktiver-Fall-Anker Sidebar | ❌ FEHLT |
| `tests/ki-functions-garantie/` | ❌ FEHLT |

---

*Ende Phase A · Diff zeigt: ~21h reale Restarbeit statt 47h. Marcel-Bestätigung empfohlen vor Phase B-Start.*
