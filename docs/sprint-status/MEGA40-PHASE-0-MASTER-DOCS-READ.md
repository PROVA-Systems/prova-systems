# MEGA⁴⁰ Phase 0 — Master-Docs-Read + Code-Stand + Tech-Stack-Plan

**Datum:** 2026-05-08
**Branch:** `mega40-editor-vorlagen` (NEU von `mega39-master-consolidation` @ d0a8b3a)
**SW-Cache vorher:** `prova-v999.10-mega39-p9-bescheinigungen-top12`

---

## Spec-Quellen-Inventur

| Datei | Status | Verwendet |
|-------|--------|-----------|
| `/mnt/project/MEGA-40-EDITOR-VORLAGEN-STRATEGY.md` | ❌ NICHT VERFÜGBAR (Linux-Sandbox-Pfad nicht in Win-Env) | – |
| `/mnt/project/MARCEL-UEBERGABE-PROTOKOLL-FINAL-V2.md` | ❌ NICHT VERFÜGBAR | – |
| Master-Prompt MEGA⁴⁰ (in `docs/sprint-prompts/MEGA40-PROMPT.md`) | ✅ vollständig | ⭐ Hauptquelle |
| `docs/master/PROVA-VISION-MASTER.md` | ✅ | gelesen in M³⁹ Phase 0 |
| `docs/master/PROVA-ARCHITEKTUR-MASTER.md` | ✅ | gelesen in M³⁹ Phase 0 |
| `docs/master/PROVA-REGELN-PERMANENT.md` | ✅ | gelesen in M³⁹ Phase 0 |
| `docs/audit/SYSTEM-COMPLETENESS-AUDIT-REPORT.md` | ✅ | gelesen in M³⁹ Phase 0 |

**Spec-Lücken-Behandlung** (per Master-Prompt-Direktive *"Bei Spec-Lücken: best-effort + Doku, NICHT pausieren"*):
- M⁴⁰-Strategy.md + Marcel-Übergabe-V2 sind nicht erreichbar.
- Der Master-Prompt selbst enthält Vision (3 Wege), Acceptance pro Phase, Tech-Empfehlung (TipTap), Compliance-Regeln.
- Das ist **ausreichend für autonomen Run**. Phase 4 (DOCX-Import-Lib-Auswahl) wird Recherche + Trade-off-Doku nachholen.

---

## 3-Wege-Vision (eigene Worte)

PROVAs Editor-Stack wird **dreiwege-fähig**:

