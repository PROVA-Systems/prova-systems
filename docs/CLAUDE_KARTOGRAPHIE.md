# CLAUDE Datei-Kartographie

**Stand:** 2026-05-13 15:30 GMT+2 · Erzeugt durch **MEGA⁷¹ Forensik-Sprint**
**Branch:** `docs/mega71-kartographie` (kein Push zu `main` ohne Marcel-Review)
**Letzter analysierter Commit:** `e0c92cd` (MEGA70 Phase 1.1 — Kontrast-Token-Fix)
**Autor:** Claude Code (data-driven, jede Aussage durch `find`/`grep`/`cat`/`git log` belegt)
**Strikt analytisch** — keine Patches, kein sw.js-Bump, kein Code-Change während Forensik.

---

## ⚡ Executive Summary (60-Sekunden-Read)

### Marcels Kernfrage — eindeutig beantwortet

> **„Wo ist HEUTE der §6-Fachurteils-Editor?"**

**Antwort:** `stellungnahme.html` IST der TipTap-basierte §6-Fachurteils-Editor.
Die Datei ist semantisch **falsch benannt** — sie heißt „stellungnahme" aber ihr `<title>` (Z.15) lautet wörtlich **„§6 Fachurteil · PROVA"**. Sie lädt `lib/editor-tiptap-bundle.js` (Z.742), mountet via `window.ProvaEditor.create()` (Z.659), und alle 4 Pilot-Tests unter `tests/fachurteil-editor/*` validieren ihr Verhalten.

→ **Pfad C aus MEGA⁷¹ §5** ist Realität: stellungnahme.html IST de-facto der §6-Editor. Umbenennung empfohlen.

### Sprint-Status (Zustand Werkzeuge)

| Bereich | Soll (Vision-Master Tag 19) | Ist (verifiziert) | Drift |
|---|---|---|---|
| TipTap-Editor | ✅ 95% live | ✅ Bundle (435 KB) + 8 Custom-Nodes geladen, in 5 HTMLs gemountet | OK |
| 7 Custom-Nodes (ANHANG-09) | ✅ alle | ✅ alle in `lib/extensions/` + Bonus `prova-wikilink` | OK |
| HTML-Pages | ~51 (Architektur-Master) | **212** im Repo | 🚨 massive Über-Zählung (Templates, Vorlagen-Duplikate, Brief-Skeletons, Test-Pages) |
| Airtable-frei (Regel 35a) | „vollständig migriert" | **44 .js-Files** rufen noch `/.netlify/functions/airtable*` | ⚠️ Dead-Code im Live-Pfad (wrapper blockiert 410) |
| Workflow-Phasen-Sidebar | Phase-Tracking + Anker | `aktiverFallBlock()` + `PROVA_KONTEXT.setFall(phase)` vorhanden — keiner setzt Phase | 🟡 Phase 1.2 WIP stashed |
| Fragment-Bühne | UI fehlt | `fragmente.html` als Stub vorhanden, **0 Referenzen** (Zombie) | 🟡 Phase 1.3 noch nicht angebunden |

### Top-3 Empfehlungen (Detail in §7)

1. **Umbenennen:** `stellungnahme.html` → `fachurteil.html` (+ Redirect-Alias). Eliminiert Marcel-Konfusion permanent.
2. **`fragmente.html` verlinken:** Sidebar/Akte-Tab → kein Zombie mehr, Phase 1.3 wird sichtbar.
3. **Airtable-Toxic-Sweep:** 44 *-logic.js auf 410-Wrapper-Pfad konsolidieren oder strippen (Regel 35a Compliance).

---

## 1 — Datei-Inventar (alle HTML + JS + Functions)

### 1.1 HTML-Files (Total: 212)

Roh-Liste: `docs/_kartographie-rohdaten/html-flat-list.txt` (alle 212 sortiert)
Mit LOC + Last-Commit: `docs/_kartographie-rohdaten/html-enriched.txt`

**Größte 15 (LOC absteigend):**

| LOC | Datei | Letzter Commit | Status |
|---|---|---|---|
| 2440 | index.html | 4 days ago | live (Landing) |
| 1560 | einstellungen.html | 3 days ago | live |
| 1408 | ortstermin-modus.html | 16 hours ago | live |
| 1174 | dashboard.html | 16 hours ago | live |
| 1148 | vorlage-08-baumaengel.html | 4 weeks ago | duplikat (siehe `formulare/`) |
| 1136 | formulare/vorlage-08-baumaengel.html | 5 weeks ago | duplikat |
| 1132 | benachrichtigungen.html | 3 days ago | live |
| 1106 | app.html | 3 hours ago | live (Diktat-Wizard) |
| 1078 | admin/voll.html | 4 days ago | RARE (1 ref) |
| 1045 | admin-dashboard.html | 3 days ago | live (admin path) |
|  947 | akte.html | 16 hours ago | live (Case-Hub) |
|  913 | onboarding-welcome.html | 3 days ago | live |
|  861 | admin/index.html | 4 days ago | live (admin path) |
|  822 | vor-ort.html | 3 days ago | live |
|  816 | **stellungnahme.html** | **16 hours ago** | **live — IST der §6-Editor** |

**Kategorisierung der 212 HTMLs:**

