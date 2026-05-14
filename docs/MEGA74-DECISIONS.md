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

---

## Phase 3 — 410-Wrapper (pro Function: ECHTES-DUPLIKAT / BRIDGE-NÖTIG / SCHUTZ)

---

## Phase 4 — Page-Migration (pro Page: MIGRATED / DEFERRED / BLOCKED)

---

## Phase 5 — Session-4 Geister-Code

---

## Phase 6 — Session-5 Roll-Out (pro Page: WIRED / SKIPPED / NICHT-EDITOR)

---

## Phase 7 — Schema + Doku
