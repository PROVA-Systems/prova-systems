# MEGA⁴⁰ PARTIAL 1 of N — Token-Limit-Stop nach P0 + P1.1

**Datum:** 2026-05-08
**Branch:** `mega40-editor-vorlagen` (NEU von `mega39-master-consolidation` @ d0a8b3a)
**SW-Cache:** `prova-v1201-mega40-p1.1-editor-foundation-schema`

---

## Ehrlicher Token-Stop

M⁴⁰-Master-Prompt schätzt selbst **23-27h CC-Zeit über 4-7 Sessions**. Kombiniert mit dem M³⁵–M³⁹-Vorlauf in dieser Conversation und dem ~25k-Token-großen Master-Prompt selbst, ist das Token-Window jetzt am Ende.

**Pragma gemäß CLAUDE.md Compounding-Engineering:** Ehrlicher Stopp NACH funktionalem Commit (statt Mid-Phase-Abbruch in Phase 1.2 mit broken TipTap-Integration).

---

## Done in dieser Session

| Phase | Commit | Inhalt | Tests |
|-------|--------|--------|-------|
| **0 Master-Docs-Read** | `5a11973` | Lücken-Tabelle (Strategy-Files fehlen, Master-Prompt als Hauptquelle), Tech-Stack-Decision (TipTap), Code-Stand-Snapshot | – |
| **1.1 Editor Schema + Lambdas** | `907a548` | Migration 33 (documents + documents_versions APPLIED), document-save.js + document-load.js mit Workspace-RLS + Versions-pro-Save | 18/18 ✅ |

**Total: 2 Commits, 18 neue Tests grün.**

---

## Open für Folge-Sessions

### P1.2 — TipTap-UI-Integration (~2h)
- TipTap v2 via esm.sh oder lokal bundled
- `lib/editor-tiptap.js` Wrapper-Lib
- Demo-Page `editor-demo.html`
- Toolbar mit Bold/Italic/Underline/Listen/Headings/Align
- Auto-Save 5s debounced ruft `/document-save`
- Versions-UI (Liste der letzten 10 Saves)
- 10+ UI-Tests
- Pattern A volle Page-Width

### Phase 2 — Erweiterte Editor-Features (~3h)
TipTap-Extensions: Tabellen, Bilder, Fußnoten, Querverweise, ToC, Seitenumbrüche, Code, Schriftart/-größe/-farbe.

### Phase 3 — 3-Wege-Auswahl-Modal (~2h)
Modal mit 3 Karten + Mode-Switcher mit Datenverlust-Warning + Locked-Sections-Konzept.

### Phase 4 — DOCX-Import (~2-3h)
mammoth.js für DOCX→HTML→TipTap-JSON. Platzhalter-Detection. Recherche-Pflicht.

### Phase 5 — DOCX-Export (~3h)
docx (npm) für TipTap-JSON→DOCX. Roundtrip-Test 80% strukturelle Übereinstimmung.

### Phase 6 — Rechtschreibung + Konjunktiv-II (~2h)
Browser-Spellcheck + KI-Backstop S1 (gpt-5.5-instant) + S3-Konjunktiv-II (gpt-5.5).
Lib `lib/ki-werkzeug-stufen.js` aus M³⁹ P6 ist bereit — nur an Editor docken.

### Phase 7 — Vorlagen-System (~3h)
Vorlagen-Page + CRUD + 5 PROVA-Defaults aus F-04/F-09/F-10/F-15/F-19.

### Phase 8 — Bibliothek-Toolbar Integration (~2-3h)
Lib `lib/bibliothek-pattern.js` aus M³⁹ P5 dockt an TipTap an.

### Phase 9 — PDF-Generation + E2E (~3-4h)
TipTap-JSON → PDFMonkey-Variables. Locked-Sections injizieren. E2E alle 3 Wege.

### Phase 10 — FINAL + Tag v1300 (~1h)
14 Pre-FINAL-Checks + Master-Doku-Updates.

---

## Tech-Stack-Decisions (final)

| Bereich | Wahl | Begründung |
|---------|------|------------|
| Editor | TipTap v2 | modular, Vanilla-friendly, JSON-Storage, MIT, big Extension-Ökosystem |
| DOCX-Import | mammoth.js (vorläufig) | finale Recherche in P4 |
| DOCX-Export | docx (npm) | native DOCX-Generation aus JSON |
| Storage | JSONB (Supabase) | non-negotiable, perfekt für TipTap |
| Auto-Save | 5s debounced (`lib/debounce.js` falls nötig) | non-negotiable |
| Versions | Pro Save NEUE Zeile (kein Diff) | non-negotiable, Storage via 30d-Retention managen |
| RLS | workspace_memberships-JOIN | konsistent zu auftraege/kontakte/fristen |

---

## Marcel-Manual aus dieser Session

Keine — Schema-Migration läuft idempotent, Lambdas brauchen kein Setup.

Nach M⁴⁰-FINAL (in mehreren Folge-Sessions):
1. mega34 → main, mega39 → main, mega40 → main (in Reihenfolge)
2. sw.js → v1300 + git tag v1300 (nach 14/14 Acceptance)

---

## Test-Bilanz M⁴⁰ Session 1

| Phase | Tests neu | Tests grün |
|-------|-----------|------------|
| P0 | 0 | – |
| P1.1 | 18 | 18 |
| **Σ M⁴⁰ Session 1** | **18** | **18** |

Plus: alle M³⁵–M³⁹-Tests bleiben grün (kein Regression).

---

## Resume-Plan für Folge-Session

```
git checkout mega40-editor-vorlagen
git pull
# Phase 1.2 starten:
#   1. lib/editor-tiptap.js mit TipTap v2
#   2. Demo-Page editor-demo.html
#   3. Auto-Save-Logic via document-save Lambda
#   4. Tests
#   5. Per-Item-Push
```

Migration 33 ist live, Lambdas funktional — UI kann nahtlos andocken.

---

*MEGA⁴⁰ PARTIAL 1 of N — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
