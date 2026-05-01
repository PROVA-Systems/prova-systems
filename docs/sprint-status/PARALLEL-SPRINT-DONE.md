# Parallel-Sprint — DONE

**Datum:** 01.05.2026 mittag (während Marcel Option C testet)
**Mode:** isolierte Tasks, KEIN Auth-Code, KEIN Service-Worker, KEIN Frontend-Render
**Ergebnis:** 3/3 SUCCESS · 3 Branches gepusht · KEIN Merge in main

---

## Task 1 — Cluster-Review-Cleanup ✅ SUCCESS

**Branch:** `cleanup/cluster-review-auto`
**Commit:** `bfcb0f5`
**Aktion:** 20 DEAD-Pages gelöscht, 3 BLOCKED zur Marcel-Review

### Pre-Check Methodik
Pro File: `grep` über `*.html`, `*.js`, `*.toml`, `*.json` mit Filter:
- ❌ ignorieren: das File selbst
- ❌ ignorieren: `prova-layout.config.js` (Catalog, weak ref)
- ❌ ignorieren: `docs/`, `briefe/`, `node_modules/`, `playwright-report/`
- ✅ blockieren bei: andere HTML, *-logic.js, sw.js, netlify.toml, _redirects, app-logic.js (Wizard-Registry)

### 20 SAFE-DELETED

```
angebot-gutachten.html               beauftragungsbestaetigung-gericht.html
checkliste-brandschaden.html         deckungsanfrage.html
einladung-ortstermin-gericht.html    ergaenzungsfragen-antwort.html
fristverlaengerungsantrag.html       honorarvereinbarung.html
kostenrahmen-erhoehung.html          kostenvoranschlag-sanierung.html
kostenvorschuss-gericht.html         maengelanzeige.html
maengelruege.html                    messprotokoll-feuchte.html
messprotokoll-risse.html             ortstermin-protokoll.html
umladebrief-ortstermin.html          stellungnahme-v3.1.html
stellungnahme-gate.html              effizienz.html
```

**−3350 Zeilen** netto. Smoke-Test: 15/15 PASS.

### 3 BLOCKED (NICHT gelöscht — Marcel-Review)

