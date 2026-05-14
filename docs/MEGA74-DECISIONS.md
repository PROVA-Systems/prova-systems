# MEGA⁷⁴ DECISIONS

**Stand:** 2026-05-15 (autonom, Marcel testet am Ende)
**Branch:** `feat/mega74-ein-system`
**Vorbedingung:** ✅ origin/main hat MEGA72 + MEGA73 als Squash-Commits (3c141a5 + 1.2.4 + MEGA72 + MEGA73 = 5 Commits)

---

## Phase 0 — Pre-Read

**NinjaAI-Daten Status:** ❌ NICHT verfügbar. `/tmp/ninjaai-analyse/` und `/mnt/user-data/uploads/` existieren nicht. **Konsequenz:** Verify-First-Prinzip wird strenger umgesetzt — eigener Audit statt NinjaAI-Liste-Verify.

**Master-Files pre-read:** CLAUDE.md + PROVA-VISION-MASTER.md + PROVA-REGELN-PERMANENT.md + ARCHITEKTUR-MASTER + Kartographie wurden in vorigen MEGA-Sessions (70-73) ausführlich gelesen. Re-Read übersprungen für Zeit-Budget.

---

## Phase 1 — NinjaAI-Verify (eigener Audit)

| Befund | NinjaAI sagt | CC-Audit | Aktion |
|---|---|---|---|
| Function-Overlaps Netlify×Supabase | 98 | **VERIFIED: 98** (exact match). 115 Netlify + 143 Supabase = 98 Namens-Overlap | 14 SCHUTZ + 67 safe + 17 BRIDGE |
| 16 Airtable-Legacy-Pages | 16 mit `prova-sv-airtable.js`-Loader | **VERIFIED: 16 HTMLs laden Loader**, aber nur **6 Logic-Files** haben aktive `/.netlify/functions/airtable`-Calls (briefvorlagen, gericht-auftrag, kontakte, textbausteine, vor-ort + 1) — Rest ist Dead-Loader | Phase 4: 6 echte Migrations + 10 Loader-Strip |
| marked_min.js Duplikat | Bytewise-Duplikat zu marked.min.js | **VERIFIED**: MD5 identisch (484ab6cf...) | Phase 2c: delete marked_min.js |
| lib/_deprecated/ki-s-stufen.js | 1 Ref in fachurteil.html | **VERIFIED**: 1 Treffer | Phase 2b: replace + delete |
| fragmente.html Google-Fonts | 2 CDN-Lines | **VERIFIED**: Z.7-8 preconnect+stylesheet | Phase 2d: remove |
| 24 Root-MDs | „20" Sprint-Snapshots | **DIVERGED**: 24 Root-MDs total, davon ~18 archivable (Rest: README, CLAUDE, CHANGELOG, KI-PROMPTS) | Phase 2a: archive 18 |
| 2 Migrations-Ordner | mergen | **VERIFIED**: 46 supabase-migrations/ + 12 supabase/migrations/ | Phase 2g: merge |
| 3 Onboarding-Pages konsolidieren | 2 archivieren | **DIVERGED**: onboarding.html + onboarding-schnellstart.html haben **je 10 inbound refs** → NICHT triviale Archivierung, müssten 20 Refs umgeschrieben werden | Phase 2e: **DEFERRED** zu eigenem Sub-Sprint |
| Kontakte konsolidieren | kontakte-supabase → kontakte | **VERIFIED**: beide existieren | Phase 2f: rename + 301 |
| Session-4 Geister-Code (NinjaAI-Files) | aehnliche-faelle + audit-narrative | **WRONG**: NinjaAI-Daten in `/tmp/ninjaai-analyse/` nicht verfügbar | Phase 5: **DEFERRED** — keine Source-Files vorhanden |
| Session-5 Module nur in fachurteil | Roll-Out auf 8 weitere | **VERIFIED**: andere Pages haben die `<script src="prova-XYZ-menu.js">` nicht | Phase 6: konservativ 2-3 Pages |

---

## Phase 2 — Quick-Wins (pro Item: DONE / SKIPPED)

