# 🌅 MEGA⁴⁰ — EDITOR & VORLAGEN-SYSTEM (Master-Prompt)

**Owner:** Marcel Schreiber  
**Branch:** `mega40-editor-vorlagen` (NEU von `mega39-master-consolidation`)  
**Tag:** v1100 → v1300 (nur bei N/N Acceptance)  
**Modus:** AUTONOMOUS — Auto-Mode, Self-Scoping aktiv, ehrliche PARTIAL bei Token-Limit  
**Geschätzt:** 23-27h CC-Zeit, 4-7 Sessions

---

## 🚨 EXECUTIVE CONTEXT — Warum dieser Sprint existiert

PROVA hat ein **fundamentales Loch**: SVs können Gutachten nur als geführter Wizard erstellen. Der Editor ist nur ein nacktes `<textarea>` ohne Formatierung. Etablierte SVs mit eigenen Word-Vorlagen haben dadurch keinen Anschluss — 30-40% Markt-Verlust.

**Marcel-Vision (3 Wege):**

> "Ich will dass der SV beim Klick auf 'Neues Gutachten' wählen kann:
>  
>  Weg A — Mit PROVA-Wizard geführt werden (für Einsteiger, Schnell-Standard)
>  Weg B — Seine eigene Word-Vorlage hochladen und damit arbeiten
>          (für Etablierte mit 15-Jahres-Vorlage)
>  Weg C — Hybrid: PROVA übernimmt die rechtlich kritischen Compliance-Sektionen
>          (Deckblatt, §407a-Block, EU-AI-Act-Disclosure, Unterschrift),
>          der SV schreibt den Hauptteil in seinem eigenen Stil.
>  
>  In allen 3 Wegen muss der SV einen vollwertigen Cloud-Editor haben —
>  mit Bold, Listen, Tabellen, Bildern, Fußnoten, Rechtschreibung, KI-Hilfen.
>  Damit er NIE wieder in Word oder Excel wechseln muss."

**Marketing-Pitch (für Marcel-Memory):**
> "Gutachten Manager VERWALTET. PROVA ERSTELLT."

---

## 🛡️ ANTI-ABKÜRZUNGS-REGELN

```
1.  Phase 0 PFLICHT — alle Master-Dokumente lesen vor Phase 1
2.  Per-Item-Push (1 funktionales Item = 1 Commit)
3.  Heart-Beat alle 5 Items (Status-Update)
4.  Token-Limit ehrlich bei <15% — sauberer Resume-Point
5.  KEIN Branch-Merge zu main durch CC (Marcel-Pflicht)
6.  KI-Modelle: gpt-5.5 + gpt-5.5-instant (NIEMALS gpt-4o — deprecated Feb 2026)
7.  KI-Modell-Namen NIEMALS im UI sichtbar
8.  Konjunktiv-II-Pflicht in §6-Hinweisen (§407a ZPO)
9.  sw.js CACHE_VERSION in JEDEM Commit bumpen
10. Working-Tree-Disziplin — CLAUDE.md, masterplan-v2/, NACHT-PAUSE.md NICHT antasten
11. Recherche-Pflicht für DOCX-Compliance + Word-Roundtrip-Verhalten
12. KI-Funktions-Garantie 5-Tests-Suite pro KI-Funktion
```

---

## 🎯 SELF-SCOPING-FREIHEIT

**Du bist Senior-Dev mit Co-Founder-Mandat.** Marcel + Web-Claude liefern Vision + Acceptance, **du entscheidest wie umgesetzt wird:**

```
✅ DU entscheidest: Library-Auswahl (TipTap nur Empfehlung — wenn was besseres existiert: dokumentiere + nutze)
✅ DU entscheidest: Schema-Details (Tabellen-Struktur, Indizes, RLS-Policies)
✅ DU entscheidest: Code-Architektur (Module-Splits, Naming, Patterns)
✅ DU entscheidest: Reihenfolge innerhalb einer Phase
✅ DU entscheidest: Test-Strategie (was unit, was integration, was e2e)
✅ DU entscheidest: UI-Umsetzung-Details (Komponenten-Struktur, CSS-Architektur)

🛑 NICHT-Verhandelbar:
   - Vision (3 Wege A/B/C)
   - User-Stories pro Phase
   - Acceptance-Criteria
   - Compliance-Regeln (§407a, EU AI Act, DSGVO)
   - KI-Modell-Stack (gpt-5.5)
   - Auto-Save 5s
   - Storage-Format JSONB (für saubere Versionierung)
```