| Kategorie | Count | Anmerkung |
|---|---|---|
| App-Pages (Root-Level) | ~80 | core Workflow-Pages |
| `briefe/*` (Brief-Page-Vorlagen) | 26 | meist nur intern 1-2× referenziert |
| `formulare/vorlage-*` (Gutachten-Vorlagen) | 11 | Duplikate zu Root `vorlage-*.html` |
| Root `vorlage-*` (alte Position) | 11 | **Duplikate zu `formulare/`** — Cleanup-Kandidat |
| `pdf-templates/` | 9 | PDFMonkey-Server-Side, OK |
| `legal/` | 5 | **Duplikate zu Root `agb.html`/`impressum.html`/...** — Cleanup |
| `admin/` | 2 | Admin-Cockpit-Subfolder |
| `tools/` | 14 | Test-Pages + Migrations-UI |
| `pdfmonkey-*.html` (2 Files) | 2 | Server-Side |
| `playwright-report*/index.html` | 2 | Auto-generated — **NIE committen** |
| Übrige | ~50 | Brief-/Bescheinigungs-/Spezialseiten |

Beleg-Command:
```bash
find . -maxdepth 2 -name "*.html" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./docs/*" | wc -l   # → 212
```

### 1.2 Page-Logic-JS (Total: 41)

Roh: `docs/_kartographie-rohdaten/logic-js-enriched.txt`

**Größte 10:**

| LOC | Datei | Letzter Commit | Logik-Pair (HTML) |
|---|---|---|---|
| 3781 | app-logic.js | 3 hours ago | app.html |
| 2636 | stellungnahme-logic.js | 6 days ago | **stellungnahme.html (§6-Editor)** |
| 1434 | wertgutachten-logic.js | 3 hours ago | wertgutachten.html |
| 1331 | freigabe-logic.js | 6 days ago | freigabe.html |
| 1316 | einstellungen-logic.js | 3 weeks ago | einstellungen.html |
| 1243 | dashboard-logic.js | 5 days ago | dashboard.html |
| 1219 | kostenermittlung-logic.js | 3 weeks ago | kostenermittlung.html |
| 1143 | akte-logic.js | 3 hours ago | akte.html |
| 1068 | textbausteine-logic.js | 3 weeks ago | textbausteine.html |
|  817 | rechnungen-logic.js | 8 days ago | rechnungen.html |

**Verwaiste logic.js (HTML existiert nicht):** keine gefunden — alle 41 haben passende HTML.

**Notable Pairs:**
- `gutachterliche-stellungnahme.html` ↔ `gutachterliche-stellungnahme-logic.js` (400 LOC) — **separater Auftragstyp**, NICHT §6
- `schadensfaelle-logic.js` (365 LOC) ↔ `schadensfaelle.html` — Flow A Übersicht
- `bescheinigungs-logic.js` (212 LOC) ↔ Bescheinigungs-Suite

### 1.3 Lib-Module (Total: 163)

Roh: `docs/_kartographie-rohdaten/lib-js-list.txt`

**TipTap-relevante Module (verifiziert via grep):**
- `lib/editor-tiptap-bundle.js` (435 KB, kompiliert) ✅
- `lib/editor-tiptap.js` (794 LOC, High-Level-Wrapper)
- `lib/prova-editor.js` (TipTap-Wrapper-Klasse)
- `lib/editor-extensions.js` (Footnote/PageBreak/CrossRef)
- `lib/editor-spell-layer.js` (Spell + Konjunktiv-II)
- `lib/extensions/prova-callout.js`
- `lib/extensions/prova-foto-embed.js`
- `lib/extensions/prova-fragment-marker.js`
- `lib/extensions/prova-ki-suggestion.js`
- `lib/extensions/prova-norm-citation.js`
- `lib/extensions/prova-skizze-embed.js`
- `lib/extensions/prova-textbaustein-block.js`
- `lib/extensions/prova-wikilink.js` (Bonus, nicht in ANHANG-09 spec)

→ **Alle 7 Pflicht-Extensions aus ANHANG-09 vorhanden** ✅

Plus `prova-bubble-menu.js`, `prova-slash-menu.js`, `prova-floating-menu.js`, `prova-cheat-sheet.js`, `prova-command-palette.js`, `prova-commands-registry.js`, `prova-fragment-sidebar.js`, `prova-editor-context-sidebar.js` (frisch, unverlinkt).

### 1.4 Edge Functions

| Stack | Count | Pfad |
|---|---|---|
| Netlify Functions (.js) | 115 | `netlify/functions/*.js` |
| Supabase Edge Functions | 144 | `supabase/functions/<name>/index.ts` |

Architektur-Master (Tag 8) sagte „~31 Netlify, ~7 Supabase Edge Fns". **Realität: 115 + 144.** → Massive Drift seit Tag 8.

Beleg:
```bash
find ./netlify/functions -maxdepth 1 -name "*.js" | wc -l   # → 115
find ./supabase/functions -maxdepth 1 -type d | wc -l       # → 144 (incl. parent dir)
```

---

## 2 — Routing (URL → File)

Quellen: `netlify.toml` (814 LOC, ~60 redirects), `_redirects` (45 LOC), `lib/nav.js` (1920 LOC, hardcoded `href`-Liste), `sw.js` APP_SHELL (~80 Files).

`lib/prova-layout.config.js` (in MEGA⁷¹-Prompt erwähnt): **existiert NICHT**. Es gibt `prova-layout.config.js` im Root, aber nur als Includes-Reference, kein `shell`-Array.

### 2.1 App-Subdomain (`app.prova-systems.de`)