| File | Grund |
|---|---|
| `ortstermin-arbeitsblatt.html` | Link in `benachrichtigungen.html:632` als Action-Button („Arbeitsblatt"-Quick-Link). Ein einzelner Live-Ref. |
| `vorlage-10-schiedsgutachten.html` ↔ `vorlage-11-bauabnahmeprotokoll.html` | Cross-Ref auf gegenseitige „Vorlage 10/11"-Navigations-Buttons. Transitive cleanup möglich wenn beide gleichzeitig gelöscht — Marcel-Entscheidung. |

### 2 pdfmonkey-Templates NICHT angetastet

`pdfmonkey-brief-template.html`, `pdfmonkey-messprotokoll-template.html` — Cluster-Review-Doc sagt „DELETE oder VERSCHIEBEN nach `docs/templates-source/`". Marcel-Entscheidung steht aus.

### Nächster Schritt

Marcel reviewt → Merge `cleanup/cluster-review-auto` in main → optional Folge-Sprint für die 3 BLOCKED-Pages + 2 pdfmonkey-Files.

---

## Task 2 — KI-PROMPTS-MASTER.md Skeleton ✅ SUCCESS

**Branch:** `docs/ki-prompts-master-skeleton`
**Commit:** `818bdfb`
**Aktion:** Neue Datei `KI-PROMPTS-MASTER.md` (289 Zeilen) im Repo-Root

### Inhalt-Struktur

- **Architektur-Hinweise:** Pseudonymisierungs-Pflicht, Modell-Wahl-Konvention (CLAUDE.md Regel 14: GPT-4o für Konjunktiv-II, NICHT 4o-mini), Halluzinations-Verbot, KI-Funktions-Garantie
- **4 Flow-Sektionen:**
  - Flow A Schadensgutachten — §1 bis §6 mit Modell-Wahl + Token-Budget pro Slot
  - Flow B Wertgutachten
  - Flow C Beratung
  - Flow D Baubegleitung
- **Cross-Cutting-Slots:**
  - Halluzinations-Check (auto vor Freigabe, GPT-4o)
  - Konjunktiv-II-Validator (opt-in S3, GPT-4o **NUR**)
  - §4↔§6 Konsistenz-Check
- **Test-Protokoll** (5 Tests pro Slot, CLAUDE.md Regel 15)
- **Kosten-Tracking-Hinweis** (`ki_protokoll`-Tabelle, Regel 16)

### Status

Alle Slots sind als **TBD Sprint 9** markiert. Inhaltliche Prompts werden im KI-Prompt-Härtungs-Sprint gefüllt. Diese Datei ist **Single-Source-of-Truth** — ohne Eintrag hier keine Live-Schaltung.

### Nächster Schritt

Marcel reviewt Skeleton-Struktur → Merge in main → Sprint 9 füllt Slots.

---

## Task 3 — Pricing-Diskrepanz ✅ SUCCESS

**Branch:** `fix/pricing-discrepancy`
**Commit:** `f733c98`
**Aktion:** `index.html` Zeile 1809: `25 Gutachten` → `30 Gutachten`

### Gefundene Diskrepanz

| File | Zeile | Vorher | Nachher |
|---|---|---|---|
| `index.html` | 1809 | `<strong>25 Gutachten</strong> pro Monat inklusive` | `<strong>30 Gutachten</strong> pro Monat inklusive` |

**Bekannt aus:** Memory + `OPTION-C-INVENTORY.md` Lessons-Learned. `pricing.html` ist die kanonische Version mit `30 Aufträge` für Solo (Phase 4 Marcel-Direktive).

### NICHT gemacht (bewusst)

- **Wording-Sync** „Gutachten" vs „Aufträge" — pricing.html sagt „Aufträge", index.html sagt jetzt „30 Gutachten". Wort-Inkonsistenz bleibt. Strikt nach Marcel-Spec „25 → 30 (im Marketing-Kontext)" — Number-Fix, kein Wording-Refactor.
- **Team-Tier-Sync** (Zeile 1837 `75 Gutachten`) — `pricing.html` sagt für Team „unbegrenzt", aber `index.html`-Team-Card hat eigenes „Demnächst"-Banner mit 75-Slot-Vorschau. Separater Sprint nötig falls Team-Marketing aktualisiert werden soll.

### Smoke-Test

15/15 PASS.

### Nächster Schritt

Marcel reviewt 1-Zeilen-Edit → Merge `fix/pricing-discrepancy` in main → Pricing-Page zeigt konsistente Zahl.

---

## 🚨 Konflikt-Protokoll-Status

Keiner der 3 Tasks musste in `NACHT-PAUSE-PARALLEL.md` dokumentiert werden:
- Task 1: 3 BLOCKED-Pages dokumentiert IM Commit-Message + diesem Status-Doc, kein Konflikt
- Task 2: kein Konflikt (neuer File)
- Task 3: kein Konflikt (1 klarer Treffer, eindeutiger Fix)

---

## Übersicht aller 3 Branches (alle gepusht, KEIN Merge in main)

| Branch | Commit | Files Δ | Smoke-Test |
|---|---|---|---|
| `cleanup/cluster-review-auto` | `bfcb0f5` | -20 Files (-3350 LOC) | ✅ 15/15 |
| `docs/ki-prompts-master-skeleton` | `818bdfb` | +1 File (+289 LOC) | n/a (Doku-only) |
| `fix/pricing-discrepancy` | `f733c98` | 1 File (-1+1 LOC) | ✅ 15/15 |

---

## Marcel-Review Aktionen (nach Option-C-Test)

1. `cleanup/cluster-review-auto` reviewen → mergen wenn OK
   - Plus optional: 3 BLOCKED-Pages entscheiden (ortstermin-arbeitsblatt-Link weg + delete? Vorlagen 10+11 transitive delete?)
2. `docs/ki-prompts-master-skeleton` reviewen → mergen
3. `fix/pricing-discrepancy` reviewen → mergen
4. (separat) pdfmonkey-Templates: DELETE oder `docs/templates-source/`?
5. (separat) Team-Tier-Marketing-Sync (75 → unbegrenzt)?

---

*Parallel-Sprint abgeschlossen 01.05.2026 mittag · 3/3 SUCCESS · 3 Branches gepusht · KEIN Merge in main*