**Bei Spec-Lücken:** best-effort + Doku in entsprechendem Phase-Report. NICHT pausieren.

---

## 🚨 AUTONOMOUS-MODE

```
✅ Marcel ist offline. Du läufst mehrere Sessions autonom.
✅ KEINE Confirmation-Pausen
✅ KEINE "soll ich weitermachen"-Fragen
✅ Migration via Supabase MCP (Authorization GEGEBEN)
✅ Bei Test-Failure: selbst diagnostizieren + fixen
✅ Per-Item-Push, kein Mid-Phase-Stop

🛑 EHRLICH STOPP nur bei:
   - Token-Window <15% → PARTIAL-Doku + Resume-Plan
   - DESTRUCTIVE-Action ohne klare Direktive
   - 3 aufeinanderfolgende identische Test-Failures
   - Acceptance-Liste komplett grün (= FINAL)
```

---

## 📚 PHASE 0 — PFLICHT-LEKTÜRE

⚠️ **Ohne Phase 0 kein Phase 1.**

### Hauptquellen (Priorität-Reihenfolge)

```
1. /mnt/project/MEGA-40-EDITOR-VORLAGEN-STRATEGY.md ⭐
2. /mnt/project/MARCEL-UEBERGABE-PROTOKOLL-FINAL-V2.md ⭐
3. PROVA-VISION-MASTER.md
4. PROVA-ARCHITEKTUR-MASTER.md
5. PROVA-REGELN-PERMANENT.md
6. SYSTEM-COMPLETENESS-AUDIT-REPORT.md
7. PROVA-CHAT-TRANSPORT-vAKTUELL.md
```

### Output Phase 0

`docs/sprint-status/MEGA40-PHASE-0-MASTER-DOCS-READ.md`:

1. Welche Dokumente gelesen + was draus mitgenommen
2. 3-Wege-Vision in eigenen Worten zusammengefasst
3. Code-Stand-Snapshot
4. Tech-Stack-Plan: was nutzt du, warum
5. Implementierungs-Reihenfolge der Phasen 1-10

---

## PHASE 1 — Editor-Foundation (~3-4h)

User-Story: SV will Texteditor mit Bold/Italic/Listen — ohne Word.

Acceptance:
- Editor-Komponente, Vanilla-JS-friendly
- Bold/Italic/Underline/Listen/Headings/Align
- JSON-Storage in Supabase
- Auto-Save 5s debounced
- Versions-History pro Save
- Workspace-RLS
- Demo-Page
- Pattern A volle Page-Width
- 10+ Tests grün

Tech-Empfehlung: TipTap (modular, MIT, JSON-Storage). CC darf Trade-offs prüfen + abweichen mit Doku.

---

## PHASE 2 — Erweiterte Editor-Features (~3h)

Acceptance:
- Tabellen einfügen + bearbeiten
- Bilder einbetten (Supabase Storage, Resize, Caption, Alt-Text)
- Fußnoten-System (Auto-Numerierung, Auto-Norm-Text)
- Querverweise (Auto-Update)
- Inhaltsverzeichnis (auto aus Headings)
- Seitenumbrüche
- Code-Blöcke
- Schriftart/Größe/Farbe/Highlight
- Erweiterte Toolbar (gruppiert)
- 10+ Tests grün

---

## PHASE 3 — 3-Wege-Auswahl-Modal (~2h)

Acceptance:
- Modal mit 3 Karten (Wizard / Eigene / Hybrid)
- Mode in DB (weg_a / weg_b / weg_c)
- Mode-Switcher mit Datenverlust-Warning
- Hybrid Locked-Sections (Deckblatt, §407a, EU AI Act, Unterschrift)
- Integration in mind. 3 Pages
- 5+ Tests grün