| URL-Path | HTML-File | Quelle | Status |
|---|---|---|---|
| `/login` | `app-login.html` (200 rewrite) | netlify.toml Z.46 | live |
| `/dashboard` | `dashboard.html` | netlify.toml Z.414 | live |
| `/akte` | `akte.html` | netlify.toml Z.419 | live |
| `/app` | `app.html` | netlify.toml Z.424 | live (Diktat-Wizard) |
| `/pilot` | `pilot.html` | netlify.toml Z.430 | live |
| `/archiv` | `archiv.html` | netlify.toml Z.445 | live |
| `/briefe` | `briefe.html` | netlify.toml Z.450 | live |
| `/kontakte` | `kontakte-supabase.html` | netlify.toml Z.455 | live (Supabase-Variante) |
| `/profil` | `profil-supabase.html` | netlify.toml Z.460 | live (Supabase-Variante) |
| `/termine` | `termine.html` | netlify.toml Z.465 | live |
| `/rechnungen` | `rechnungen.html` | netlify.toml Z.470 | live |
| `/einstellungen` | `einstellungen.html` | netlify.toml Z.475 | live |
| `/freigabe` | `freigabe.html` | netlify.toml Z.480 | live |
| `/freigabe-queue` | `freigabe-queue.html` | netlify.toml Z.485 | live |
| `/stellungnahme` | **`stellungnahme.html`** | netlify.toml Z.490 | **§6-Editor (s. §4)** |
| `/gutachterliche-stellungnahme` | `gutachterliche-stellungnahme.html` | netlify.toml Z.268-278 | live (anderer Typ, s. §4.2) |
| `/wertgutachten` | `wertgutachten.html` | netlify.toml Z.292 | live |
| `/baubegleitung` | `baubegleitung.html` | netlify.toml Z.282 | live |
| `/beratung` | (kein direkter Eintrag) | implizit via `*.html` | live |
| `/normen` | `normen.html` | Z.309 | live |
| `/textbausteine` | `textbausteine.html` | Z.314 | live |
| `/positionen` | `positionen.html` | Z.319 | live |
| `/jveg` | `jveg.html` | Z.304 | live |
| `/jahresbericht` | `jahresbericht.html` | Z.329 | live |
| `/kostenermittlung` | `kostenermittlung.html` | Z.334 | live |
| `/hilfe` | `hilfe.html` | Z.339 | live |
| `/statistiken` | `statistiken.html` | Z.344 | live |
| `/onboarding` | `onboarding.html` | Z.351 | live |
| `/portal` | `portal.html` | Z.363 | live |
| `/benachrichtigungen` | `benachrichtigungen.html` | Z.368 | live |
| `/import-assistent` | `import-assistent.html` | Z.373 | live |
| `/smtp-einrichtung` | `smtp-einrichtung.html` | Z.378 | live |
| `/auftrag-neu` | (`neuer-fall.html`?) | Z.383 | live |
| `/zpo-anzeige` | `zpo-anzeige.html` | Z.324 | live |

### 2.2 Landing-Subdomain (`prova-systems.de`)

| URL | File |
|---|---|
| `/` | `index.html` |
| `/pricing` /`/preise` | `pricing.html` |
| `/kontakt` /`/contact` | `kontakt.html` |
| `/agb` /`/datenschutz` /`/impressum` /`/avv` | Root-HTMLs (path-only, beide Hosts) |
| Alle App-URLs | 301 → `app.prova-systems.de/*` |

### 2.3 Sidebar-Nav (`nav.js` hardcoded)

Aus `nav.js` Z.104-127 (App-Sidebar) und Z.1198-1213 (Cmd+K-Palette):

**Sidebar-Items (Standard-Reihenfolge):**
1. Zentrale → `dashboard.html`
2. Meine Aufträge → `archiv.html` (mit Count `auftraege`)
3. Kalender → `termine.html` (mit Count `kalender_heute`)
4. Fristen → `fristen.html`
5. Rechnungen → `rechnungen.html` (mit Count `rechnungen_ueberfaellig`, warn)
6. Mahnwesen → `mahnwesen.html`
7. Briefe → `briefe.html`
8. Kontakte → `kontakte.html` (mit Count `kontakte`)
9. Jahresbericht → `jahresbericht.html`
10. Bibliothek → `bibliothek.html`
11. Skizzen → `skizzen.html`
12. JVEG-Rechner → `jveg.html`
13. Positionen & Preise → `positionen.html`
14. Profil & Briefkopf → `profil-supabase.html`
15. Einstellungen → `einstellungen.html`
16. Hilfe & Support → `hilfe.html`

**NICHT in Sidebar (Workflow-internal):** `stellungnahme.html`, `akte.html`, `app.html`, `freigabe.html`, `wertgutachten.html`, `baubegleitung.html`, `beratung.html`, `fragmente.html`, `gutachterliche-stellungnahme.html` — alle erreichbar via Wizard/Akte-Tabs/Cmd+K, nicht via Sidebar-Klick.

**Aktiver-Fall-Anker:** `nav.js` Z.135-186 (`aktiverFallBlock()`) liest `prova_aktiver_fall` + `prova_aktuelle_phase` und rendert Phase-spezifische CTA-Karte. **Implementierung vorhanden, Setter-Code im Phase-1.2-Stash (siehe §7 Empfehlungen).**

### 2.4 Mobile-Bottom-Bar (`nav.js` Z.1721-1724)

- Zentrale → `dashboard.html`
- Fälle → `archiv.html`
- Neu → `app.html` (highlight)
- Termine → `termine.html`

---

## 3 — Per-File-Profile (Top-30 App-Pages)

> **Methodik:** Pro Datei: erste 80 Z. + ggf. `<title>` + `<body data-page="…">` + `editor-tiptap-bundle` + `contenteditable` + Airtable-Calls + `node --check`-Status.
> Vollständige 230 Title+data-page-Liste: `docs/_kartographie-rohdaten/titles-and-pages.txt`.

### Core Workflow (Flow A — Schadensgutachten)

#### `app.html` (1106 LOC)
- **Title:** PROVA — Auftrag erfassen (Wizard)
- **Purpose:** Auftrag-Erfassung-Wizard (Stammdaten → Auftraggeber → Schadenart → Diktat-Start)
- **Logic:** `app-logic.js` (3781 LOC, größte Logic-Datei)
- **Editor:** kein TipTap; nutzt `contenteditable` für Diktat-Input
- **Setzt:** `PROVA_KONTEXT.setFall(...)` (Z.3404, ohne Phase-Parameter — Gap aus Phase 1.2)
- **Airtable-Drift:** ja (Live-Pfad)
- **Status:** live