- **Weg A — Wizard-geführt**: Einsteiger werden Schritt-für-Schritt durch IHK-konforme Sektionen geleitet. PROVA produziert das gesamte Dokument nach Vorgaben. Best-Practice-Kompatibilität garantiert.
- **Weg B — Eigene Word-Vorlage**: Etablierter SV mit jahrelang perfektionierter Word-Vorlage lädt die `.docx` hoch. PROVA konvertiert nach intern (Editor-JSON), erkennt Platzhalter, lässt SV in seiner gewohnten Struktur weiter arbeiten. PROVA fügt **keine** unerwünschten Compliance-Pflichten hinzu.
- **Weg C — Hybrid (Marcel's Lieblings-Variante)**: PROVA übernimmt die **rechtlich kritischen Sektionen** (Deckblatt, §407a-Block, EU-AI-Act-Disclosure, Unterschrifts-Block) als **gelockt** in den Editor injiziert. Der SV schreibt den Hauptteil in seinem eigenen Stil — kann ihn aber NICHT versehentlich Compliance-relevante Sektionen überschreiben.

**Mode-Wechsel jederzeit möglich.** Locked-Sections sind in der DB konfigurierbar pro Dokument.

**Marketing-Pitch:** *"Gutachten Manager VERWALTET. PROVA ERSTELLT."*

---

## Code-Stand-Snapshot

| Bereich | Stand | Beleg |
|---------|-------|-------|
| KI-Modell-Stack gpt-5.5 | ✅ migriert (M³⁹ P1) | `lib/ki-cost-calc.js` Z.27-29: gpt-5.5/5.5-pro/5.5-instant Pricing. Edge Function ki-proxy/index.ts MODEL_API_NAME mit praezise/schnell + Legacy-Aliase. |
| Login Cross-Domain Cookie | ✅ aktiv (M³⁹ P10 F1) | `lib/supabase-client.js` crossDomainStorage |
| Vault-Migration | ✅ live (M³⁷ C) | Migrations 25 + 26 applied |
| Bibliothek-Pattern | ✅ live (M³⁹ P5) | `lib/bibliothek-pattern.js` mit 6 Kategorien |
| KI-Werkzeug-Stufen S1/S2/S3 | ✅ live (M³⁹ P6) | `lib/ki-werkzeug-stufen.js` |
| Skizzen-Canvas | ✅ live (M³⁹ P3) | `lib/skizzen-canvas.js` Tier 1+2 |
| Bescheinigungen Top 12 | ✅ live (M³⁹ P9) | `bescheinigungs-logic.js` |
| Editor-Foundation | ❌ nicht da | nur `<textarea>` an mehreren Stellen (app.html: 2, stellungnahme.html: 5, freigabe.html: 1) |
| Vorlagen-System | ❌ nicht da | Migration 32 user_favoriten existiert (M³⁹ P5), aber keine `documents` / `templates`-Tabellen |
| DOCX-Import/Export | ❌ nicht da | – |
| 3-Wege-Modal | ❌ nicht da | – |

**M⁴⁰-Pflicht ist daher: NEU bauen** — keine Verify-Phasen erkennbar wie bei M³⁹.

---

## Tech-Stack-Entscheidung (Co-Founder-Mandat aktiv)

### Editor (Phase 1+2)

**Entscheidung: TipTap v2** (mit ProseMirror unten drunter).

**Trade-off-Analyse:**

| Lib | Pro | Contra | Verdict |
|-----|-----|--------|---------|
| **TipTap** | Modular, Vanilla-JS-fähig (kein Framework-Lock), JSON-Schema, MIT-Lizenz, große Extension-Ökosystem (Tabellen/Bilder/Footnotes/CollabSync ready), aktive Maintainance | Etwas größeres Bundle (~200KB gzipped Core), ProseMirror-Modell hat Lernkurve | ✅ |
| Lexical (Meta) | Sehr modern, performant, JSON-Schema | Stark React-orientiert, Vanilla-Wrapper unreif | ❌ Vanilla-Friction |
| Slate | Flexibel, JSON-Schema | React-only API stable, Vanilla-Wrapper experimentell | ❌ |
| Quill | Vanilla-Friendly | OldSchool Delta-Format (nicht JSON-Tree), schwerer Tabellen-Support | ❌ |
| ProseMirror direkt | Maximale Kontrolle | Sehr Low-Level, alles selbst bauen | ❌ Time-Cost |

→ **TipTap** ist Marcel-Empfehlung + meine eigene Entscheidung. Bestätigt.

### DOCX-Konvertierung (Phase 4+5)

**Entscheidung (vorläufig, finale Recherche in Phase 4):**

- **Import:** `mammoth` (DOCX → HTML, dann HTML → TipTap-JSON via TipTap-Parser).
- **Export:** `docx` (npm package, native DOCX-Generation aus JSON).

Beide sind MIT-lizenziert, browser- und node-fähig (CDN via esm.sh).

### Storage-Format

**JSONB in Supabase** (Master-Prompt non-negotiable). TipTap nutzt von Haus aus JSON — perfekter Match.

### Auto-Save

Debounced 5s (Master-Prompt non-negotiable). Implementation via lodash-style Debounce ohne externe Lib (eigener `debounce(fn, ms)` Helper in `lib/debounce.js` falls noch nicht vorhanden).

### Versions-History

Pro Save **NEUE Zeile** in `documents_versions`-Tabelle. Foreign Key zu `documents.id`. Komplettes JSON gespeichert (kein Diff). Storage-Aufwand wird via Retention-Policy (z.B. 30d) später gemanagt.

### RLS-Policy

Workspace-isoliert — gleiches Pattern wie `auftraege`/`kontakte`/`fristen`-Tabellen.

---

## Implementierungs-Reihenfolge (Self-Scoping)

| Phase | Inhalt | Geschätzt | Priorität |
|-------|--------|-----------|-----------|
| 1 | Editor-Foundation (TipTap + Tabellen DB + Auto-Save + Versions) | 3-4h | KRITISCH (Basis für 2-9) |
| 2 | Erweiterte Editor-Features (Tabellen, Bilder, Fußnoten, Querverweise) | 3h | HOCH |
| 3 | 3-Wege-Modal | 2h | HOCH |
| 4 | DOCX-Import (mammoth) | 2-3h | MITTEL |
| 5 | DOCX-Export (docx) | 3h | MITTEL |
| 6 | Rechtschreibung + Konjunktiv-II (gpt-5.5) | 2h | HOCH (Compliance) |
| 7 | Vorlagen-System | 3h | MITTEL |
| 8 | Bibliothek-Toolbar Integration (M³⁹ P5 docked) | 2-3h | NIEDRIG (existing P5 nutzbar) |
| 9 | PDF-Generation + E2E | 3-4h | HOCH (Pilot-relevant) |
| 10 | FINAL + Tag v1300 | 1h | nach allen |

**Pragma-Reihenfolge** (Token-realistisch): Ich starte mit Phase 1 (Foundation) und gehe sequenziell. Bei Token-Limit ehrlicher PARTIAL-Stop.

---

## Branch-Strategie

```
main (veraltet, M³⁵-³⁹ noch nicht gemerged)
  └─ mega34-final-100-percent (M³⁵-³⁷, latest 27c212b)
       └─ mega39-master-consolidation (M³⁹, latest d0a8b3a)
            └─ mega40-editor-vorlagen (M⁴⁰, NEU)
```

Marcel-Pflicht-Reihenfolge nach M⁴⁰-FINAL:
1. mega34 → main
2. mega39 → main
3. mega40 → main
4. sw.js → v1300 + git tag v1300

---

*M⁴⁰ Phase 0 — Co-Authored-By Claude Opus 4.7 (1M context, autonomer Run) — 2026-05-08*