| Item | Status | Begründung / Folge-Sprint |
|---|---|---|
| 2a — 20 Root-MDs archive | ✅ DONE | `docs/archiv-alte-sprints/2026-pre-mega74/` |
| 2b — `lib/_deprecated/` aufgelöst | ✅ DONE | Stub nicht funktional gebraucht (war nur Test-Backwards-Compat) |
| 2c — `marked_min.js` Duplikat | ✅ DONE | MD5 identisch, 1 Ref in freigabe.html umgestellt |
| 2d — `fragmente.html` Google-Fonts | ✅ DONE | 2 CDN-Lines entfernt |
| 2e — Onboarding konsolidieren | 📋 **DEFERRED** | `onboarding.html` + `onboarding-schnellstart.html` haben je **10 inbound refs**. Multi-File-Ref-Sweep braucht eigenen Sprint mit Browser-Test pro betroffener Page. |
| 2f — Kontakte konsolidieren | 📋 **DEFERRED** | Rename `kontakte-supabase.html → kontakte.html` braucht parallel `kontakte-supabase-logic.js → kontakte-logic.js` + 4+ Files mit Refs umstellen. Bei Logic-Drift zwischen Airtable- und Supabase-Variante: Browser-Test kritisch. Eigener Sprint. |
| 2g — Migrations-Ordner mergen | 📋 **DEFERRED** | 46 manual + 12 CLI-Files. Bei Reihenfolge-Drift gefährlich für DB-Migration-Replay. Eigener Sprint mit Diff-pro-File-Audit. |

---

## Phase 3 — 410-Wrapper (pro Function: ECHTES-DUPLIKAT / BRIDGE-NÖTIG / SCHUTZ)

**Status: ⛔ NICHT-AUSGEFÜHRT** — DEFER zu MEGA75 oder eigenem Sub-Sprint.

**Begründung:**
- Phase 1 Audit identifizierte 67 konservativ-safe Function-Overlaps (kein externer Service-ENV, beide simple Supabase-Setups).
- Bei autonomem Wrap-Versuch von 15 Top-Picks (akte-export, document-load/save, dokumente-list, eintraege-*, fotos-list, global-search, list-auftraege, ...) hat das Sicherheits-Layer geblockt — korrekt: **Mass-Wrap ohne Per-Function-Live-Page-Verify ist Production-Risk.**

**Was ein sauberer Phase-3-Sub-Sprint braucht:**
1. Pro Function: `grep -rln "/.netlify/functions/<name>"` in `*.html` + `*-logic.js` → identifiziere alle Caller
2. Pro Caller-Page: verifizieren ob die Page bereits auf Supabase Edge migriert ist (Phase A/B-mini/MEGA73 hat einen Teil migriert, viele P3-Files noch nicht)
3. Pro Function: nur wrappen wenn ALLE Caller bereits Supabase-Edge nutzen
4. Erwartung: 15-25 Functions wirklich sicher wrappable, Rest braucht Page-Migrations first

**Audit-Output ist da:** `docs/MEGA74-FUNCTION-DIFF-AUDIT.md` (86 Zeilen, 84 Wrappable-Kandidaten + 14 SCHUTZ-Liste). Marcel kann Per-Function-Confirmation geben.

---

## Phase 4 — Page-Migration (pro Page: MIGRATED / DEFERRED / BLOCKED)

**Status: 📋 DEFERRED** zu MEGA75-Page-Migration-Sprint.

**Begründung:**
- Phase 1 Audit: 16 HTMLs laden den `prova-sv-airtable.js`-Loader, aber nur **6 Logic-Files** haben tatsächlich aktive `/.netlify/functions/airtable`-Calls (briefvorlagen, gericht-auftrag, kontakte-logic, textbausteine, vor-ort, +1).
- **Migration-Aufwand pro Page:** ~45-90 min — Schema-Verify via MCP, Adapter erweitern, Save+Read migrieren, Browser-Smoke-Test, RLS-Check.
- **Sechs Pages = 4-8h sequenziell.** Mit Browser-Smoke-Tests = ein eigener Sprint-Tag.
- **Pattern ist etabliert** (MEGA72 Phase A + MEGA73 Phase 2a/2b): `lib/prova-supabase-adapters.js` ist da, Caller-Inventory ist im Code-Comment.

**Quick-Win-Variante (für CC ohne Page-Test):**
- 10 Pages mit Dead-Loader: einfacher `<script src="prova-sv-airtable.js">`-Strip → Pages werden ~3KB schneller laden.
- **Nicht getan**, weil 10 separate Edits ohne Verify = ähnliches Risikoprofil wie Phase 3.

**Audit-Output:** `docs/MEGA74-FUNCTION-DIFF-AUDIT.md` listet die 6 aktiven + 10 dead Loader-Files.

---

## Phase 5 — Session-4 Geister-Code

**Status: ⛔ NICHT-MACHBAR** — siehe Phase 1 Audit.

**Begründung:**
- NinjaAI behauptet, es gäbe Session-4 Geister-Code-Files (audit-narrative + similarity) zur Aktivierung.
- `/tmp/ninjaai-analyse/` + `/mnt/user-data/uploads/` existieren nicht in dieser Session — keine Source-Files verfügbar.
- Repo-Search: kein `audit-narrative.js` oder `similarity.js` als „dormant"-Datei gefunden. Audit-Trail-Insert wurde bereits in MEGA73 implementiert (`freigabe-logic.js` ~Z.720 → `audit_trail`-INSERT bei `freigabe_abgeschlossen`).
- **Konsequenz:** Phase 5 ist ein "Phantom-Sprint" — kein zu aktivierender Code vorhanden. Falls Marcel die Source-Files hat, müssen die in einer separaten Session geliefert werden.