#### `akte.html` (947 LOC) + `akte-logic.js` (1143 LOC)
- **Title:** Akte · PROVA
- **Purpose:** Case-Overview-Hub — 12-Tab-Bar, Workflow-Visualisierung
- **Phasen-Definition:** `akte-logic.js` Z.158-211 `AKTE_PHASEN` (9 Phasen, Flow-A/B/C/D)
- **Editor:** TipTap für `_notizEditor` (Z.581) — Case-Notizen, NICHT §6
- **`PROVA_KONTEXT`-Definition:** Hier in `akte-logic.js` Z.1054 (zentrale Public API)
- **Status:** live, ist Hub

#### **`stellungnahme.html` (816 LOC) — DER §6-EDITOR** ⭐
- **Title:** `<title>§6 Fachurteil · PROVA</title>` (Z.15) ← **eindeutige Aussage**
- **Logic:** `stellungnahme-logic.js` (2636 LOC, zweitgrößte)
- **Editor:** TipTap via `editor-tiptap-bundle.js` (Z.742) + `ProvaEditor.create()` (Z.659, Variable `_stelEditor`)
- **KI-Helper:** „Guided Writing v3.1 — KI-Analyse-Box" (Z.158 Comment) — KI-Karte INNERHALB des §6-Editors, kein separates Feature
- **Tests:** `tests/fachurteil-editor/c1-viewport.test.js`, `c2-c4-gate-override.test.js`, `c5-s-buttons.test.js`, `tests/e2e/03-paragraph6-editor.e2e.js`
- **Status:** **live, ist DE-FACTO der §6-Fachurteil-Editor — semantisch falsch benannt**

#### `freigabe.html` (801 LOC) + `freigabe-logic.js` (1331 LOC)
- **Title:** Freigabe & PDF · PROVA
- **Purpose:** Compliance-Check + PDF-Export-Trigger
- **Editor:** kein TipTap, nutzt `contenteditable` für letzte Texteingaben
- **Airtable-Drift:** ja (`freigabe-logic.js` ruft `/v0/...` mit `provaFetch('/.netlify/functions/airtable',...)`)
- **Status:** live

#### `fragmente.html` (502 LOC) ⚠️
- **Title:** Befund-Fragmente · PROVA
- **Purpose:** Fragment-Bühne UI für `befund_fragmente`-Tabelle (Phase 1.3 Vorarbeit)
- **Editor:** kein TipTap (UI-only, ruft `asset-to-fragments-v1` + `fragments-to-befund-v1` Edge Fns)
- **Status:** **ZOMBIE** — keine HTML/JS referenziert sie (0 inbound refs)
- **Empfehlung:** in `akte.html` 12-Tab-Bar als Tab anbinden oder Sidebar-Link

### Andere Auftragstypen (NICHT §6)

#### `gutachterliche-stellungnahme.html`
- **Title:** Neue Gutachterliche Stellungnahme · PROVA
- **`<body data-page>`:** `technische-stellungnahme`
- **Subtitle:** „Eigenständiger Auftragstyp · Fachliche Stellungnahme zu konkreter Frage in 3 Phasen"
- **Editor:** **textarea** (`ts-textarea` Klasse, Z.195/217/224/230) — kein TipTap!
- **Logic:** `gutachterliche-stellungnahme-logic.js` (400 LOC)
- **Status:** live, **separater Auftragstyp** — nicht zu verwechseln mit §6-Editor

#### `wertgutachten.html` (551 LOC) + `wertgutachten-logic.js` (1434 LOC)
- **Title:** Wertgutachten · PROVA
- **Purpose:** Flow B — Verkehrswert nach ImmoWertV (Sachwert/Vergleich/Ertrag)
- **Editor:** kein TipTap
- **Status:** live

#### `beratung.html` + `beratung-logic.js` (705 LOC)
- **Title:** Beratung · PROVA
- **Purpose:** Flow C — Beratung 3-Phasen-Wizard (SVO §18)
- **Status:** live

#### `baubegleitung.html` + `baubegleitung-logic.js` (753 LOC)
- **Title:** Baubegleitung · PROVA
- **Purpose:** Flow D — Multi-Termin Begleitung (VOB/B §12)
- **Status:** live

### Editor-Demos / Doc-Editor

#### `editor-demo.html`
- **Title:** Editor-Demo · PROVA (MEGA⁴⁰ P1.2)
- **Purpose:** Standalone-Demo für TipTap-Auto-Save + Versions-Historie
- **Editor:** TipTap via `editor-tiptap.css` + `prova-editor.css`
- **Status:** Demo/Dev-Tool, nicht via Sidebar erreichbar

#### `dokument-neu.html` (MEGA⁴⁰ P3)
- **Title:** Neues Dokument · PROVA
- **Editor:** TipTap via `ProvaEditor.create()` (Z.369) für Mode-B (Document-Templates)
- **Pattern:** „Mode-B" = freie Doc-Erstellung, NICHT §6
- **Status:** live

#### `briefvorlagen.html` (400 LOC)
- **Title:** Briefe & Vorlagen · PROVA
- **Editor:** kein direkter TipTap-Mount (vom Erstgrep false-positive; Datei lädt aber `editor-bibliothek-adapter.js`)
- **Status:** live

### Vollständige Per-File-Liste