---

## PHASE 4 — DOCX-Import (~2-3h)

User-Story: 15-Jahre-Word-Vorlage hochladen → 1:1 sichtbar.

Acceptance:
- Upload-Page (Drag&Drop)
- DOCX → Editor-JSON Konvertierung
- Platzhalter-Detection ({{Mandant}}, {{AZ}})
- User-Mapping zu PROVA-Datenfeldern
- Preview vor Speichern
- Option "Als Vorlage" / "Direkt bearbeiten"
- Warnings bei nicht-konvertierbarem Content
- 5+ Tests grün
- Recherche-Pflicht: 3-5 Quellen Lib-Auswahl

---

## PHASE 5 — DOCX-Export (~3h)

Acceptance:
- Export-Button (PDF / DOCX / HTML)
- Editor-JSON → DOCX
- Headings, Listen, Tabellen, Bilder, Formatierung erhalten
- Fußnoten als Word-Footnotes
- Bilder eingebettet
- Roundtrip-Test 80% strukturelle Übereinstimmung
- Performance <10s für 30-Seiten
- 5+ Tests grün

---

## PHASE 6 — Rechtschreibung + Konjunktiv-II (~2h)

Acceptance:
- Layer 1: Browser-Native-Spellcheck (de-DE)
- Layer 2: KI-Backstop S1 (gpt-5.5-instant via 'schnell')
- Konjunktiv-II-Validator (gpt-5.5 via 'praezise', NUR §6)
- Begründungs-Box NICHT-kopierbar
- KEINE gpt-4o-Refs (deprecated!)
- KI-Funktions-Garantie 5-Tests
- 10+ Tests grün

---

## PHASE 7 — Vorlagen-System (~3h)

Acceptance:
- Vorlagen-Page Karten-Grid (Filter: Alle/Eigene/PROVA-Default/DOCX)
- "Als Vorlage speichern" im Editor
- Use-Count + Last-Used-At Tracking
- User-eigene = workspace-isoliert (RLS)
- PROVA-Default = global lesbar
- 5+ PROVA-Defaults aus F-04/F-09/F-10/F-15/F-19 geseeded
- 8+ Tests grün

---

## PHASE 8 — Bibliothek-Toolbar Integration (~2-3h)

Acceptance:
- Bibliothek-Pattern (M³⁹ P5) dockt an Editor an
- 6 Kategorien insertable
- Auto-Fußnote bei Normen + §-Verweisen
- Cursor-Position-Erhalt
- Recent-Items + Favoriten
- 5+ Tests grün

---

## PHASE 9 — PDF-Generation + E2E (~3-4h)

Acceptance:
- Editor-JSON → PDFMonkey-Variables
- Locked-Sections (Hybrid) auto-eingefügt
- IHK-konform
- E2E alle 3 Wege
- Performance <30s für 30-Seiten
- Doku

---

## PHASE 10 — FINAL + Tag v1300 (~1h)

14 Pre-FINAL-Checks. Master-Doku-Updates. Tag v1300 nur bei N/N.

---

## 🚨 TOKEN-LIMIT-PROTOKOLL

Bei ~85% Token-Window:
1. STOPP nach aktueller Item-Commit
2. PARTIAL-Doku
3. KEIN Tag-Bump
4. Sauberer Resume-Plan

---

## KRITISCHE REFERENZ-DATEN

KI-Modelle (M³⁹ P1):
- praezise → gpt-5.5
- schnell → gpt-5.5-instant
- VERBOTEN: gpt-4o, gpt-4o-mini, gpt-4-turbo

Branch:
```
mega40-editor-vorlagen
  ↑ NEU von mega39-master-consolidation (M³⁹ FINAL d0a8b3a)
```

Bei Konflikt M⁴⁰-Strategy.md vs Master-Doku → M⁴⁰-Strategy.
Bei Konflikt KI-Modell → M³⁹ P1 (gpt-5.5 NICHT gpt-4o).

---

🚀 **GO.**