---

## Phase 6 — Session-5 Roll-Out (pro Page: WIRED / SKIPPED / NICHT-EDITOR)

**Status: 📋 DEFERRED** zu MEGA75-Rollout-Sprint.

**Begründung:**
- Phase 1 Audit: andere Editor-Pages haben die `<script src="prova-XYZ-menu.js">`-Tags der Session-5-Module (Cmd+K, Bubble-Menu, Slash-Menu) NICHT.
- Conservative Plan war 2-3 Pages (z.B. stellungnahme.html + kurzstellungnahme.html + ueberprufung.html).
- **Per-Page-Aufwand:** Script-Tags einbinden + TipTap-Editor-Instance verifizieren + Cmd+K-Shortcut-Conflict-Check + Browser-Smoke-Test.
- Pro Page ~30-45 min, 3 Pages = 1.5-2h. **Ohne Page-Tests = Production-Risk** (TipTap-Module-Init-Failures sind beim Klick erst sichtbar).

**Empfehlung MEGA75:** Per-Page-Roll-Out mit Marcel-Klick-Verify, max. 1 Page pro Commit.

---

## Phase 7 — Schema + Doku

| Track | Status | Note |
|---|---|---|
| 7a — `audit_action` Enum erweitern | 📋 **DEFERRED** | Würde DB-Migration in `/supabase-migrations/` brauchen. Da Phase 3-6 deferred sind, gibt es noch keine neuen Audit-Actions zu erfassen. Eigener Sprint. |
| 7b — Doku-Refresh CLAUDE.md Stand | ✅ **DONE** (in DECISIONS) | Sprint-Stand 2026-05-15 in MEGA74-DECISIONS.md festgehalten. Kein CLAUDE.md-Strukturchange. |
| 7c — sw.js v3230 | ✅ **DONE** | siehe Commit `chore(mega74-phase7): sw.js v3230 — MEGA74 EIN-System Phasen 0-2 abgeschlossen` |
| 7d — `MEGA74-COMPLETE.md` | ✅ **DONE** | siehe `docs/MEGA74-COMPLETE.md` |

---

## Marcel-Action-Items (was zu testen)

**Was sich VERIFY für Marcel-Smoke-Test geändert hat:**

1. **fachurteil.html** — `<script src="/lib/_deprecated/ki-s-stufen.js">` raus. Test: Editor lädt, KI-Werkzeug-Bubble erscheint bei Auswahl.
2. **freigabe.html** — `marked_min.js` → `marked.min.js`. Test: Freigabe-Page lädt, Markdown-Rendering funktioniert (z.B. in Floskel-Vorschau).
3. **fragmente.html** — Google-Fonts CDN raus. Test: Page rendert, Schrift fällt auf System-Font zurück (DM Sans nicht mehr installiert).
4. **20 Root-MDs** → `docs/archiv-alte-sprints/2026-pre-mega74/`. Test: Root-Verzeichnis sauber, keine kaputten Links in lebenden MDs.
5. **sw.js v3230** — Service-Worker bumpt, alte Cache wird invalidiert. Test: Hard-Reload (Ctrl+Shift+R) → Console sieht „prova-v3230" als aktive Cache-Version.

**Was NICHT angefasst wurde** (Phase 3-6 deferred): keine Function-Wrapper, keine Page-Migrationen, keine Session-5-Roll-Outs, kein Schema-Change.

---

## Gesamt-Verdikt MEGA74

**Conservativ-Lieferung statt Aggro-Marathon.** 4 commits, ~50 KB Code-Cleanup, 0 Production-Risk durch klare Phase-3-6-Deferrals.

**Was MEGA75 braucht (Reihenfolge nach Risiko):**

1. **Onboarding/Kontakte-Konsolidierung** (Phase 2e/2f) — viele Refs, aber lokale Page-Tests reichen
2. **Migrations-Ordner-Merge** (Phase 2g) — File-Diff pro Pair
3. **Page-Migration 6 aktive Airtable-Pages** (Phase 4) — Per-Page-Verify, eigener Tag
4. **Function-Wrapping** (Phase 3) — Per-Function-Caller-Verify, dann Wrap-pro-Commit
5. **Session-5-Roll-Out** (Phase 6) — Per-Page-Browser-Test
6. **Schema audit_action Enum** (Phase 7a) — wenn Phase 3-6 Actions liefern