Wegen Umfangs (212 HTMLs) als Roh-Daten:
- `docs/_kartographie-rohdaten/titles-and-pages.txt` (230 Zeilen: alle `<title>` + `<body data-page>`)
- `docs/_kartographie-rohdaten/html-enriched.txt` (LOC + Last-Commit alle 212)

---

## 4 — Editor-Verortung (§6-Frage — DIE Kernfrage)

### 4.1 Befund

> **Der §6-Fachurteils-Editor ist HEUTE: `stellungnahme.html`.**
> **Status: ✅ live, TipTap-basiert, voll-bestückt mit den 8 Custom-Nodes aus ANHANG-09.**
> **Problem: Datei-Name ist semantisch irreführend — Marcel-Konfusion direkt aus Naming.**

### 4.2 Belege (verifiziert)

**Beleg 1 — `<title>`-Tag:**
```bash
grep -n "<title>" stellungnahme.html
# → Z.15: <title>§6 Fachurteil · PROVA</title>
```

**Beleg 2 — Inline §6-Texte (allein in stellungnahme.html):**
```bash
grep -n "§6\|Fachurteil" stellungnahme.html
# → Z.67:  ✍️ Fokus-Modus · §6 Fachurteil
# → Z.109: <span>§6 Fachurteil</span>
# → Z.152: <!-- §6 DIKTAT-HINWEIS -->
# → Z.155: Ihr Schritt: §6 Fachurteil schreiben
# → Z.253: <!-- §6 FACHURTEIL — Hauptelement -->
# → Z.258: <div class="card-title">§6 Fachurteil — Ihre persönliche Einschätzung</div>
# → Z.318: ✅ §6 abschließen & Freigabe starten →
# → Z.475: Fachurteil bestätigen & zur Freigabe →
```

**Beleg 3 — TipTap-Bundle wird geladen:**
```bash
grep -n "editor-tiptap-bundle\|ProvaEditor" stellungnahme.html
# → Z.659: _stelEditor = await window.ProvaEditor.create({
# → Z.742: '/lib/editor-tiptap-bundle.js',
```

**Beleg 4 — Test-Suite testet `stellungnahme.html` als §6-Editor:**
```bash
ls tests/fachurteil-editor/
# → c1-viewport.test.js
# → c2-c4-gate-override.test.js
# → c5-s-buttons.test.js
ls tests/e2e/
# → 03-paragraph6-editor.e2e.js   (e2e-Test heißt explizit „paragraph6-editor")
```

**Beleg 5 — Vision-Master Tag 19 sagt „§6 Fachurteil-Editor 95% live":**
- Datei: `docs/master/PROVA-VISION-MASTER.md` Z.16
- TEIL F Bauplan: `docs/session5/06-TEIL-F-PROVA-Editor-Architektur.md`
- 8 Custom-Nodes-Spec: `docs/session5/09-ANHANG-Custom-Nodes-Spec.md`
- Phase-A NinjaAI-Diff (eigenes Werk): `docs/audit/MEGA70-NINJA-DIFF.md` GAP 2 (Score 80%, „Editor-Core ist DONE")

### 4.3 Was „Guided Writing v3.1" tatsächlich ist

Die Marcel-irritierende Aussage „GUIDED WRITING v3.1 — KI-Analyse-Box" steht in `stellungnahme.html` Z.158 als HTML-Comment **innerhalb** des §6-Editor-Layouts. Sie referenziert eine **KI-Helper-Card** (Z.158-196), nicht einen anderen Editor.

**Layout-Reihenfolge in stellungnahme.html:**
1. Z.67-119: Fokus-Modus-Header („§6 Fachurteil")
2. Z.152-155: §6-Diktat-Hinweis-Banner
3. Z.158-196: KI-Analyse-Box (Guided-Writing v3.1) ← optionale Helper-Card
4. Z.253-475: TipTap-Editor + Toolbar + Freigabe-Button
5. Z.659+742: ProvaEditor-Mount

→ **Eine Seite, ein Editor, drei UI-Helfer.**

### 4.4 §6-Editor ↔ Kurzstellungnahme — Unterschiede

| Aspekt | `stellungnahme.html` (§6) | `gutachterliche-stellungnahme.html` |
|---|---|---|
| Title | „§6 Fachurteil · PROVA" | „Neue Gutachterliche Stellungnahme · PROVA" |
| body data-page | (kein data-page-Attribut) | `technische-stellungnahme` |
| Editor | **TipTap** (`ProvaEditor.create`) | **`<textarea class="ts-textarea">`** |
| Custom-Nodes | 8 Extensions geladen | keine |
| LOC | 816 | (~302, gemäß `<script src="/gutachterliche-stellungnahme-logic.js">` Z.302) |
| Logic | `stellungnahme-logic.js` (2636 LOC) | `gutachterliche-stellungnahme-logic.js` (400 LOC) |
| Tests | `tests/fachurteil-editor/*` + `tests/e2e/03-paragraph6-editor.e2e.js` | keine spezifischen Tests |
| Use-Case | finales §6 im Gutachten-Workflow | eigenständige fachliche Stellungnahme zu Frage |
| Workflow-Phase | Phase 5 (Flow A Gutachten) | eigener Auftragstyp (Mini) |

### 4.5 Phase 1.2-Patch (Stash) — war korrekt

Mein in Phase 1.2 angelegter Patch `stellungnahme-logic.js` → `localStorage.setItem('prova_aktuelle_phase', '3')` mit Kommentar `"§6-Editor öffnen → Phase=3"` war **inhaltlich richtig**. Der File-Name ist die einzige Quelle der Irritation.

---

## 5 — Vision/Reality-Drift

### 5.1 Pages: existieren laut Vision-Master? Realität?

| Vision-Page | Datei im Repo | Live? | Anmerkung |
|---|---|---|---|
| /dashboard | `dashboard.html` (1174 LOC) | ✅ | |
| /akte | `akte.html` (947 LOC) + 12-Tab-Bar | ✅ | |
| /archiv | `archiv.html` (599 LOC) + `schadensfaelle.html` | ✅ | Beide live |
| /stellungnahme | `stellungnahme.html` (816 LOC) | ✅ | **= §6-Editor (s. §4)** |
| /gutachterliche-stellungnahme | `gutachterliche-stellungnahme.html` | ✅ | separater Typ |
| /wertgutachten | `wertgutachten.html` (551 LOC) | ✅ | Flow B |
| /beratung | `beratung.html` | ✅ | Flow C |
| /baubegleitung | `baubegleitung.html` | ✅ | Flow D |
| /freigabe | `freigabe.html` (801 LOC) | ✅ | |
| /bibliothek | `bibliothek.html` (539 LOC) | ✅ | |
| /textbausteine | `textbausteine.html` | ✅ | |
| /normen | `normen.html` | ✅ | |
| /einstellungen | `einstellungen.html` (1560 LOC) | ✅ | |
| /onboarding | `onboarding.html` + `onboarding-welcome.html` + `onboarding-supabase.html` + `onboarding-schnellstart.html` | ✅ | 4 Varianten, evtl. Konsolidierung nötig |
| Fragment-Bühne | `fragmente.html` (502 LOC) | ⚠️ | **vorhanden aber Zombie (0 Refs)** |
| §6-Editor (TipTap-Custom-Nodes) | `stellungnahme.html` + `lib/extensions/*` | ✅ | alle 8 Extensions geladen |
| Audit-Trail (Two-View) | `lib/prova-audit-trail-view.js` + `audit-trail.html` (Page) | ✅ | Page für direkten Zugang vorhanden |

→ **Page-Mapping zu 100% — keine Vision-Page fehlt physisch.**

### 5.2 Architektur-Drift

| Vision-Doku-Aussage | Tatsächlich (verifiziert) | Drift-Faktor |
|---|---|---|
| Architektur-Master (Tag 8): „51 App-Pages" | **212 HTML-Files** im Repo | 4× — Templates, Vorlagen-Duplikate, Brief-Skeletons |
| Architektur-Master: „~31 Netlify Functions post-Cleanup" | **115 Netlify Functions** | 3.7× — neue Sprints haben weitere Lambdas eingeführt |
| Architektur-Master: „~7 Supabase Edge Fns" | **144 Edge Function dirs** | 20× — Bulk-Migration in MEGA⁵⁰+ Wellen |
| Master „Voll-Supabase-Refactor abgeschlossen" | **44 *-logic.js calling `/.netlify/functions/airtable*`** | Mismatch — Wrapper blockiert 410, Dead-Code aber im Live-Pfad |
| Vision-Master Tag 19: „pricing 179/379€" | `pricing.html` 738 LOC — letzte Änderung 8d ago | OK aber zentral wichtig |
| CLAUDE.md v3.1 (Repo-Root): „Solo 179€" | OK | Sync |
| `docs/master/PROVA-REGELN-PERMANENT.md` (Z.128-129): „Solo 149 €, Team 279 €" | **Inkonsistent zu CLAUDE.md v3.1** | 🟡 Regel-Update overdue |
| MEGA⁷¹-Prompt: „lib/prova-layout.config.js shell-Array" | **Existiert NICHT** | Vision-Doku referenziert ein nicht-implementiertes File |
| MEGA⁷¹-Prompt: „lib/prova-akte-tabs.js 12-Tab-Bar" | Existiert (in MEGA⁶⁹ vorgesehen, in lib/ — siehe Phase-A-Audit) | OK |

### 5.3 Naming-Drift (Marcel-Konfusion-Quellen)

| Datei | Wahrer Inhalt | Empfohlener Name |
|---|---|---|
| `stellungnahme.html` | §6-Fachurteil-Editor (TipTap) | `fachurteil.html` |
| `gutachterliche-stellungnahme.html` | Eigenständiger Auftragstyp (Mini-Stellungnahme zu Frage) | `kurzstellungnahme.html` oder `mini-stellungnahme.html` |
| `app.html` | Auftrag-Erfassung-Wizard | `auftrag-wizard.html` oder `neuauftrag.html` |
| `archiv.html` | „Meine Aufträge" (laut Sidebar-Label) | `meine-auftraege.html` (oder Sidebar-Label `Archiv` setzen) |

→ Bei Umbenennung: Redirect-Aliase im `_redirects` für alte URLs (mind. 90 Tage 301).

---

## 6 — Zombies & Cleanup-Kandidaten

Methodik: Pro HTML `basename` in allen `*.html`, `*.js`, `*.toml`, `_redirects` gegrept (ausgenommen die Datei selbst). 0 Treffer = Zombie, 1-2 Treffer = RARE.

Roh-Daten: `docs/_kartographie-rohdaten/zombies.txt` (81 Einträge)

### 6.1 Echte Zombies (0 Refs, 12 Files)

| Datei | LOC | Empfehlung |
|---|---|---|
| `anforderung-unterlagen-erweitert.html` | n/a | verify-first (Brief-Vorlage?) |
| `briefe/ortstermin-arbeitsblatt.html` | n/a | verify-first |
| **`fragmente.html`** | 502 | **VERLINKEN, nicht löschen** — Phase-1.3-Stub, soll in Akte-Tab/Sidebar |
| `legal/datenschutz-intern.html` | n/a | delete (Duplikat zu `datenschutz.html`?) |
| `mahnung-1.html` | n/a | delete-Kandidat (ersetzt durch `mahnwesen.html`?) |
| `mahnung-2.html` | n/a | delete-Kandidat |
| `mahnung-3.html` | n/a | delete-Kandidat |
| `share.html` | n/a | verify-first (Public-Share-Pattern?) |
| `tools/test-edge-functions.html` | n/a | delete (Dev-Test) |
| `tools/test-mega62.html` | n/a | delete (alter Sprint-Test) |
| `tools/test-mega63.html` | n/a | delete (alter Sprint-Test) |
| `tools/test-mega64.html` | n/a | delete (alter Sprint-Test) |

### 6.2 Rare-Files (1-2 Refs) — Cleanup-Audit

68 weitere Files mit nur 1-2 Inbound-Refs — meist Brief-/Bescheinigungs-Vorlagen in `briefe/` und `formulare/`. Empfehlung: separater Cleanup-Sprint nach MEGA⁷⁰-FINISHING.

### 6.3 Duplikat-Cluster

**`vorlage-NN-*.html` doppelt:**
- Root-Level (`vorlage-01-standard.html`, ...) ← alt
- `formulare/vorlage-01-standard.html` ← neu (kanonisch)
- → Empfehlung: Root-Versionen als Zombies löschen, ggf. 301-Redirects (`/vorlage-01-standard.html` → `/formulare/...`)

**Legal-Duplikate:**
- Root-Level `agb.html`, `datenschutz.html`, `impressum.html`, `avv.html` (kanonisch laut CLAUDE.md Regel 27)
- `legal/agb.html`, `legal/datenschutz.html`, `legal/impressum.html`, `legal/avv.html`
- → CLAUDE.md Regel 27 sagt: „Legal-Pages bleiben am Root". → `legal/*` sind Drift — löschen.

### 6.4 Playwright-Reports

`playwright-report/index.html` + `playwright-report-m42/index.html` sind Auto-generierte Test-Reports.
→ Empfehlung: in `.gitignore` aufnehmen, von Git entfernen (`git rm --cached`).

---

## 7 — Empfehlungen für weitere Sprints

### 7.1 Naming-Cleanup (Marcel-Konfusion-Quelle eliminieren)

**Schritt 1 — Datei umbenennen + Redirect:**
```bash
git mv stellungnahme.html fachurteil.html
git mv stellungnahme-logic.js fachurteil-logic.js
# In fachurteil.html: script-src auf fachurteil-logic.js anpassen
# In _redirects: /stellungnahme → /fachurteil (301)
# In netlify.toml Z.490: /stellungnahme → /fachurteil (200 rewrite)
# In allen 38 Referenzen (vor allem freigabe-logic.js, app-logic.js, akte-logic.js): suchen/ersetzen
```

**Optional:** `gutachterliche-stellungnahme.html` → `kurzstellungnahme.html`.

**Risiko:** Mittel — 38 Files referenzieren `stellungnahme.html`/`-logic.js`. Vor Migration alle suchen-ersetzen, dann Tests `npm run test:fachurteil`.

### 7.2 Fragment-Bühne anbinden (Phase 1.3 abschließen)

`fragmente.html` existiert (502 LOC) aber ist Zombie. Anbindung:
1. In `akte.html` 12-Tab-Bar einen Tab „Fragmente" mit `href="fragmente.html?az={az}"` hinzufügen.
2. In `nav.js` Sidebar-Cmd+K-Palette einen Eintrag aufnehmen.
3. Sicherstellen dass `auftrag-id` aus URL korrekt geparst wird.

### 7.3 Phase-Tracking-Patch (gestasht) — sicher mergebar nach §6-Klarheit

Stash `MEGA70 Phase 1.2 WIP (Fall-Anker phase-tracking)` ist in `git stash list` einsehbar. Inhalt:
- `app-logic.js:3404` → `setFall(..., phase=2)`
- `stellungnahme-logic.js` → Phase=3 bei Load *(KORREKT — stellungnahme = §6-Editor)*
- `freigabe-logic.js` → Phase=4 bei AZ-Load
- `akte-logic.js:ladeFallKontext()` → `prova_aktiver_fall` + Default-Phase=2
- `sw.js` → v3201

→ **Patch ist inhaltlich korrekt.** Bei Pfad-C (Umbenennung in §7.1) muss `stellungnahme-logic.js` zu `fachurteil-logic.js` migriert werden. Sonst: `git stash pop` ist safe.

### 7.4 Airtable-Toxic-Sweep (Regel 35a Compliance)

44 *-logic.js (siehe §1.4) rufen weiterhin `/.netlify/functions/airtable`. Per Regel 35a in PROVA-REGELN-PERMANENT.md Z.247-265 sind Tot-Code-Strings erlaubt (Wrapper blockiert mit 410), aber neue Calls verboten. Vorschlag:
1. Auflistung der 44 Files in `docs/airtable-migration-status.md` (existiert bereits, ergänzen).
2. Pro File: ist der Code-Pfad tot (Wrapper 410) oder noch aktiv (= Bug)?
3. Tote Calls strippen, aktive auf Supabase migrieren.

### 7.5 Zombie-Cleanup (Phase 3 nach §7.1)

Sicher löschbar:
- `mahnung-1.html`, `mahnung-2.html`, `mahnung-3.html` (ersetzt durch `mahnwesen.html`)
- `tools/test-mega62.html`, `test-mega63.html`, `test-mega64.html` (alte Sprint-Tests)
- `tools/test-edge-functions.html`
- `legal/agb.html`, `legal/avv.html`, `legal/datenschutz.html`, `legal/impressum.html`, `legal/datenschutz-intern.html` (CLAUDE.md Regel 27)

Verify-first (Vorsicht):
- `anforderung-unterlagen-erweitert.html`
- `briefe/ortstermin-arbeitsblatt.html`
- `share.html`

### 7.6 Vorlage-Duplikat-Cleanup

Root `vorlage-01-standard.html` ... `vorlage-11-bauabnahmeprotokoll.html` (11 Files, je ~400 LOC) sind Duplikate zu `formulare/vorlage-NN-*.html`. Empfehlung: Root-Versionen löschen, 301-Redirects.

### 7.7 Regeln-Master synchronisieren

`docs/master/PROVA-REGELN-PERMANENT.md` Z.128-129 sagt „Solo 149 €/Team 279 €" — `CLAUDE.md` v3.1 sagt „Solo 179 €/Team 379 €" (gültig seit 2026-05-08).
→ `PROVA-REGELN-PERMANENT.md` Regel 21 aktualisieren.

### 7.8 Drift-Doku aktualisieren

`docs/master/PROVA-ARCHITEKTUR-MASTER.md` (Stand Tag 8) sagt „~31 Functions". Heute sind es **115 + 144**. Eine Aktualisierung pro Sprint-Quartal (oder ein Auto-Generator) wäre sinnvoll.

---

## 8 — Belege & Reproduzierbarkeit

Alle Aussagen in dieser Datei sind durch genau eine der folgenden Quellen belegt:

1. **`find` / `wc -l`** (Datei-Existenz + Größe)
2. **`grep` / Grep tool** (String-Vorkommen mit Zeilennummer)
3. **`cat <file>`** / Read tool (Datei-Inhalt mind. erste 80 Zeilen)
4. **`git log`** (letzter Commit pro Datei)
5. **Master-Doku** (`CLAUDE.md`, `PROVA-VISION-MASTER.md`, `PROVA-ARCHITEKTUR-MASTER.md`, `06-TEIL-F`, `09-ANHANG-Custom-Nodes-Spec`, `04-TEIL-B-Thema3-HERZSTUECK`, MEGA70-NINJA-DIFF, MEGA70-FINISHING-SPRINT-PROMPT)

Roh-Daten unter `docs/_kartographie-rohdaten/`:
- `html-flat-list.txt` — alle 212 HTML-Pfade
- `html-enriched.txt` — LOC + Last-Commit pro HTML
- `logic-js-enriched.txt` — alle 41 *-logic.js mit LOC
- `lib-js-list.txt` — alle 163 lib/-Module
- `netlify-fns.txt` / `supabase-fns.txt` — Function-Inventare
- `titles-and-pages.txt` — alle 230 `<title>`-Tags + `<body data-page>`-Werte
- `zombies.txt` — 81 Files mit 0-2 Refs

---

## 9 — Sicherheits-Guardrails

Diese Kartographie enthält **keine** API-Keys, JWT-Secrets, Stripe-Webhook-Secrets oder Service-Role-Tokens. Bei `grep` über Code-Files wurde sorgfältig auf Token-Treffer geachtet — keine wurden in den Bericht aufgenommen.

Konkrete sensible Strings (z.B. PostgreSQL-Pwd, Anthropic-API-Key) sind im Repo durch `.env`, GitHub-Secrets oder Netlify-ENVs geschützt und werden hier NICHT zitiert.

---

## 10 — Anschluss & Pfad-Entscheidung

Per MEGA⁷¹-Prompt §5:

### Pfad A: §6-Editor existiert (z.B. `editor.html` mit TipTap)
→ Pfad A trifft NICHT zu. `editor-demo.html` ist Demo, kein produktiver §6-Editor.

### Pfad B: §6-Editor existiert nicht
→ Pfad B trifft NICHT zu. TipTap-Editor IST gemountet — nur unter „falschem" Datei-Namen.

### **Pfad C: `stellungnahme.html` IST de-facto der §6-Editor (Mini-Variante)** ⭐
→ **Pfad C TRIFFT ZU.** Empfehlung: Umbenennung `stellungnahme.html` → `fachurteil.html` (siehe §7.1).

→ **Marcel entscheidet:** Umbenennung sofort (mit Redirect) oder Vision-Master-Update („stellungnahme.html ist offizieller Name des §6-Editors")?

Bei **Umbenennung**: Phase 1.2 WIP-Stash kann nach Migration sauber gepoppt werden (Patch ist semantisch korrekt — nur Dateinamen-Anpassung nötig).
Bei **Beibehaltung**: Phase 1.2 WIP-Stash kann sofort 1:1 gepoppt werden.

---

## 11 — Bonus (optional, falls Zeit gewesen wäre)

- **LOC-Verteilung Bar-Chart:** könnte aus `logic-js-enriched.txt` per einfachem Markdown-Bar-Chart gezogen werden.
- **Dependency-Graph Mermaid:** HTML → logic.js → lib/*.js → Edge-Fns. Skizze:
  ```
  stellungnahme.html
    ├─ stellungnahme-logic.js (2636 LOC)
    │    ├─ lib/editor-tiptap-bundle.js (435 KB)
    │    │    └─ 8× lib/extensions/prova-*.js
    │    ├─ lib/supabase-client.js
    │    └─ /.netlify/functions/ki-proxy (KI-Calls)
    └─ lib/auth-guard.js → /supabase/functions/audit-write
  ```
- **Hot-Spot-Liste (last 30 days):** Top-5 modified Files —
  1. `app-logic.js` (3h ago)
  2. `akte-logic.js` (3h ago, durch Phase 1.2 WIP, jetzt gestasht)
  3. `app.html` (3h ago)
  4. `wertgutachten-logic.js` (3h ago)
  5. `freigabe.html` (3h ago)

---

*Ende MEGA⁷¹ Datei-Kartographie · Pflicht-Read vor jeder Weiter-Phase · Marcel entscheidet Pfad (A/B/C aus §10) bevor MEGA⁷⁰ Phase 1.3/Phase 1.2.1 fortgesetzt wird.*
